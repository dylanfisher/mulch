/**
 * @role The door at a jump dial's corner: the framed plus, and the popover of further amounts
 *   behind it (0121). Seven dials on the jumps card carry one — the distance, the phrase, the
 *   repeats, the burst's vary, the rest, the hold and the arrangement — so the frame they share is
 *   declared here once and the amounts stay each menu's own (principle 3, P87, 0135).
 * @instead Which amounts each door holds → src/ui/PlayerDistance.tsx, src/ui/PlayerPhrase.tsx,
 *   src/ui/PlayerRepeats.tsx, src/ui/PlayerVary.tsx, src/ui/PlayerRest.tsx, src/ui/PlayerRate.tsx,
 *   src/ui/PlayerArrange.tsx. The one `deck.player` they all patch → src/ui/PlayerCard.tsx.
 */
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { yardLabel } from "@/lib/copy";
import type { PlayerDefaults, PlayerSpec } from "@/lib/player";
import type { DeckId } from "@/state/store";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/ui/components/popover";
import { ACTION_ICONS } from "@/ui/icons";
import type { PlayerVoiceReader } from "@/ui/PlayerDial";
import { INSTANT_POPUP } from "@/ui/shell";

/**
 * What every one of those seven doors takes. Each is the same component with a different list of
 * amounts inside it, and each spelled this list out for itself — seven copies of five paragraphs,
 * which is six more than a fact gets (principle 1). Declared here, beside the frame they all
 * share, so a prop added to a door is added once.
 */
export type PlayerDoorProps = {
  deck: DeckId;
  /**
   * What names the controls behind this door, where the card's own words would not tell them from
   * another set on screen. The empty string is the card's own, which is named by its captions and
   * its yard alone; a part's fold draws the very boxes the card draws, so with one open there are
   * two Gate dials and two Rate doors in one yard, and `aria-label` is the only thing between them
   * (0055, 0176, src/ui/PlayerDial.tsx, src/ui/PlayerPart.tsx).
   */
  named: string;
  /** The spec every dial behind the door reads and patches, which is the card's own (0089). */
  player: PlayerSpec;
  /** What each dial snaps back to on a double-click: the switch's own values (0118). */
  defaults: PlayerDefaults;
  /** The card's own patch: one `deck.player` per gesture, carrying the whole spec (0089). */
  patch: (fields: Partial<PlayerSpec>) => void;
  /** What the song is standing at, handed down from the card: every dial behind a door reads the
   *  pattern's own numbers while one plays, exactly as the dial on the row does (0157). */
  voice?: PlayerVoiceReader;
  /** Whether the card's dials are pointed at a part of its song, so every dial behind the door
   *  reads and writes that part and wears the mark saying so (0176, src/ui/PlayerDial.tsx). */
  selected?: boolean;
  /** Whether every control in the door is refused rather than absent: the card draws its whole
   *  body whether or not its switch is on, so the dial and the plus at its corner are greyed and
   *  unturnable until the module holds a spec (0121, 0173). */
  disabled?: boolean;
};

/** Where the plus sits, and how it reads when there is nothing behind it to open yet. */
const TRIGGER = "absolute -top-0.5 -right-0.5 text-foreground";

export function PlayerMore({
  deck,
  named,
  title,
  dial,
  children,
  disabled = false,
}: {
  deck: DeckId;
  /** What names this door where the yard alone would not, from `PlayerDoorProps` above. */
  named: string;
  /** What the menu is called: the popover's title and the name of the control that opens it. */
  title: string;
  /** The dial the marker sits on the corner of, drawn by whoever declares its range. */
  dial: ReactNode;
  /** The amounts behind it, laid out the way a card's row of dials is. */
  children: ReactNode;
  /** Refused rather than absent, the flag `PlayerDoorProps` above carries (0121, 0173). */
  disabled?: boolean;
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
          aria-label={`${named === "" ? yardLabel(deck) : named} ${title}`}
          disabled={disabled}
          className={cn(TRIGGER, disabled ? "opacity-50" : "cursor-pointer")}
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
