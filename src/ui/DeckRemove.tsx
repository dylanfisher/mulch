/**
 * @role One deck's remove control, and the question a playing deck is asked first.
 * @instead What removal actually does → src/app/execute.ts. The guard here is presentation
 *   only: `deck.remove` still removes a playing deck, so ./scripts/drive and the seam never
 *   learn a confirmation step.
 */

import { useCallback } from "react";

import { ACTION_TOOLTIPS, yardLabel } from "@/lib/copy";
import type { Instrument } from "@/app/facade";
import type { DeckId } from "@/state/store";
import { Button } from "@/ui/components/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/ui/components/popover";
import { ACTION_ICONS } from "@/ui/icons";
import { Says } from "@/ui/Says";

export function DeckRemove({
  instrument,
  deck,
  playing,
}: {
  instrument: Instrument;
  deck: DeckId;
  playing: boolean;
}) {
  const label = `Remove ${yardLabel(deck)}`;
  const onRemove = useCallback(() => {
    instrument.send({ t: "deck.remove", deck });
  }, [instrument, deck]);

  // Stopped: the press is the removal, because there is nothing to lose by it.
  if (!playing) {
    return (
      <Says what={ACTION_TOOLTIPS.remove}>
        <Button size="icon-xs" variant="ghost" aria-label={label} onClick={onRemove}>
          <ACTION_ICONS.remove />
        </Button>
      </Says>
    );
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button size="icon-xs" variant="ghost" aria-label={label}>
            <ACTION_ICONS.remove />
          </Button>
        }
      />
      <PopoverContent side="bottom" align="end" className="w-56">
        <PopoverTitle>{`${yardLabel(deck)} Is Playing`}</PopoverTitle>
        <Button
          size="xs"
          variant="destructive"
          aria-label={`Confirm Remove ${yardLabel(deck)}`}
          onClick={onRemove}
        >
          <ACTION_ICONS.remove data-icon="inline-start" />
          Remove Anyway
        </Button>
      </PopoverContent>
    </Popover>
  );
}
