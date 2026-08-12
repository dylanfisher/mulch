/** @role Numeric range maths, shared by every continuous control — knobs, faders, meters. */

/** Constrain `value` to the inclusive range [`min`, `max`]. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Map a value in [`min`, `max`] onto the unit interval [0, 1]. */
export function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return clamp((value - min) / (max - min), 0, 1);
}

/** Map a fraction of the unit interval back onto [`min`, `max`]. */
export function denormalize(fraction: number, min: number, max: number): number {
  return min + clamp(fraction, 0, 1) * (max - min);
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
