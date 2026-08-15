/** @role One deck's registry-rendered ordered effect rack and its performance commands. */
import { useCallback } from "react";

import type { Instrument } from "@/app/facade";
import { effectById, EFFECTS, type EffectId } from "@/audio/effects/registry";
import type { DeckId, DeckState } from "@/state/store";
import { Button } from "@/ui/components/button";
import { ParameterKnob } from "@/ui/ParameterKnob";

function AddEffectButton({
  instrument,
  deck,
  effect,
}: {
  instrument: Instrument;
  deck: DeckId;
  effect: EffectId;
}) {
  const plugin = effectById(effect);
  const add = useCallback(() => {
    instrument.send({ t: "effect.add", deck, effect });
  }, [instrument, deck, effect]);

  return (
    <Button size="sm" variant="outline" onClick={add}>
      add {plugin.label}
    </Button>
  );
}

/**
 * The three operations a performer reaches for. Every one of them is the ordinary serialisable
 * command ./scripts/drive can send too — a control needing any other path would mean the seam is
 * wrong (0023, docs/plan.md §4).
 */
// oxlint-disable-next-line max-lines-per-function
function SlotControls({
  instrument,
  deck,
  effect,
  index,
  last,
  bypassed,
}: {
  instrument: Instrument;
  deck: DeckId;
  effect: EffectId;
  index: number;
  last: number;
  bypassed: boolean;
}) {
  const label = effectById(effect).label;

  const toggleBypass = useCallback(() => {
    instrument.send({ t: "effect.bypass", deck, effect, bypassed: !bypassed });
  }, [instrument, deck, effect, bypassed]);
  const moveEarlier = useCallback(() => {
    instrument.send({ t: "effect.reorder", deck, effect, index: index - 1 });
  }, [instrument, deck, effect, index]);
  const moveLater = useCallback(() => {
    instrument.send({ t: "effect.reorder", deck, effect, index: index + 1 });
  }, [instrument, deck, effect, index]);
  const remove = useCallback(() => {
    instrument.send({ t: "effect.remove", deck, effect });
  }, [instrument, deck, effect]);

  return (
    <>
      <Button
        size="sm"
        variant={bypassed ? "default" : "ghost"}
        aria-pressed={bypassed}
        aria-label={`Bypass ${label} on deck ${deck}`}
        onClick={toggleBypass}
      >
        bypass
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={index === 0}
        aria-label={`Move ${label} earlier on deck ${deck}`}
        onClick={moveEarlier}
      >
        &lt;
      </Button>
      <Button
        size="sm"
        variant="ghost"
        disabled={index === last}
        aria-label={`Move ${label} later on deck ${deck}`}
        onClick={moveLater}
      >
        &gt;
      </Button>
      <Button
        size="sm"
        variant="ghost"
        aria-label={`Remove ${label} from deck ${deck}`}
        onClick={remove}
      >
        remove
      </Button>
    </>
  );
}

/** One slot of the rack: the effect's registry-driven knobs, then its rack controls. */
function EffectSlot({
  instrument,
  deck,
  state,
  effect,
  index,
}: {
  instrument: Instrument;
  deck: DeckId;
  state: DeckState;
  effect: EffectId;
  index: number;
}) {
  const plugin = effectById(effect);
  const bypassed = state.bypassed.includes(effect);

  return (
    <div className="flex items-end gap-2" aria-label={plugin.label}>
      <div className="type-readout text-muted-foreground">{plugin.label}</div>
      {/* A bypassed effect keeps its knobs live: the values it comes back at are set here. */}
      <div className={bypassed ? "flex items-end gap-2 opacity-50" : "flex items-end gap-2"}>
        {plugin.params.map((param) => (
          <ParameterKnob
            key={param.id}
            instrument={instrument}
            deck={deck}
            param={param.id}
            value={state.params[param.id]}
          />
        ))}
      </div>
      <SlotControls
        instrument={instrument}
        deck={deck}
        effect={effect}
        index={index}
        last={state.effects.length - 1}
        bypassed={bypassed}
      />
    </div>
  );
}

export function EffectRack({
  instrument,
  deck,
  state,
}: {
  instrument: Instrument;
  deck: DeckId;
  state: DeckState;
}) {
  const inactive = EFFECTS.filter((effect) => !state.effects.includes(effect.id));

  return (
    <section className="flex flex-wrap items-end gap-4" aria-label={`Deck ${deck} effects`}>
      <div className="type-eyebrow text-muted-foreground">effects</div>
      {state.effects.map((id, index) => (
        <EffectSlot
          key={id}
          instrument={instrument}
          deck={deck}
          state={state}
          effect={id}
          index={index}
        />
      ))}
      {inactive.map((effect) => (
        <AddEffectButton key={effect.id} instrument={instrument} deck={deck} effect={effect.id} />
      ))}
    </section>
  );
}
