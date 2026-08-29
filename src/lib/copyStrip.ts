/**
 * @role The words a written part's row says: the sentence over it, what each of the three numbers
 *   on a cell is called, and the gestures that add and take one away. Beside src/lib/copy.ts
 *   rather than in it because that file is at the hard cap (0045, the reason src/lib/copyKnobs.ts
 *   is where it is).
 * @instead What a cell *is*, and the bound each of these words sits under →
 *   src/lib/playerStrip.ts. The row itself → src/ui/PlayerStrip.tsx. The card's own four box
 *   headings, which this is deliberately not one of — the row is drawn in a part's fold and never
 *   on the card, and `PLAYER_GROUP_LABELS` is what the card is made of → src/lib/copy.ts, which is
 *   also every other word the interface says.
 */

/** The eyebrow over the box, a question the way the card's own four are (0059, 0173). */
export const PLAYER_STRIP_LABEL = "What It Plays";

/**
 * How to read the row, in one sentence: what a cell is, what the three numbers on it are, and the
 * one thing a glance has to know — that writing a row takes the dials under it over, and clearing
 * it hands them back (0188). Said once here, on the box's own eyebrow, for the reason the scope's
 * sentence is said on its (0080).
 */
export const PLAYER_STRIP_TOOLTIP = `Each cell is one landing: the slot of the loop it reads, how many times it sounds there, and how long it waits after. The row plays left to right and comes round for as long as the part lasts, and the number between two cells is the jump from one to the next. A part with a row plays that row — the dials that would have drawn one are the row's while it stands, and clearing the row gives them back.`;

/** What the three numbers on a cell are called, one word each the way every caption is (0059). */
export const PLAYER_STRIP_LABELS = {
  slot: "Slot",
  /** Not "Repeats": the dial by that name rolls a count, and this one *is* the count (0135). */
  repeats: "Times",
  /** Not "Rest", for the same reason — the Rest dial is the other author of this number (0163). */
  rest: "Wait",
} as const;

/** The gestures on the row, each named after what it leaves behind rather than what it does. */
export const PLAYER_STRIP_ADD = "Add Cell";
export const PLAYER_STRIP_REMOVE = "Remove Cell";
export const PLAYER_STRIP_SELECT = "Edit Cell";

/** What the box says while nobody has written a row: the part is drawn, which is not a failure. */
export const PLAYER_STRIP_EMPTY = "Drawn by the dials. Add a cell to write this part instead.";

/** One cell, read as it is drawn on it: the slot, the count and the wait after it, in that order. */
export const stripReadout = (slot: number, repeats: number, rest: number): string =>
  `${String(slot).padStart(2, "0")} ×${repeats}${rest > 0 ? ` ·${rest}` : ""}`;

/** The jump between two cells, signed, on the ring the grid is: shown between them on the row. */
export const stripJump = (from: number, to: number, slots: number): string => {
  const move = (((to - from) % slots) + slots) % slots;
  // Read the short way round, the way a walk that wrapped the top of the grid reads negative: a
  // jump of fifteen on a grid of sixteen is one slot back and is read as one (0162).
  const short = move > slots / 2 ? move - slots : move;
  return short > 0 ? `+${short}` : String(short);
};
