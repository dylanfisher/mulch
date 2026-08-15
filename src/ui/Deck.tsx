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
// oxlint-disable max-dependencies

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
import { Button } from "@/ui/components/button";
import { Input } from "@/ui/components/input";
import { ToggleGroup, ToggleGroupItem } from "@/ui/components/toggle-group";
import { EffectRack } from "@/ui/EffectRack";
import { LoadField } from "@/ui/LoadField";
import { ParameterKnob } from "@/ui/ParameterKnob";
import { Waveform } from "@/ui/Waveform";

/** How much of a synthetic source to make before anyone says otherwise. */
const GEN_SECS = 4;
/**
 * The session, read through the instrument's read-only view. `getState` is stable and the store
 * replaces only the deck that changed, so this re-renders on that deck's writes and no others.
 */
function useDeck(instrument: Instrument, deck: DeckId): DeckState {
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
  const looping = state.loop !== null;
  const loaded = genOf(state.source);
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

  const onPlay = useCallback(() => {
    instrument.send({ t: "deck.play", deck });
  }, [instrument, deck]);

  const onStop = useCallback(() => {
    instrument.send({ t: "deck.stop", deck });
  }, [instrument, deck]);

  const onLoop = useCallback(() => {
    instrument.send({ t: "deck.loop.toggle", deck });
  }, [instrument, deck]);

  const onActivate = useCallback(() => {
    instrument.send({ t: "deck.activate", deck });
  }, [instrument, deck]);

  // Memoised for the reference, not the work: a fresh array literal in a JSX prop re-renders
  // the group on every parent render (react-perf/jsx-no-new-array-as-prop). Same shape as
  // ThemeToggle's `useMemo(() => [theme], [theme])`.
  const selected = useMemo(() => (loaded === null ? [] : [loaded.gen]), [loaded]);

  return (
    <section
      className="flex flex-col gap-4 border border-border p-4 data-[active=true]:border-primary"
      data-active={active}
      aria-label={`Deck ${deck}${active ? " (active)" : ""}`}
    >
      <header className="flex items-baseline gap-3">
        <h2 className="type-title uppercase">deck {deck}</h2>
        <Button
          size="xs"
          variant={active ? "secondary" : "outline"}
          aria-pressed={active}
          aria-label={active ? `Deck ${deck} active` : `Select deck ${deck}`}
          onClick={onActivate}
        >
          {active ? "active" : "select"}
        </Button>
        <span className="type-readout text-muted-foreground">
          {label(state.source)}
          {state.duration > 0 && ` · ${state.duration.toFixed(2)}s`}
          {state.loop !== null &&
            ` · loop ${state.loop.in.toFixed(2)}–${state.loop.out.toFixed(2)}s`}
          {state.playing && " · playing"}
        </span>
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
        <div className="flex gap-2">
          <Button size="sm" onClick={onPlay} disabled={state.duration === 0}>
            play
          </Button>
          <Button size="sm" variant="outline" onClick={onStop} disabled={!state.playing}>
            stop
          </Button>
          <Button
            size="sm"
            variant={looping ? "default" : "outline"}
            onClick={onLoop}
            disabled={state.duration === 0}
            aria-pressed={looping}
          >
            loop
          </Button>
        </div>

        <div className="ml-auto flex gap-2">
          {DECK_PARAM_IDS.map((param) => (
            <ParameterKnob
              key={param}
              instrument={instrument}
              deck={deck}
              param={param}
              value={state.params[param]}
              lane={(isAutomationParam(param) ? state.automation[param] : undefined) ?? null}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
