/** @role Smooth manual movement and sample-critical automation scheduling for bound AudioParams. */
import type { AutomationPoint } from "@/lib/automation";

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

/**
 * Schedule one lane onto one AudioParam for the pass beginning at `origin`. A point's `at` is
 * time from the start of its own gesture, so `origin` is what places the lane on the clock —
 * the transport re-arms the same points against every pass it schedules ahead (0028). `base` is
 * the parameter's manual value, which holds until the lane's first point. Whatever was scheduled
 * from `origin` onwards is replaced; earlier passes are left to finish.
 */
export function scheduleAutomation(
  target: AudioParam,
  lane: readonly AutomationPoint[],
  base: number,
  origin: number,
): void {
  target.cancelScheduledValues(origin);
  const first = lane[0];
  // An empty lane is the release: the parameter goes back to its manual value from here on.
  if (first === undefined) {
    target.setValueAtTime(base, origin);
    return;
  }
  target.setValueAtTime(first.at === 0 ? first.value : base, origin);
  // A lane that starts late holds the base and then steps, rather than ramping out of a value
  // the gesture never passed through.
  if (first.at > 0) target.setValueAtTime(first.value, origin + first.at);
  for (let index = 1; index < lane.length; index++) {
    const point = lane[index];
    if (point === undefined) throw new Error("automation lane changed while scheduling");
    target.linearRampToValueAtTime(point.value, origin + point.at);
  }
}
