/**
 * @role One deck: pick a source, load it, play it, loop it, and ride its knobs. Every gesture
 *   here sends a command ./scripts/drive can send too — a control that needs any other path
 *   would mean the seam is wrong (docs/plan.md §4).
 * @instead The knob itself → src/ui/Knob.tsx. A load's length or frequency field →
 *   src/ui/LoadField.tsx. A parameter's range or label → src/audio/params.ts.
 */

// Eleven imports, and ten of them are the controls a deck is made of — every one is a command
// the UI can send, so the count tracks the seam's surface rather than this file's complexity.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies

import { type ChangeEvent, useCallback, useMemo, useState, useSyncExternalStore } from "react";

import type { Instrument } from "@/app/facade";
import { DECK_PARAM_IDS, isAutomationParam } from "@/audio/params";
import type { GenSource } from "@/lib/source";
import {
  DEFAULT_HZ,
  effectiveGenHz,
  GEN_KINDS,
  isGenHz,
  isGenSecs,
  MAX_SECS,
  MIN_SECS,
} from "@/lib/waveform";
import type { DeckId, DeckState } from "@/state/store";
import { Input } from "@/ui/components/input";
import { ToggleGroup, ToggleGroupItem } from "@/ui/components/toggle-group";
import { DeckRemove } from "@/ui/DeckRemove";
import { DeckTransport } from "@/ui/DeckTransport";
import { EffectRack } from "@/ui/EffectRack";
import { LoadField } from "@/ui/LoadField";
import { ParameterKnob } from "@/ui/ParameterKnob";
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

/** The picker's items depend on nothing, so they are built once rather than on every render. */
const SOURCE_ITEMS = GEN_KINDS.map((kind) => (
  <ToggleGroupItem key={kind} value={kind}>
    {kind}
  </ToggleGroupItem>
));

/** The synthetic source loaded, or null for nothing / a blob. The one place this is narrowed. */
const genOf = (source: DeckState["source"]): GenSource | null =>
  source !== null && "gen" in source ? source : null;

const label = (source: DeckState["source"]): string => {
  if (source === null) return "nothing loaded";
  // The one place the blob half is narrowed — reading `blobId` is what needs it.
  return "gen" in source ? source.gen : `blob ${source.blobId}`;
};

/** The three states of a transport, in the order they are true: playing, held, stopped. */
const transportReadout = (state: DeckState): string => {
  if (state.playing) return " · playing";
  return state.paused === null ? "" : ` · paused ${state.paused.toFixed(2)}s`;
};

/**
 * What the deck is holding, as one string: the header truncates it to a single line, so the
 * same text has to be readable in full as a title. Building it as text rather than as spans is
 * what makes both possible from one source.
 */
const readout = (state: DeckState): string =>
  label(state.source) +
  (state.duration > 0 ? ` · ${state.duration.toFixed(2)}s` : "") +
  (state.loop === null ? "" : ` · loop ${state.loop.in.toFixed(2)}–${state.loop.out.toFixed(2)}s`) +
  transportReadout(state);

/** Ingest is intentionally state-free; the ordinary serialisable command is the mutation. */
export async function importDeckFile(
  instrument: Instrument,
  deck: DeckId,
  file: File,
): Promise<void> {
  const blobId = await instrument.ingest(file);
  instrument.send({ t: "deck.load", deck, source: { blobId } });
}

// A deck is a flat panel of controls, not branching logic: the length tracks how many commands
// the UI can send. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function Deck({
  instrument,
  deck,
  active,
}: {
  instrument: Instrument;
  deck: DeckId;
  active: boolean;
}) {
  const state = useDeck(instrument, deck);
  const [importError, setImportError] = useState<string | null>(null);
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
    (value: string[]) => {
      const [gen] = value;
      // Base UI clears the group when the pressed item was already on; a re-press means reload,
      // which is a useful gesture in itself, so the current source stands in for an empty pick.
      const kind = GEN_KINDS.find((k) => k === gen) ?? loaded?.gen ?? null;
      if (kind === null) return;
      // Length carries across a change of generator; frequency does not, because it means a
      // different thing in each — 4 is a click rate, and as a pitch it is inaudible.
      load({ gen: kind, secs, hz: kind === loaded?.gen ? hz : DEFAULT_HZ[kind] });
    },
    [load, loaded, secs, hz],
  );

  const onFile = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.currentTarget.files?.item(0);
      if (file === null || file === undefined) return;
      setImportError(null);
      void importDeckFile(instrument, deck, file).catch((error: unknown) => {
        setImportError(`Import failed: ${String(error)}`);
      });
      event.currentTarget.value = "";
    },
    [instrument, deck],
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
  const onPointerDownCapture = useCallback(() => {
    if (active) return;
    instrument.send({ t: "deck.activate", deck });
  }, [instrument, deck, active]);

  // Memoised for the reference, not the work: a fresh array literal in a JSX prop re-renders
  // the group on every parent render (react-perf/jsx-no-new-array-as-prop). Same shape as
  // ThemeToggle's `useMemo(() => [theme], [theme])`.
  const selected = useMemo(() => (loaded === null ? [] : [loaded.gen]), [loaded]);

  // The deck this panel names has been removed and the parent list is one render behind. Saying
  // nothing is the truthful answer; inventing a default deck to draw would not be (0029).
  if (state === undefined) return null;

  return (
    <section
      className="flex flex-col gap-4 border border-border p-4 data-[active=true]:border-primary"
      data-active={active}
      aria-label={`Deck ${deck}${active ? " (active)" : ""}`}
      onPointerDownCapture={onPointerDownCapture}
    >
      {/* The name is the only part that may grow, so it is the only part that flexes: it takes
          the slack, truncates on one line, and the remove control keeps its place whatever the
          source is called. */}
      <header className="flex items-baseline gap-3">
        <h2 className="shrink-0 type-title uppercase">deck {deck}</h2>
        <span
          className="min-w-0 flex-1 truncate type-readout text-muted-foreground"
          title={readout(state)}
        >
          {readout(state)}
        </span>
        <DeckRemove instrument={instrument} deck={deck} playing={state.playing} />
      </header>

      <div className="flex flex-wrap items-end gap-4">
        <ToggleGroup
          value={selected}
          onValueChange={onSource}
          variant="outline"
          size="sm"
          spacing={0}
          aria-label={`Deck ${deck} source`}
        >
          {SOURCE_ITEMS}
        </ToggleGroup>

        <Input
          className="w-52"
          type="file"
          accept="audio/*"
          aria-label={`Import audio for deck ${deck}`}
          onChange={onFile}
        />
        {importError !== null && (
          <span className="type-body text-destructive" role="alert">
            {importError}
          </span>
        )}

        <LoadField
          id={`${deck}-secs`}
          name="length"
          value={secs}
          min={MIN_SECS}
          max={MAX_SECS}
          valid={isGenSecs}
          disabled={loaded === null}
          onCommit={onSecs}
        />

        {/* A generator whose default frequency is zero has none at all (src/lib/waveform.ts):
            noise and silence ignore an hz, so the deck does not offer one. */}
        {loaded !== null && DEFAULT_HZ[loaded.gen] > 0 && (
          <LoadField
            id={`${deck}-hz`}
            name="freq"
            value={hz}
            min={0}
            valid={isGenHz}
            disabled={false}
            onCommit={onHz}
          />
        )}
      </div>

      <Waveform instrument={instrument} deck={deck} state={state} />

      <EffectRack instrument={instrument} deck={deck} state={state} />

      <div className="flex items-end gap-4">
        <DeckTransport instrument={instrument} deck={deck} state={state} />

        <div className="ml-auto flex gap-2">
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
    </section>
  );
}
