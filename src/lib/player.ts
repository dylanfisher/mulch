/**
 * @role The player's pattern as pure maths — the durable spec a deck carries, and the sequence of
 *   steps a seed unfolds into. Same seed, same steps, on any machine and in any host: this is the
 *   file that makes a jumping performance reproducible (0089, 0068).
 * @instead Turning a step into sound — which source starts when, and the fades at its seams →
 *   src/audio/deck.ts, which is the transport and the only thing that may move a read position.
 *   Nothing here knows what a second is: a step is counted in slots.
 */
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
 * How long one burst sounds before the next one, in slots. It is the player's own clock rather
 * than the grid's: below one the burst is shorter than the slot it started in, which is the short
 * burst inside a long loop the module was missing, and above one it reads on past that slot.
 */
export const PLAYER_BURST_MIN = 0.125;
export const PLAYER_BURST_MAX = 4;

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
 * How many jumps hold one read rate before a new one is drawn. Zero never drifts and the deck's
 * own rate is the only one the pattern reads at; anything else is what makes a pattern evolve
 * rather than repeat.
 */
export const PLAYER_DRIFT_MIN = 0;
export const PLAYER_DRIFT_MAX = 16;

/**
 * The read rates a drift draws from, as ratios of the deck's own. A closed set rather than a
 * range, and the reason `drift` is a count and not a magnitude: how far the rate may wander is
 * the module's decision, and how often it does is the performer's.
 */
export const PLAYER_RATES = [0.5, 0.75, 1, 1.5, 2] as const;

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
  /** How long one burst sounds, in slots, PLAYER_BURST_MIN…PLAYER_BURST_MAX. */
  burst: number;
  /** How far that length may vary either way, as a fraction of it, 0…1. */
  vary: number;
  /** How long the pattern rests before the next jump, in slots, 0…PLAYER_REST_MAX. */
  rest: number;
  /** How many jumps hold one read rate before a new one is drawn. Whole; zero never drifts. */
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
  "drift",
] as const satisfies readonly (keyof PlayerSpec)[];
export type PlayerKnob = (typeof PLAYER_KNOBS)[number];

/** One step of the pattern: where to read, how long to stay, and how much of each repeat sounds. */
export type PlayerStep = {
  /** Which of `PLAYER_SLOTS` divisions of the loop this step reads from. */
  slot: number;
  /** How many times that burst plays before the next jump. At least one. */
  repeats: number;
  /**
   * How long one of those repeats sounds, in slots — the drawn burst, at least
   * `PLAYER_BURST_MIN`. Exactly one is a repeat that is the slot it started in, which is what a
   * vary of zero draws from the default burst.
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
  /** The rate the drift is holding, and how many steps it has held it for. */
  let rate = 1;
  let held = 0;
  const next = (): PlayerStep => {
    // Drawn before the step that reads at it, so the first step of a pattern is always the deck's
    // own rate and a drift of zero draws nothing at all.
    if (spec.drift > 0 && held >= spec.drift) {
      rate = PLAYER_RATES[Math.floor(random() * PLAYER_RATES.length)] ?? 1;
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
      rate,
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
        drift: player.drift,
      };
