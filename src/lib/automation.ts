/**
 * @role Parameter automation as pure timeline data: validation and registry-range normalization
 *   of a gesture's own points, before an audio host schedules them against a pass.
 */

import { finite, objectAt } from "./guards.ts";
import { clamp, snapToStep } from "./range";

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

/** Whether two lanes are the same gesture — the same points, in the same order, at the same times. */
export function sameLane(
  left: readonly AutomationPoint[],
  right: readonly AutomationPoint[],
): boolean {
  if (left.length !== right.length) return false;
  return left.every((point, index) => {
    const other = right[index];
    return other !== undefined && other.at === point.at && other.value === point.value;
  });
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
