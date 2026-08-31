/**
 * @role The pools each kind of effect — and each tier of an arrangement — names its instances
 *   from, and the draw that turns an instance's own id into one of those names.
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
  return nameFrom(pools, fold(instance));
}

/**
 * One name off two pools, from one fold: the remainder picks the adjective and the quotient picks
 * the noun, so the halves move independently and the whole product of the pools is reachable.
 * Written once because both an effect instance and an arrangement's three tiers are named this
 * way, and a second copy of the arithmetic is a second answer to what one id is called (0081).
 */
function nameFrom(pools: NamePools, hash: number): string {
  const { adjectives, nouns } = pools;
  const adjective = adjectives[hash % adjectives.length] ?? adjectives[0];
  const noun = nouns[Math.floor(hash / adjectives.length) % nouns.length] ?? nouns[0];
  return twoPartName(adjective, noun);
}

/** The three tiers of an arrangement that wear a name of their own: an album of songs of parts. */
export type NamedTier = "album" | "song" | "part";

/**
 * The pools each tier of an arrangement names its rows from, exactly as an effect instance is
 * named (0081): two pools multiplied, twelve of each, and nouns disjoint from every other pool in
 * this file so a name read on its own says which tier it names. The adjectives narrow as the tiers
 * do — an album's say how a whole tract stands over a season, a song's how one bed of it is coming
 * on, a part's how one small thing on it looks — and the nouns are the same ground read at three
 * distances: a tract, a bed, a single growing thing.
 */
export const TIER_NAMES: Record<NamedTier, NamePools> = {
  album: {
    adjectives: words(
      "Wintering Rolling Standing Enduring Sweeping Lasting Settled Broad Whole Perennial Ranging Abiding",
    ),
    nouns: words(
      "Estate Common Heath Moor Pasture Terrace Woodland Parkland Fenland Grassland Marsh Acreage",
    ),
  },
  song: {
    adjectives: words(
      "Flowering Ripening Budding Climbing Sunlit Early Late Quiet Nodding Swaying Tangled Sown",
    ),
    nouns: words("Patch Row Stand Clump Tuft Corner Arbour Bower Pergola Grove Walk Bank"),
  },
  part: {
    adjectives: words("Young Tender Short Slender Fresh Trimmed Curling Green Pale Fine Soft Neat"),
    nouns: words("Leaf Stem Root Petal Frond Tendril Blade Stalk Sepal Node Bulb Seedling"),
  },
};

/**
 * The name one album, song or part wears, drawn from its own durable id the way an effect
 * instance's is (0081): a pure function of the id, so a reorder, a reload and an archive all leave
 * it where it was and no second durable field carries it (0057, 0076). This is the draw the walk's
 * own drawn run takes, where there is no list of siblings to look at and nothing to avoid.
 */
export const tierName = (tier: NamedTier, id: string): string =>
  nameFrom(TIER_NAMES[tier], fold(id));

/**
 * The name a hand's gesture mints: the draw above, and then the same fold stepped on by an attempt
 * counter until it lands on a reading none of its siblings already wears. This is where a tier's
 * name parts from an effect instance's — 0081 refuses a redraw loop because an effect is named
 * inside a stream a seed has to reproduce, and a gesture is outside every stream and spends
 * nothing.
 *
 * Stepped rather than folded again, because the two indices are one number's remainder and
 * quotient: adding one walks the adjectives and carries into the nouns, so 144 attempts reach all
 * 144 readings exactly once and a free one is never missed while one exists. Bounded by that
 * product and falling back to the first draw when it is spent, which is a list of 144 siblings and
 * a name repeated rather than a loop that will not end (principle 5). A row a hand has renamed is
 * not in `taken` unless it happens to wear a drawn name, which is the right answer either way:
 * what is avoided is a reading appearing twice.
 */
export function mintTierName(tier: NamedTier, id: string, taken: Iterable<string>): string {
  const pools = TIER_NAMES[tier];
  const already = new Set(taken);
  const hash = fold(id);
  const readings = pools.adjectives.length * pools.nouns.length;
  for (let attempt = 0; attempt < readings; attempt++) {
    const next = nameFrom(pools, hash + attempt);
    if (!already.has(next)) return next;
  }
  return nameFrom(pools, hash);
}
