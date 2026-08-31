/**
 * @role The pools each kind of effect names its instances from, and the draw that turns an
 *   instance's own id into one of those names.
 * @instead The instrument's other nouns — yards, actions, transport — → src/lib/copy.ts, which this
 *   was the middle of until that file came within twenty lines of the hard cap (0045).
 */
import { fold, twoPartName, words } from "./copy.ts";

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
 * from twelve adjectives times twelve nouns. The adjectives say what that kind of effect does — a
 * delay's about distance and return, a filter's about narrowing, an eq's about shaping — and the
 * noun pools are disjoint by construction, so a delay and a filter can never draw the same name.
 * Twelve of each is 144 readings per kind, so two instances of one kind reading alike is expected
 * somewhere past the twelfth rather than at the seventh (0149) — further than any rack goes.
 *
 * Keyed by plain string because `EffectId` lives in `src/audio` and lib may not import it
 * (docs/map.md); that every registered effect has both pools is checked where both are reachable,
 * in `src/audio/effects/registry.test.ts`.
 */
export const EFFECT_NAMES: Record<string, NamePools> = {
  delay: {
    adjectives: words(
      "Far Returning Echoing Trailing Distant Answering Repeating Lagging Ringing Bouncing Doubling Following",
    ),
    nouns: words(
      "Well Barrel Steps Hollow Path Fence Corridor Ravine Cistern Landing Alley Cavern",
    ),
  },
  filter: {
    adjectives: words(
      "Narrow Close Shaded Winnowed Woven Tight Combed Strained Pinched Cropped Slotted Threaded",
    ),
    nouns: words("Hedge Trellis Sieve Gate Screen Lattice Grille Mesh Weir Vent Louvre Riddle"),
  },
  eq: {
    adjectives: words(
      "Tilted Raised Banked Carved Terraced Levelled Leaning Graded Tiered Shaped Dished Stepped",
    ),
    nouns: words("Bed Spiral Trap Border Mound Verge Ridge Trough Plot Slope Swale Shelf"),
  },
  compressor: {
    adjectives: words(
      "Flattened Packed Tamped Crushed Cramped Held Squeezed Compact Weighted Cinched Firm Loaded",
    ),
    nouns: words("Bale Press Clamp Roller Sack Crate Vice Barrow Bundle Churn Mangle Kiln"),
  },
  reverb: {
    adjectives: words(
      "Open Wide Vaulted Drifting Washed Carrying Hollowed Spacious Cavernous Billowing Airy Lofted",
    ),
    nouns: words(
      "Barn Chamber Silo Grotto Cloister Meadow Hall Quarry Cellar Courtyard Basin Glasshouse",
    ),
  },
  tape: {
    adjectives: words(
      "Worn Warped Slackened Smudged Aged Slipping Faded Creased Wavering Sagging Dusted Grainy",
    ),
    nouns: words("Reel Spool Ribbon Furrow Coil Loam Groove Thread Winder Strand Bobbin Rut"),
  },
  pop: {
    adjectives: words(
      "Bright Sprung Quickened Crisp Snapping Lifted Keen Springing Sharpened Brisk Startled Perked",
    ),
    nouns: words("Husk Pod Shoot Snap Spark Bud Crackle Kernel Sprig Flint Bristle Burr"),
  },
  scatter: {
    adjectives: words(
      "Scattered Strewn Broken Flung Torn Sprinkled Shed Tumbled Sifted Chopped Loosed Spilled",
    ),
    nouns: words(
      "Chaff Shard Clipping Litter Scree Gravel Thatch Windrow Sweepings Grit Splinter Siftings",
    ),
  },
  // The one entry that names a run of other effects rather than a sound of its own, so its
  // adjectives say how a thing grows and its nouns are the places growing happens (0081, 0204).
  automator: {
    adjectives: words(
      "Creeping Turning Seeding Drifting Spreading Rotating Volunteer Sprawling Wandering Unruly Roving Shifting",
    ),
    nouns: words(
      "Wilding Runner Sprawl Volunteer Copse Bramble Windfall Allotment Weald Spinney Coppice Glade",
    ),
  },
};

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
