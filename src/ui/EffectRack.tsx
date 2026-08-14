/** @role One deck's registry-rendered ordered effect rack and its add commands. */
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
      {state.effects.map((id) => {
        const effect = effectById(id);
        return (
          <div key={id} className="flex items-end gap-2" aria-label={effect.label}>
            <div className="type-readout text-muted-foreground">{effect.label}</div>
            {effect.params.map((param) => (
              <ParameterKnob
                key={param.id}
                instrument={instrument}
                deck={deck}
                param={param.id}
                value={state.params[param.id]}
              />
            ))}
          </div>
        );
      })}
      {inactive.map((effect) => (
        <AddEffectButton key={effect.id} instrument={instrument} deck={deck} effect={effect.id} />
      ))}
    </section>
  );
}
