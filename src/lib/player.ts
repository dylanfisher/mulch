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

/** How many times a slot may repeat before the next jump. */
export const PLAYER_REPEATS_MIN = 1;
export const PLAYER_REPEATS_MAX = 16;

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
};

/** One step of the pattern: where to read, how long to stay, and how much of each repeat sounds. */
export type PlayerStep = {
  /** Which of `PLAYER_SLOTS` divisions of the loop this step reads from. */
  slot: number;
  /** How many times that slot plays before the next jump. At least one. */
  repeats: number;
  /**
   * The fraction of each repeat that sounds before the gate closes, in
   * `[PLAYER_GATE_FLOOR, 1]`. Exactly 1 is a repeat nothing cuts, which is what a gate of zero
   * draws every time.
   */
  gate: number;
};

/** The durable fields, in the order they are declared. The one list a stored spec is keyed against. */
const PLAYER_FIELDS = ["seed", "variation", "distance", "repeats", "gate"] as const;

/** Whether an outside string is one of the declared variations. A narrowing, not an assertion. */
const isVariation = (value: unknown): value is PlayerVariation =>
  PLAYER_VARIATIONS.some((declared) => declared === value);

/** A whole number in `[min, max]`, or a loud no. The check the three counted fields share. */
function whole(value: unknown, min: number, max: number, at: string): number {
  const number = finite(value, at);
  if (!Number.isInteger(number)) throw new RangeError(`${at} is not whole: ${number}`);
  if (number < min || number > max)
    throw new RangeError(`${at} is outside ${min}…${max}: ${number}`);
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
  const gate = finite(raw["gate"], `${at} gate`);
  if (gate < PLAYER_GATE_MIN || gate > PLAYER_GATE_MAX) {
    throw new RangeError(`${at} gate is outside ${PLAYER_GATE_MIN}…${PLAYER_GATE_MAX}: ${gate}`);
  }
  return {
    seed: whole(raw["seed"], 0, PLAYER_SEED_MAX, `${at} seed`),
    variation,
    distance: whole(raw["distance"], PLAYER_DISTANCE_MIN, PLAYER_DISTANCE_MAX, `${at} distance`),
    repeats: whole(raw["repeats"], PLAYER_REPEATS_MIN, PLAYER_REPEATS_MAX, `${at} repeats`),
    gate,
  };
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
 */
export function playerWalk(spec: PlayerSpec): () => PlayerStep {
  assertPlayer(spec, "a player walk");
  const random = mulberry32(spec.seed);
  let slot = 0;
  return () => {
    const step: PlayerStep = {
      slot,
      // 1…repeats, so the knob is "at most this many" and one is always reachable.
      repeats: 1 + Math.floor(random() * spec.repeats),
      // At a hardness of zero this is exactly 1 without drawing a different number — the gate is
      // shut off rather than set very open, so an unstuttered pattern has no gain moves inside it.
      gate: Math.max(PLAYER_GATE_FLOOR, 1 - spec.gate * random()),
    };
    const travel = 1 + Math.floor(random() * spec.distance);
    // Forward only ever adds; wander is as likely to go back, drawn after the distance so the two
    // variations walk the same distances and differ only in sign.
    const move = spec.variation === "forward" ? travel : random() < 0.5 ? -travel : travel;
    slot = (((slot + move) % PLAYER_SLOTS) + PLAYER_SLOTS) % PLAYER_SLOTS;
    return step;
  };
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
      };
