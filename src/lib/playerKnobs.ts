/**
 * @role Every number of the jumps spec as a thing a hand turns: the range each of the forty-one
 *   is bounded by, the finest a hand may land on it, the curve it travels along, and which of the
 *   card's runs it stands in. One declaration, which is what lets a run draw a set of dials it is
 *   handed rather than a set it was written with (0153).
 * @instead What each of those numbers *means*, and the argument for the bound itself →
 *   src/lib/player.ts, which declares every constant this assembles. The words under a dial →
 *   src/lib/copyKnobs.ts, which is keyed by the same list. The control → src/ui/PlayerDial.tsx.
 */
import type { RangeCurve } from "./range.ts";
import {
  PLAYER_BURST_MAX,
  PLAYER_BURST_MIN,
  PLAYER_BURST_STEP,
  PLAYER_GATE_MAX,
  PLAYER_GATE_MIN,
  PLAYER_KNOBS,
  PLAYER_PART_KNOBS,
  PLAYER_VARY_CHANCE_MAX,
  PLAYER_VARY_CHANCE_MIN,
  PLAYER_VARY_MAX,
  PLAYER_VARY_MIN,
  type PlayerKnob,
} from "./player.ts";
import { PLAYER_DROP_MAX, PLAYER_DROP_MIN } from "./playerDrop.ts";
import {
  PLAYER_BED_BIAS_MAX,
  PLAYER_BED_BIAS_MIN,
  PLAYER_BED_DISTANCE_MAX,
  PLAYER_BED_DISTANCE_MIN,
  PLAYER_BED_EVERY_MAX,
  PLAYER_BED_EVERY_MIN,
  PLAYER_BED_HOME_MAX,
  PLAYER_BED_HOME_MIN,
  PLAYER_BED_MAX,
  PLAYER_BED_MIN,
} from "./playerBed.ts";
import {
  PLAYER_RATCHET_MAX,
  PLAYER_RATCHET_MIN,
  PLAYER_REPEATS_CHANCE_MAX,
  PLAYER_REPEATS_CHANCE_MIN,
  PLAYER_REPEATS_MAX,
  PLAYER_REPEATS_MIN,
  PLAYER_REPEATS_SPREAD_MAX,
  PLAYER_REPEATS_SPREAD_MIN,
} from "./playerRepeats.ts";
import {
  PLAYER_PHRASE_CHANCE_MAX,
  PLAYER_PHRASE_CHANCE_MIN,
  PLAYER_PHRASE_KEEP_MAX,
  PLAYER_PHRASE_KEEP_MIN,
  PLAYER_PHRASE_RETURN_MAX,
  PLAYER_PHRASE_RETURN_MIN,
} from "./playerFigure.ts";
import { PLAYER_REVERSE_MAX, PLAYER_REVERSE_MIN } from "./playerReverse.ts";
import {
  PLAYER_CHANCE_MAX,
  PLAYER_CHANCE_MIN,
  PLAYER_CLIMB_MAX,
  PLAYER_CLIMB_MIN,
  PLAYER_DRIFT_MAX,
  PLAYER_DRIFT_MIN,
  PLAYER_HOLD_MAX,
  PLAYER_HOLD_MIN,
  PLAYER_SPREAD_MAX,
  PLAYER_SPREAD_MIN,
} from "./playerRungs.ts";
import {
  PLAYER_SPARK_DELAY_MAX,
  PLAYER_SPARK_DELAY_MIN,
  PLAYER_SPARK_LEVEL_MAX,
  PLAYER_SPARK_LEVEL_MIN,
  PLAYER_SPARK_MAX,
  PLAYER_SPARK_MIN,
} from "./playerSpark.ts";
import {
  PLAYER_DISTANCE_MAX,
  PLAYER_DISTANCE_MIN,
  PLAYER_PHRASE_MAX,
  PLAYER_PHRASE_MIN,
} from "./playerSlots.ts";
import {
  PLAYER_REST_CHANCE_MAX,
  PLAYER_REST_CHANCE_MIN,
  PLAYER_REST_MAX,
  PLAYER_REST_MIN,
  PLAYER_REST_PULSES_MAX,
  PLAYER_REST_PULSES_MIN,
  PLAYER_REST_SPAN_MAX,
  PLAYER_REST_SPAN_MIN,
  PLAYER_REST_SPREAD_MAX,
  PLAYER_REST_SPREAD_MIN,
} from "./playerRest.ts";
import {
  PLAYER_BIAS_MAX,
  PLAYER_BIAS_MIN,
  PLAYER_HOME_MAX,
  PLAYER_HOME_MIN,
  PLAYER_STRIDE_MAX,
  PLAYER_STRIDE_MIN,
} from "./playerTravel.ts";
import {
  PLAYER_ARRANGE_AMOUNT_MAX,
  PLAYER_ARRANGE_AMOUNT_MIN,
  PLAYER_ARRANGE_APART_MAX,
  PLAYER_ARRANGE_APART_MIN,
  PLAYER_ARRANGE_CHANCE_MAX,
  PLAYER_ARRANGE_CHANCE_MIN,
  PLAYER_ARRANGE_GROW_MAX,
  PLAYER_ARRANGE_GROW_MIN,
  PLAYER_ARRANGE_SPAN_MAX,
  PLAYER_ARRANGE_SPAN_MIN,
  PLAYER_ARRANGE_KEEP_MAX,
  PLAYER_ARRANGE_KEEP_MIN,
  PLAYER_ARRANGE_MAX,
  PLAYER_ARRANGE_MIN,
  PLAYER_ARRANGE_RETURN_MAX,
  PLAYER_ARRANGE_RETURN_MIN,
} from "./playerSong.ts";

/** How one number of the spec is turned: where it may go, how finely, and along what curve. */
export type KnobDial = {
  min: number;
  max: number;
  /**
   * The finest a hand may land on, or absent for the dial's own default hundredth. A step of one
   * is also how this file says *counted*: a knob that measures lands anywhere its range allows,
   * and a knob that counts lands on whole numbers — so nothing else has to keep a list of which
   * is which (`assertPlayer` is still the judge, in src/lib/player.ts).
   */
  step?: number;
  /** Absent is linear, which is every knob here but the one whose range spans three orders. */
  curve?: RangeCurve;
};

/**
 * All of them, keyed by the list that declares them, so a knob added to `PLAYER_KNOBS` without a
 * range fails the build rather than reaching a menu as a dial from nowhere.
 *
 * Every bound is the constant declared in src/lib/player.ts rather than a number written again —
 * this file is an assembly of facts, and the argument for each of them lives beside the constant
 * it is (principle 1).
 */
export const PLAYER_KNOB_DIALS: Record<PlayerKnob, KnobDial> = {
  // The third dial in the module whose range holds a negative, and the only one where the negative
  // is a *place* rather than a direction: bed −3 is three loop-lengths back through the source, so
  // zero is the loop the hand set and the two ends are the file either side of it (0183).
  bed: { min: PLAYER_BED_MIN, max: PLAYER_BED_MAX, step: 1 },
  bedEvery: { min: PLAYER_BED_EVERY_MIN, max: PLAYER_BED_EVERY_MAX, step: 1 },
  // The second dial drawn on a log curve, and for the burst's own reason: one sixteenth to a
  // whole file is three orders of magnitude, and drawn linear the crawl — everything under one
  // bed, which is what the sixteenth is *for* — would be the bottom sixtieth of the sweep (0193).
  // Counted all the same: a hand lands on whole sixteenths at either end of it.
  bedDistance: {
    min: PLAYER_BED_DISTANCE_MIN,
    max: PLAYER_BED_DISTANCE_MAX,
    step: 1,
    curve: "log",
  },
  // The bed's lean, which is the jump's own field one grid up and so carries the same range and
  // the same reading: zero wanders, ±1 only ever goes one way (0162, 0183).
  bedBias: { min: PLAYER_BED_BIAS_MIN, max: PLAYER_BED_BIAS_MAX },
  bedHome: { min: PLAYER_BED_HOME_MIN, max: PLAYER_BED_HOME_MAX },
  distance: { min: PLAYER_DISTANCE_MIN, max: PLAYER_DISTANCE_MAX, step: 1 },
  // One of the two dials in the module whose range holds a negative, because the thing it says is
  // a direction and not a size: zero is the middle of it and the two ends are the two walks the
  // module used to be a choice between (0162). The climb below is the other.
  bias: { min: PLAYER_BIAS_MIN, max: PLAYER_BIAS_MAX },
  stride: { min: PLAYER_STRIDE_MIN, max: PLAYER_STRIDE_MAX },
  home: { min: PLAYER_HOME_MIN, max: PLAYER_HOME_MAX },
  phrase: { min: PLAYER_PHRASE_MIN, max: PLAYER_PHRASE_MAX, step: 1 },
  phraseKeep: { min: PLAYER_PHRASE_KEEP_MIN, max: PLAYER_PHRASE_KEEP_MAX, step: 1 },
  phraseChance: { min: PLAYER_PHRASE_CHANCE_MIN, max: PLAYER_PHRASE_CHANCE_MAX },
  phraseReturn: { min: PLAYER_PHRASE_RETURN_MIN, max: PLAYER_PHRASE_RETURN_MAX },
  repeats: { min: PLAYER_REPEATS_MIN, max: PLAYER_REPEATS_MAX, step: 1 },
  repeatsChance: { min: PLAYER_REPEATS_CHANCE_MIN, max: PLAYER_REPEATS_CHANCE_MAX },
  repeatsSpread: { min: PLAYER_REPEATS_SPREAD_MIN, max: PLAYER_REPEATS_SPREAD_MAX, step: 1 },
  // The count's keep is the rate walk's range said for the count: a hold is counted in jumps
  // whatever it is holding, so the two are one range and not two that agree (0135).
  repeatsHold: { min: PLAYER_HOLD_MIN, max: PLAYER_HOLD_MAX, step: 1 },
  // A fraction of a repeat, like the gate below it, and drawn linear for the reason every fraction
  // here is: the range holds a zero and the zero is what turns it off.
  ratchet: { min: PLAYER_RATCHET_MIN, max: PLAYER_RATCHET_MAX },
  gate: { min: PLAYER_GATE_MIN, max: PLAYER_GATE_MAX },
  drop: { min: PLAYER_DROP_MIN, max: PLAYER_DROP_MAX },
  // A third odds beside the two above it, and the one of the three that takes nothing away: a
  // reversed landing sounds for exactly as long as a forward one, on the same slot (P121).
  reverse: { min: PLAYER_REVERSE_MIN, max: PLAYER_REVERSE_MAX },
  // A fourth odds on that row, and the one of the four that adds rather than takes away or turns
  // around: a spark is a second read of the loop under the landing that threw it (P123).
  spark: { min: PLAYER_SPARK_MIN, max: PLAYER_SPARK_MAX },
  // And how loud that one is, linear for the reason every fraction here is: the range holds a zero
  // and the zero is a spark nobody hears. Not in the Spark dial's own run — 0124 puts an amount
  // beside the dial whose *draw* it shapes, and this shapes no draw at all: the walk rolls whether
  // a landing sparks and where, and the level is carried the way the ratchet is (0124).
  sparkLevel: { min: PLAYER_SPARK_LEVEL_MIN, max: PLAYER_SPARK_LEVEL_MAX },
  // And how far into the landing that one begins, linear and beside the level for the same two
  // reasons: the range holds a zero and the zero is the spark sounding with its landing, and it
  // shapes no draw either — the walk rolls whether a landing sparks and where, and both of the
  // spark's amounts are carried rather than drawn (0124, 0175).
  sparkDelay: { min: PLAYER_SPARK_DELAY_MIN, max: PLAYER_SPARK_DELAY_MAX },
  /**
   * The other dial drawn on a log curve, because its range spans three orders of magnitude: drawn
   * linear, the whole region a grain is heard in — five milliseconds to a tenth of a second —
   * would be the bottom twentieth of the sweep. Its step is finer than its floor, so the floor is
   * reachable and an arrow key on it still moves; the default hundredth can do neither.
   */
  burst: {
    min: PLAYER_BURST_MIN,
    max: PLAYER_BURST_MAX,
    step: PLAYER_BURST_STEP,
    curve: "log",
  },
  // Linear where the burst is logarithmic, because a log range cannot hold a zero and this one's
  // zero is the value that turns it off — but stepped as finely, so the finest stray a hand can
  // set is the finest burst it can set (0135).
  vary: { min: PLAYER_VARY_MIN, max: PLAYER_VARY_MAX, step: PLAYER_BURST_STEP },
  varyChance: { min: PLAYER_VARY_CHANCE_MIN, max: PLAYER_VARY_CHANCE_MAX },
  rest: { min: PLAYER_REST_MIN, max: PLAYER_REST_MAX },
  // Two counts rather than two measures: what a placed pattern says is how many of the span's
  // jumps wait, and both are jumps, so both land on whole numbers (0163).
  restPulses: { min: PLAYER_REST_PULSES_MIN, max: PLAYER_REST_PULSES_MAX, step: 1 },
  restSpan: { min: PLAYER_REST_SPAN_MIN, max: PLAYER_REST_SPAN_MAX, step: 1 },
  restChance: { min: PLAYER_REST_CHANCE_MIN, max: PLAYER_REST_CHANCE_MAX },
  restSpread: { min: PLAYER_REST_SPREAD_MIN, max: PLAYER_REST_SPREAD_MAX },
  hold: { min: PLAYER_HOLD_MIN, max: PLAYER_HOLD_MAX, step: 1 },
  chance: { min: PLAYER_CHANCE_MIN, max: PLAYER_CHANCE_MAX },
  spread: { min: PLAYER_SPREAD_MIN, max: PLAYER_SPREAD_MAX, step: 1 },
  drift: { min: PLAYER_DRIFT_MIN, max: PLAYER_DRIFT_MAX, step: 1 },
  // The second dial in the module whose range holds a negative, and for the reason the first one
  // does: what it says is a direction and not a size, so zero is the middle of it and the two ends
  // are the two ways a landing can climb its ladder (0167).
  climb: { min: PLAYER_CLIMB_MIN, max: PLAYER_CLIMB_MAX, step: 1 },
  arrange: { min: PLAYER_ARRANGE_MIN, max: PLAYER_ARRANGE_MAX, step: 1 },
  // A keep counted in rounds of an arrangement, where the one above it is counted in passes of a
  // figure: two ranges that agree on their numbers and are not one, for the reason 0151 gave the
  // first pair — a keep counts whatever it keeps, and these keep different things.
  arrangeKeep: { min: PLAYER_ARRANGE_KEEP_MIN, max: PLAYER_ARRANGE_KEEP_MAX, step: 1 },
  arrangeChance: { min: PLAYER_ARRANGE_CHANCE_MIN, max: PLAYER_ARRANGE_CHANCE_MAX },
  arrangeReturn: { min: PLAYER_ARRANGE_RETURN_MIN, max: PLAYER_ARRANGE_RETURN_MAX },
  // The four 0199 added. Two fractions and two counts, and the counts are counts of different
  // things — a grow counts rounds, the way the keep above it does, and a span counts doublings of
  // a part's own length, which is the one thing in this table measured in neither jumps nor slots
  // nor seconds.
  arrangeAmount: { min: PLAYER_ARRANGE_AMOUNT_MIN, max: PLAYER_ARRANGE_AMOUNT_MAX },
  arrangeGrow: { min: PLAYER_ARRANGE_GROW_MIN, max: PLAYER_ARRANGE_GROW_MAX, step: 1 },
  arrangeSpan: { min: PLAYER_ARRANGE_SPAN_MIN, max: PLAYER_ARRANGE_SPAN_MAX, step: 1 },
  arrangeApart: { min: PLAYER_ARRANGE_APART_MIN, max: PLAYER_ARRANGE_APART_MAX },
};

/**
 * Whether a knob counts rather than measures, which is the same question as whether it steps by
 * one. Read wherever a drawn or blended value has to land on a whole number before anything
 * durable holds it — the character arithmetic in src/lib/playerCharacter.ts and every dial that
 * commits a turn — so the two cannot disagree about which knobs are counts.
 */
export const isWholeKnob = (knob: PlayerKnob): boolean => PLAYER_KNOB_DIALS[knob].step === 1;

/**
 * The four of those that shape the rate walk rather than the jump: what the module lets go of
 * when a hold expires, as against where and for how long it lands (0118). They are the ones drawn
 * in the Hold dial's own run rather than as dials of the card's own row — a partition of
 * `PLAYER_KNOBS` and not a second list of it, so a knob is in exactly one of the two places and the
 * split is declared once (src/ui/PlayerRate.tsx).
 */
export const PLAYER_RATE_KNOBS = [
  "chance",
  "spread",
  "drift",
  // And the fourth, which is the one of them that moves the rate *inside* a landing rather than
  // between two: the same ladder, walked per repeat instead of per hold, which is why it is in this
  // dial's run and not a dial of its own (0167).
  "climb",
] as const satisfies readonly PlayerKnob[];

/**
 * What stands in the Repeats dial's own run: the same three the rate walk carries, said for
 * the count — whether a due redraw fires, how far it strays, and how many jumps keep one (0135).
 * There is no drift beside them: a redrawn count is drawn fresh inside the spread rather than
 * travelled from the count it is on, so there is nothing a drift could bound
 * ([0124](../../docs/decisions/0124-a-drawn-number-carries-the-amounts-that-shape-its-draw.md)).
 */
export const PLAYER_REPEATS_KNOBS = [
  "repeatsChance",
  "repeatsSpread",
  "repeatsHold",
  // And the ratchet, which is the one of the four that shapes no draw at all: it is an amount *of*
  // the count — how much of each repeat the next one keeps — so it belongs beside the dial whose
  // number it reshapes, which is the same reason the three above it are there (0124, 0135).
  "ratchet",
] as const satisfies readonly PlayerKnob[];

/**
 * What stands in the Distance dial's own run: which way the walk leans, how often a jump takes
 * the whole distance rather than a drawn one, and how often it comes home instead — the three
 * amounts that shape the draw the Distance dial bounds, which is where a drawn number's amounts
 * belong (0124, 0162).
 */
export const PLAYER_TRAVEL_KNOBS = [
  "bias",
  "stride",
  "home",
] as const satisfies readonly PlayerKnob[];

/**
 * What stands in the Phrase dial's own run: how many passes keep one figure, whether a kept
 * one evolves, and where a let-go one goes — the three amounts that shape what becomes of a
 * figure, said for the figure the way the rate walk's three are said for a rate (0124, 0151).
 * There is no spread beside them: a figure is a run of slots and not a number, so there is no
 * amount it could be strayed by — what a figure may become is the chance and the return.
 */
export const PLAYER_PHRASE_KNOBS = [
  "phraseKeep",
  "phraseChance",
  "phraseReturn",
] as const satisfies readonly PlayerKnob[];

/**
 * What stands in the Arrange dial's own run: the Phrase dial's own three, said for a run of parts
 * instead of a run of slots (0124, 0151, 0158), and the four 0199 put beside them — what an
 * arrangement has to be given before it can be left to evolve on its own without wandering out of
 * earshot.
 *
 * In the order a hand meets the questions: what becomes of a run over time — how long it is kept,
 * whether a kept one moves, where a let-go one goes, how fast it arrives — and then what the parts
 * inside it may be, which is how far each is taken from the dials, how long each lasts and how
 * unlike its neighbour each is. Seven amounts is the longest run on the card, and it is the size
 * of the question rather than a judgement: an arrangement is the one dial here whose draw is a
 * whole other pattern (0124).
 */
export const PLAYER_ARRANGE_KNOBS = [
  "arrangeKeep",
  "arrangeChance",
  "arrangeReturn",
  "arrangeGrow",
  "arrangeAmount",
  "arrangeSpan",
  "arrangeApart",
] as const satisfies readonly PlayerKnob[];

/**
 * What stands in the Every dial's own run: how far one bed move travels, which way it leans and
 * how often it comes home to the song's own bed instead — the three amounts that shape the move the
 * Every dial schedules, which is where a drawn number's amounts belong (0124, 0183). The Bed dial
 * beside it is not one of them: it is the place the three are measured from, so it stands on the
 * box's own row.
 */
export const PLAYER_BED_KNOBS = [
  "bedDistance",
  "bedBias",
  "bedHome",
] as const satisfies readonly PlayerKnob[];

/**
 * Which fields of this spec say what the *song* is rather than what a part of it is like — the
 * Arrange dial and the three beside it, which is `song`'s own exclusion said for the four that are
 * knobs (0153, 0158), and the Bed dial, its period and the three behind that, which are the ground
 * every part of the song is read on (0184). Read by the three halves of one rule: no region may
 * name one (a throw at load), no character press may write one — a press that zeroed `arrange`
 * would swap the song's author, and one that zeroed `bed` would move the loop under it
 * (src/lib/playerCharacter.ts) — and no part may carry one (0176, `PLAYER_PART_KNOBS`).
 */
export const PLAYER_SONG_KNOBS = [
  "arrange",
  ...PLAYER_ARRANGE_KNOBS,
  "bed",
  "bedEvery",
  ...PLAYER_BED_KNOBS,
] as const satisfies readonly PlayerKnob[];
export type PlayerSongKnob = (typeof PLAYER_SONG_KNOBS)[number];

/**
 * And that those two lists are the one list, answered at load rather than in prose (0122). A part
 * carries `PLAYER_PART_KNOBS` and the song carries these nine, so a knob in neither would be a
 * number no part could hold and no card could keep, and a knob in both would be a part rewriting
 * the arrangement it is inside (0176, 0158). The lists are spelled out in two files because one is
 * the split `PLAYER_KNOBS` is built from and the other is the run's own; this is what keeps them
 * from drifting.
 */
for (const knob of PLAYER_KNOBS) {
  const part = PLAYER_PART_KNOBS.some((named) => named === knob);
  const song = PLAYER_SONG_KNOBS.some((named) => named === knob);
  if (part === song) {
    throw new TypeError(`${knob} is ${part ? "both" : "neither"} a part's knob and the song's`);
  }
}

/** What stands in the Vary dial's own run: the chance a landing is varied at all (P87). */
export const PLAYER_VARY_KNOBS = ["varyChance"] as const satisfies readonly PlayerKnob[];

/**
 * The two amounts that *place* the waits: how many jumps of the span take one, and how long the
 * span is. Their own list because they are the pattern, and the pattern is the field's other
 * author — the run draws these alone while one is live, so the two rolled amounts below are never
 * on screen saying something the walk is not reading (0163).
 */
export const PLAYER_REST_PLACED_KNOBS = [
  "restPulses",
  "restSpan",
] as const satisfies readonly PlayerKnob[];

/**
 * The two that *roll* one instead: whether a wait is taken, and how much it strays. Drawn only
 * while no pattern is placing them, which is the whole of what "one author at a time" looks like
 * on the card (0163).
 */
export const PLAYER_REST_ROLLED_KNOBS = [
  "restChance",
  "restSpread",
] as const satisfies readonly PlayerKnob[];

/**
 * What stands in the Rest dial's own run, both authors' amounts together: the set a name has to
 * be unique within, and the set the run draws while the roll is the author (P87, 0163).
 */
export const PLAYER_REST_KNOBS = [
  ...PLAYER_REST_PLACED_KNOBS,
  ...PLAYER_REST_ROLLED_KNOBS,
] as const satisfies readonly PlayerKnob[];

/**
 * Every knob that stands in another dial's run rather than on the card's own row, which is the
 * eight runs and nothing else. A partition of `PLAYER_KNOBS` with the row's own dials as its
 * complement, so a knob is drawn in exactly one place and the split is declared here rather than at
 * each surface — and it is what says which names have to carry the dial they shape (0195).
 */
export const PLAYER_RUN_KNOBS = [
  ...PLAYER_BED_KNOBS,
  ...PLAYER_TRAVEL_KNOBS,
  ...PLAYER_PHRASE_KNOBS,
  ...PLAYER_REPEATS_KNOBS,
  ...PLAYER_VARY_KNOBS,
  ...PLAYER_REST_KNOBS,
  ...PLAYER_RATE_KNOBS,
  ...PLAYER_ARRANGE_KNOBS,
] as const satisfies readonly PlayerKnob[];
