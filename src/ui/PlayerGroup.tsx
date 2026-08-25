/**
 * @role One bordered box of the mulcher card's dials, under the eyebrow saying which question its
 *   controls answer (0173). Four of these are the card's body, in place of the one flex-wrap that
 *   stood every control at the same distance from every other.
 * @instead The words on them → src/lib/copy.ts. Which control belongs to which box, and the one
 *   `deck.player` they all patch → src/ui/PlayerCard.tsx. A dial itself → src/ui/PlayerDial.tsx.
 */
import { Children, type ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * How many controls a box holds before it stacks rather than runs on. Two dials read as a pair at
 * any width; three and up read as a row that has to be counted, and the card is far wider than any
 * one box needs — so a box that has more than this fills downward first and stays a block the eye
 * takes in whole (0173).
 */
const DEEP_ABOVE = 2;

export function PlayerGroup({
  label,
  children,
}: {
  /** The eyebrow over the box: the question its controls answer, from src/lib/copy.ts. */
  label: string;
  /** The controls themselves, laid out in the order the card declares them. */
  children: ReactNode;
}) {
  // Column-major over two rows, which is what "two deep" is: the grid fills the first column top
  // to bottom and then starts another, so a box of six is three columns of two rather than a row
  // of six with a hole under it. `Children.count` rather than a flag on each box — how deep a box
  // stands is a consequence of how many dials it holds, and a flag would be a second answer to
  // that a hand could set wrong (principle 1).
  const deep = Children.count(children) > DEEP_ABOVE;
  return (
    // The card's own frame at the card's own weight (src/ui/components/card.tsx): a box inside a
    // card is not a second card, so it wears the ring rather than a border of its own invention.
    <div data-slot="player-group" className="flex flex-col gap-1 p-2 ring-1 ring-foreground/10">
      <span className="type-eyebrow text-muted-foreground">{label}</span>
      <div
        className={cn("grid grid-flow-col items-end gap-2", deep ? "grid-rows-2" : "grid-rows-1")}
      >
        {children}
      </div>
    </div>
  );
}
