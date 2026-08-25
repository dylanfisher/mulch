/**
 * @role One deck: pick a source or drop a file on its waveform, load it, play it, loop it, and
 *   ride its knobs. Every gesture
 *   here sends a command ./scripts/drive can send too — a control that needs any other path
 *   would mean the seam is wrong (docs/plan.md §4).
 * @instead The knob itself → src/ui/Knob.tsx. A load's frequency field → src/ui/LoadField.tsx.
 *   A parameter's range or label → src/audio/params.ts.
 */

// One line over the soft cap per control that now says what it does, which is what this file is:
// a header of yard-wide actions and the sections under it. Read and judged, far under the hard
// cap docs/map.md sets — see docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines

// Ten imports, and nine of them are the controls a deck is made of — every one is a command
// the UI can send, so the count tracks the seam's surface rather than this file's complexity.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies

import { useCallback, useState, useSyncExternalStore } from "react";

import { ACTION_TOOLTIPS, failedMessage, yardLabel } from "@/lib/copy";
import type { Instrument } from "@/app/facade";
import { DECK_PARAM_IDS, isAutomationParam } from "@/audio/params";
import { isAcceptedAudioFile, unacceptedAudioFile } from "@/lib/audioFile";
import { type SongPartId } from "@/lib/playerSong";
import { type BlobId, genOf, type GenSource } from "@/lib/source";
import { DEFAULT_HZ, effectiveGenHz, GEN_HZ_STEP, type GenKind, isGenHz } from "@/lib/waveform";
import { sourceBlobId } from "@/state/session";
import type { DeckId, DeckState } from "@/state/store";
import { activateYardCommand, captureClipCommand, duplicateYardCommand } from "@/ui/actions";
import { DRAG_CARD_ATTRIBUTE, type DragHandleProps } from "@/ui/listDrag";
import { Button } from "@/ui/components/button";
import { Toggle } from "@/ui/components/toggle";
import { DeckRemove } from "@/ui/DeckRemove";
import { DeckTransport } from "@/ui/DeckTransport";
import { EffectRack } from "@/ui/EffectRack";
import { ACTION_ICONS } from "@/ui/icons";
import { Says } from "@/ui/Says";
import { LoadField } from "@/ui/LoadField";
import { MoireStrip } from "@/ui/MoireStrip";
import { ParameterKnob } from "@/ui/ParameterKnob";
import { PlayerCard } from "@/ui/PlayerCard";
import { SourcePicker } from "@/ui/SourcePicker";
import { Waveform } from "@/ui/Waveform";
import { secondsLabel } from "@/ui/Knob";
import { FoldCaret } from "@/ui/FoldCaret";
// oxlint-enable import/max-dependencies

/**
 * The session, read through the instrument's read-only view. `getState` is stable and the store
 * replaces only the deck that changed, so this re-renders on that deck's writes and no others.
 */
function useDeck(instrument: Instrument, deck: DeckId): DeckState | undefined {
  const read = useCallback(() => instrument.state.getState().decks[deck], [instrument, deck]);
  return useSyncExternalStore(instrument.state.subscribe, read, read);
}

/**
 * What the source is called, or null when it has no name a person would read: an imported blob
 * is addressed by an id, and an id is not a name, so the readout says nothing about it and the
 * id stays inside the source (P32). The length beside it is what tells a reader it loaded.
 */
const label = (source: DeckState["source"]): string | null => {
  if (source === null) return "nothing loaded";
  return "gen" in source ? source.gen : null;
};

/** The three states of a transport, in the order they are true: playing, held, stopped. */
const transportReadout = (state: DeckState): string | null => {
  if (state.playing) return "playing";
  return state.paused === null ? null : `paused ${secondsLabel(state.paused)}`;
};

/**
 * The yard's name and what the deck is holding, as one string: the header truncates it to a
 * single line, so the same text has to be readable in full as a title. Building it as text
 * rather than as spans is what makes both possible from one source. A part with nothing to say
 * drops out entirely, separator and all, so an unnamed source never leaves a leading `·`. The
 * name leads it, because it is the one part that is about the yard rather than its source
 * (0057) — it is what P32 emptied this readout of the blob id to make room for.
 */
const readout = (name: string, state: DeckState): string =>
  [
    name,
    label(state.source),
    state.duration > 0 ? secondsLabel(state.duration) : null,
    state.loop === null ? null : `loop ${state.loop.in.toFixed(2)}–${secondsLabel(state.loop.out)}`,
    transportReadout(state),
  ]
    .filter((part) => part !== null)
    .join(" · ");

/**
 * The load's own outcome, so an import can be refused by it. `send` returns void by design
 * (docs/plan.md §2) and a blob load decodes asynchronously, so a container the picker accepts
 * and the codec inside it the browser will not decode — which is most of what an `.m4a` can hold
 * — reaches the bus as an `error` event and nowhere else. Nothing on the screen subscribes to
 * that bus, so the whole of that failure used to be a yard that stayed empty (0132).
 *
 * A refusal is this import's when it names these bytes, which is what a failed load says and an
 * `error` event carries no deck to say instead (`load` in src/app/execute.ts). Any other failure
 * is somebody else's and is left to whoever sent it — an import that resolved on another yard's
 * refusal would be the same silence, reported as a success.
 *
 * The other two ways a load ends carry the deck, so they are read off it: it loaded — this one's
 * bytes, or a newer load that took the yard while these decoded, and either way this call has
 * nothing left to say — or the yard was removed under it. A load that is superseded and then
 * itself refused reports through the newer import and leaves this promise pending; that is the
 * bound of correlating by the blob, and it costs one listener rather than a wrong answer.
 */
function loadOutcome(instrument: Instrument, deck: DeckId, blobId: BlobId): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const off = instrument.on((event) => {
      if (event.t === "error" && event.detail.includes(blobId)) {
        off();
        reject(new Error(event.detail));
      } else if ((event.t === "deck.loaded" || event.t === "deck.removed") && event.deck === deck) {
        off();
        resolve();
      }
    });
    try {
      instrument.send({ t: "deck.load", deck, source: { blobId } });
    } catch (error) {
      // A command refused before it ran answers here and nowhere else, so the subscription this
      // promise opened has to come off with it (principle 5).
      off();
      throw error;
    }
  });
}

/**
 * Ingest is intentionally state-free; the ordinary serialisable command is the mutation. The
 * refusal by name comes first, so a file no deck would take never reaches the blob store — and
 * it is the one refusal, shared with whatever else takes a file for a deck (0043). The bytes
 * the name says nothing about are refused by the decode, and this waits for that answer.
 */
export async function importDeckFile(
  instrument: Instrument,
  deck: DeckId,
  file: File,
): Promise<void> {
  if (!isAcceptedAudioFile(file.name)) throw new TypeError(unacceptedAudioFile(file.name));
  const blobId = await instrument.ingest(file);
  await loadOutcome(instrument, deck, blobId);
}

// A deck is a flat panel of controls, not branching logic: the length tracks how many commands
// the UI can send. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function Deck({
  instrument,
  deck,
  emoji,
  name,
  active,
  handle,
}: {
  instrument: Instrument;
  deck: DeckId;
  /** The emoji this yard was added with, held by the session's deck list and passed in (0057). */
  emoji: string;
  /** The name this yard was added with, from the same list and drawn at the same call site. */
  name: string;
  active: boolean;
  /** The grip's props: the drag of this yard's handle and the arrow keys on it (0111). */
  handle: DragHandleProps;
}) {
  const state = useDeck(instrument, deck);
  const [importError, setImportError] = useState<string | null>(null);
  /**
   * Folded shut or open — a view preference and nothing else: no command, nothing durable, no
   * history entry (plan §2). It lives with the panel rather than in a module map keyed by deck
   * id, so removing a yard takes its fold with it and a later yard handed the same free letter
   * (`nextDeckId`) opens the way every new yard does.
   */
  const [collapsed, setCollapsed] = useState(false);
  /** The rack's own fold, held above the fold that renders it so it survives one (P64). */
  const rackFold = useState(false);
  /** The jumps card's own fold, held here for the same reason the rack's is (P74). */
  const playerFold = useState(false);
  /** And the song section inside that card, held here for the same reason again: it is drawn
   *  under the card's fold, so a fold of its own would be forgotten every time that one closed
   *  (0157). */
  const songFold = useState(false);
  /** And which part of that song the card's dials are pointed at, held here for the same reason
   *  again: a fold may put the section away, and a selection that went with it would be a hand's
   *  aim forgotten by a caret (0176). A view preference: no command, nothing durable, no history
   *  entry (plan §2). */
  const songSelect = useState<SongPartId | null>(null);
  const loaded = genOf(state?.source ?? null);
  const hz = loaded === null ? 0 : effectiveGenHz(loaded.gen, loaded.hz);
  /**
   * The id this yard's imported bytes are stored under, for the one control that says what is
   * loaded: the name a person recognises the audio by is read off it, by the picker itself
   * (0127) — so this is a second reader of that name and not a second fact.
   */
  const blobId = sourceBlobId(state?.source ?? null);

  /** Every source control is the same gesture — load this generator, with these arguments. */
  const load = useCallback(
    (source: GenSource) => {
      // A refusal is about what the yard is holding, and this changes that: left standing, the
      // words "Import failed" would sit beside a control reading `sine`, in the header, forever
      // — the one place with no gesture that dismisses it (P98).
      setImportError(null);
      instrument.send({ t: "deck.load", deck, source });
    },
    [instrument, deck],
  );

  const onSource = useCallback(
    (kind: GenKind) => {
      // Frequency does not carry across a change of generator, because it means a different
      // thing in each — 4 is a click rate, and as a pitch it is inaudible. Picking the generator
      // already loaded reloads it, which is a useful gesture in itself. The tone takes no
      // argument at all: its pitch is `deck.tone` (0110), and its length is its kind's (P127).
      if (kind === "tone") {
        load({ gen: kind });
        return;
      }
      load({ gen: kind, hz: kind === loaded?.gen ? hz : DEFAULT_HZ[kind] });
    },
    [load, loaded, hz],
  );

  /** The one ingest every route into this deck takes — the picker below and the waveform's drop. */
  const receiveFile = useCallback(
    (file: File) => {
      setImportError(null);
      void importDeckFile(instrument, deck, file).catch((error: unknown) => {
        setImportError(failedMessage("Import", error));
      });
    },
    [instrument, deck],
  );

  const onHz = useCallback(
    (next: number) => {
      if (loaded === null) return;
      load({ ...loaded, hz: effectiveGenHz(loaded.gen, next) });
    },
    [load, loaded],
  );

  /**
   * Touching the deck anywhere is what selects it — one capture-phase handler on the container,
   * so no control has to know about selection, and nothing is sent when the deck is already
   * active, or a knob drag would push a redundant command on every press (0019).
   */
  const activate = useCallback(() => {
    if (active) return;
    instrument.send(activateYardCommand(deck));
  }, [instrument, deck, active]);

  /**
   * The two gestures that are about the whole yard rather than about what it is playing, so they
   * sit in the yard's own group where the thing they are about is, beside remove and the fold
   * (0078). Both read the session at the press rather than through a prop: which letters are unspent,
   * and how many clips a new one counts from, are facts about the moment the hand went down.
   */
  const capture = useCallback(() => {
    instrument.send(captureClipCommand(instrument.state.getState().clips, deck));
  }, [instrument, deck]);
  const duplicate = useCallback(() => {
    instrument.send(duplicateYardCommand(instrument.state.getState(), deck));
  }, [instrument, deck]);

  /**
   * A drop carries no pointer press, so the capture handler above never sees it — but the hand
   * is on this deck as surely as if it had been clicked, so the drop selects it too (P16).
   */
  const onDropFile = useCallback(
    (file: File) => {
      activate();
      receiveFile(file);
    },
    [activate, receiveFile],
  );

  // The deck this panel names has been removed and the parent list is one render behind. Saying
  // nothing is the truthful answer; inventing a default deck to draw would not be (0029).
  if (state === undefined) return null;

  return (
    <section
      className="flex flex-col gap-4 border border-border bg-background p-4 data-[active=true]:border-primary data-[dragging=true]:relative data-[dragging=true]:z-10"
      {...{ [DRAG_CARD_ATTRIBUTE]: "" }}
      data-active={active}
      aria-label={`${yardLabel(deck)}${active ? " (Active)" : ""}`}
      onPointerDownCapture={activate}
    >
      {/* The name is the only part that may grow, so it is the only part that flexes: it takes
          the slack, truncates on one line, and the remove control keeps its place whatever the
          source is called. */}
      <header className="flex flex-wrap items-baseline gap-3">
        {/* The heading is the fold: folded or open is a state the yard is left in, so it is a
            Toggle reporting `aria-pressed`, and the caret turns with the state rather than being
            a second icon (0055). The name sits inside the control rather than three elements
            away from it, so the press target is the whole heading and the control's accessible
            name is what the heading says (P73); the negative margin pulls that padded word back
            into line with the panel's own edge. */}
        <h2 className="shrink-0">
          <Says what={ACTION_TOOLTIPS.collapse}>
            <Toggle
              size="sm"
              className="-ml-2.5"
              pressed={collapsed}
              onPressedChange={setCollapsed}
            >
              <span className="type-title">
                <span aria-hidden="true">{emoji}</span> {yardLabel(deck)}
              </span>
              <FoldCaret />
            </Toggle>
          </Says>
        </h2>
        {/* What this yard is playing and how to change it, at the top of the yard where a reader
            starts: one control for the generators and the import both, so the source is said once
            and said where the yard's name is rather than in the first row of its body (P98). */}
        <SourcePicker
          deck={deck}
          current={loaded?.gen ?? null}
          blobId={blobId}
          onPick={onSource}
          onImport={receiveFile}
        />
        {importError !== null && (
          <span className="min-w-0 truncate type-body text-destructive" role="alert">
            {importError}
          </span>
        )}
        <span
          className="min-w-0 flex-1 truncate type-readout text-muted-foreground"
          title={readout(name, state)}
        >
          {readout(name, state)}
        </span>
        {/* Folded, the yard's whole body is gone and the drift with it — so the picture moves
            into the slack this header already has, between the readout and the group of buttons,
            and a shut yard still says what it is doing. Open, it is drawn full width down below
            where the thing it is about is. */}
        {collapsed && (
          <MoireStrip
            instrument={instrument}
            deck={deck}
            state={state}
            className="min-w-0 flex-1 self-center"
          />
        )}
        {/* The grip, first of the yard's own group: the drag that moves this yard among the
            others, and the arrow keys on it, which are the keyboard path and the one
            ./scripts/drive can press (0062, 0111). */}
        <Says what={ACTION_TOOLTIPS.reorder}>
          <Button
            size="icon-xs"
            variant="ghost"
            className="cursor-grab touch-none"
            aria-label={`Reorder ${yardLabel(deck)}`}
            {...handle}
          >
            <ACTION_ICONS.reorder />
          </Button>
        </Says>
        <Says what={ACTION_TOOLTIPS.capture}>
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={`Capture ${yardLabel(deck)}`}
            onClick={capture}
          >
            <ACTION_ICONS.capture />
          </Button>
        </Says>
        <Says what={ACTION_TOOLTIPS.duplicate}>
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={`Duplicate ${yardLabel(deck)}`}
            onClick={duplicate}
          >
            <ACTION_ICONS.duplicate />
          </Button>
        </Says>
        <DeckRemove instrument={instrument} deck={deck} playing={state.playing} />
      </header>

      {collapsed ? null : (
        <>
          {/* A generator whose default frequency is zero has none at all (src/lib/waveform.ts):
          noise and silence ignore an hz, so the deck does not offer one — and neither does a
          tone, whose pitch is the knob on the row below (0110). Its length is not asked for at
          all any more: every drawn source is one length its kind declares (P127). */}
          {loaded !== null && DEFAULT_HZ[loaded.gen] > 0 && (
            <div className="flex flex-wrap items-end gap-4">
              <LoadField
                id={`${deck}-hz`}
                name="Freq"
                value={hz}
                min={0}
                step={GEN_HZ_STEP}
                valid={isGenHz}
                onCommit={onHz}
              />
            </div>
          )}

          {/* Above the peaks, not below them: the transport and the knobs are what a hand reaches
          for, and a waveform that grows pushes them off the screen otherwise (P32). */}
          <div className="flex flex-wrap items-end gap-4">
            <DeckTransport instrument={instrument} deck={deck} state={state} />

            <div className="ml-auto flex flex-wrap gap-2">
              {DECK_PARAM_IDS.map((param) => (
                <ParameterKnob
                  key={param}
                  instrument={instrument}
                  deck={deck}
                  param={param}
                  value={state.params[param]}
                  lane={(isAutomationParam(param) ? state.automation[param] : undefined) ?? null}
                  playing={state.playing}
                />
              ))}
            </div>
          </div>

          <Waveform instrument={instrument} deck={deck} state={state} onFile={onDropFile} />

          {/* Under the peaks and above the rack: the peaks say what one pass sounds like, and
              this says what the passes do to each other over time. */}
          <MoireStrip instrument={instrument} deck={deck} state={state} />

          {/* Below the drift and above the rack, in the same language every other thing a yard
              holds is drawn in: what it moves is where inside the loop the deck is reading — the
              transport's, never an effect's (0089, P74). */}
          <PlayerCard
            instrument={instrument}
            deck={deck}
            state={state}
            fold={playerFold}
            songFold={songFold}
            songSelect={songSelect}
          />

          <EffectRack instrument={instrument} deck={deck} state={state} fold={rackFold} />
        </>
      )}
    </section>
  );
}
