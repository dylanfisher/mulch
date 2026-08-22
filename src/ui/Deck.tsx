/**
 * @role One deck: pick a source or drop a file on its waveform, load it, play it, loop it, and
 *   ride its knobs. Every gesture
 *   here sends a command ./scripts/drive can send too — a control that needs any other path
 *   would mean the seam is wrong (docs/plan.md §4).
 * @instead The knob itself → src/ui/Knob.tsx. A load's length or frequency field →
 *   src/ui/LoadField.tsx. A parameter's range or label → src/audio/params.ts.
 */

// One line over the soft cap per control that now says what it does, which is what this file is:
// a header of yard-wide actions and the sections under it. Read and judged, far under the hard
// cap docs/map.md sets — see docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines

// Eleven imports, and ten of them are the controls a deck is made of — every one is a command
// the UI can send, so the count tracks the seam's surface rather than this file's complexity.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies

import { type ChangeEvent, useCallback, useState, useSyncExternalStore } from "react";

import { ACTION_TOOLTIPS, yardLabel } from "@/lib/copy";
import type { Instrument } from "@/app/facade";
import { DECK_PARAM_IDS, isAutomationParam } from "@/audio/params";
import { AUDIO_FILE_ACCEPT, isAcceptedAudioFile, unacceptedAudioFile } from "@/lib/audioFile";
import { genOf, type GenSource } from "@/lib/source";
import {
  DEFAULT_HZ,
  effectiveGenHz,
  GEN_HZ_STEP,
  type GenKind,
  isGenHz,
  isGenSecs,
  MAX_SECS,
  MIN_SECS,
} from "@/lib/waveform";
import type { DeckId, DeckState } from "@/state/store";
import { activateYardCommand, captureClipCommand, duplicateYardCommand } from "@/ui/actions";
import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/input";
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
import { RecycleMark } from "@/ui/RecycleMark";
import { SourcePicker } from "@/ui/SourcePicker";
import { Waveform } from "@/ui/Waveform";
// oxlint-enable import/max-dependencies

/** How much of a synthetic source to make before anyone says otherwise. */
const GEN_SECS = 4;
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
  return state.paused === null ? null : `paused ${state.paused.toFixed(2)}s`;
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
    state.duration > 0 ? `${state.duration.toFixed(2)}s` : null,
    state.loop === null ? null : `loop ${state.loop.in.toFixed(2)}–${state.loop.out.toFixed(2)}s`,
    transportReadout(state),
  ]
    .filter((part) => part !== null)
    .join(" · ");

/**
 * Ingest is intentionally state-free; the ordinary serialisable command is the mutation. The
 * refusal comes first, so a file the browser cannot decode never reaches the blob store — and
 * it is the one refusal, shared with whatever else takes a file for a deck (0043).
 */
export async function importDeckFile(
  instrument: Instrument,
  deck: DeckId,
  file: File,
): Promise<void> {
  if (!isAcceptedAudioFile(file.name)) throw new TypeError(unacceptedAudioFile(file.name));
  const blobId = await instrument.ingest(file);
  instrument.send({ t: "deck.load", deck, source: { blobId } });
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
}: {
  instrument: Instrument;
  deck: DeckId;
  /** The emoji this yard was added with, held by the session's deck list and passed in (0057). */
  emoji: string;
  /** The name this yard was added with, from the same list and drawn at the same call site. */
  name: string;
  active: boolean;
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
  const loaded = genOf(state?.source ?? null);
  const secs = loaded?.secs ?? GEN_SECS;
  const hz = loaded === null ? 0 : effectiveGenHz(loaded.gen, loaded.hz);

  /** Every source control is the same gesture — load this generator, with these arguments. */
  const load = useCallback(
    (source: GenSource) => {
      instrument.send({ t: "deck.load", deck, source });
    },
    [instrument, deck],
  );

  const onSource = useCallback(
    (kind: GenKind) => {
      // Length carries across a change of generator; frequency does not, because it means a
      // different thing in each — 4 is a click rate, and as a pitch it is inaudible. Picking the
      // generator already loaded reloads it, which is a useful gesture in itself.
      load({ gen: kind, secs, hz: kind === loaded?.gen ? hz : DEFAULT_HZ[kind] });
    },
    [load, loaded, secs, hz],
  );

  /** The one ingest every route into this deck takes — the picker below and the waveform's drop. */
  const receiveFile = useCallback(
    (file: File) => {
      setImportError(null);
      void importDeckFile(instrument, deck, file).catch((error: unknown) => {
        setImportError(`Import failed: ${String(error)}`);
      });
    },
    [instrument, deck],
  );

  const onFile = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.item(0);
      if (file === null || file === undefined) return;
      receiveFile(file);
      event.currentTarget.value = "";
    },
    [receiveFile],
  );

  const onSecs = useCallback(
    (next: number) => {
      if (loaded === null) return;
      load({ ...loaded, secs: next });
    },
    [load, loaded],
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
    instrument.send(duplicateYardCommand(instrument.state.getState().spentDeckIds, deck));
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
      className="flex flex-col gap-4 border border-border p-4 data-[active=true]:border-primary"
      data-active={active}
      aria-label={`${yardLabel(deck)}${active ? " (Active)" : ""}`}
      onPointerDownCapture={activate}
    >
      {/* The name is the only part that may grow, so it is the only part that flexes: it takes
          the slack, truncates on one line, and the remove control keeps its place whatever the
          source is called. */}
      <header className="flex items-baseline gap-3">
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
              <ACTION_ICONS.collapse
                data-icon="inline-end"
                className="transition-transform group-aria-pressed/toggle:rotate-180"
              />
            </Toggle>
          </Says>
        </h2>
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
          <div className="flex flex-wrap items-end gap-4">
            <SourcePicker deck={deck} current={loaded?.gen ?? null} onPick={onSource} />

            <Input
              className="w-52"
              type="file"
              accept={AUDIO_FILE_ACCEPT}
              aria-label={`Import Audio for ${yardLabel(deck)}`}
              onChange={onFile}
            />
            {importError !== null && (
              <span className="type-body text-destructive" role="alert">
                {importError}
              </span>
            )}

            <LoadField
              id={`${deck}-secs`}
              name="Length"
              value={secs}
              min={MIN_SECS}
              max={MAX_SECS}
              step="any"
              valid={isGenSecs}
              disabled={loaded === null}
              onCommit={onSecs}
            />

            {/* A generator whose default frequency is zero has none at all (src/lib/waveform.ts):
            noise and silence ignore an hz, so the deck does not offer one. */}
            {loaded !== null && DEFAULT_HZ[loaded.gen] > 0 && (
              <LoadField
                id={`${deck}-hz`}
                name="Freq"
                value={hz}
                min={0}
                step={GEN_HZ_STEP}
                valid={isGenHz}
                disabled={false}
                onCommit={onHz}
              />
            )}
          </div>

          {/* Above the peaks, not below them: the transport and the knobs are what a hand reaches
          for, and a waveform that grows pushes them off the screen otherwise (P32). */}
          <div className="flex flex-wrap items-end gap-4">
            <DeckTransport instrument={instrument} deck={deck} state={state} />
            {/* Only while it is playing, and gone the moment it is not: a mark that is always
                there says nothing, and a stopped yard renders no animation at all. */}
            <RecycleMark playing={state.playing} />

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
          <PlayerCard instrument={instrument} deck={deck} state={state} fold={playerFold} />

          <EffectRack instrument={instrument} deck={deck} state={state} fold={rackFold} />
        </>
      )}
    </section>
  );
}
