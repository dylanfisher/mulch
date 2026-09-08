/**
 * @role A motion: a parameter automation that is never recorded and never stored — a character
 *   and a seed, from which every eight-second stretch of the lane is drawn on demand, each stretch
 *   a pure function of (seed, index) so none depends on the ones before it and all of them join
 *   (0309). Pure maths: no clock, no context, and the one PRNG in src/lib/random.ts.
 * @instead A lane a hand recorded, and the one reading of any lane → src/lib/automation.ts. The
 *   jump pattern's characters, which these are modelled on → src/lib/playerCharacter.ts.
 */
import { automationValueAt, normalizeAutomationLane, type AutomationLane } from "./automation.ts";
import type { AutomationRange } from "./automation.ts";
import { fold } from "./copy.ts";
import { exactKeys, objectAt, oneOf, whole } from "./guards.ts";
import { mulberry32, SEED_MAX } from "./random.ts";
import { clamp, denormalize, normalize, type RangeCurve } from "./range.ts";
import { fromIds } from "./records.ts";

/**
 * The characters a motion may be asked to sound like. Each is a region over the four dials below
 * rather than a point, so one name is a kind of movement and not one movement (0152, 0309).
 *
 * **Order is durable** only in the sense every closed list here is: a name is what a session
 * stores, so renaming one is a session from another build (0026).
 */
export const MOTION_CHARACTERS = ["sporadic", "smooth", "restless", "creep", "pulse"] as const;
export type MotionCharacter = (typeof MOTION_CHARACTERS)[number];

/** The whole of what a motion durably is. Which lane it plays is drawn from this, never kept. */
export type MotionSpec = { character: MotionCharacter; seed: number };

/**
 * How long one stretch of a motion is: the piece drawn in one go, and the cycle the transport
 * arms it on. Long enough that a slow character has room to move inside one; short enough that
 * a stretch is drawn and scheduled well inside the automation horizon.
 */
export const MOTION_STRETCH_SECS = 8;

/**
 * How far apart the two points of a step are. Equal times collapse to one point last-write-wins
 * (`normalizeAutomationLane`), so a step is a hold and then a ramp this long — the same length
 * the graph ramps any set value over (`PARAM_RAMP_SECS`, held equal in src/audio/deck.test.ts,
 * because this leaf cannot import audio).
 */
export const MOTION_STEP_GAP_SECS = 0.01;

/** The shortest gap between two moves: room for one step in it. */
const MIN_MOVE_SECS = MOTION_STEP_GAP_SECS * 2;

/** How fast the quick steps inside a flurry come, and how many of them one flurry may hold. */
const FLURRY_STEP_SECS = 0.06;
const FLURRY_STEPS_MAX = 5;

/**
 * How many stretches lie between two anchors of the slow path the ends ride. Every stretch ends on
 * a point of that path, so a stretch can be drawn without drawing the one before it and still
 * begin where that one left off (0309).
 */
export const MOTION_ANCHOR_STRETCHES = 4;

/**
 * The dials a character is a region over. Pace is how long a move waits, jitter how unevenly,
 * reach how far one move may travel as a fraction of the parameter's range, glide how much of the
 * wait is spent ramping there (none is a step), and flurry the odds a move arrives as a burst of
 * quick steps rather than one.
 */
export const MOTION_KNOBS = ["pace", "jitter", "reach", "glide", "flurry"] as const;
export type MotionKnob = (typeof MOTION_KNOBS)[number];

type MotionDial = { min: number; max: number; curve?: RangeCurve };

export const MOTION_KNOB_DIALS: Record<MotionKnob, MotionDial> = {
  // Two and a half orders, so half way is by the ear (the burst's argument in playerCharacter.ts).
  pace: { min: 0.05, max: 16, curve: "log" },
  jitter: { min: 0, max: 1 },
  reach: { min: 0, max: 1 },
  glide: { min: 0, max: 1 },
  flurry: { min: 0, max: 1 },
};

type MotionVoice = Record<MotionKnob, number>;

/**
 * One character: the span of every dial, drawn fresh for every stretch — which is what makes a
 * motion evolve rather than repeat. Every bound is inside its dial's own range; the arithmetic
 * never clamps.
 */
type Region = Record<MotionKnob, readonly [low: number, high: number]>;

export const MOTION_CHARACTER_REGIONS: Record<MotionCharacter, Region> = {
  // Fast, far, and never on the beat: steps anywhere in the range, arriving when they arrive.
  sporadic: {
    pace: [0.08, 0.4],
    jitter: [0.6, 1],
    reach: [0.3, 1],
    glide: [0, 0.15],
    flurry: [0, 0.1],
  },
  // One long ramp into the next, nothing ever steps.
  smooth: { pace: [2, 8], jitter: [0.2, 0.5], reach: [0.2, 0.6], glide: [1, 1], flurry: [0, 0] },
  // Smooth most of the time, and every few moves a fast judder on the way to where it was going.
  restless: {
    pace: [1, 4],
    jitter: [0.3, 0.6],
    reach: [0.2, 0.5],
    glide: [0.8, 1],
    flurry: [0.3, 0.6],
  },
  // Barely moving: slow ramps a fraction of the range, the kind of change heard only later.
  creep: { pace: [3, 10], jitter: [0.2, 0.5], reach: [0.02, 0.1], glide: [1, 1], flurry: [0, 0] },
  // Regular steps at one rate — a rhythm the ear can count, held for a whole stretch at a time.
  pulse: { pace: [0.2, 0.5], jitter: [0, 0], reach: [0.3, 0.7], glide: [0, 0], flurry: [0, 0] },
};

/**
 * Where a dial sits a fraction of the way across a span: geometric along a log curve, arithmetic
 * along a linear one — the rule `at` follows in playerCharacter.ts, said for these five.
 */
const drawKnob = (knob: MotionKnob, span: readonly [number, number], fraction: number): number => {
  const [from, to] = span;
  if (fraction === 0) return from;
  return MOTION_KNOB_DIALS[knob].curve === "log"
    ? from * (to / from) ** fraction
    : from + (to - from) * fraction;
};

/** Every dial of one character, drawn from its region in the order the dials are declared. */
function drawVoice(character: MotionCharacter, random: () => number): MotionVoice {
  const region = MOTION_CHARACTER_REGIONS[character];
  return fromIds(MOTION_KNOBS, (knob) => drawKnob(knob, region[knob], random()));
}

/**
 * The generator one stretch is drawn from. The seed and the index are folded together as text,
 * because `fold` is the repo's one hash and a string per eight seconds costs nothing; `#` marks
 * the anchors' own stream so a stretch and an anchor of the same number never share a draw.
 */
const stretchSeed = (seed: number, index: number): number => fold(`${seed}/${index}`);
const anchorSeed = (seed: number, index: number): number => fold(`${seed}#${index}`);

/**
 * How wide the window the slow path's anchors are drawn inside, about the middle of the range:
 * the whole of it for a character that reaches far, and a band for one that creeps — a creep
 * whose stretches ended anywhere in the range would cross it every eight seconds, which is not a
 * creep. Read off the region's reach ceiling so the ends and the moves agree about how far the
 * character goes.
 */
const anchorSpread = (character: MotionCharacter): number =>
  0.5 * clamp(MOTION_CHARACTER_REGIONS[character].reach[1] * 4, 0, 1);

/** One anchor of the slow path, normalized. */
function anchorAt(spec: MotionSpec, index: number): number {
  const random = mulberry32(anchorSeed(spec.seed, index));
  return 0.5 + (random() * 2 - 1) * anchorSpread(spec.character);
}

/**
 * Where stretch `index` ends, normalized: a point on the straight line between the two anchors it
 * lies between, so the ends of consecutive stretches step along one slow path and any stretch
 * knows its own start — the end of the one before — in constant time (0309).
 */
export function stretchEnd(spec: MotionSpec, index: number): number {
  const leg = Math.floor(index / MOTION_ANCHOR_STRETCHES);
  const along = ((index % MOTION_ANCHOR_STRETCHES) + 1) / MOTION_ANCHOR_STRETCHES;
  const from = anchorAt(spec, leg);
  const to = anchorAt(spec, leg + 1);
  return from + (to - from) * along;
}

/** A target pushed back inside the unit interval by reflection, so a walk never pins at an end. */
const reflect = (value: number): number => {
  if (value > 1) return clamp(2 - value, 0, 1);
  if (value < 0) return clamp(-value, 0, 1);
  return value;
};

type Walk = { at: number; value: number }[];

/** A step onto `value` at `at`: the hold that ends and the ramp that lands, one gap apart. */
function step(walk: Walk, at: number, value: number): void {
  const last = walk.at(-1);
  if (last !== undefined && at - MOTION_STEP_GAP_SECS > last.at) {
    walk.push({ at: at - MOTION_STEP_GAP_SECS, value: last.value });
  }
  walk.push({ at, value });
}

/**
 * One move, landing on `target` at `at` after `wait` seconds since the move before it: a ramp
 * across the glided part of the wait, or — where the flurry odds say so — a burst of quick steps
 * around the target and then the target itself.
 */
function move(
  walk: Walk,
  voice: MotionVoice,
  random: () => number,
  at: number,
  wait: number,
  target: number,
): void {
  const last = walk.at(-1);
  if (last === undefined) throw new Error("a move with nothing to move from");
  if (random() < voice.flurry) {
    const room = Math.floor((wait - MIN_MOVE_SECS) / FLURRY_STEP_SECS);
    const steps = Math.min(
      FLURRY_STEPS_MAX,
      room,
      2 + Math.floor(random() * (FLURRY_STEPS_MAX - 1)),
    );
    for (let index = steps; index > 0; index--) {
      const judder = reflect(target + (random() * 2 - 1) * voice.reach * 0.5);
      step(walk, at - index * FLURRY_STEP_SECS, judder);
    }
    step(walk, at, target);
    return;
  }
  const ramp = Math.max(MOTION_STEP_GAP_SECS, wait * voice.glide);
  // A glide over the whole wait starts at the previous point: no hold to lay.
  if (ramp < wait - MOTION_STEP_GAP_SECS) walk.push({ at: at - ramp, value: last.value });
  walk.push({ at, value: target });
}

/**
 * Stretch `index` of a motion, as the lane the transport schedules for that cycle and the one the
 * dial paints from: the character's dials drawn fresh from its region, a random walk of moves in
 * the parameter's normalized space from where the stretch before it ended — from `base`, the
 * knob's own value, for the first — bent by a straight line so it ends exactly on `stretchEnd`,
 * and the last point at `MOTION_STRETCH_SECS` so the lane's span is the stretch. Every value is
 * inside `range`, at its step, the way any lane is (`normalizeAutomationLane`).
 */
export function drawMotionStretch(
  spec: MotionSpec,
  index: number,
  range: AutomationRange,
  base: number,
): AutomationLane {
  if (!Number.isInteger(index) || index < 0) throw new RangeError(`motion stretch ${index}`);
  const random = mulberry32(stretchSeed(spec.seed, index));
  const voice = drawVoice(spec.character, random);
  const curve = range.curve ?? "linear";
  const start =
    index === 0 ? normalize(base, range.min, range.max, curve) : stretchEnd(spec, index - 1);
  const walk: Walk = [{ at: 0, value: start }];
  let position = start;
  let at = 0;
  for (;;) {
    const wait = Math.max(MIN_MOVE_SECS, voice.pace * (1 + voice.jitter * (random() * 2 - 1)));
    at += wait;
    if (at >= MOTION_STRETCH_SECS) break;
    position = reflect(position + (random() * 2 - 1) * voice.reach);
    move(walk, voice, random, at, wait, position);
  }
  // The bend: whatever the walk reached, the stretch ends where the slow path says, and every
  // point between is moved a share of the difference proportional to its time.
  const end = stretchEnd(spec, index);
  const lift = end - position;
  const points = walk.map((point) => ({
    at: point.at,
    value: denormalize(
      clamp(point.value + lift * (point.at / MOTION_STRETCH_SECS), 0, 1),
      range.min,
      range.max,
      curve,
    ),
  }));
  points.push({
    at: MOTION_STRETCH_SECS,
    value: denormalize(clamp(end, 0, 1), range.min, range.max, curve),
  });
  return normalizeAutomationLane(points, range);
}

/** Which stretch `elapsed` seconds since a motion's anchor is inside, and how far into it. */
export const motionCycle = (elapsed: number): number => Math.floor(elapsed / MOTION_STRETCH_SECS);
export const motionPhase = (elapsed: number): number =>
  elapsed - motionCycle(elapsed) * MOTION_STRETCH_SECS;

/**
 * The value a motion holds `elapsed` seconds after it began — the one reading, through the same
 * `automationValueAt` a recorded lane is read by. Draws the stretch it is inside; a per-frame
 * reader keeps that stretch rather than calling this (src/ui/motionLive.ts).
 */
export function motionValueAt(
  spec: MotionSpec,
  range: AutomationRange,
  elapsed: number,
  base: number,
): number {
  const lane = drawMotionStretch(spec, motionCycle(elapsed), range, base);
  return automationValueAt(lane, motionPhase(elapsed), base);
}

/** Whether two specs are one motion — the same performance, which keeps its place (0309). */
export const sameMotion = (left: MotionSpec, right: MotionSpec): boolean =>
  left.character === right.character && left.seed === right.seed;

/**
 * The one validator of a motion on the wire and in a session: exactly a character and a seed,
 * or null for none (the shape `assertPlayer` has, src/lib/playerWire.ts).
 */
export function assertMotion(value: unknown, at: string): MotionSpec | null {
  if (value === null) return null;
  const raw = objectAt(value, at);
  exactKeys(raw, ["character", "seed"], at);
  return {
    character: oneOf(raw["character"], MOTION_CHARACTERS, `${at} character`),
    seed: whole(raw["seed"], 0, SEED_MAX, `${at} seed`),
  };
}
