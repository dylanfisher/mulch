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

/**
 * How the two halves of a name are joined — once, so a fresh boot, a yard's draw and an effect
 * instance's draw agree forever on what a name built from two pools looks like.
 */
const twoPartName = (adjective: string, noun: string): string => `${adjective} ${noun}`;

/**
 * Draw one yard's emoji and one yard's name. Both are called from the call site that mints the
 * id (`src/ui/App.tsx`) and travel in `deck.add`, because a reducer that drew its own would make
 * replay, restore and the fingerprint non-deterministic (0057). What is declared here is the
 * pools and the shape of the result; when to draw stays the caller's.
 */
export const mintYardEmoji = (): string => pick(YARD_EMOJI);
export const mintYardName = (): string => twoPartName(pick(YARD_ADJECTIVES), pick(YARD_PLANTS));

/**
 * The name the one deck a fresh session boots with carries: a draw like any other yard's, taken
 * once as this module loads so every store a boot creates agrees on it. The emoji beside it stays
 * the pool's first — the name is a draw, the house is not (P47).
 */
export const INITIAL_YARD_NAME = mintYardName();

/** The two pools one kind of effect names its instances from — an adjective and a noun. */
export type NamePools = {
  /** What that kind of effect does to the sound, said as a word: one half of every name. */
  adjectives: readonly [string, ...string[]];
  /** The garden thing it is likened to. Disjoint across effects, which is what makes a name say
   *  which kind of thing it names when it is read on its own. */
  nouns: readonly [string, ...string[]];
};

/**
 * The pools each effect type's instances are named from, keyed by the registry's own effect id.
 * Two pools multiplied rather than one flat list of pairs, the way a yard's name already is
 * (P55): a rack of five delays runs out of distinct readings from eight fixed pairs and does not
 * from six adjectives times six nouns. The adjectives say what that kind of effect does — a
 * delay's about distance and return, a filter's about narrowing, an eq's about shaping — and the
 * noun pools are disjoint by construction, so a delay and a filter can never draw the same name.
 *
 * Keyed by plain string because `EffectId` lives in `src/audio` and lib may not import it
 * (docs/map.md); that every registered effect has both pools is checked where both are reachable,
 * in `src/audio/effects/registry.test.ts`.
 */
export const EFFECT_NAMES: Record<string, NamePools> = {
  delay: {
    adjectives: ["Far", "Returning", "Echoing", "Trailing", "Distant", "Answering"],
    nouns: ["Well", "Barrel", "Steps", "Hollow", "Path", "Fence"],
  },
  filter: {
    adjectives: ["Narrow", "Close", "Shaded", "Sifted", "Woven", "Tight"],
    nouns: ["Hedge", "Trellis", "Sieve", "Gate", "Screen", "Lattice"],
  },
  eq: {
    adjectives: ["Tilted", "Raised", "Banked", "Carved", "Terraced", "Levelled"],
    nouns: ["Bed", "Spiral", "Trap", "Border", "Mound", "Verge"],
  },
  compressor: {
    adjectives: ["Pressed", "Packed", "Tamped", "Rolled", "Bound", "Held"],
    nouns: ["Bale", "Press", "Clamp", "Roller", "Sack", "Crate"],
  },
  reverb: {
    adjectives: ["Open", "Wide", "Vaulted", "Drifting", "Washed", "Carrying"],
    nouns: ["Barn", "Chamber", "Silo", "Grotto", "Cloister", "Meadow"],
  },
};

/**
 * A string folded to a non-negative integer — FNV-1a, in the 32 bits `Math.imul` gives exactly.
 * It exists to index a pool — or a waveform (src/lib/moire.ts) — from an opaque id, so what it
 * needs is to be the same everywhere and to spread short ids that differ in one character; it is
 * not a checksum and nothing durable rests on it.
 */
export function fold(text: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash = Math.imul(hash ^ text.codePointAt(index)!, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * The name one effect instance wears: one adjective and one noun from its effect's two pools,
 * both indexed by the instance's own durable id (0076). The draw is a pure function of that id
 * rather than a `Math.random()` at the call site, so the name is the same after a drag, a reload
 * and an archive without a durable field to carry it, and replay stays deterministic (0057). An
 * effect with no pools is a registry entry this file was never told about, which is a missing
 * pool and not a nameless effect.
 *
 * The two indices come from one fold: the remainder picks the adjective and the quotient picks
 * the noun, so the halves move independently and the whole product of the pools is reachable.
 */
export function effectName(effect: string, instance: string): string {
  // Asked of the record itself, not of what it inherits: `EFFECT_NAMES.constructor` is a function
  // no pools declared, and drawing from it would read `undefined` as a name (principle 5).
  const pools = Object.hasOwn(EFFECT_NAMES, effect) ? EFFECT_NAMES[effect] : undefined;
  if (pools === undefined) throw new Error(`no name pool for effect ${effect}`);
  const hash = fold(instance);
  const { adjectives, nouns } = pools;
  const adjective = adjectives[hash % adjectives.length] ?? adjectives[0];
  const noun = nouns[Math.floor(hash / adjectives.length) % nouns.length] ?? nouns[0];
  return twoPartName(adjective, noun);
}

/**
 * What the Export Audio dialog offers as a filename: the yard being exported, said the way the
 * interface says it, and the bytes it is playing. Derived every time the dialog opens and stored
 * nowhere — a filename is not session state (P40). A yard playing no blob is its name alone.
 */
export const exportAudioName = (yard: string, blobId: string | null): string =>
  blobId === null ? yard : `${yard} ${blobId}`;

/**
 * What each debug counter counts and in what unit, keyed by the name that counter is labelled
 * with in `src/ui/DebugConsole.tsx`. A four-letter label over a number says neither, and the two
 * counters a browser can decline to answer read as a dash, which is a reading nobody guesses
 * (0063) — so the sentence says that too. The words live here with the rest of the copy rather
 * than inline at the label, and that every counter has exactly one is checked in the console's
 * own test.
 */
export const COUNTER_TOOLTIPS: Record<string, string> = {
  frame: "How long the last frame's work took, in milliseconds. Measured only while this is open.",
  events: "Events stamped since the instrument booted.",
  dropped: "Events that have fallen out of the ring, and so out of an exported log.",
  queued: "Scheduled envelopes still waiting for a pump.",
  decoding: "Loads the browser is still decoding into audio.",
  analyzing: "Decoded buffers the analysis worker has not answered for yet.",
  context: "What the audio clock is doing, or none for a session running with no graph at all.",
  clock: "The audio clock every envelope is scheduled against, in seconds.",
  audio:
    "The audio thread's average load, as a percent. A dash means nothing is measuring it yet, or this browser will not report it.",
  heap: "The JavaScript heap in megabytes. A dash means this browser does not expose it.",
  buffers: "What the decode cache's buffers weigh, in megabytes. Zero here is a measured zero.",
};

/**
 * The units a recurrence is said in, smallest first, each with what one of it is worth in
 * seconds. The scale escalates past the point where a duration is a duration: a pattern of a few
 * lanes over one loop lines up again on the order of geological time, and the honest answer is
 * the comparative rather than a figure nobody can hold. It is said straight — one unit and one
 * figure, no breakdown, and no unit named twice. A light year is a distance; it is on the scale
 * because that is where this number has got to, and the last entry is what the estimate reads
 * once it has stopped being one (src/lib/moire.ts).
 */
export const DURATION_SCALE = [
  ["seconds", 1],
  ["minutes", 60],
  ["hours", 3600],
  ["days", 86_400],
  ["months", 2_629_746],
  ["years", 31_556_952],
  ["centuries", 3_155_695_200],
  ["millennia", 31_556_952_000],
  ["geological epochs", 157_784_760_000_000],
  ["light years", 9_460_730_472_580_800],
  ["the age of the universe", 435_130_167_840_000_000],
] as const satisfies readonly [DurationUnit, ...DurationUnit[]];

/** One rung of that scale: what it is called, and what one of it is worth in seconds. */
export type DurationUnit = readonly [unit: string, secs: number];

/** What the moiré strip and the overlay it opens are called on screen, Titlecase per (0059). */
export const MOIRE_STRIP = "Drift";
export const MOIRE_OVERLAY = "Drift In Full";
