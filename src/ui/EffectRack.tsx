/** @role One deck's registry-rendered ordered effect rack and its performance commands. */
import { useCallback } from "react";

import type { Instrument } from "@/app/facade";
import type { EffectInstanceId } from "@/audio/effects/contract";
import { effectById, EFFECTS, type EffectId } from "@/audio/effects/registry";
import { isAutomationParam, paramIn } from "@/audio/params";
import type { SessionEffect } from "@/state/session";
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
  // A rack may hold any number of instances of one entry, so this button is never spent: it mints
  // a fresh opaque id every press, the way the deck rack mints a deck id (0029, 0030).
  const add = useCallback(() => {
    instrument.send({ t: "effect.add", deck, id: crypto.randomUUID(), effect });
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
  instance,
  label,
  index,
  last,
  bypassed,
}: {
  instrument: Instrument;
  deck: DeckId;
  instance: EffectInstanceId;
  label: string;
  index: number;
  last: number;
  bypassed: boolean;
}) {
  const toggleBypass = useCallback(() => {
    instrument.send({ t: "effect.bypass", deck, instance, bypassed: !bypassed });
  }, [instrument, deck, instance, bypassed]);
  const moveEarlier = useCallback(() => {
    instrument.send({ t: "effect.reorder", deck, instance, index: index - 1 });
  }, [instrument, deck, instance, index]);
  const moveLater = useCallback(() => {
    instrument.send({ t: "effect.reorder", deck, instance, index: index + 1 });
  }, [instrument, deck, instance, index]);
  const remove = useCallback(() => {
    instrument.send({ t: "effect.remove", deck, instance });
  }, [instrument, deck, instance]);

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

/** One slot of the rack: one instance's registry-driven knobs, then its rack controls. */
// One line over the cap, and what is here is one slot's props and its two rows. See 0007.
// oxlint-disable-next-line max-lines-per-function
function EffectSlot({
  instrument,
  deck,
  entry,
  index,
  last,
  playing,
}: {
  instrument: Instrument;
  deck: DeckId;
  entry: SessionEffect;
  index: number;
  last: number;
  playing: boolean;
}) {
  const plugin = effectById(entry.effect);
  // Two delays are two slots with the same plugin label, so the position disambiguates every
  // control name — an instance id is opaque and says nothing a performer could read (0030).
  const label = `${plugin.label} ${index + 1}`;

  return (
    <div className="flex flex-wrap items-end gap-2" aria-label={label}>
      <div className="type-readout text-muted-foreground">{label}</div>
      {/* A bypassed effect keeps its knobs live: the values it comes back at are set here. */}
      <div
        className={
          entry.bypassed
            ? "flex flex-wrap items-end gap-2 opacity-50"
            : "flex flex-wrap items-end gap-2"
        }
      >
        {plugin.params.map((param) => (
          <ParameterKnob
            key={param.id}
            instrument={instrument}
            deck={deck}
            instance={entry.id}
            name={label}
            param={param.id}
            value={paramIn(entry.params, param.id)}
            lane={(isAutomationParam(param.id) ? entry.automation[param.id] : undefined) ?? null}
            playing={playing}
          />
        ))}
      </div>
      <SlotControls
        instrument={instrument}
        deck={deck}
        instance={entry.id}
        label={label}
        index={index}
        last={last}
        bypassed={entry.bypassed}
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
  return (
    <section className="flex flex-wrap items-end gap-4" aria-label={`Deck ${deck} effects`}>
      <div className="type-eyebrow text-muted-foreground">effects</div>
      {state.effects.map((entry, index) => (
        <EffectSlot
          key={entry.id}
          instrument={instrument}
          deck={deck}
          entry={entry}
          index={index}
          last={state.effects.length - 1}
          playing={state.playing}
        />
      ))}
      {EFFECTS.map((effect) => (
        <AddEffectButton key={effect.id} instrument={instrument} deck={deck} effect={effect.id} />
      ))}
    </section>
  );
}
