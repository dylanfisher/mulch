/**
 * @role One dial of the jumps card and the amounts that shape what it bounds, standing beside it:
 *   the run they are drawn as, and the name those amounts wear so no two dials on the card share a
 *   word (0195). Eight dials carry one — the ground's period, the distance, the phrase, the
 *   repeats, the burst's vary, the rest, the hold and the arrangement — so the frame they share is
 *   declared here once and the amounts stay each dial's own (principle 3, P87, 0135).
 * @instead Which amounts each dial holds → src/ui/PlayerBed.tsx, src/ui/PlayerDistance.tsx,
 *   src/ui/PlayerPhrase.tsx, src/ui/PlayerRepeats.tsx, src/ui/PlayerVary.tsx,
 *   src/ui/PlayerRest.tsx, src/ui/PlayerRate.tsx, src/ui/PlayerArrange.tsx. The one `deck.player`
 *   they all patch → src/ui/PlayerCard.tsx. The box a run lands in → src/ui/PlayerGroup.tsx.
 */
import { Children, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import type { PlayerDefaults, PlayerSpec } from "@/lib/player";
import type { DeckId } from "@/state/store";
import type { PlayerVoiceReader } from "@/ui/PlayerDial";

/**
 * What every one of those eight takes. Each is the same run with a different list of amounts
 * inside it, and each spelled this list out for itself — eight copies of five paragraphs, which is
 * seven more than a fact gets (principle 1). Declared here, beside the frame they all share, so a
 * prop added to a run is added once.
 */
export type PlayerRunProps = {
  deck: DeckId;
  /**
   * What names the controls in this run, where the card's own words would not tell them from
   * another set on screen. The empty string is the card's own, which is named by its captions and
   * its yard alone; a part's fold draws the very boxes the card draws, so with a part open there
   * are two Gate dials and two Hold runs in one yard, and `aria-label` is the only thing between
   * them (0055, 0176, src/ui/PlayerDial.tsx, src/ui/PlayerPart.tsx).
   */
  named: string;
  /** The spec every dial in the run reads and patches, which is the card's own (0089). */
  player: PlayerSpec;
  /** What each dial snaps back to on a double-click: the switch's own values (0118). */
  defaults: PlayerDefaults;
  /** The card's own patch: one `deck.player` per gesture, carrying the whole spec (0089). */
  patch: (fields: Partial<PlayerSpec>) => void;
  /** What the song is standing at, handed down from the card: every amount in the run reads the
   *  pattern's own numbers while one plays, exactly as the dial it belongs to does (0157). */
  voice?: PlayerVoiceReader;
  /** Whether the card's dials are pointed at a part of its song, so every dial in the run reads
   *  and writes that part and wears the mark saying so (0176, src/ui/PlayerDial.tsx). */
  selected?: boolean;
  /** Whether every control in the run is refused rather than absent: the card draws its whole body
   *  whether or not its switch is on, so the dials are greyed and unturnable until the module holds
   *  a spec (0121, 0173). */
  disabled?: boolean;
};

/**
 * What the amounts of one run are named by: the dial they belong to, under whatever already names
 * the set they are in. A caption is a dial's whole accessible name (src/ui/Knob.tsx), and with
 * every amount on the card at once a chance called Chance is one of six sliders nothing could tell
 * apart — so an amount is named for the dial it shapes and the words on screen stay the one word
 * each (0195, src/lib/copyKnobs.ts). Handed to a dial as its `named` prefix, so a part's fold puts
 * the part in front of both.
 */
export const runName = (named: string, title: string): string =>
  named === "" ? title : `${named} ${title}`;

/**
 * The wash a run wears: the dial and each of its amounts, side by side in the box's own flow. It is
 * a tint and not a border, because `PlayerGroup` already says a box inside a card is not a second
 * card — and because these are siblings of that box's flex rather than one node, a ring would have
 * to be drawn once per element and would read as four boxes (0173, P135). Rounded only at the ends
 * of the run, so the tint reads as one bracket.
 */
const RUN = "flex flex-col justify-end self-stretch bg-muted/40 px-1.5 py-1";

/**
 * A dial and its amounts, laid out as ordinary siblings of the box's own flex: the dial first, then
 * one wrapper per amount, all of them tinted as one bracket. Nothing is behind anything — every
 * number the module declares is on the card, and what says which dial an amount belongs to is the
 * bracket it stands in and the name it wears (0195).
 *
 * A fragment and not a box: the amounts wrap with the dial and stand at the same baseline as every
 * other dial in the box. A Fragment paints neither a ring nor a tint, so the run marks itself per
 * element rather than growing a nested bordered box, which a box inside a card may not be (0173).
 */
export function PlayerRun({
  title,
  dial,
  children,
}: {
  /** What the run is called: the name of the dial its amounts shape, which is what they are named
   *  after (`runName`) and what a test and the harness find the run by. */
  title: string;
  /** The dial the amounts belong to, drawn by whoever declares its range. */
  dial: ReactNode;
  /** The amounts themselves, laid out the way a card's row of dials is. */
  children: ReactNode;
}) {
  const amounts = Children.count(children);
  return (
    <>
      <div data-run={title} className={cn(RUN, "rounded-l-sm")}>
        {dial}
      </div>
      {Children.map(children, (amount, at) => (
        <div data-run={title} className={cn(RUN, at === amounts - 1 && "rounded-r-sm")}>
          {amount}
        </div>
      ))}
    </>
  );
}
