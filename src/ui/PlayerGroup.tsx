/**
 * @role One bordered box of the mulcher card's dials, under the eyebrow saying which question its
 *   controls answer (0173). Four of these are the card's body, in place of the one flex-wrap that
 *   stood every control at the same distance from every other. Each is full width and they stack,
 *   so a dial's amounts have somewhere to land beside it (P135, 0195).
 * @instead The words on them → src/lib/copy.ts. Which control belongs to which box, and the one
 *   `deck.player` they all patch → src/ui/PlayerCard.tsx. A dial itself → src/ui/PlayerDial.tsx.
 *   The run a dial and its amounts stand in → src/ui/PlayerRun.tsx.
 */
import type { ReactNode } from "react";

import { Says } from "@/ui/Says";

export function PlayerGroup({
  label,
  what,
  children,
}: {
  /** The eyebrow over the box: the question its controls answer, from src/lib/copy.ts. */
  label: string;
  /**
   * How to read the box, where the controls inside it do not each carry their own sentence — the
   * written row is the one such box, because what a cell means is one thing said once rather than
   * sixteen tooltips saying it (0188). Absent everywhere else: a box of dials is explained by the
   * dials, and an eyebrow that opened a tooltip saying nothing new would be a control that is not
   * one (0080).
   */
  what?: string;
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
      {what === undefined ? (
        <span className="type-eyebrow text-muted-foreground">{label}</span>
      ) : (
        // Reachable by a pointer and by a keyboard, which is what a sentence has to be: the same
        // call the scope's own eyebrow makes over its picture (0080, src/ui/PlayerScope.tsx).
        <Says what={what}>
          <button type="button" className="self-start type-eyebrow text-muted-foreground">
            {label}
          </button>
        </Says>
      )}
      {/* One row that wraps, at the full width of the card rather than in a column of its own.
          0173's "a box of more than two stands two deep" is retired here and the reason is P135's:
          that rule counted `Children`, and once a dial's amounts are siblings of the dial they
          belong to, the number of children is no longer the number of dials — so the rule has no
          derivable input left. What it was buying is bought better by the boxes themselves: a
          named, full-width block per question, filling across and wrapping, rather than a column
          count nothing on screen explains. */}
      <div className="flex flex-wrap items-end gap-2">{children}</div>
    </div>
  );
}
