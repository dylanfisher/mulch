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

/** How many times a burst may repeat before the next jump. */
export const PLAYER_REPEATS_MIN = 1;
export const PLAYER_REPEATS_MAX = 16;

/**
 * The seam of a jump, in seconds. Every player source opens and closes along the equal-power
 * curve over exactly this, and an ungated step overlaps the next by it, so the pair crosses at
 * constant power rather than clicking (0089, src/lib/crossfade.ts). Short enough to be a seam and
 * not an envelope; long enough that a 48kHz edit has ~96 samples to get from one to the other.
 *
 * It is the seam that sets how short a burst can be heard — five of these is the floor below —
 * so the number was halved to let the burst knob reach a hundred a second. Anything shorter than
 * this is measured in a room before it is written down, not assumed (P82).
 *
 * It sits here rather than beside the other scheduling numbers in src/audio/transport.ts because
 * `PLAYER_BURST_MIN` below is now this floor exactly, and lib may not reach up a tier to say so
 * (0119, docs/map.md). Neither this nor the floor ever touched the graph.
 */
export const PLAYER_FADE_SECS = 0.002;

/**
 * The shortest window the player will play, in wall seconds. Two fades have to fit inside a gated
 * repeat and one more has to overlap the seam, so anything below five of them cannot carry the
 * fades that keep it from clicking. Ten milliseconds — a hundred bursts a second, with ~96
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
 * How much a burst's length is allowed to vary, as a fraction of it, either way. Zero draws
 * exactly the burst every time; one may halve it or leave it a moment shy of double.
 */
export const PLAYER_VARY_MIN = 0;
export const PLAYER_VARY_MAX = 1;

/**
 * How long the pattern rests before the next jump, in slots. Zero runs the bursts continuously,
 * which is the whole of what the module did before it had a rest to take.
 */
export const PLAYER_REST_MIN = 0;
export const PLAYER_REST_MAX = 4;

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
export type PlayerSpec = {
  /** The one field that makes a performance reproducible (0089). A whole number, 0…2³²−1. */
  seed: number;
  variation: PlayerVariation;
  /** Slots a jump may travel, 1…PLAYER_SLOTS. Whole. */
  distance: number;
  /** The most repeats one step may hold, 1…PLAYER_REPEATS_MAX. Whole. */
  repeats: number;
  /** How hard the gate stutters, 0…1. */
  gate: number;
  /** How long one burst sounds, in wall seconds, PLAYER_BURST_MIN…PLAYER_BURST_MAX. */
  burst: number;
  /** How far that length may vary either way, as a fraction of it, 0…1. */
  vary: number;
  /** How long the pattern rests before the next jump, in slots, 0…PLAYER_REST_MAX. */
  rest: number;
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
 * The seven numbers of that spec a hand turns, in the order the card draws them — the seed is
 * drawn rather than turned and the variation is a choice between two named things, so neither is
 * here. The list is what the words in `src/lib/copy.ts` are keyed by, so a field with no caption
 * and no sentence is a hole one test finds (P65, P74).
 */
export const PLAYER_KNOBS = [
  "distance",
  "repeats",
  "gate",
  "burst",
  "vary",
  "rest",
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

/** One step of the pattern: where to read, how long to stay, and how much of each repeat sounds. */
export type PlayerStep = {
  /** Which of `PLAYER_SLOTS` divisions of the loop this step reads from. */
  slot: number;
  /** How many times that burst plays before the next jump. At least one. */
  repeats: number;
  /**
   * How long one of those repeats sounds, in wall seconds — the drawn burst, at least
   * `PLAYER_BURST_MIN`. The one field of a step that owes the loop nothing: the same number
   * sounds for the same time whatever the deck is looping, which is what makes it a grain rather
   * than a subdivision (0119).
   */
  burst: number;
  /** How long nothing sounds before the next step, in slots. Zero is a pattern that never rests. */
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
 * — the two a hand does not turn, then the seven it does, which are named once in `PLAYER_KNOBS`
 * above rather than spelled out a second time here (principle 1).
 */
const PLAYER_FIELDS = ["seed", "variation", ...PLAYER_KNOBS] as const;

/** Whether an outside string is one of the declared variations. A narrowing, not an assertion. */
const isVariation = (value: unknown): value is PlayerVariation =>
  PLAYER_VARIATIONS.some((declared) => declared === value);

/** A finite number in `[min, max]`, or a loud no. The check the four continuous fields share. */
function within(value: unknown, min: number, max: number, at: string): number {
  const number = finite(value, at);
  if (number < min || number > max)
    throw new RangeError(`${at} is outside ${min}…${max}: ${number}`);
  return number;
}

/** The same, and whole with it. The check the four counted fields share. */
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
    repeats: whole(raw["repeats"], PLAYER_REPEATS_MIN, PLAYER_REPEATS_MAX, `${at} repeats`),
    gate: within(raw["gate"], PLAYER_GATE_MIN, PLAYER_GATE_MAX, `${at} gate`),
    burst: within(raw["burst"], PLAYER_BURST_MIN, PLAYER_BURST_MAX, `${at} burst`),
    vary: within(raw["vary"], PLAYER_VARY_MIN, PLAYER_VARY_MAX, `${at} vary`),
    rest: within(raw["rest"], PLAYER_REST_MIN, PLAYER_REST_MAX, `${at} rest`),
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
export function playerWalk(spec: PlayerSpec, from = 0): () => PlayerStep {
  assertPlayer(spec, "a player walk");
  const random = mulberry32(spec.seed);
  let slot = 0;
  /** The rung the hold is on — a signed distance from unity — and how many steps it has held it. */
  let rung = 0;
  let held = 0;
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
    const step: PlayerStep = {
      slot,
      // 1…repeats, so the knob is "at most this many" and one is always reachable.
      repeats: 1 + Math.floor(random() * spec.repeats),
      // At a hardness of zero this is exactly 1 without drawing a different number — the gate is
      // shut off rather than set very open, so an unstuttered pattern has no gain moves inside it.
      gate: Math.max(PLAYER_GATE_FLOOR, 1 - spec.gate * random()),
      // Either way from the burst, so a vary lengthens as readily as it shortens, and never
      // shorter than the shortest burst the module declares.
      burst: Math.max(PLAYER_BURST_MIN, spec.burst * (1 + spec.vary * (2 * random() - 1))),
      // The one field nothing draws: a rest is how long the pattern breathes for, not another
      // thing for it to vary.
      rest: spec.rest,
      rate: PLAYER_RATES[PLAYER_RATE_UNITY + rung] ?? 1,
    };
    const travel = 1 + Math.floor(random() * spec.distance);
    // Forward only ever adds; wander is as likely to go back, drawn after the distance so the two
    // variations walk the same distances and differ only in sign.
    const move = spec.variation === "forward" ? travel : random() < 0.5 ? -travel : travel;
    slot = (((slot + move) % PLAYER_SLOTS) + PLAYER_SLOTS) % PLAYER_SLOTS;
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
        repeats: player.repeats,
        gate: player.gate,
        burst: player.burst,
        vary: player.vary,
        rest: player.rest,
        hold: player.hold,
        chance: player.chance,
        spread: player.spread,
        drift: player.drift,
      };
