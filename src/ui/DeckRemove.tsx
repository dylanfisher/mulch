/**
 * @role One deck's remove control, and the question a playing deck is asked first.
 * @instead What removal actually does → src/app/execute.ts. The guard here is presentation
 *   only: `deck.remove` still removes a playing deck, so ./scripts/drive and the seam never
 *   learn a confirmation step.
 */

import { useCallback } from "react";

import type { Instrument } from "@/app/facade";
import type { DeckId } from "@/state/store";
import { Button } from "@/ui/components/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/ui/components/popover";
import { ACTION_ICONS } from "@/ui/icons";

export function DeckRemove({
  instrument,
  deck,
  playing,
}: {
  instrument: Instrument;
  deck: DeckId;
  playing: boolean;
}) {
  const onRemove = useCallback(() => {
    instrument.send({ t: "deck.remove", deck });
  }, [instrument, deck]);

  // Stopped: the press is the removal, because there is nothing to lose by it.
  if (!playing) {
    return (
      <Button size="icon-xs" variant="ghost" aria-label={`Remove deck ${deck}`} onClick={onRemove}>
        <ACTION_ICONS.remove />
      </Button>
    );
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button size="icon-xs" variant="ghost" aria-label={`Remove deck ${deck}`}>
            <ACTION_ICONS.remove />
          </Button>
        }
      />
      <PopoverContent side="bottom" align="end" className="w-56">
        <PopoverTitle>{`Deck ${deck} is playing`}</PopoverTitle>
        <Button
          size="xs"
          variant="destructive"
          aria-label={`Confirm remove deck ${deck}`}
          onClick={onRemove}
        >
          <ACTION_ICONS.remove data-icon="inline-start" />
          remove anyway
        </Button>
      </PopoverContent>
    </Popover>
  );
}
