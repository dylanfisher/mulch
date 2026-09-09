/**
 * @role A motion: a lane drawn rather than recorded — a character and a seed become the points a
 *   hand might have ridden, over a span, and from there it is a lane like any other (0309). Pure
 *   maths: no clock, no context, and the one PRNG in src/lib/random.ts.
 * @instead A lane a hand recorded, and the one reading of any lane → src/lib/automation.ts. The
 *   jump pattern's characters, which these are modelled on → src/lib/playerCharacter.ts.
 */
import { normalizeAutomationLane, type AutomationLane } from "./automation.ts";
import type { AutomationRange } from "./automation.ts";
import { fold } from "./copy.ts";
import { exactKeys, objectAt } from "./guards.ts";
import { mulberry32 } from "./random.ts";
import { clamp, denormalize, normalize, type RangeCurve } from "./range.ts";
import { fromIds } from "./records.ts";

/**
 * The characters a drawn lane may be asked to sound like. Each is a region over the four dials
 * below rather than a point, so one name is a kind of movement and not one movement (0152, 0309).
 */
export const MOTION_CHARACTERS = ["sporadic", "smooth", "restless", "creep", "pulse"] as const;
export type MotionCharacter = (typeof MOTION_CHARACTERS)[number];

/**
 * The spans a lane is dealt when nothing has chosen one: a press with no length set draws one
 * between these, on a log curve, so short and long are equally likely (0309).
 */
export const MOTION_SPAN_SECS = { min: 4, max: 24 } as const;

/**
 * How many passes a drawn lane may play before it is drawn again in its place, in the same
 * character at the same length — the counts the menu offers, besides off (0311).
 */
export const MOTION_REDRAW_PASSES = [1, 2, 4, 8] as const;
/** What a knob's redraw is set to: one of those counts, or 0 for a lane that stands as drawn. */
export type MotionRedraw = 0 | (typeof MOTION_REDRAW_PASSES)[number];

/**
 * What a drawn lane says about how it was drawn: the character it was drawn in, and how many
 * passes it plays before it is drawn again in that same character. One value per (instance,
 * param) beside the lane itself rather than inside it (0314), because a lane is what the audio
 * host schedules and no reader of it reads either of these.
 *
 * It exists exactly while a drawn lane does: a lane a hand recorded, and a knob holding no lane
 * at all, hold no `MotionDrawn` — which is what makes "only a drawn lane is ever redrawn" a fact
 * about the session rather than a rule a knob remembers (0311, 0314).
 */
export type MotionDrawn = { character: MotionCharacter; redraw: MotionRedraw };

/** Whether a value off the wire or out of storage is one of the characters this file declares. */
export const isMotionCharacter = (value: unknown): value is MotionCharacter =>
  MOTION_CHARACTERS.some((character): boolean => character === value);

/** And whether it is one of the counts a redraw may be set to, 0 among them. */
export const isMotionRedraw = (value: unknown): value is MotionRedraw =>
  value === 0 || MOTION_REDRAW_PASSES.some((count): boolean => count === value);

/**
 * One `MotionDrawn` off the wire or out of storage, proved whole: exactly the two halves, each one
 * this build offers. The one assert, imported by the command guard and by the stored-session
 * validator alike — the shape `assertPlayer` already has (src/lib/playerWire.ts), and written once
 * because two copies of it are two answers to what a drawn state is (principle 1, 0314).
 */
export function assertMotionDrawn(value: unknown, at: string): asserts value is MotionDrawn {
  const said = objectAt(value, at);
  exactKeys(said, ["character", "redraw"], at);
  if (!isMotionCharacter(said.character)) {
    throw new TypeError(`${at}.character is not a character: ${String(said.character)}`);
  }
  if (!isMotionRedraw(said.redraw)) {
    throw new TypeError(`${at}.redraw is not a count: ${String(said.redraw)}`);
  }
}

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
 * One character: the span of every dial, drawn fresh for every lane — which is what makes two
 * presses of one name two performances. Every bound is inside its dial's own range; the
 * arithmetic never clamps.
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
  // Regular steps at one rate — a rhythm the ear can count, held for the whole lane.
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
 * The span a press is dealt when no length has been chosen: its own stream off the seed, so the
 * lane drawn at a chosen span is the lane that would have been drawn at the dealt one, only
 * longer or shorter (0309).
 */
export function dealMotionSpan(seed: number): number {
  const random = mulberry32(fold(`${seed}#span`));
  return MOTION_SPAN_SECS.min * (MOTION_SPAN_SECS.max / MOTION_SPAN_SECS.min) ** random();
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
 * The lane a motion draws, as if a hand had ridden it: the character's dials drawn from its
 * region, a random walk of moves in the parameter's normalized space from `base` — the knob's own
 * value, where a recorded lane begins too — over `span` seconds, bent by a straight line so it
 * ends exactly where it began and goes round without a jump, with the last point at `span` so
 * the lane's span is the one asked for. The first move lands by the middle at the latest, so no
 * lane is flat however slow the character. Every value is inside `range`, at its step, the way any
 * lane is (`normalizeAutomationLane`).
 */
export function drawMotionLane(
  character: MotionCharacter,
  seed: number,
  range: AutomationRange,
  base: number,
  span: number,
): AutomationLane {
  if (!(span > MIN_MOVE_SECS)) throw new RangeError(`motion span ${span}`);
  const random = mulberry32(seed);
  const voice = drawVoice(character, random);
  const curve = range.curve ?? "linear";
  const start = normalize(base, range.min, range.max, curve);
  const walk: Walk = [{ at: 0, value: start }];
  let position = start;
  let at = 0;
  for (;;) {
    const drawn = Math.max(MIN_MOVE_SECS, voice.pace * (1 + voice.jitter * (random() * 2 - 1)));
    const wait = walk.length === 1 ? Math.min(drawn, span / 2) : drawn;
    if (at + wait > span - MIN_MOVE_SECS) break;
    at += wait;
    position = reflect(position + (random() * 2 - 1) * voice.reach);
    move(walk, voice, random, at, wait, position);
  }
  // The bend: whatever the walk reached, the lane ends where it began, and every point between
  // is moved a share of the difference proportional to its time.
  const lift = start - position;
  const points = walk.map((point) => ({
    at: point.at,
    value: denormalize(
      clamp(point.value + lift * (point.at / span), 0, 1),
      range.min,
      range.max,
      curve,
    ),
  }));
  points.push({ at: span, value: base });
  return normalizeAutomationLane(points, range);
}
