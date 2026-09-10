/**
 * @role The seven banks a yard's name is drawn from, and the draw that joins them: an adjective, a
 *   plant and a place always, and an air and a small detail on a coin apiece — the place and the
 *   air each a joining word drawn against a noun (0324) — so a rack of yards reads as a set of tiny
 *   scenes rather than a list of usernames (0317).
 * @instead The instrument's other nouns — actions, transport, the emoji a yard wears beside this
 *   name — → src/lib/copy.ts, which this left because that file is a couple of dozen lines from
 *   the hard cap and this is a split rather than a shave (0045). What an effect instance and an
 *   arrangement's tiers are named → src/lib/copyNames.ts.
 */
import { pick, twoPartName, words } from "./copy.ts";
import { DURABLE_TEXT_MAX } from "./guards.ts";
import {
  type SceneLight,
  type SceneName,
  type SceneReach,
  type SceneSpecks,
  type SceneSpread,
  type SceneStand,
  type SceneWind,
  SCENE_LIGHTS,
  SCENE_NAMES,
  SCENE_REACHES,
  SCENE_SPECKS,
  SCENE_SPREADS,
  SCENE_STANDS,
  SCENE_WINDS,
} from "./moireScene.ts";

/** One bank flattened out of the grouping that is the bank: the words, in the grouping's own order. */
const banked = (grouped: readonly (readonly string[])[]): readonly [string, ...string[]] => {
  const [first, ...rest] = grouped.flat();
  if (first === undefined)
    throw new Error("A bank grouped into nothing is a bank nobody can draw.");
  return [first, ...rest];
};

/**
 * The first half of every name: what the yard is like, **under the wind that adjective sets**
 * (0329). Forty-eight of them against forty-eight plants is 2304 pairs before the places multiply
 * it, so the first repeat is expected well past any session's worth of yards (0149, 0317).
 * Titlecase, like every label the instrument writes (0059).
 *
 * The grouping is the bank rather than a second copy of it: a word exists in exactly one place, so
 * an adjective cannot be drawn without a wind and a wind cannot name a word nobody draws
 * (principle 1).
 */
export const YARD_ADJECTIVES_BY_WIND: Readonly<Record<SceneWind, readonly string[]>> = {
  still: words("Slow Deep Still Dim Damp Sheltered Hidden Shady Misty Hushed Mossy Sleepy Inner"),
  quiet: words("Quiet Low Far Soft Old Near Pale Gentle Narrow Lonely Rusty Distant Little Lower"),
  breeze: words("North Bright Warm South Green Dry Cool Sunny Wide Silver Golden Broad"),
  windy: words("High Windy Crooked Weathered Upper Outer"),
  wild: words("Wild Tangled Winding"),
};

export const YARD_ADJECTIVES = banked(SCENE_WINDS.map((wind) => YARD_ADJECTIVES_BY_WIND[wind]));

/**
 * The second: what is growing there, **under the scene it stands in** (0329). House-and-garden,
 * like the emoji pool it is drawn beside, and grouped for the reason the adjectives are.
 */
export const YARD_PLANTS_BY_SCENE: Readonly<Record<SceneName, readonly string[]>> = {
  meadow: words(
    "Fern Clover Sorrel Nettle Moss Bracken Heather Thistle Lichen Gorse Broom Vetch Teasel Mullein",
  ),
  bloom: words(
    "Foxglove Yarrow Hawthorn Orchard Comfrey Meadowsweet Elder Blackthorn Campion Cowslip " +
      "Primrose Bindweed Woodruff Bugle Speedwell Chicory Tansy Mallow Betony",
  ),
  water: words("Rush Reed Sedge"),
  canopy: words("Thicket Willow Bramble Cedar Hedgerow Alder Ivy Laurel Birch Rowan Hazel Aspen"),
};

export const YARD_PLANTS = banked(SCENE_NAMES.map((scene) => YARD_PLANTS_BY_SCENE[scene]));

/**
 * The third, and the one that turns a pair of words into somewhere: where on the ground it is. It
 * is drawn twice — a joining word against a noun — so that the same corner of a yard can be
 * arrived at from more than one side, and every word here has to read against every noun below it:
 * a word that reads with half of them, like "over the Stairs", is not in the bank (0324). The word
 * opens lowercase, so the reading is a sentence with one capitalised name in it rather than a
 * shouted label (0059). Grouped **under the reach it reads as** (0335) for the reason the
 * adjectives are grouped under their wind: a word exists in exactly one place.
 */
export const YARD_PLACE_WORDS_BY_REACH: Readonly<Record<SceneReach, readonly string[]>> = {
  close: words("by beside"),
  middle: words("near past"),
  far: words("behind beyond"),
};

export const YARD_PLACE_WORDS = banked(
  SCENE_REACHES.map((reach) => YARD_PLACE_WORDS_BY_REACH[reach]),
);

/**
 * What it is drawn against: something in a garden solid enough to stand on one side of. Nothing
 * long and thin — a path is walked along, not stood behind — because the bank is what every word
 * above must read against, not a list of things a yard has. Grouped **under the shape of the shade
 * it casts** (0335): four shadows and not twenty-four things, because a fence, a hedge and a low
 * bridge are one band of shade across a field and the picture draws the shade.
 */
export const YARD_PLACE_NOUNS_BY_STAND: Readonly<Record<SceneStand, readonly string[]>> = {
  wall: ["the Old Wall", "the Fence", "the Hedge", "the Low Bridge", "the Garden Seat"],
  steps: ["the Stairs", "the Cold Frame", "the Potting Bench", "the Log Store", "the Woodpile"],
  grille: ["the Greenhouse", "the Gate", "the Chicken Run", "the Ivy Arch"],
  mass: [
    "the Shed",
    "the Water Butt",
    "the Rain Barrel",
    "the Old Pump",
    "the Stone Trough",
    "the Beehive",
    "the Coal Bunker",
    "the Compost Heap",
    "the Back Door",
    "the Apple Tree",
  ],
};

export const YARD_PLACE_NOUNS = banked(
  SCENE_STANDS.map((stand) => YARD_PLACE_NOUNS_BY_STAND[stand]),
);

/**
 * The first of the two optional banks, and the second that is joined: when it is, what the weather
 * is doing, what the light is like. Optional because a name that always says everything says
 * nothing — half the yards carrying one is what makes it worth reading on the ones that do (0317).
 * Two words, because an air is a medium: it is stood in and moved through. "at" reads with a
 * moment and not a light, "toward" and "into" with a weather and not a still light — each of them
 * reads with half the bank below, which is what keeps them out of it (0324). Grouped **under the
 * way the light spreads** for the reason the adjectives are grouped under their wind: a field stood
 * in its light is washed by it and a field seen through one has that light fall through it.
 */
export const YARD_AIR_WORDS_BY_SPREAD: Readonly<Record<SceneSpread, readonly string[]>> = {
  wash: words("in"),
  fall: words("through"),
};

export const YARD_AIR_WORDS = banked(
  SCENE_SPREADS.map((spread) => YARD_AIR_WORDS_BY_SPREAD[spread]),
);

/**
 * What the air is drawn against, **under the light it puts a scene in** (0329): a light or a
 * weather, never a joined phrase, so the reading is a table on this bank and not on the join. The
 * day is not a group here and cannot be — it is what a name with *no* air reads as, and an air that
 * named the day would be a phrase saying nothing (0317).
 */
export const YARD_AIR_NOUNS_BY_LIGHT: Readonly<Record<SceneLight, readonly string[]>> = {
  day: [],
  dusk: ["Falling Dusk", "Late Light", "Long Shadows"],
  moon: ["Moonlight", "Night Air"],
  frost: ["Frost", "Falling Snow", "Sea Fog", "Cold Light"],
  rain: ["Soft Rain", "Thin Mist", "Low Cloud", "Grey Light"],
  sun: ["Low Sunlight", "First Light", "Warm Wind"],
};

export const YARD_AIR_NOUNS = banked(SCENE_LIGHTS.map((light) => YARD_AIR_NOUNS_BY_LIGHT[light]));

/**
 * The second: one small living thing or quiet object, on its own coin, for the same reason. Grouped
 * **under what it makes of the field's bright points**: a creature is a flock of them and an object
 * is one kept thing, left at the foot of whatever the yard stands by. The scene's own is not a
 * group here and cannot be — it is what a name with *no* detail reads as, exactly as the day is for
 * the air above.
 */
export const YARD_DETAILS_BY_SPECKS: Readonly<Record<SceneSpecks, readonly string[]>> = {
  own: [],
  flock: [
    "with Moths",
    "with Bees",
    "with a Wren",
    "with Snails",
    "with Sparrows",
    "with Beetles",
    "with Swifts",
    "with Spiders",
    "with Blackbirds",
  ],
  kept: [
    "with a Bell",
    "with a Watering Can",
    "with a Wind Chime",
    "with a Wheelbarrow",
    "with a Cracked Saucer",
    "with a Rope Swing",
    "with a Rusted Trowel",
  ],
};

export const YARD_DETAILS = banked(SCENE_SPECKS.map((specks) => YARD_DETAILS_BY_SPECKS[specks]));

/**
 * Draw a joining word against a noun — once, so the place and the air agree forever on what a
 * joined half reads like, and so the word is always drawn before the noun (0324). The join itself
 * is `twoPartName`'s, which is where two halves of any name are put together. Not exported:
 * the only draw is the mint below it (0057).
 */
const joinedName = (
  wordBank: readonly [string, ...string[]],
  nounBank: readonly [string, ...string[]],
): string => twoPartName(pick(wordBank), pick(nounBank));

/**
 * Draw one yard's name: the three banks that always speak, then each optional bank on its own
 * coin. So a name runs from "Gentle Moss past the Stairs" to "Gentle Moss past the Stairs toward
 * Dusk with Moths", and no two yards in a session read as a numbered list (0317).
 *
 * Called from the call site that mints the id (src/ui/actions.ts) and carried in `deck.add`,
 * because a reducer that drew its own would make replay, restore and the fingerprint
 * non-deterministic (0057).
 */
export function mintYardName(): string {
  const said = [
    twoPartName(pick(YARD_ADJECTIVES), pick(YARD_PLANTS)),
    joinedName(YARD_PLACE_WORDS, YARD_PLACE_NOUNS),
  ];
  // A name is durable text, so it is bounded by the one bound durable text has (`assertDurableText`)
  // — and the two banks that are optional are the two that give way to it. The three that always
  // speak fit inside it by construction: the longest adjective, plant, joining word and noun are well
  // under. Checked here rather than trimmed later, because a name cut mid-phrase is a scene that
  // stops halfway (principle 5, 0317).
  const drawn = (draw: () => string): void => {
    if (Math.random() >= 0.5) return;
    const next = draw();
    if ([...said, next].join(" ").length <= DURABLE_TEXT_MAX) said.push(next);
  };
  drawn(() => joinedName(YARD_AIR_WORDS, YARD_AIR_NOUNS));
  drawn(() => pick(YARD_DETAILS));
  return said.join(" ");
}

/**
 * The name the one deck a fresh session boots with carries: a draw like any other yard's, taken
 * once as this module loads so every store a boot creates agrees on it. The emoji beside it stays
 * the pool's first — the name is a draw, the house is not (P47).
 */
export const INITIAL_YARD_NAME = mintYardName();
