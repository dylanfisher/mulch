/**
 * @role The words the interface says for the instrument's own nouns, and the emoji pool a yard is
 *   named from — declared once here so no surface types the noun itself (plan P28).
 * @instead A command name, a state field or a durable key → those stay `deck`: this file is what
 *   the user reads, not what the code is called.
 */

/**
 * What a deck is called on screen. Every label, title and heading builds from this one word, and
 * it is Titlecase because every label in the instrument is (P29).
 */
export const YARD = "Yard";

/**
 * One yard, named the way a label names it: the noun and the id, in the case a reader sees. The
 * pattern lives here rather than at the twenty call sites that used to write `${YARD} ${deck}`,
 * so "Yard A" is one string built one way — a deck id is opaque and lower case is not part of it
 * (0029).
 */
export function yardLabel(deck: string): string {
  return `${YARD} ${deck.toUpperCase()}`;
}

/**
 * The pool a yard's emoji is drawn from when it is added: fixed, house-and-garden, and small
 * enough that repeats across many yards are expected. The emoji names a yard, it does not
 * identify it — the id does that (0029).
 */
export const YARD_EMOJI = ["🏡", "🌴", "🌵", "🌻", "🌳", "🪴", "🍅", "🐝", "🦋", "🌷"] as const;

/** The emoji the one deck a fresh session boots with carries — the pool's first, not a draw. */
export const INITIAL_YARD_EMOJI = YARD_EMOJI[0];
