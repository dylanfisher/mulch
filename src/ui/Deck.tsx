/**
 * @role One deck: pick a source, load it, play it, loop it, and ride its knobs. Every gesture
 *   here sends a command ./scripts/drive can send too — a control that needs any other path
 *   would mean the seam is wrong (docs/plan.md §4).
 * @instead The knob itself → src/ui/Knob.tsx. A parameter's range or label → src/audio/params.ts.
 */
import { useCallback, useMemo, useSyncExternalStore } from "react";

import type { Instrument } from "@/app/facade";
import { PARAM_IDS, PARAMS, type ParamId } from "@/audio/params";
import { GEN_KINDS, type GenKind } from "@/lib/waveform";
import type { DeckId, DeckState } from "@/state/store";
import { Button } from "@/ui/components/button";
import { ToggleGroup, ToggleGroupItem } from "@/ui/components/toggle-group";
import { Knob } from "@/ui/Knob";

/** How much of a synthetic source to make. Long enough to hear, short enough to load instantly. */
const GEN_SECS = 4;
/** The loop the loop button sets: the first second, where a click train shows four clicks. */
const LOOP_SECS = 1;

/**
 * The session, read through the instrument's read-only view. `getState` is stable and the store
 * replaces only the deck that changed, so this re-renders on that deck's writes and no others.
 */
function useDeck(instrument: Instrument, deck: DeckId): DeckState {
  const read = useCallback(() => instrument.state.getState().decks[deck], [instrument, deck]);
  return useSyncExternalStore(instrument.state.subscribe, read, read);
}

/** Which generator is loaded, or null for nothing / a blob. The one place this is narrowed. */
const genOf = (source: DeckState["source"]): GenKind | null =>
  source !== null && "gen" in source ? source.gen : null;

const label = (source: DeckState["source"]): string => {
  if (source === null) return "nothing loaded";
  // The one place the blob half is narrowed — reading `blobId` is what needs it.
  return "gen" in source ? source.gen : `blob ${source.blobId}`;
};

function ParamKnob({
  instrument,
  deck,
  param,
  value,
}: {
  instrument: Instrument;
  deck: DeckId;
  param: ParamId;
  value: number;
}) {
  const spec = PARAMS[param];
  const onChange = useCallback(
    (next: number) => {
      instrument.send({ t: "param.set", deck, param, value: next });
    },
    [instrument, deck, param],
  );

  return (
    <Knob
      label={spec.label}
      value={value}
      onChange={onChange}
      min={spec.min}
      max={spec.max}
      defaultValue={spec.default}
      size="sm"
      {...(spec.step === undefined ? {} : { step: spec.step })}
    />
  );
}

// A deck is a flat panel of controls, not branching logic: the length tracks how many commands
// the UI can send. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function Deck({ instrument, deck }: { instrument: Instrument; deck: DeckId }) {
  const state = useDeck(instrument, deck);
  const looping = state.loop !== null;

  const onSource = useCallback(
    (value: string[]) => {
      const [gen] = value;
      // Base UI clears the group when the pressed item was already on; a re-press means reload,
      // which is a useful gesture in itself, so the current source stands in for an empty pick.
      const kind = GEN_KINDS.find((k) => k === gen) ?? genOf(state.source);
      if (kind === null) return;
      instrument.send({ t: "deck.load", deck, source: { gen: kind, secs: GEN_SECS } });
    },
    [instrument, deck, state.source],
  );

  const onPlay = useCallback(() => {
    instrument.send({ t: "deck.play", deck });
  }, [instrument, deck]);

  const onStop = useCallback(() => {
    instrument.send({ t: "deck.stop", deck });
  }, [instrument, deck]);

  const onLoop = useCallback(() => {
    // `out` at or below `in` clears the loop, so one command covers both directions.
    const out = looping ? 0 : Math.min(LOOP_SECS, state.duration);
    instrument.send({ t: "deck.loop", deck, in: 0, out });
  }, [instrument, deck, looping, state.duration]);

  const selected = useMemo(() => {
    const gen = genOf(state.source);
    return gen === null ? [] : [gen];
  }, [state.source]);

  return (
    <section className="flex flex-col gap-4 border border-border p-4" aria-label={`Deck ${deck}`}>
      <header className="flex items-baseline gap-3">
        <h2 className="type-title uppercase">deck {deck}</h2>
        <span className="type-readout text-muted-foreground">
          {label(state.source)}
          {state.duration > 0 && ` · ${state.duration.toFixed(2)}s`}
          {state.playing && " · playing"}
        </span>
      </header>

      <ToggleGroup
        value={selected}
        onValueChange={onSource}
        variant="outline"
        size="sm"
        spacing={0}
        aria-label={`Deck ${deck} source`}
      >
        {GEN_KINDS.map((kind) => (
          <ToggleGroupItem key={kind} value={kind}>
            {kind}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>

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
          {PARAM_IDS.map((param) => (
            <ParamKnob
              key={param}
              instrument={instrument}
              deck={deck}
              param={param}
              value={state.params[param]}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
