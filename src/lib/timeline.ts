/**
 * @role Time on a deck's buffer as pure maths — where the playhead is under a play plan, at the
 *   rate the plan is read at, and how seconds map onto the pixels a waveform is drawn and dragged
 *   in. Node-testable; the audio-thread twin of the position arithmetic lives in
 *   src/audio/worklets/loop-reporter.js, which restates these formulas because a worklet can
 *   import nothing (0031).
 * @instead Reducing samples to something drawable → src/lib/peaks.ts. Reading a live position
 *   → peek() on src/app/facade.ts; nothing here touches a clock or a context.
 */
import { clamp, denormalize, normalize } from "./range";

/**
 * Semitones per octave, and the cents one semitone is worth — the two constants that turn a
 * pitch in semitones into the doubling `AudioBufferSourceNode` applies to its read rate. Written
 * here because the rate maths below is the reason they exist (0031).
 */
const SEMITONES_PER_OCTAVE = 12;
export const CENTS_PER_SEMITONE = 100;

/**
 * The one statement of what speed and pitch do to a deck's read rate: buffer seconds consumed
 * per second of wall clock. Speed is the multiplier as it reads; pitch is semitones, which the
 * source node applies as `2 ** (cents / 1200)` on top of it. Every piece of position arithmetic
 * on both sides of the worklet seam takes this number and nothing else about the two knobs
 * (0031).
 */
export function playbackRate(speed: number, semitones: number): number {
  return speed * 2 ** (semitones / SEMITONES_PER_OCTAVE);
}

/**
 * What the transport schedules: an explicit start on the wall clock, the buffer offset the
 * cycle is anchored at, the loop length in buffer seconds — 0 for a source that plays through
 * once — the rate the buffer is read at, and how far into the current cycle it already was at
 * `startTime`. The same shape src/audio/deck.ts posts to the loop-reporter worklet.
 *
 * `phase` is 0 for a plan a play created. It is non-zero only for the plan a rate change
 * rebases mid-flight: the source keeps playing and the arithmetic is re-anchored at the instant
 * the new rate takes effect, which is what keeps a rate change from moving the playhead (0031).
 */
export type PlayPlan = {
  startTime: number;
  offset: number;
  period: number;
  rate: number;
  phase: number;
};

/**
 * Seconds into the buffer at `now`. Before `startTime` the source is scheduled but not yet
 * audible, so the playhead sits where the plan is anchored; looping wraps within
 * [offset, offset + period); a one-shot runs to the end of the buffer and stays there.
 *
 * Wall time becomes buffer time exactly once, here: `elapsed * rate`. The worklet computes the
 * same family of arithmetic as a floor division (cycles completed, loop-reporter.js); this is
 * the main-thread remainder (position within the cycle). One plan, two readings — change the
 * shape of one and change the other.
 */
export function playheadAt(now: number, plan: PlayPlan, duration: number): number {
  const elapsed = now - plan.startTime;
  if (elapsed <= 0) return Math.min(plan.offset + plan.phase, duration);
  const progress = plan.phase + elapsed * plan.rate;
  // Both branches clamp: the transport clamps loop edges to the buffer already, but this file
  // cannot know that, and a plan whose offset + period overruns the buffer must not put the
  // playhead off the end of the canvas.
  if (plan.period > 0) return Math.min(plan.offset + (progress % plan.period), duration);
  return Math.min(plan.offset + progress, duration);
}

/**
 * How many loop boundaries this plan has crossed by `now`, counted from its own anchor. The
 * main thread's reading of the floor division the worklet performs on the audio thread
 * (loop-reporter.js) — stated here so it can be tested without one, and so the two sides of the
 * seam are one piece of arithmetic written twice rather than two ideas.
 */
export function cyclesAt(now: number, plan: PlayPlan): number {
  if (plan.period <= 0) return 0;
  const progress = plan.phase + Math.max(0, now - plan.startTime) * plan.rate;
  return Math.floor(progress / plan.period);
}

/**
 * When the `nth` boundary of this plan happens, on the wall clock. The inverse of `cyclesAt`,
 * and what a reported `deck.looped` carries as its time: a cycle costs `period / rate` seconds,
 * so halving the rate doubles the time between two reports of the same loop.
 */
export function cycleTimeAt(nth: number, plan: PlayPlan): number {
  return plan.startTime + (nth * plan.period - plan.phase) / plan.rate;
}

/**
 * Below this travel a drag is a click and sends nothing — a loop of 0px was not asked for. One
 * number for both surfaces a loop is shaped on: the handle strip and a Shift-held sweep of the
 * peaks (0066).
 */
export const MIN_DRAG_PX = 4;

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
 * The seconds a distance of `px` covers. A span, not a point, so it is deliberately unclamped:
 * a gesture measures its travel between two readings, and clamping either of them into the
 * buffer would eat the part of the travel that happened past an edge — a handle grabbed to the
 * left of a loop that starts at 0 reads a negative position, and the difference is still real
 * (0053). What the travel finally lands on is clamped where it is applied, not here.
 */
export function pxSpanToSecs(px: number, duration: number, width: number): number {
  if (width <= 0) return 0;
  return (px / width) * duration;
}

/**
 * Whether a point is one this loop is read at. Half-open by construction: `out` is the edge the
 * cycle wraps at, not a position the source is ever read from, so a resume there is a resume at
 * the top. The one statement of it — the transport resumes by this rule (src/audio/deck.ts),
 * a click seeks by it (src/ui/Waveform.tsx) and a press slides by it
 * (src/ui/LoopHandles.tsx).
 */
export function insideLoop(at: number, loop: { in: number; out: number }): boolean {
  return at >= loop.in && at < loop.out;
}

/**
 * Where a click asks the playhead to go, or null when it asks for nothing. With a loop active
 * the loop is the segment being performed, so only a point inside it moves the playhead and
 * everything outside is refused (0041).
 */
export function seekTarget(
  secs: number,
  loop: { in: number; out: number } | null,
  duration: number,
): number | null {
  if (duration <= 0) return null;
  const at = clamp(secs, 0, duration);
  if (loop === null) return at;
  return insideLoop(at, loop) ? at : null;
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
