/**
 * @role The door at a jump dial's corner: the framed plus, and the popover of further amounts
 *   behind it (0121). Four dials on the jumps card carry one — the repeats, the burst's vary, the
 *   rest and the hold — so the frame they share is declared here once and the amounts stay each
 *   menu's own (principle 3, P87, 0135).
 * @instead Which amounts each door holds → src/ui/PlayerRepeats.tsx, src/ui/PlayerVary.tsx,
 *   src/ui/PlayerRest.tsx, src/ui/PlayerRate.tsx. The one `deck.player` they all patch →
 *   src/ui/PlayerCard.tsx.
 */
import type { ReactNode } from "react";

import { yardLabel } from "@/lib/copy";
import type { DeckId } from "@/state/store";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/ui/components/popover";
import { ACTION_ICONS } from "@/ui/icons";
import { INSTANT_POPUP } from "@/ui/shell";

export function PlayerMore({
  deck,
  title,
  dial,
  children,
}: {
  deck: DeckId;
  /** What the menu is called: the popover's title and the name of the control that opens it. */
  title: string;
  /** The dial the marker sits on the corner of, drawn by whoever declares its range. */
  dial: ReactNode;
  /** The amounts behind it, laid out the way a card's row of dials is. */
  children: ReactNode;
}) {
  return (
    <div className="relative">
      {dial}
      {/* Where a lane's preview marker sits on a parameter knob, one control along
          (src/ui/ParameterKnob.tsx), with two differences these need. It is always drawn rather
          than waiting on a held modifier, because it is the only way to the amounts behind it and
          a control nothing can open is not a control. And it is the framed plus rather than that
          marker's own dot: a dot beside a dial reads as something the dial is, and a plus in a
          frame reads as more of it behind a press, which is what this one is (0121). Drawn in the
          instrument's own ink and in one colour only — a door does not report the state of what is
          behind it. The pointer says the same to a hand already moving. */}
      <Popover>
        <PopoverTrigger
          aria-label={`${yardLabel(deck)} ${title}`}
          className="absolute -top-0.5 -right-0.5 cursor-pointer text-foreground"
        >
          <ACTION_ICONS.more className="size-3.5" />
        </PopoverTrigger>
        {/* Opens instantly, for the reason the effect picker's does: ./scripts/drive clicks into
            this popup, and waiting out an enter and an exit costs the gate a scenario's worth of
            time for nothing a person would notice (0056, src/ui/EffectPicker.tsx). */}
        <PopoverContent side="top" align="end" className={`w-auto ${INSTANT_POPUP}`}>
          <PopoverTitle>{title}</PopoverTitle>
          <div className="flex items-end gap-2">{children}</div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
