/**
 * @role The words the interface says for the instrument's own nouns, and the pools a yard and an
 *   effect instance are named from — declared once here so no surface types the noun itself
 *   (plan P28).
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

/**
 * The name the one deck a fresh session boots with carries: a draw like any other yard's, taken
 * once as this module loads so every store a boot creates agrees on it. The emoji beside it stays
 * the pool's first — the name is a draw, the house is not (P47).
 */
export const INITIAL_YARD_NAME = mintYardName();

/**
 * The pool each effect type's instances are named from, keyed by the registry's own effect id.
 * Themed to the yard and to what that effect does, and disjoint by construction — a delay and a
 * filter can never draw the same name, so a name read on its own says which kind of thing it is.
 *
 * Keyed by plain string because `EffectId` lives in `src/audio` and lib may not import it
 * (docs/map.md); that every registered effect has a pool is checked where both are reachable,
 * in `src/audio/effects/registry.test.ts`.
 */
export const EFFECT_NAMES: Record<string, readonly [string, ...string[]]> = {
  delay: [
    "Echo Well",
    "Rain Barrel",
    "Stone Steps",
    "Hollow Log",
    "Wind Chime",
    "Bird Bath",
    "Long Path",
    "Old Fence",
  ],
  filter: [
    "Hedge Row",
    "Trellis Screen",
    "Shade Sail",
    "Slat Gate",
    "Leaf Mould",
    "Gravel Sieve",
    "Pond Skim",
    "Cold Frame",
  ],
  eq: [
    "Sun Trap",
    "Herb Spiral",
    "Flower Bed",
    "Rock Garden",
    "Compost Heap",
    "Potting Bench",
    "Espalier",
    "Terrace Wall",
  ],
};

/**
 * Draw one effect instance's name. Like a yard's, it is drawn at the call site that mints the id
 * and travels in the command, never inside a reducer (0057). An effect with no pool is a registry
 * entry this file was never told about, which is a missing pool and not a nameless effect.
 */
export function mintEffectName(effect: string): string {
  // Asked of the record itself, not of what it inherits: `EFFECT_NAMES.constructor` is a function
  // no pool declared, and drawing from it would mint `undefined` as a name (principle 5).
  const pool = Object.hasOwn(EFFECT_NAMES, effect) ? EFFECT_NAMES[effect] : undefined;
  if (pool === undefined) throw new Error(`no name pool for effect ${effect}`);
  return pick(pool);
}

/**
 * What the Export Audio dialog offers as a filename: the yard being exported, said the way the
 * interface says it, and the bytes it is playing. Derived every time the dialog opens and stored
 * nowhere — a filename is not session state (P40). A yard playing no blob is its name alone.
 */
export const exportAudioName = (yard: string, blobId: string | null): string =>
  blobId === null ? yard : `${yard} ${blobId}`;
