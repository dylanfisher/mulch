/**
 * @role One bordered box of the mulcher card's dials, under the eyebrow saying which question its
 *   controls answer (0173). Four of these are the card's body, in place of the one flex-wrap that
 *   stood every control at the same distance from every other. Each is full width and they stack,
 *   so an opened door's amounts have somewhere to land beside the dial they belong to (P135).
 * @instead The words on them → src/lib/copy.ts. Which control belongs to which box, and the one
 *   `deck.player` they all patch → src/ui/PlayerCard.tsx. A dial itself → src/ui/PlayerDial.tsx.
 *   The door whose amounts join this flow when it opens → src/ui/PlayerMore.tsx.
 */
import type { ReactNode } from "react";

export function PlayerGroup({
  label,
  children,
}: {
  /** The eyebrow over the box: the question its controls answer, from src/lib/copy.ts. */
  label: string;
  /** The controls themselves, laid out in the order the card declares them. */
  children: ReactNode;
}) {
  return (
    // The card's own frame at the card's own weight (src/ui/components/card.tsx): a box inside a
    // card is not a second card, so it wears the ring rather than a border of its own invention.
    <div
      data-slot="player-group"
      className="flex w-full flex-col gap-1 p-2 ring-1 ring-foreground/10"
    >
      <span className="type-eyebrow text-muted-foreground">{label}</span>
      {/* One row that wraps, at the full width of the card rather than in a column of its own.
          0173's "a box of more than two stands two deep" is retired here and the reason is P135's:
          that rule counted `Children`, and once a door's amounts are siblings of the dial they
          belong to, the number of children is no longer the number of dials — so the rule has no
          derivable input left. What it was buying is bought better by the boxes themselves: a
          named, full-width block per question, filling across and wrapping, rather than a column
          count nothing on screen explains. */}
      <div className="flex flex-wrap items-end gap-2">{children}</div>
    </div>
  );
}
