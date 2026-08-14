/** @role Smooth manual movement and sample-critical automation scheduling for bound AudioParams. */
import { automationValueAt, type AutomationPoint } from "@/lib/automation";

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

/** Replace one AudioParam's future schedule from `now`, preserving the lane's linear semantics. */
export function scheduleAutomation(
  target: AudioParam,
  lane: readonly AutomationPoint[],
  base: number,
  now: number,
): void {
  target.cancelScheduledValues(now);
  target.setValueAtTime(automationValueAt(lane, now, base), now);
  const firstFuture = lane.findIndex((point) => point.at > now);
  if (firstFuture < 0) return;
  const first = lane[firstFuture];
  if (first === undefined) throw new Error("automation lane changed while scheduling");
  if (firstFuture === 0) target.setValueAtTime(first.value, first.at);
  else target.linearRampToValueAtTime(first.value, first.at);
  for (let index = firstFuture + 1; index < lane.length; index++) {
    const point = lane[index];
    if (point === undefined) throw new Error("automation lane changed while scheduling");
    target.linearRampToValueAtTime(point.value, point.at);
  }
}
