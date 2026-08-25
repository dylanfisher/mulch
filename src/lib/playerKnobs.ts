/**
 * @role Every number of the jumps spec as a thing a hand turns: the range each of the twenty-four is
 *   bounded by, the finest a hand may land on it, and the curve it travels along. One declaration,
 *   which is what lets a menu draw a set of dials it is handed rather than a set it was written
 *   with (0153).
 * @instead What each of those numbers *means*, and the argument for the bound itself →
 *   src/lib/player.ts, which declares every constant this assembles. The words under a dial →
 *   src/lib/copy.ts. The control → src/ui/PlayerDial.tsx.
 */
import type { RangeCurve } from "./range.ts";
import {
  PLAYER_BURST_MAX,
  PLAYER_BURST_MIN,
  PLAYER_BURST_STEP,
  PLAYER_CHANCE_MAX,
  PLAYER_CHANCE_MIN,
  PLAYER_DISTANCE_MAX,
  PLAYER_DISTANCE_MIN,
  PLAYER_DRIFT_MAX,
  PLAYER_DRIFT_MIN,
  PLAYER_GATE_MAX,
  PLAYER_GATE_MIN,
  PLAYER_HOLD_MAX,
  PLAYER_HOLD_MIN,
  PLAYER_PHRASE_MAX,
  PLAYER_PHRASE_MIN,
  PLAYER_REPEATS_CHANCE_MAX,
  PLAYER_REPEATS_CHANCE_MIN,
  PLAYER_REPEATS_MAX,
  PLAYER_REPEATS_MIN,
  PLAYER_REPEATS_SPREAD_MAX,
  PLAYER_REPEATS_SPREAD_MIN,
  PLAYER_REST_CHANCE_MAX,
  PLAYER_REST_CHANCE_MIN,
  PLAYER_REST_MAX,
  PLAYER_REST_MIN,
  PLAYER_REST_SPREAD_MAX,
  PLAYER_REST_SPREAD_MIN,
  PLAYER_SPREAD_MAX,
  PLAYER_SPREAD_MIN,
  PLAYER_VARY_CHANCE_MAX,
  PLAYER_VARY_CHANCE_MIN,
  PLAYER_VARY_MAX,
  PLAYER_VARY_MIN,
  type PlayerKnob,
} from "./player.ts";
import {
  PLAYER_PHRASE_CHANCE_MAX,
  PLAYER_PHRASE_CHANCE_MIN,
  PLAYER_PHRASE_KEEP_MAX,
  PLAYER_PHRASE_KEEP_MIN,
  PLAYER_PHRASE_RETURN_MAX,
  PLAYER_PHRASE_RETURN_MIN,
} from "./playerFigure.ts";
import {
  PLAYER_ARRANGE_CHANCE_MAX,
  PLAYER_ARRANGE_CHANCE_MIN,
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
 * The twenty, keyed by the list that declares them, so a knob added to `PLAYER_KNOBS` without a
 * range fails the build rather than reaching a menu as a dial from nowhere.
 *
 * Every bound is the constant declared in src/lib/player.ts rather than a number written again —
 * this file is an assembly of facts, and the argument for each of them lives beside the constant
 * it is (principle 1).
 */
export const PLAYER_KNOB_DIALS: Record<PlayerKnob, KnobDial> = {
  distance: { min: PLAYER_DISTANCE_MIN, max: PLAYER_DISTANCE_MAX, step: 1 },
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
  gate: { min: PLAYER_GATE_MIN, max: PLAYER_GATE_MAX },
  /**
   * The one dial drawn on a log curve, because its range spans three orders of magnitude: drawn
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
  restChance: { min: PLAYER_REST_CHANCE_MIN, max: PLAYER_REST_CHANCE_MAX },
  restSpread: { min: PLAYER_REST_SPREAD_MIN, max: PLAYER_REST_SPREAD_MAX },
  hold: { min: PLAYER_HOLD_MIN, max: PLAYER_HOLD_MAX, step: 1 },
  chance: { min: PLAYER_CHANCE_MIN, max: PLAYER_CHANCE_MAX },
  spread: { min: PLAYER_SPREAD_MIN, max: PLAYER_SPREAD_MAX, step: 1 },
  drift: { min: PLAYER_DRIFT_MIN, max: PLAYER_DRIFT_MAX, step: 1 },
  arrange: { min: PLAYER_ARRANGE_MIN, max: PLAYER_ARRANGE_MAX, step: 1 },
  // A keep counted in rounds of an arrangement, where the one above it is counted in passes of a
  // figure: two ranges that agree on their numbers and are not one, for the reason 0151 gave the
  // first pair — a keep counts whatever it keeps, and these keep different things.
  arrangeKeep: { min: PLAYER_ARRANGE_KEEP_MIN, max: PLAYER_ARRANGE_KEEP_MAX, step: 1 },
  arrangeChance: { min: PLAYER_ARRANGE_CHANCE_MIN, max: PLAYER_ARRANGE_CHANCE_MAX },
  arrangeReturn: { min: PLAYER_ARRANGE_RETURN_MIN, max: PLAYER_ARRANGE_RETURN_MAX },
};

/**
 * Whether a knob counts rather than measures, which is the same question as whether it steps by
 * one. Read wherever a drawn or blended value has to land on a whole number before anything
 * durable holds it — the character arithmetic in src/lib/playerCharacter.ts and every dial that
 * commits a turn — so the two cannot disagree about which knobs are counts.
 */
export const isWholeKnob = (knob: PlayerKnob): boolean => PLAYER_KNOB_DIALS[knob].step === 1;
