/** @role Smooth AudioParam movement shared by deck nodes and effect bindings. */

/** Short enough to feel immediate, long enough to avoid zipper noise during a drag. */
export const PARAM_RAMP_SECS = 0.01;

/**
 * Hold a parameter wherever it is before ramping to the next value, so a fast drag becomes a
 * series of joins rather than jumps. Firefox lacks cancelAndHoldAtTime, so its fallback re-pins
 * the last committed value before scheduling the same ramp.
 */
export function rampTo(target: AudioParam, value: number, when: number): void {
  if (typeof target.cancelAndHoldAtTime === "function") {
    target.cancelAndHoldAtTime(when);
  } else {
    target.cancelScheduledValues(when);
    target.setValueAtTime(target.value, when);
  }
  target.linearRampToValueAtTime(value, when + PARAM_RAMP_SECS);
}
