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

/**
 * The first half of every name: what the yard is like. Forty-eight of them against forty-eight
 * plants is 2304 pairs before the places multiply it, so the first repeat is expected well past
 * any session's worth of yards (0149, 0317). Titlecase, like every label the instrument writes
 * (0059).
 */
export const YARD_ADJECTIVES = words(
  "Quiet North Low Bright Slow Wild Deep Warm Far Still South High Soft Dim " +
    "Green Damp Dry Old Near Cool Pale Sheltered Windy Hidden " +
    "Gentle Shady Sunny Misty Hushed Crooked Wide Narrow Lonely Tangled Silver Golden " +
    "Rusty Mossy Weathered Sleepy Broad Distant Little Upper Lower Inner Outer Winding",
);

/** The second: what is growing there. House-and-garden, like the emoji pool it is drawn beside. */
export const YARD_PLANTS = words(
  "Fern Thicket Clover Willow Bramble Rush Sorrel Cedar Nettle Moss Hedgerow Alder " +
    "Bracken Heather Ivy Laurel Birch Foxglove Yarrow Thistle Reed Hawthorn Lichen Orchard " +
    "Comfrey Meadowsweet Elder Rowan Hazel Blackthorn Gorse Broom Vetch Campion Cowslip Primrose " +
    "Bindweed Teasel Mullein Woodruff Bugle Speedwell Chicory Tansy Mallow Betony Sedge Aspen",
);

/**
 * The third, and the one that turns a pair of words into somewhere: where on the ground it is. It
 * is drawn twice — a joining word against a noun — so that the same corner of a yard can be
 * arrived at from more than one side, and every word here has to read against every noun below it:
 * a word that reads with half of them, like "over the Stairs", is not in the bank (0324). The word
 * opens lowercase, so the reading is a sentence with one capitalised name in it rather than a
 * shouted label (0059).
 */
export const YARD_PLACE_WORDS = words("by beside near past behind beyond");

/**
 * What it is drawn against: something in a garden solid enough to stand on one side of. Nothing
 * long and thin — a path is walked along, not stood behind — because the bank is what every word
 * above must read against, not a list of things a yard has.
 */
export const YARD_PLACE_NOUNS: readonly [string, ...string[]] = [
  "the Old Wall",
  "the Stairs",
  "the Shed",
  "the Gate",
  "the Fence",
  "the Greenhouse",
  "the Hedge",
  "the Water Butt",
  "the Apple Tree",
  "the Cold Frame",
  "the Compost Heap",
  "the Rain Barrel",
  "the Coal Bunker",
  "the Garden Seat",
  "the Ivy Arch",
  "the Back Door",
  "the Low Bridge",
  "the Woodpile",
  "the Potting Bench",
  "the Log Store",
  "the Stone Trough",
  "the Beehive",
  "the Chicken Run",
  "the Old Pump",
];

/**
 * The first of the two optional banks, and the second that is joined: when it is, what the weather
 * is doing, what the light is like. Optional because a name that always says everything says
 * nothing — half the yards carrying one is what makes it worth reading on the ones that do (0317).
 * Two words, because an air is a medium: it is stood in and moved through. "at" reads with a
 * moment and not a light, "toward" and "into" with a weather and not a still light — each of them
 * reads with half the bank below, which is what keeps them out of it (0324).
 */
export const YARD_AIR_WORDS = words("in through");

/**
 * What the air is drawn against, and the entries a scene reads a name by (bench-06): a light or a
 * weather, never a joined phrase, so the reading is a table on this bank and not on the join.
 */
export const YARD_AIR_NOUNS: readonly [string, ...string[]] = [
  "Falling Dusk",
  "Moonlight",
  "Frost",
  "Soft Rain",
  "Low Sunlight",
  "First Light",
  "Late Light",
  "Thin Mist",
  "Low Cloud",
  "Long Shadows",
  "Falling Snow",
  "Grey Light",
  "Night Air",
  "Warm Wind",
  "Sea Fog",
  "Cold Light",
];

/** The second: one small living thing or quiet object, on its own coin, for the same reason. */
export const YARD_DETAILS: readonly [string, ...string[]] = [
  "with Moths",
  "with a Bell",
  "with Bees",
  "with a Wren",
  "with Snails",
  "with a Watering Can",
  "with Sparrows",
  "with a Wind Chime",
  "with Beetles",
  "with a Wheelbarrow",
  "with Swifts",
  "with a Cracked Saucer",
  "with Spiders",
  "with a Rope Swing",
  "with Blackbirds",
  "with a Rusted Trowel",
];

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
