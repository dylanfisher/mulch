/**
 * @role The five banks a yard's name is drawn from, and the draw that joins them: an adjective, a
 *   plant and a place always, and a time and a small detail on a coin apiece — so a rack of yards
 *   reads as a set of tiny scenes rather than a list of usernames (0317).
 * @instead The instrument's other nouns — actions, transport, the emoji a yard wears beside this
 *   name — → src/lib/copy.ts, which this left because that file is a couple of dozen lines from
 *   the hard cap and this is a split rather than a shave (0045). What an effect instance and an
 *   arrangement's tiers are named → src/lib/copyNames.ts.
 */
import { pick, words } from "./copy.ts";
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
 * The third, and the one that turns a pair of words into somewhere: where on the ground it is.
 * Each entry is a whole phrase because a preposition is not a word a pool multiplies — "beneath"
 * and "the Stairs" are one thing to read — and it opens lowercase, so the reading is a sentence
 * with one capitalised name in it rather than a shouted label.
 */
export const YARD_PLACES: readonly [string, ...string[]] = [
  "by the Old Wall",
  "beneath the Stairs",
  "beside the Stone Path",
  "under the Eaves",
  "behind the Shed",
  "along the Fence",
  "at the Gate",
  "near the Open Window",
  "past the Water Butt",
  "over the Low Bridge",
  "by the Back Door",
  "beside the Greenhouse",
  "under the Apple Tree",
  "beyond the Hedge",
  "at the Bottom of the Steps",
  "by the Cold Frame",
  "along the Gravel Walk",
  "behind the Compost Heap",
  "near the Rain Barrel",
  "under the Washing Line",
  "beside the Garden Seat",
  "at the Corner of the Yard",
  "by the Broken Pot",
  "beneath the Ivy Arch",
];

/**
 * The first of the two optional banks: when it is, what the weather is doing, what the light is
 * like. Optional because a name that always says everything says nothing — half the yards
 * carrying one is what makes it worth reading on the ones that do (0317).
 */
export const YARD_AIRS: readonly [string, ...string[]] = [
  "at Dusk",
  "in Soft Rain",
  "in Moonlight",
  "at First Light",
  "in Low Sun",
  "after Rain",
  "in Thin Mist",
  "at Noon",
  "in Late Light",
  "under Cloud",
  "in Still Air",
  "at Dawn",
  "in Frost",
  "on a Warm Evening",
  "in Long Shadow",
  "before the Storm",
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
 * Draw one yard's name: the three banks that always speak, then each optional bank on its own
 * coin. So a name runs from "Gentle Moss beneath the Stairs" to "Gentle Moss beneath the Stairs at
 * Dusk with Moths", and no two yards in a session read as a numbered list (0317).
 *
 * Called from the call site that mints the id (src/ui/actions.ts) and carried in `deck.add`,
 * because a reducer that drew its own would make replay, restore and the fingerprint
 * non-deterministic (0057). `twoPartName` stays what it is — the effect and tier draws still join
 * two halves — and this join is its own.
 */
export function mintYardName(): string {
  const said = [`${pick(YARD_ADJECTIVES)} ${pick(YARD_PLANTS)}`, pick(YARD_PLACES)];
  // A name is durable text, so it is bounded by the one bound durable text has (`assertDurableText`)
  // — and the two banks that are optional are the two that give way to it. The three that always
  // speak fit inside it by construction: the longest adjective, plant and place together are well
  // under. Checked here rather than trimmed later, because a name cut mid-phrase is a scene that
  // stops halfway (principle 5, 0317).
  const drawn = (bank: readonly [string, ...string[]]): void => {
    if (Math.random() >= 0.5) return;
    const next = pick(bank);
    if ([...said, next].join(" ").length <= DURABLE_TEXT_MAX) said.push(next);
  };
  drawn(YARD_AIRS);
  drawn(YARD_DETAILS);
  return said.join(" ");
}

/**
 * The name the one deck a fresh session boots with carries: a draw like any other yard's, taken
 * once as this module loads so every store a boot creates agrees on it. The emoji beside it stays
 * the pool's first — the name is a draw, the house is not (P47).
 */
export const INITIAL_YARD_NAME = mintYardName();
