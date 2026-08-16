/** @role Smooth manual movement and sample-critical automation scheduling for bound AudioParams. */
import type { AutomationPoint } from "@/lib/automation";

/** Short enough to feel immediate, long enough to avoid zipper noise during a drag. */
export const PARAM_RAMP_SECS = 0.01;

/**
 * Hold a parameter wherever it is before ramping to the next value, so a fast drag becomes a
 * series of joins rather than jumps. Firefox lacks cancelAndHoldAtTime, so its fallback re-pins
 * the last committed value before scheduling the same ramp.
 */
export function rampTo(
  target: AudioParam,
  value: number,
  when: number,
  over = PARAM_RAMP_SECS,
): void {
  if (typeof target.cancelAndHoldAtTime === "function") {
    target.cancelAndHoldAtTime(when);
  } else {
    target.cancelScheduledValues(when);
    target.setValueAtTime(target.value, when);
  }
  target.linearRampToValueAtTime(value, when + over);
}

/**
 * The longest gap between two moves that still counts as one continuous gesture. Wider than any
 * pointer cadence and narrower than a pause: a move this far after the one before it has nothing
 * left to join to — whatever the last one scheduled has long since arrived — so it is an opening
 * move again and rejoining across the gap would only make the knob answer late.
 */
export const SAME_GESTURE_GAP_SECS = 0.05;

/**
 * A parameter's live moves, joined the way playback joins a lane's points. `rampTo` alone ramps
 * over `PARAM_RAMP_SECS` and then holds flat until the next pointer event, so a drag is a
 * staircase of 10ms risers — inaudible on gain or pan, a click on the wide log parameters
 * (cutoff, EQ frequency and Q), and exactly what the same gesture does not do once it is a lane
 * being played back. Ramping over the gap since the previous move instead leaves no flat stretch
 * at all, at the cost of arriving one pointer event late (0065).
 *
 * Only a move still inside `SAME_GESTURE_GAP_SECS` of the one before it is joined. A move that
 * stands alone — the first of a gesture, a keyboard nudge, a double-click reset, a lane handing a
 * parameter back to its manual value — has no riser to smooth and keeps the immediate ramp.
 */
function joinMoves(target: AudioParam): (value: number, when: number) => void {
  let previous: number | null = null;
  return (value, when) => {
    const gap = previous === null ? Number.POSITIVE_INFINITY : when - previous;
    previous = when;
    const joined = gap > PARAM_RAMP_SECS && gap <= SAME_GESTURE_GAP_SECS;
    rampTo(target, value, when, joined ? gap : PARAM_RAMP_SECS);
  };
}

/**
 * One registered parameter's two ways into the graph: the value a fresh instance is built at, and
 * every move after it. `target` is the same AudioParam both use, which is what lets a lane be
 * scheduled onto exactly what a knob drags (0024).
 */
export type ParamBinding = {
  initialize(value: number): void;
  set(value: number, when: number): void;
  target: AudioParam;
};

/**
 * The binding for a parameter that is one AudioParam — which is every parameter, because a plugin
 * whose parameter drives more than one node derives them from one param in its own graph (0049).
 */
export function bindParam(target: AudioParam): ParamBinding {
  const join = joinMoves(target);
  return {
    initialize: (value) => {
      target.value = value;
    },
    set: join,
    target,
  };
}

/**
 * How long a cycle takes to join the one before it. A lane repeats on its own length, and a
 * gesture that ends somewhere other than where it started would otherwise step from its last
 * value to its first at every boundary — a click, once per cycle, forever. Short enough to be
 * the same instant musically, long enough that no parameter jumps (0035).
 */
export const LANE_SEAM_SECS = 0.005;

/**
 * Schedule one cycle of one lane onto one AudioParam, beginning at `origin`. A point's `at` is
 * time from the start of its own gesture, so `origin` is what places the lane on the clock — the
 * transport re-arms the same points against every cycle it schedules ahead (0028, 0035). `base`
 * is the parameter's manual value, which holds until the lane's first point. Whatever was
 * scheduled from `origin` onwards is replaced; earlier cycles are left to finish.
 */
export function scheduleAutomation(
  target: AudioParam,
  lane: readonly AutomationPoint[],
  base: number,
  origin: number,
): void {
  const first = lane[0];
  // An empty lane is the release: the parameter goes back to its manual value from here on.
  if (first === undefined) {
    target.cancelScheduledValues(origin);
    target.setValueAtTime(base, origin);
    return;
  }
  // Hold whatever the previous cycle left here, then join this one across the seam. The Firefox
  // fallback is the same one `rampTo` carries, for the same missing method.
  if (typeof target.cancelAndHoldAtTime === "function") {
    target.cancelAndHoldAtTime(origin);
  } else {
    target.cancelScheduledValues(origin);
    target.setValueAtTime(target.value, origin);
  }
  // Never past the next thing the lane does: a gesture whose first move lands inside the seam
  // gets a shorter one, rather than a joint scheduled after the point it joins to.
  const gap = first.at > 0 ? first.at : (lane[1]?.at ?? Number.POSITIVE_INFINITY);
  const seam = Math.min(LANE_SEAM_SECS, gap / 2);
  target.linearRampToValueAtTime(first.at === 0 ? first.value : base, origin + seam);
  // A lane that starts late holds the base and then steps, rather than ramping out of a value
  // the gesture never passed through.
  if (first.at > 0) target.setValueAtTime(first.value, origin + first.at);
  for (let index = 1; index < lane.length; index++) {
    const point = lane[index];
    if (point === undefined) throw new Error("automation lane changed while scheduling");
    target.linearRampToValueAtTime(point.value, origin + point.at);
  }
}
