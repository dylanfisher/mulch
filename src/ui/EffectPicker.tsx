/**
 * @role The add-an-effect control: a popover listing the registry's entries with the icon each
 *   one declares, so an effect joins the picker by existing rather than by a button being added
 *   here (0016, 0056).
 * @instead What an effect's icon is → its own plugin file in src/audio/effects/. What adding one
 *   does → src/app/execute.ts; this sends the ordinary `effect.add` and nothing else.
 */

import { useCallback } from "react";

import { yardLabel } from "@/lib/copy";
import type { Instrument } from "@/app/facade";
import { EFFECTS } from "@/audio/effects/registry";
import type { DeckId } from "@/state/store";
import { addEffectCommand } from "@/ui/actions";
import { Button } from "@/ui/components/button";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/ui/components/popover";
import { ACTION_ICONS } from "@/ui/icons";
import { INSTANT_POPUP } from "@/ui/shell";

function AddEffectItem({
  instrument,
  deck,
  effect,
}: {
  instrument: Instrument;
  deck: DeckId;
  effect: (typeof EFFECTS)[number];
}) {
  // A rack may hold any number of instances of one entry, so this item is never spent: the
  // construction in src/ui/actions.ts mints a fresh opaque id every press (0029, 0030), and the
  // palette's Add-an-Effect entries reach that same construction (P41).
  const add = useCallback(() => {
    instrument.send(addEffectCommand(deck, effect.id));
  }, [instrument, deck, effect]);
  const Icon = effect.icon;

  return (
    <PopoverClose
      render={
        <Button
          size="sm"
          variant="ghost"
          className="justify-start"
          aria-label={`Add ${effect.label} to ${yardLabel(deck)}`}
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
          <Button size="sm" variant="outline" aria-label={`Add an Effect to ${yardLabel(deck)}`}>
            <ACTION_ICONS.add data-icon="inline-start" />
            Add Effect
          </Button>
        }
      />
      {/* Opens instantly: this popup's entries are clicked by ./scripts/drive, and waiting out a
          100ms enter and exit costs the gate ~450ms for one scenario (0056). */}
      <PopoverContent side="bottom" align="start" className={`w-56 ${INSTANT_POPUP}`}>
        <PopoverTitle>{`Add to ${yardLabel(deck)}`}</PopoverTitle>
        {EFFECTS.map((effect) => (
          <AddEffectItem key={effect.id} instrument={instrument} deck={deck} effect={effect} />
        ))}
      </PopoverContent>
    </Popover>
  );
}
