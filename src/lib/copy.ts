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

/** What the gesture that writes the session archive is called on screen, Titlecase per (0059). */
export const EXPORT_SESSION = "Export Session";

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

/**
 * The two halves a yard's name is drawn from: an adjective and a plant, joined with a space and
 * already Titlecase because every label in the instrument is (0059). Small pools, so repeats are
 * expected — the name names a yard, the id identifies it (0029).
 */
export const YARD_ADJECTIVES = [
  "Quiet",
  "North",
  "Low",
  "Bright",
  "Slow",
  "Wild",
  "Deep",
  "Warm",
  "Far",
  "Still",
] as const;

/** The other half. House-and-garden, like the emoji pool it is drawn beside. */
export const YARD_PLANTS = [
  "Fern",
  "Thicket",
  "Clover",
  "Willow",
  "Bramble",
  "Rush",
  "Sorrel",
  "Cedar",
  "Nettle",
  "Moss",
] as const;

/**
 * One draw from one fixed pool — the whole of the randomness a yard's decorations involve. The
 * pool is a non-empty tuple, so the entry the index lands on is the first one or a real member
 * and never undefined.
 */
const pick = <T>(pool: readonly [T, ...T[]]): T =>
  pool[Math.floor(Math.random() * pool.length)] ?? pool[0];

/** How the two halves of a name are joined — once, so a fresh boot and a draw agree forever. */
const yardName = (adjective: string, plant: string): string => `${adjective} ${plant}`;

/**
 * Draw one yard's emoji and one yard's name. Both are called from the call site that mints the
 * id (`src/ui/App.tsx`) and travel in `deck.add`, because a reducer that drew its own would make
 * replay, restore and the fingerprint non-deterministic (0057). What is declared here is the
 * pools and the shape of the result; when to draw stays the caller's.
 */
export const mintYardEmoji = (): string => pick(YARD_EMOJI);
export const mintYardName = (): string => yardName(pick(YARD_ADJECTIVES), pick(YARD_PLANTS));

/** The name the one deck a fresh session boots with carries — each pool's first, not a draw. */
export const INITIAL_YARD_NAME = yardName(YARD_ADJECTIVES[0], YARD_PLANTS[0]);
