/**
 * @role The player's pattern as pure maths — the durable spec a deck carries, and the sequence of
 *   steps a seed unfolds into. Same seed, same steps, on any machine and in any host: this is the
 *   file that makes a jumping performance reproducible (0089, 0068).
 * @instead Turning a step into sound — which source starts when, and the fades at its seams →
 *   src/audio/deck.ts, which is the transport and the only thing that may move a read position.
 *   A step is counted in slots, except its burst, which is the one length that is wall seconds
 *   because it is a grain and not a subdivision (0119).
 */
// Over the 400-line cap, and what is over it is this module's own numbers: every knob it declares
// carries the paragraph saying what its range means and why it is that range, which is the only
// place those arguments exist. Splitting them off would put a bound in one file and its reason in
// another. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { mulberry32 } from "./random.ts";
import { finite, objectAt } from "./guards.ts";
import {
  createFigure,
  PLAYER_PHRASE_CHANCE_MAX,
  PLAYER_PHRASE_CHANCE_MIN,
  PLAYER_PHRASE_KEEP_MAX,
  PLAYER_PHRASE_KEEP_MIN,
  PLAYER_PHRASE_RETURN_MAX,
  PLAYER_PHRASE_RETURN_MIN,
  type FigureSpec,
} from "./playerFigure.ts";

/**
 * The variations, as a declared enum rather than a free number (0089). "forward" only ever moves
 * on through the loop; "wander" is as likely to go back as on. Every other knob the module has is
 * a magnitude, and this is the one choice that is a kind rather than an amount.
 */
export const PLAYER_VARIATIONS = ["forward", "wander"] as const;
export type PlayerVariation = (typeof PLAYER_VARIATIONS)[number];

/**
 * How many divisions the loop is cut into. Sixteen, so the grid is the loop's own sixteenths —
 * which is what "beat-aware where the loop is" means for a loop that was snapped to a bar: the
 * player has no tempo of its own and never needs one, because every position it can name is a
 * fraction of the loop the performer already set.
 */
export const PLAYER_SLOTS = 16;

/** How far a jump may travel, in slots. One is the next slot along; the whole grid is anywhere. */
export const PLAYER_DISTANCE_MIN = 1;
export const PLAYER_DISTANCE_MAX = PLAYER_SLOTS;

/**
 * How many slots make one figure — the run the walk lays down and then reads back, so a pattern
 * says something twice before it says anything new (0151). Zero is off, and off is the memoryless
 * walk this module was until it could keep a figure: every knob it had shaped the draw of the next
 * slot and none of them made the pattern repeat itself.
 *
 * The ceiling is the whole grid. A figure longer than the loop has slots would be a run repeating
 * over a thing shorter than itself, which is a loop and not a figure.
 *
 * Here rather than in src/lib/playerFigure.ts with the figure's other three amounts, and it has to
 * be: this is the one of the four derived from `PLAYER_SLOTS`, and a figure module reaching back
 * for that constant would close a cycle the two files evaluate inside — this bound is read at
 * module init, so a cycle is a TDZ throw at load and not a slow import. A phrase's length is a
 * grid fact, like the distance above it; what becomes of a figure is not.
 */
export const PLAYER_PHRASE_MIN = 0;
export const PLAYER_PHRASE_MAX = PLAYER_SLOTS;

/**
 * How many times a burst repeats before the next jump. Sixty-four, so a step at the burst
 * floor can hold a landing for a third of a second rather than a sixteenth of one: the shorter
 * the grain, the more of them one landing takes to be heard as a landing at all, and the count is
 * the only knob that says how long the pattern stays put.
 */
export const PLAYER_REPEATS_MIN = 1;
export const PLAYER_REPEATS_MAX = 64;

/**
 * The odds a repeat count that is due to be redrawn actually is, 0…1. One redraws on every count
 * the hold is up on; zero keeps the count the dial says forever, whatever the hold says. Rolled
 * on every jump the hold is due on, so a failed roll is the same odds again on the next jump and
 * never a redraw postponed — the rate walk's chance, said for the count instead (0134, 0135).
 */
export const PLAYER_REPEATS_CHANCE_MIN = 0;
export const PLAYER_REPEATS_CHANCE_MAX = 1;

/**
 * How far a redrawn count may stray from the dial, in repeats, either way. Zero is the dial's own
 * number every time, which is what 0134 made the count mean and what it still means until this is
 * turned up. The ceiling is the whole dial: the widest stray that can reach either end of the
 * range from anywhere on it, and no wider, since a window is clipped to `PLAYER_REPEATS_MIN…MAX`
 * rather than wrapped.
 */
export const PLAYER_REPEATS_SPREAD_MIN = 0;
export const PLAYER_REPEATS_SPREAD_MAX = PLAYER_REPEATS_MAX - PLAYER_REPEATS_MIN;

// How many jumps keep one count is `PLAYER_HOLD_MIN…PLAYER_HOLD_MAX` below: a hold is counted in
// jumps whatever it is holding, so the two are one range and not two that happen to agree
// (principle 1). Zero keeps one count forever, which is the arithmetic 0134 asked for.

/**
 * The seam of a jump, in seconds. Every player source opens and closes along the equal-power
 * curve over exactly this, and an ungated step overlaps the next by it, so the pair crosses at
 * constant power rather than clicking (0089, src/lib/crossfade.ts). Short enough to be a seam and
 * not an envelope; long enough that a 48kHz edit has ~48 samples to get from one to the other.
 *
 * It is the seam that sets how short a burst can be heard — five of these is the floor below — so
 * the number is halved again to let the burst knob reach two hundred a second: 1ms is ~48 samples
 * at 48kHz to get from one step to the next, which is a seam a room hears as a seam and not as a
 * click (0120).
 *
 * It sits here rather than beside the other scheduling numbers in src/audio/transport.ts because
 * `PLAYER_BURST_MIN` below is now this floor exactly, and lib may not reach up a tier to say so
 * (0119, docs/map.md). Neither this nor the floor ever touched the graph.
 */
export const PLAYER_FADE_SECS = 0.001;

/**
 * The shortest window the player will play, in wall seconds. Two fades have to fit inside a gated
 * repeat and one more has to overlap the seam, so anything below five of them cannot carry the
 * fades that keep it from clicking. Five milliseconds — two hundred bursts a second, with ~48
 * samples at 48kHz to get from one step to the next. A deck whose loop divides into slots shorter
 * than this plays its loop and does not jump (docs/plan.md §4).
 */
export const PLAYER_MIN_SLOT_SECS = PLAYER_FADE_SECS * 5;

/**
 * How long one burst sounds before the next one, **in wall seconds**. A duration and not a
 * fraction of the loop: the burst is the grain this module has to offer, so its length is what a
 * listener hears as timbre, and under ~50ms its own repetition is a pitch. Measured in slots that
 * pitch was the loop's length — moving an out point transposed every burst on the deck, which is
 * the one thing a grain length must not do (0119). Distance and rest stay in slots, because those
 * are rhythm, and rhythm is the loop's.
 *
 * The floor is the seam's own, `PLAYER_MIN_SLOT_SECS`: the wall-second window the transport
 * already refuses to go below, so the knob bottoms out exactly where the sound does rather than
 * above or below it depending on which loop it happened to be over. The ceiling is what four
 * slots of an eight-second loop used to buy.
 *
 * Still over two orders of magnitude, so the one dial that reads this is drawn on a log curve
 * (src/ui/PlayerCard.tsx).
 */
export const PLAYER_BURST_MIN = PLAYER_MIN_SLOT_SECS;
export const PLAYER_BURST_MAX = 2;

/**
 * The finest a hand may set the burst, and the reason it is not the floor itself: the dial that
 * reads it is drawn on a log curve, where an arrow key moves by a fraction of the whole sweep
 * rather than by a step — about 7% of the value over a sweep this wide. At the floor that is
 * under half a step, and a knob whose key press snaps back to where it started answers no key at
 * all. A slot's division, applied to the floor, clears half a step everywhere in the range
 * (0064, src/ui/Knob.tsx).
 */
export const PLAYER_BURST_STEP = PLAYER_BURST_MIN / PLAYER_SLOTS;

/**
 * How much a burst's length is allowed to stray either way, **in wall seconds** — the burst's own
 * unit, on the burst's own range. Zero draws exactly the burst every time; the whole of it may
 * reach from the floor to a burst's length past the ceiling.
 *
 * Clamped at the burst floor and nowhere else, so a vary far larger than the burst it strays is
 * one-sided in practice: it lengthens freely and shortens only down to `PLAYER_BURST_MIN`.
 *
 * A fraction of the burst until P97, which made this the one dial on the card saying a number
 * nothing beside it was said in: a vary of 0.5 was half of whatever the burst happened to be, so
 * the two dials could not be read against each other and moving the burst moved what the vary
 * meant. Said in seconds, "vary" is this much either side of the burst and the pair compares by
 * eye (0135).
 *
 * Linear where the burst is logarithmic, because a log range cannot hold a zero
 * (`assertLogRange`, src/lib/range.ts) and this one's zero is the value that turns it off. Its
 * step is the burst's, `PLAYER_BURST_STEP`, so the finest stray a hand can set is the finest
 * burst it can set.
 */
export const PLAYER_VARY_MIN = 0;
export const PLAYER_VARY_MAX = PLAYER_BURST_MAX;

/**
 * The odds one landing's length is varied at all, 0…1. One varies every landing, which is the
 * whole of what `vary` did before it had a chance behind it; zero leaves every landing at the
 * length the dial says, which is what a vary of zero also gives and by a different road. The roll
 * is taken per landing, so a failed one is not a variation deferred.
 *
 * It is the chance the rate walk has, said for the burst instead: the `+` marker on the Vary dial
 * holds this one alone, because Vary *is* the spread of a burst and a drift is a property of a
 * walk, which a burst length is not — it is drawn fresh at every landing (P87).
 */
export const PLAYER_VARY_CHANCE_MIN = 0;
export const PLAYER_VARY_CHANCE_MAX = 1;

/**
 * How long the pattern rests before the next jump, in slots. Zero runs the bursts continuously,
 * which is the whole of what the module did before it had a rest to take.
 */
export const PLAYER_REST_MIN = 0;
export const PLAYER_REST_MAX = 4;

/**
 * The odds a wait is actually taken, 0…1. One waits before every jump, which is what the rest did
 * before it had a chance behind it; anything less makes the wait a maybe and the pattern's rhythm
 * uneven without a second dial for it. Rolled per jump, so a failed roll is a jump that runs on.
 */
export const PLAYER_REST_CHANCE_MIN = 0;
export const PLAYER_REST_CHANCE_MAX = 1;

/**
 * How far a taken wait may stray from the dial, as a fraction of it, either way — the spread the
 * rate walk has, said for a wait instead, and captioned with the same word for that reason. Zero
 * waits exactly as long every time; one may halve the wait or leave it a moment shy of double.
 * There is no drift beside it: a wait is drawn fresh at every jump rather than walked, so there is
 * no rest it could be travelling from (P87).
 */
export const PLAYER_REST_SPREAD_MIN = 0;
export const PLAYER_REST_SPREAD_MAX = 1;

/**
 * How many jumps hold one read rate before a new one is drawn. Zero holds one rate forever — the
 * deck's own is then the only one the pattern reads at — and anything else is what makes a
 * pattern evolve rather than repeat.
 */
export const PLAYER_HOLD_MIN = 0;
export const PLAYER_HOLD_MAX = 16;

/**
 * The read rates a hold lets go of, as ratios of the deck's own — a ladder rather than a set, and
 * walked in rungs exactly as the loop is walked in slots (0118). Symmetric about unity at the
 * centre, so a rung is a signed distance from the deck's own rate and the two directions are the
 * same size.
 *
 * Still closed rather than a continuous range: what a rate may *be* is the module's decision and
 * these nine are musical intervals, while how far it strays, how far one change leaps and whether
 * it fires at all are the performer's, which is what `spread`, `drift` and `chance` are.
 */
export const PLAYER_RATES = [0.25, 0.375, 0.5, 0.75, 1, 1.5, 2, 3, 4] as const;

/** Where 1 sits on that ladder: the rung a walk starts on and measures its distance from. */
export const PLAYER_RATE_UNITY = 4;

/** How many rungs either way. The bound on `spread`, and the ceiling on `drift`. */
export const PLAYER_RATE_RUNGS = 4;

/**
 * The odds a change that is due actually happens, 0…1. One is a hold that always lets go on its
 * count, which is the whole of what the module did before it could roll; zero holds the rate it
 * is on forever whatever the count says. The roll is taken every jump the hold is due on, so a
 * failed one is not a change deferred — it is the same odds again on the next jump.
 */
export const PLAYER_CHANCE_MIN = 0;
export const PLAYER_CHANCE_MAX = 1;

/**
 * How far from the deck's own rate a drawn rate may sit, in rungs. Zero never leaves it — the
 * pattern is then jumps at one speed, which `hold: 0` also gives and by a different road. Two is
 * the ladder this module had before it had a knob for it, 0.5…2; the whole of it is an octave
 * either way.
 */
export const PLAYER_SPREAD_MIN = 0;
export const PLAYER_SPREAD_MAX = PLAYER_RATE_RUNGS;

/**
 * The most rungs one change may travel from the rate it is on. One steps to a neighbouring rate
 * and never further, so a pattern slides; the whole ladder may leap anywhere inside the spread,
 * which is what the uniform draw this replaced always did. It is `distance` a rung down, and it
 * is bounded by the spread rather than by itself.
 */
export const PLAYER_DRIFT_MIN = 1;
export const PLAYER_DRIFT_MAX = PLAYER_RATE_RUNGS;

/**
 * How hard the gate stutters, as the fraction of each repeat it may cut. Zero leaves every repeat
 * whole — the player is then jumps and nothing else — and one may cut a repeat down to
 * `PLAYER_GATE_FLOOR` of itself.
 */
export const PLAYER_GATE_MIN = 0;
export const PLAYER_GATE_MAX = 1;

/** The shortest a gated repeat may be drawn, as a fraction of the slot. Below this it is a click. */
export const PLAYER_GATE_FLOOR = 0.05;

/** The seed's range: the 32 bits `mulberry32` has state for, as a whole number. */
export const PLAYER_SEED_MAX = 0xff_ff_ff_ff;

/**
 * The shared jump clock, in seconds: how often any jumping yard's next step may begin. Wall
 * seconds rather than slots, because seconds are the one thing yards with different loops can
 * share — a slot is a sixteenth of whatever loop its own deck holds, and no two decks need hold
 * the same one (P68, 0097).
 *
 * An eighth of a second at the short end, where a clock is faster than the bursts it is gathering
 * and gathers nothing; eight seconds at the long end, past which two yards landing together is no
 * longer something a listener hears as together.
 */
export const SYNC_MIN_SECS = 0.125;
export const SYNC_MAX_SECS = 8;

/** A tick is a multiple of the period, so a step already on one must not be pushed to the next. */
const SYNC_TOLERANCE = 1e-9;

/**
 * What a deck durably holds when its player is on. Null on the deck is the whole of "off" — the
 * same shape `loop` has, and for the same reason: there is no second field that could disagree
 * with it.
 */
export type PlayerSpec = FigureSpec & {
  /** The one field that makes a performance reproducible (0089). A whole number, 0…2³²−1. */
  seed: number;
  variation: PlayerVariation;
  /** Slots a jump may travel, 1…PLAYER_SLOTS. Whole. */
  distance: number;
  /** How many repeats one step holds, 1…PLAYER_REPEATS_MAX. Whole. */
  repeats: number;
  /** The odds a count that is due to be redrawn is, 0…1. */
  repeatsChance: number;
  /** How far a redrawn count may stray from that, in repeats, 0…PLAYER_REPEATS_SPREAD_MAX. */
  repeatsSpread: number;
  /** How many jumps keep one count, PLAYER_HOLD_MIN…PLAYER_HOLD_MAX. Whole; zero keeps it. */
  repeatsHold: number;
  /** How hard the gate stutters, 0…1. */
  gate: number;
  /** How long one burst sounds, in wall seconds, PLAYER_BURST_MIN…PLAYER_BURST_MAX. */
  burst: number;
  /** How far that length may vary either way, as a fraction of it, 0…1. */
  vary: number;
  /** The odds one landing's length is varied at all, 0…1. */
  varyChance: number;
  /** How long the pattern rests before the next jump, in slots, 0…PLAYER_REST_MAX. */
  rest: number;
  /** The odds a wait is taken, 0…1. */
  restChance: number;
  /** How far a taken wait may stray from that, as a fraction of it, 0…1. */
  restSpread: number;
  /** How many jumps hold one read rate before a new one is drawn. Whole; zero holds one forever. */
  hold: number;
  /** The odds a due change fires, 0…1. */
  chance: number;
  /** How far from the deck's own rate a rate may sit, in rungs, 0…PLAYER_RATE_RUNGS. Whole. */
  spread: number;
  /** The most rungs one change may travel, 1…PLAYER_RATE_RUNGS. Whole. */
  drift: number;
};

/**
 * Every field a switch press leaves at a value: the whole spec but the seed, which is drawn at
 * the gesture rather than defaulted (0089). Named here so the card that declares those values and
 * the four menus that snap a dial back to one are keyed against the same list (principle 1).
 */
export type PlayerDefaults = Omit<PlayerSpec, "seed">;

/**
 * Every number of that spec a hand turns, in the order the card draws them — the seed is drawn
 * rather than turned and the variation is a choice between two named things, so neither is here.
 * The list is what the words in `src/lib/copy.ts` are keyed by, so a field with no caption and no
 * sentence is a hole one test finds (P65, P74).
 */
export const PLAYER_KNOBS = [
  "distance",
  "phrase",
  "phraseKeep",
  "phraseChance",
  "phraseReturn",
  "repeats",
  "repeatsChance",
  "repeatsSpread",
  "repeatsHold",
  "gate",
  "burst",
  "vary",
  "varyChance",
  "rest",
  "restChance",
  "restSpread",
  "hold",
  "chance",
  "spread",
  "drift",
] as const satisfies readonly (keyof PlayerSpec)[];
export type PlayerKnob = (typeof PLAYER_KNOBS)[number];

/**
 * The three of those that shape the rate walk rather than the jump: what the module lets go of
 * when a hold expires, as against where and for how long it lands (0118). They are the ones drawn
 * behind the marker on the Hold dial instead of on the card's own row — a partition of
 * `PLAYER_KNOBS` and not a second list of it, so a knob can be in exactly one of the two places
 * and the split is declared once (src/ui/PlayerRate.tsx).
 */
export const PLAYER_RATE_KNOBS = [
  "chance",
  "spread",
  "drift",
] as const satisfies readonly PlayerKnob[];

/**
 * What the `+` marker on the Repeats dial holds: the same three the rate walk carries, said for
 * the count — whether a due redraw fires, how far it strays, and how many jumps keep one (0135).
 * There is no drift beside them: a redrawn count is drawn fresh inside the spread rather than
 * travelled from the count it is on, so there is nothing a drift could bound
 * ([0124](../../docs/decisions/0124-a-drawn-number-carries-the-amounts-that-shape-its-draw.md)).
 */
export const PLAYER_REPEATS_KNOBS = [
  "repeatsChance",
  "repeatsSpread",
  "repeatsHold",
] as const satisfies readonly PlayerKnob[];

/**
 * What the `+` marker on the Phrase dial holds: how many passes keep one figure, whether a kept
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

/** What the `+` marker on the Vary dial holds: the chance a landing is varied at all (P87). */
export const PLAYER_VARY_KNOBS = ["varyChance"] as const satisfies readonly PlayerKnob[];

/** What the `+` marker on the Rest dial holds: whether a wait is taken, and how much it strays. */
export const PLAYER_REST_KNOBS = [
  "restChance",
  "restSpread",
] as const satisfies readonly PlayerKnob[];

/**
 * Every knob behind a marker rather than on the card's own row, which is the four menus and
 * nothing else. A partition of `PLAYER_KNOBS` with the row's own dials as its complement, so a
 * knob is drawn in exactly one place and the split is declared here rather than at each surface.
 */
export const PLAYER_MENU_KNOBS = [
  ...PLAYER_PHRASE_KNOBS,
  ...PLAYER_REPEATS_KNOBS,
  ...PLAYER_VARY_KNOBS,
  ...PLAYER_REST_KNOBS,
  ...PLAYER_RATE_KNOBS,
] as const satisfies readonly PlayerKnob[];

/** One step of the pattern: where to read, how long to stay, and how much of each repeat sounds. */
export type PlayerStep = {
  /** Which of `PLAYER_SLOTS` divisions of the loop this step reads from. */
  slot: number;
  /** How many times that burst plays before the next jump — the count this step is held at. */
  repeats: number;
  /**
   * How long one of those repeats sounds, in wall seconds — the drawn burst, at least
   * `PLAYER_BURST_MIN`. The one field of a step that owes the loop nothing: the same number
   * sounds for the same time whatever the deck is looping, which is what makes it a grain rather
   * than a subdivision (0119).
   */
  burst: number;
  /**
   * How long nothing sounds before the next step, in slots. Zero is a step that runs straight on —
   * a pattern that never rests, or one whose wait this jump's roll refused. A taken wait may stray
   * either side of the dial, so this reaches twice `PLAYER_REST_MAX` at the widest (P87).
   */
  rest: number;
  /** The ratio of the deck's own read rate this step reads at — one of `PLAYER_RATES`. */
  rate: number;
  /**
   * The fraction of each repeat that sounds before the gate closes, in
   * `[PLAYER_GATE_FLOOR, 1]`. Exactly 1 is a repeat nothing cuts, which is what a gate of zero
   * draws every time.
   */
  gate: number;
};

/**
 * The durable fields, in the order they are declared. The one list a stored spec is keyed against
 * — the two a hand does not turn, then every one it does, which are named once in `PLAYER_KNOBS`
 * above rather than spelled out a second time here (principle 1).
 */
const PLAYER_FIELDS = ["seed", "variation", ...PLAYER_KNOBS] as const;

/** Whether an outside string is one of the declared variations. A narrowing, not an assertion. */
const isVariation = (value: unknown): value is PlayerVariation =>
  PLAYER_VARIATIONS.some((declared) => declared === value);

/** A finite number in `[min, max]`, or a loud no. The check every continuous field shares. */
function within(value: unknown, min: number, max: number, at: string): number {
  const number = finite(value, at);
  if (number < min || number > max)
    throw new RangeError(`${at} is outside ${min}…${max}: ${number}`);
  return number;
}

/** The same, and whole with it. The check every counted field shares. */
function whole(value: unknown, min: number, max: number, at: string): number {
  const number = within(value, min, max, at);
  if (!Number.isInteger(number)) throw new RangeError(`${at} is not whole: ${number}`);
  return number;
}

/**
 * A player off the wire or out of storage, checked, with null passed through as the whole of
 * "off". Loud rather than clamped: every field is durable and carried by a command, and a player
 * quietly running a pattern nobody asked for is exactly the failure this refuses (principle 5).
 *
 * The one validator: the command wire and the stored session both come through here, so there is
 * no second copy of what a spec is allowed to be.
 */
// One check per durable field, so the length is how many fields the spec declares rather than how
// much this function decides — and every one of them is here because there is exactly one
// validator. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function assertPlayer(value: unknown, at: string): PlayerSpec | null {
  if (value === null) return null;
  const raw = objectAt(value, at);
  // Exactly these keys — no extras and none missing, the way a stored deck is keyed
  // (src/state/session.ts): a field nobody declared is a spec from another build, not a spec.
  const keys = Object.keys(raw);
  if (keys.length !== PLAYER_FIELDS.length || PLAYER_FIELDS.some((f) => !Object.hasOwn(raw, f))) {
    throw new TypeError(`${at} has ${keys.join(", ")}, expected ${PLAYER_FIELDS.join(", ")}`);
  }
  const variation: unknown = raw["variation"];
  if (!isVariation(variation)) {
    throw new TypeError(`${at} variation is not one declared: ${String(variation)}`);
  }
  return {
    seed: whole(raw["seed"], 0, PLAYER_SEED_MAX, `${at} seed`),
    variation,
    distance: whole(raw["distance"], PLAYER_DISTANCE_MIN, PLAYER_DISTANCE_MAX, `${at} distance`),
    phrase: whole(raw["phrase"], PLAYER_PHRASE_MIN, PLAYER_PHRASE_MAX, `${at} phrase`),
    phraseKeep: whole(
      raw["phraseKeep"],
      PLAYER_PHRASE_KEEP_MIN,
      PLAYER_PHRASE_KEEP_MAX,
      `${at} phraseKeep`,
    ),
    phraseChance: within(
      raw["phraseChance"],
      PLAYER_PHRASE_CHANCE_MIN,
      PLAYER_PHRASE_CHANCE_MAX,
      `${at} phraseChance`,
    ),
    phraseReturn: within(
      raw["phraseReturn"],
      PLAYER_PHRASE_RETURN_MIN,
      PLAYER_PHRASE_RETURN_MAX,
      `${at} phraseReturn`,
    ),
    repeats: whole(raw["repeats"], PLAYER_REPEATS_MIN, PLAYER_REPEATS_MAX, `${at} repeats`),
    repeatsChance: within(
      raw["repeatsChance"],
      PLAYER_REPEATS_CHANCE_MIN,
      PLAYER_REPEATS_CHANCE_MAX,
      `${at} repeatsChance`,
    ),
    repeatsSpread: whole(
      raw["repeatsSpread"],
      PLAYER_REPEATS_SPREAD_MIN,
      PLAYER_REPEATS_SPREAD_MAX,
      `${at} repeatsSpread`,
    ),
    repeatsHold: whole(raw["repeatsHold"], PLAYER_HOLD_MIN, PLAYER_HOLD_MAX, `${at} repeatsHold`),
    gate: within(raw["gate"], PLAYER_GATE_MIN, PLAYER_GATE_MAX, `${at} gate`),
    burst: within(raw["burst"], PLAYER_BURST_MIN, PLAYER_BURST_MAX, `${at} burst`),
    vary: within(raw["vary"], PLAYER_VARY_MIN, PLAYER_VARY_MAX, `${at} vary`),
    varyChance: within(
      raw["varyChance"],
      PLAYER_VARY_CHANCE_MIN,
      PLAYER_VARY_CHANCE_MAX,
      `${at} varyChance`,
    ),
    rest: within(raw["rest"], PLAYER_REST_MIN, PLAYER_REST_MAX, `${at} rest`),
    restChance: within(
      raw["restChance"],
      PLAYER_REST_CHANCE_MIN,
      PLAYER_REST_CHANCE_MAX,
      `${at} restChance`,
    ),
    restSpread: within(
      raw["restSpread"],
      PLAYER_REST_SPREAD_MIN,
      PLAYER_REST_SPREAD_MAX,
      `${at} restSpread`,
    ),
    hold: whole(raw["hold"], PLAYER_HOLD_MIN, PLAYER_HOLD_MAX, `${at} hold`),
    chance: within(raw["chance"], PLAYER_CHANCE_MIN, PLAYER_CHANCE_MAX, `${at} chance`),
    spread: whole(raw["spread"], PLAYER_SPREAD_MIN, PLAYER_SPREAD_MAX, `${at} spread`),
    drift: whole(raw["drift"], PLAYER_DRIFT_MIN, PLAYER_DRIFT_MAX, `${at} drift`),
  };
}

/**
 * A session's jump clock off the wire or out of storage, checked, with null passed through as
 * the whole of "no clock" — every yard then keeps its own time, which is what the player did
 * before it had one to share. The one validator: the command wire and the stored session both
 * come through here (0097).
 */
export function assertSync(value: unknown, at: string): number | null {
  if (value === null) return null;
  return within(value, SYNC_MIN_SECS, SYNC_MAX_SECS, at);
}

/**
 * When the next step may begin: `at` itself with no clock, and otherwise the first tick at or
 * after it. Ticks are counted from the context's own zero and from nothing else — never from
 * whichever deck happened to start first — which is what keeps a synced render a function of the
 * session rather than of the order its yards were played (0097, 0068).
 */
export const syncedFrom = (at: number, sync: number | null): number =>
  sync === null ? at : Math.ceil(at / sync - SYNC_TOLERANCE) * sync;

/**
 * Where a rate change lands, in rungs from unity: uniform over the rungs the drift can reach and
 * the spread allows, with the one it is already on taken out — so a change always changes
 * something, and neither end of the ladder is over-represented the way clamping a leap into range
 * would make it (0118).
 *
 * `rung` is always inside `[-spread, spread]`: a walk starts at zero, zero is inside every spread,
 * and every draw lands in the window. So `hi - lo` counts the reachable rungs exactly once the
 * current one is removed, and the shift below turns a pick at or above it into the rung past it.
 */
function drawRung(random: () => number, rung: number, spread: number, drift: number): number {
  const lo = Math.max(-spread, rung - drift);
  const hi = Math.min(spread, rung + drift);
  const reach = hi - lo;
  // A spread of zero: there is nowhere to go, and holding the deck's own rate is the point of it.
  if (reach <= 0) return rung;
  const pick = lo + Math.floor(random() * reach);
  return pick >= rung ? pick + 1 : pick;
}

/**
 * How long one landing sounds: the burst, strayed by as much as `vary` either way — on the
 * landings the chance lets stray. A spec that never varies rolls nothing, so the stream it lays
 * down is the one it laid before the chance existed (P87).
 */
function drawBurst(random: () => number, spec: PlayerSpec): number {
  const stray = spec.vary > 0 && random() < spec.varyChance ? spec.vary : 0;
  return Math.max(PLAYER_BURST_MIN, spec.burst + stray * (2 * random() - 1));
}

/**
 * Which count the next hold is kept at: uniform over the whole numbers within `repeatsSpread` of
 * the dial, clipped to the range the dial itself has. Called only where the spread is above zero,
 * so the window always holds at least two counts. Clipped rather than wrapped, so a spread
 * wider than the room below the dial simply reaches the floor — and drawn fresh rather than
 * travelled from the count it is on, which is why there is no drift beside it (0135).
 */
function drawRepeats(random: () => number, spec: PlayerSpec): number {
  const lo = Math.max(PLAYER_REPEATS_MIN, spec.repeats - spec.repeatsSpread);
  const hi = Math.min(PLAYER_REPEATS_MAX, spec.repeats + spec.repeatsSpread);
  return lo + Math.floor(random() * (hi - lo + 1));
}

/**
 * How long the pattern waits before the next jump, in slots: the rest, taken on the jumps the
 * chance allows and strayed by as much as `restSpread` either way. A pattern that never rests rolls
 * nothing. A refused wait is zero rather than a shorter one — the whole of what "no wait" means
 * here is the steps butting up, which is what a rest of zero already gives (P87).
 */
function drawRest(random: () => number, spec: PlayerSpec): number {
  if (spec.rest === 0) return 0;
  if (random() >= spec.restChance) return 0;
  return spec.rest * (1 + spec.restSpread * (2 * random() - 1));
}

/**
 * The pattern as a walk: call it for the next step, forever. The first step is always slot 0 —
 * a play begins at the top of the loop and the jumping starts after it — and every step after it
 * is drawn from the seed alone.
 *
 * Stateful on purpose, and the state is a cursor rather than a fact: the walk is built fresh from
 * the seed at every `start()`, so a play, a re-play and an offline render of the same session all
 * lay down the same sequence and nothing durable has to remember where the pattern had reached
 * (0089).
 *
 * `from` is how many steps of this same walk have already been laid down, drawn and thrown away
 * so the caller gets the tail rather than the whole. It is what lets a knob moved mid-pattern
 * re-derive the steps past the fade horizon without restarting the pattern, and it keeps the
 * result a pure function of the seed, the spec and a step count — never of a wall clock (P67).
 */
// One draw per field of a step plus the two walks it keeps between them, each with the paragraph
// saying why it is drawn where it is — the length is the step's shape and not this function's.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function playerWalk(spec: PlayerSpec, from = 0): () => PlayerStep {
  assertPlayer(spec, "a player walk");
  const random = mulberry32(spec.seed);
  let slot = 0;
  /** The rung the hold is on — a signed distance from unity — and how many steps it has held it. */
  let rung = 0;
  let held = 0;
  /** The count the pattern is on, and how many steps it has kept it. The dial's own to begin. */
  let count = spec.repeats;
  let kept = 0;

  /**
   * Where one jump from `at` lands: how far, then which way, then wrapped onto the grid. The one
   * move this module makes, and the figure below is handed it so that an evolving figure moves by
   * exactly the jump an ordinary step takes (0151).
   *
   * Forward only ever adds; wander is as likely to go back, drawn after the distance so the two
   * variations walk the same distances and differ only in sign.
   */
  const travelFrom = (at: number): number => {
    const far = 1 + Math.floor(random() * spec.distance);
    const move = spec.variation === "forward" ? far : random() < 0.5 ? -far : far;
    return (((at + move) % PLAYER_SLOTS) + PLAYER_SLOTS) % PLAYER_SLOTS;
  };

  /**
   * The walk's memory, over this walk's own generator: a figure's draws have to sit in the one
   * stream the pattern is a function of, or a moved knob could not re-derive the tail (0096).
   */
  const figure = createFigure(spec, random, travelFrom);

  const next = (): PlayerStep => {
    // Drawn before the step that reads at it, so the first step of a pattern is always the deck's
    // own rate and a hold of zero draws nothing at all.
    // The roll is taken whenever a change is due and whatever it says, so the stream stays a pure
    // function of the spec and the step count — which is what lets a moved knob re-derive the tail
    // (0096). A failed roll leaves `held` where it is: the next jump is due again and rolls again,
    // which is what a chance to change means rather than a change postponed.
    if (spec.hold > 0 && held >= spec.hold && random() < spec.chance) {
      rung = drawRung(random, rung, spec.spread, spec.drift);
      held = 0;
    }
    held++;
    // The count's own hold, read exactly as the rate's is one line up (0135).
    // The spread switches this on, the way `vary` and `rest` switch their own draws on: at zero
    // nothing is rolled, so a keep cannot move every field but the count it names (0134, 0135).
    if (
      spec.repeatsSpread > 0 &&
      spec.repeatsHold > 0 &&
      kept >= spec.repeatsHold &&
      random() < spec.repeatsChance
    ) {
      count = drawRepeats(random, spec);
      kept = 0;
    }
    kept++;
    const step: PlayerStep = {
      slot,
      // The count the pattern is holding: the dial's own until a hold lets go of it, and never a
      // draw the performer cannot turn off — which is what the count was before it had a spread
      // and a chance of its own (0134, 0135).
      repeats: count,
      // At a hardness of zero this is exactly 1 without drawing a different number — the gate is
      // shut off rather than set very open, so an unstuttered pattern has no gain moves inside it.
      gate: Math.max(PLAYER_GATE_FLOOR, 1 - spec.gate * random()),
      // Either way from the burst, so a vary lengthens as readily as it shortens, and never
      // shorter than the shortest burst the module declares.
      burst: drawBurst(random, spec),
      // How long the pattern breathes for, which is now drawn too: whether the wait is taken at
      // all and how far it strays are the two amounts behind the Rest dial's own marker (P87).
      rest: drawRest(random, spec),
      rate: PLAYER_RATES[PLAYER_RATE_UNITY + rung] ?? 1,
    };
    // Where the next step reads from: the figure's, which keeping none is one ordinary jump and
    // nothing else, and keeping one is a run of slots laid down and played back — so a pattern
    // says something twice before it says anything new, while every other field of a step goes on
    // being drawn fresh at every step (0151, src/lib/playerFigure.ts).
    slot = figure(slot);
    return step;
  };
  for (let step = 0; step < from; step++) next();
  return next;
}

/** The first `count` steps of the walk, for a caller that wants the sequence rather than a cursor. */
export function playerSequence(spec: PlayerSpec, count: number): PlayerStep[] {
  const walk = playerWalk(spec);
  return Array.from({ length: count }, () => walk());
}

/**
 * One player rebuilt in its declared field order, or null. The projection the durable session
 * takes: history compares two sessions as JSON text, so one pattern has to have exactly one
 * spelling however the command that set it happened to be keyed (0021).
 */
export const playerProjection = (player: PlayerSpec | null): PlayerSpec | null =>
  player === null
    ? null
    : {
        seed: player.seed,
        variation: player.variation,
        distance: player.distance,
        phrase: player.phrase,
        phraseKeep: player.phraseKeep,
        phraseChance: player.phraseChance,
        phraseReturn: player.phraseReturn,
        repeats: player.repeats,
        repeatsChance: player.repeatsChance,
        repeatsSpread: player.repeatsSpread,
        repeatsHold: player.repeatsHold,
        gate: player.gate,
        burst: player.burst,
        vary: player.vary,
        varyChance: player.varyChance,
        rest: player.rest,
        restChance: player.restChance,
        restSpread: player.restSpread,
        hold: player.hold,
        chance: player.chance,
        spread: player.spread,
        drift: player.drift,
      };
