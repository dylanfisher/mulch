/** @role Numeric range maths, shared by every continuous control — knobs, faders, meters. */

/** Constrain `value` to the inclusive range [`min`, `max`]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export type RangeCurve = "linear" | "log";

function assertLogRange(min: number, max: number): void {
  if (min <= 0 || max <= 0)
    throw new RangeError(`a logarithmic range must be positive: ${min}–${max}`);
}

/** Map a value in [`min`, `max`] onto the unit interval [0, 1]. */
export function normalize(
  value: number,
  min: number,
  max: number,
  curve: RangeCurve = "linear",
): number {
  if (curve === "log") {
    assertLogRange(min, max);
    if (max === min) return 0;
    return clamp(Math.log(clamp(value, min, max) / min) / Math.log(max / min), 0, 1);
  }
  if (max === min) return 0;
  return clamp((value - min) / (max - min), 0, 1);
}

/** Map a fraction of the unit interval back onto [`min`, `max`]. */
export function denormalize(
  fraction: number,
  min: number,
  max: number,
  curve: RangeCurve = "linear",
): number {
  if (curve === "log") {
    assertLogRange(min, max);
    return min * (max / min) ** clamp(fraction, 0, 1);
  }
  return min + clamp(fraction, 0, 1) * (max - min);
}

/**
 * The quietest level a peak meter draws, in dBFS. Below it the bar reads empty: a linear bar
 * spends its whole travel in the top few dB and reads as still, which is the opposite of a glance.
 */
export const METER_FLOOR_DB = -60;

/**
 * A peak level as a fraction of a meter's travel — dBFS from `METER_FLOOR_DB` up to full scale,
 * clamped at both ends. Silence and anything under the floor is 0, full scale is 1, and a level
 * hotter than full scale stays 1: past the top a meter has nothing left to say.
 */
export function meterFraction(level: number): number {
  if (!(level > 0)) return 0;
  return clamp(1 - (20 * Math.log10(level)) / METER_FLOOR_DB, 0, 1);
}

/**
 * Quantize to the nearest `step` counted from `min`, then clamp back into range.
 * `toPrecision` strips the binary-float residue that repeated stepping accumulates
 * (0.1 + 0.2 → 0.30000000000000004), which would otherwise reach the readout.
 */
export function snapToStep(value: number, min: number, max: number, step: number): number {
  if (step <= 0) return clamp(value, min, max);
  const snapped = Math.round((value - min) / step) * step + min;
  return clamp(Number(snapped.toPrecision(12)), min, max);
}
