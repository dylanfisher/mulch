/**
 * @role Parameter automation as pure timeline data: validation and registry-range normalization
 *   of a gesture's own points, before an audio host schedules them against a pass.
 */

import { clamp, snapToStep } from "./range";

/**
 * One point of a lane. `at` is seconds from the start of the gesture that recorded it, never a
 * position on a loop or on the audio clock: the transport replays the lane from its own zero at
 * the start of every pass, so the phase the recorder happened to have is discarded (0028).
 */
export type AutomationPoint = { at: number; value: number };
export type AutomationLane = AutomationPoint[];

export type AutomationRange = {
  min: number;
  max: number;
  step?: number;
};

const finite = (value: unknown, at: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${at} is not a finite number: ${String(value)}`);
  }
  return value;
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
    if (typeof candidate !== "object" || candidate === null || Array.isArray(candidate)) {
      throw new TypeError(`automation point ${index} is not an object`);
    }
    // This is the runtime narrowing from an unknown wire object to indexable fields.
    // oxlint-disable-next-line no-unsafe-type-assertion
    const point = candidate as Record<string, unknown>;
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
