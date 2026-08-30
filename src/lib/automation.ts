/**
 * @role Parameter automation as pure timeline data: validation and registry-range normalization
 *   of a gesture's own points, before an audio host schedules them against a pass.
 */

import { finite, objectAt } from "./guards.ts";
import { clamp, snapToStep } from "./range.ts";

/**
 * One point of a lane. `at` is seconds from the start of the gesture that recorded it, never a
 * position on a loop or on the audio clock: the transport replays the lane from its own zero at
 * the start of every pass, so the phase the recorder happened to have is discarded (0028).
 */
export type AutomationPoint = { at: number; value: number };
export type AutomationLane = AutomationPoint[];

/**
 * A lane's own period: the time of its last point, and the length of one cycle of it. A lane that
 * never moved has no period and holds one value (0035).
 */
export function laneSpan(lane: readonly AutomationPoint[]): number {
  return lane.at(-1)?.at ?? 0;
}

/**
 * The lengths a span may be stretched to. A gesture edits `laneSpan` after the fact, so the two
 * ends are the instrument's, not the gesture's: above the ceiling a lane stops repeating inside
 * anything a person is listening to, and the floor is what the transport can keep armed — one
 * re-arm tick lays down at most `MAX_AUTOMATION_CYCLES` cycles, so a span under
 * `AUTOMATION_REARM_SECS / MAX_AUTOMATION_CYCLES` runs out of scheduled cycles before the next
 * tick and stutters. `src/audio/deck.test.ts` holds that floor against those two constants,
 * because a leaf in `lib` cannot import them.
 */
export const MIN_LANE_SPAN = 0.1;
export const MAX_LANE_SPAN = 600;

/**
 * The same gesture over a different length: every point's time scaled by one factor, so the shape
 * is untouched and only the cycle it repeats on changes (0035, 0079). The span is held inside the
 * two lengths above, the way a value is held inside its range, and the last point carries it
 * exactly rather than the product, so the span asked for is the span the lane then reports. A lane
 * that never moved has no span to scale and is refused rather than invented.
 */
export function stretchLane(lane: readonly AutomationPoint[], span: number): AutomationLane {
  const current = laneSpan(lane);
  if (current <= 0) throw new RangeError("a lane with no span cannot be stretched");
  const held = clamp(span, MIN_LANE_SPAN, MAX_LANE_SPAN);
  const factor = held / current;
  return lane.map((point, index) => ({
    at: index === lane.length - 1 ? held : point.at * factor,
    value: point.value,
  }));
}

/**
 * Whether two lanes are the same gesture: the same values in the same order, whatever length they
 * are laid over. A lane re-based onto a new manual value and one stretched onto a new span are
 * both that gesture still going round, so both keep the anchor they were recorded on (0035, 0079);
 * different values are a new recording and start again from where the performer left it.
 */
export function sameGesture(
  left: readonly AutomationPoint[],
  right: readonly AutomationPoint[],
): boolean {
  if (left.length !== right.length) return false;
  return left.every((point, index) => right[index]?.value === point.value);
}

/**
 * The value a lane holds `at` seconds into one of its cycles, interpolated exactly as the
 * transport schedules it: `base` until the first point, a step onto that point, straight lines
 * between the rest, and the last value from there to the end of the cycle. One reading, so a
 * knob painted from a lane and a parameter driven by one cannot drift (0035).
 */
export function automationValueAt(
  lane: readonly AutomationPoint[],
  at: number,
  base: number,
): number {
  const first = lane[0];
  if (first === undefined || at < first.at) return base;
  let previous = first;
  for (const point of lane) {
    if (point.at > at) {
      const span = point.at - previous.at;
      const progress = span <= 0 ? 1 : (at - previous.at) / span;
      return previous.value + progress * (point.value - previous.value);
    }
    previous = point;
  }
  return previous.value;
}

export type AutomationRange = {
  min: number;
  max: number;
  step?: number;
};

const normalizeValue = (value: number, range: AutomationRange): number => {
  const normalized =
    range.step === undefined
      ? clamp(value, range.min, range.max)
      : snapToStep(value, range.min, range.max, range.step);
  // JSON has only one zero. Canonicalizing here keeps command, session, history, and archive
  // projections byte-deterministic even when untyped JavaScript supplies -0.
  return normalized === 0 ? 0 : normalized;
};

/** Validate untyped wire data, sort it, collapse equal times last-write-wins, and bound values. */
export function normalizeAutomationLane(input: unknown, range: AutomationRange): AutomationLane {
  if (!Array.isArray(input)) throw new TypeError("automation points are not an array");
  const indexed = input.map((candidate, index) => {
    const point = objectAt(candidate, `automation point ${index}`);
    const keys = Object.keys(point);
    if (keys.length !== 2 || !Object.hasOwn(point, "at") || !Object.hasOwn(point, "value")) {
      throw new TypeError(`automation point ${index} must have exactly at and value`);
    }
    const rawAt = finite(point.at, `automation point ${index}.at`);
    const at = rawAt === 0 ? 0 : rawAt;
    if (at < 0) throw new RangeError(`automation point ${index}.at is negative`);
    return {
      at,
      value: normalizeValue(finite(point.value, `automation point ${index}.value`), range),
      index,
    };
  });
  // ES2022 has no toSorted; indexed is fresh, and the original order is the duplicate tie-break.
  // oxlint-disable-next-line unicorn/no-array-sort
  indexed.sort((left, right) => left.at - right.at || left.index - right.index);
  const normalized: AutomationLane = [];
  for (const point of indexed) {
    const previous = normalized.at(-1);
    if (previous?.at === point.at) previous.value = point.value;
    else normalized.push({ at: point.at, value: point.value });
  }
  return normalized;
}
