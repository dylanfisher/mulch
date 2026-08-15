/**
 * @role Parameter automation as pure timeline data: validation, registry-range normalization,
 *   and linear interpolation before an audio host schedules it.
 */

import { clamp, snapToStep } from "./range";

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

/** Hard bound on a materialised repeat, so a long window cannot produce an unbounded lane. */
export const MAX_LANE_REPEATS = 32;

/**
 * The gap between one copy of a repeated gesture and the next. Without it the copy's first point
 * would land on the previous copy's last and normalization would collapse the two, turning a
 * repeat into a there-and-back; one millisecond is a return to the start, not a ramp back to it.
 */
export const LANE_SEAM_SECS = 0.001;

/**
 * A recorded gesture tiled forward to fill `window` seconds, each copy a faithful reproduction one
 * period after the last. The repeat is materialised into the lane rather than performed by the
 * transport, so live, offline and exported audio schedule exactly the same points (0024).
 */
export function repeatedLane(points: readonly AutomationPoint[], window: number): AutomationLane {
  const first = points[0];
  const last = points.at(-1);
  const copy = (): AutomationLane => points.map((point) => ({ at: point.at, value: point.value }));
  if (first === undefined || last === undefined) return [];
  const period = last.at - first.at + LANE_SEAM_SECS;
  if (period <= LANE_SEAM_SECS || !Number.isFinite(window) || window < period * 2) return copy();
  const repeats = Math.min(MAX_LANE_REPEATS, Math.floor(window / period));
  const tiled = copy();
  for (let repeat = 1; repeat < repeats; repeat++) {
    for (const point of points) {
      tiled.push({ at: point.at + repeat * period, value: point.value });
    }
  }
  return tiled;
}

/** The value a normalized linear lane owns at `at`; base holds before its first point. */
export function automationValueAt(
  lane: readonly AutomationPoint[],
  at: number,
  base: number,
): number {
  const first = lane[0];
  if (first === undefined || at < first.at) return base;
  for (let index = 1; index < lane.length; index++) {
    const next = lane[index];
    const previous = lane[index - 1];
    if (next === undefined || previous === undefined) throw new Error("automation lane changed");
    if (at <= next.at) {
      const progress = (at - previous.at) / (next.at - previous.at);
      return previous.value + (next.value - previous.value) * progress;
    }
  }
  return lane.at(-1)?.value ?? base;
}
