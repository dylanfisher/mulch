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
  // Both branches clamp: the transport clamps loop edges to the buffer already, but this file
  // cannot know that, and a plan whose offset + period overruns the buffer must not put the
  // playhead off the end of the canvas.
  if (plan.period > 0) return Math.min(plan.offset + (elapsed % plan.period), duration);
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
  if (loop === null || duration <= 0 || width <= 0) return "none";
  const toIn = Math.abs(px - secsToPx(loop.in, duration, width));
  const toOut = Math.abs(px - secsToPx(loop.out, duration, width));
  if (toIn > tolerancePx && toOut > tolerancePx) return "none";
  return toIn <= toOut ? "in" : "out";
}

/**
 * A whole loop slid by `deltaSecs`, at exactly the length it already had. The length is the
 * thing being preserved, so the clamp moves the pair: past either end the segment stops
 * against it rather than being trimmed by it. A loop longer than the buffer — which the
 * transport clamps away, but this file cannot know that — pins to the start.
 */
export function translateLoop(
  loop: { in: number; out: number },
  deltaSecs: number,
  duration: number,
): { in: number; out: number } {
  const length = loop.out - loop.in;
  const from = clamp(loop.in + deltaSecs, 0, Math.max(0, duration - length));
  return { in: from, out: from + length };
}

/**
 * The peaks columns a pixel covers, `[from, to)`, never empty — fixed-resolution peaks
 * resampled to any canvas width. A span, not a point: when the canvas is narrower than the
 * columns, one pixel owns several of them, and sampling just one would let a transient
 * vanish between two sampled columns. The draw aggregates min/max over the span, the same
 * reduction peaks() itself performs one level down.
 */
export function columnRange(x: number, width: number, columns: number): [number, number] {
  if (width <= 0 || columns <= 0) return [0, Math.max(1, columns)];
  const from = clamp(Math.floor((x * columns) / width), 0, columns - 1);
  const to = clamp(Math.floor(((x + 1) * columns) / width), from + 1, columns);
  return [from, to];
}
