/**
 * @role The add-an-effect control: a popover listing the registry's entries with the icon each
 *   one declares, so an effect joins the picker by existing rather than by a button being added
 *   here (0016, 0056).
 * @instead What an effect's icon is → its own plugin file in src/audio/effects/. What adding one
 *   does → src/app/execute.ts; this sends the ordinary `effect.add` and nothing else.
 */

import { useCallback } from "react";

import { YARD } from "@/lib/copy";
import type { Instrument } from "@/app/facade";
import { EFFECTS } from "@/audio/effects/registry";
import type { DeckId } from "@/state/store";
import { Button } from "@/ui/components/button";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/ui/components/popover";
import { ACTION_ICONS } from "@/ui/icons";

function AddEffectItem({
  instrument,
  deck,
  effect,
}: {
  instrument: Instrument;
  deck: DeckId;
  effect: (typeof EFFECTS)[number];
}) {
  // A rack may hold any number of instances of one entry, so this item is never spent: it mints
  // a fresh opaque id every press, the way the deck rack mints a deck id (0029, 0030).
  const add = useCallback(() => {
    instrument.send({ t: "effect.add", deck, id: crypto.randomUUID(), effect: effect.id });
  }, [instrument, deck, effect]);
  const Icon = effect.icon;

  return (
    <PopoverClose
      render={
        <Button
          size="sm"
          variant="ghost"
          className="justify-start"
          aria-label={`Add ${effect.label} to ${YARD} ${deck}`}
          onClick={add}
        >
          <Icon data-icon="inline-start" />
          {effect.label}
        </Button>
      }
    />
  );
}

export function EffectPicker({ instrument, deck }: { instrument: Instrument; deck: DeckId }) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button size="sm" variant="outline" aria-label={`Add an effect to ${YARD} ${deck}`}>
            <ACTION_ICONS.add data-icon="inline-start" />
            add effect
          </Button>
        }
      />
      {/* Opens instantly: this popup's entries are clicked by ./scripts/drive, and waiting out a
          100ms enter and exit costs the gate ~450ms for one scenario (0056). */}
      <PopoverContent side="bottom" align="start" className="w-56 duration-0">
        <PopoverTitle>{`Add to ${YARD} ${deck}`}</PopoverTitle>
        {EFFECTS.map((effect) => (
          <AddEffectItem key={effect.id} instrument={instrument} deck={deck} effect={effect} />
        ))}
      </PopoverContent>
    </Popover>
  );
}
