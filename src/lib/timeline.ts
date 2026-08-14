/**
 * @role Time on a deck's buffer as pure maths — where the playhead is under a play plan, and
 *   how seconds map onto the pixels a waveform is drawn and dragged in. Node-testable; the
 *   audio-thread twin of the position arithmetic lives in src/audio/worklets/loop-reporter.js.
 * @instead Reducing samples to something drawable → src/lib/peaks.ts. Reading a live position
 *   → peek() on src/app/facade.ts; nothing here touches a clock or a context.
 */
import { clamp, denormalize, normalize } from "./range";

/**
 * What the transport schedules: an explicit future start, the buffer offset it starts from,
 * and the loop length in seconds — 0 for a source that plays through once. The same shape
 * src/audio/deck.ts posts to the loop-reporter worklet.
 */
export type PlayPlan = { startTime: number; offset: number; period: number };

/**
 * Seconds into the buffer at `now`. Before `startTime` the source is scheduled but not yet
 * audible, so the playhead sits at the offset it will start from; looping wraps within
 * [offset, offset + period); a one-shot runs to the end of the buffer and stays there.
 *
 * The worklet computes the same family of arithmetic as a floor division (cycles completed,
 * loop-reporter.js); this is the main-thread remainder (position within the cycle). One plan,
 * two readings — change the shape of one and change the other.
 */
export function playheadAt(now: number, plan: PlayPlan, duration: number): number {
  const elapsed = now - plan.startTime;
  if (elapsed <= 0) return plan.offset;
  if (plan.period > 0) return plan.offset + (elapsed % plan.period);
  return Math.min(plan.offset + elapsed, duration);
}

/** Where `secs` of a `duration`-long buffer lands across `width` pixels. Clamped into view. */
export function secsToPx(secs: number, duration: number, width: number): number {
  return normalize(secs, 0, duration) * width;
}

/** The seconds a pixel points at. Clamped to the buffer, and 0 when there is nothing to map. */
export function pxToSecs(px: number, duration: number, width: number): number {
  if (width <= 0) return 0;
  return denormalize(px / width, 0, duration);
}

/**
 * Which loop marker a pointer at `px` is grabbing, if either is within `tolerancePx`.
 * Equidistant picks `in`, so a fully collapsed loop is still draggable open to the right.
 */
export function hitTest(
  px: number,
  loop: { in: number; out: number } | null,
  duration: number,
  width: number,
  tolerancePx: number,
): "in" | "out" | "none" {
  if (loop === null) return "none";
  const toIn = Math.abs(px - secsToPx(loop.in, duration, width));
  const toOut = Math.abs(px - secsToPx(loop.out, duration, width));
  if (toIn > tolerancePx && toOut > tolerancePx) return "none";
  return toIn <= toOut ? "in" : "out";
}

/** The peaks column a pixel draws — fixed-resolution peaks resampled to any canvas width. */
export function columnAt(x: number, width: number, columns: number): number {
  if (width <= 0) return 0;
  return clamp(Math.floor((x * columns) / width), 0, columns - 1);
}
