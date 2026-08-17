/**
 * @role How long the whole loop takes: the periods a deck is running on — one per active lane,
 *   plus the deck's own loop — the estimate of when they next line up, and the one human unit
 *   that estimate is said in. Pure maths: no context, no DOM, no clock.
 * @instead A lane's own period → laneSpan in src/lib/automation.ts, which this reads rather than
 *   restates. The words each unit is said in → DURATION_SCALE in src/lib/copy.ts. Drawing the
 *   rows these periods describe → src/ui/moireCanvas.ts.
 */
import { DURATION_SCALE, type DurationUnit } from "./copy";

/**
 * The loop's period in real seconds. Rate scales buffer time and not lane time, so the loop is
 * the one row of the strip that has to be divided by it (0035). A deck with no loop, or one read
 * at no rate at all, is running on no period rather than on a zero-length one.
 */
export function loopPeriodSecs(loop: { in: number; out: number } | null, rate: number): number {
  if (loop === null || rate <= 0) return 0;
  return (loop.out - loop.in) / rate;
}

/**
 * How many divisions of the shortest period the estimate is quantized onto. Relative rather than
 * absolute: a fixed grid fine enough for a 0.1s lane cannot reach far enough for a ten-minute
 * one, and this is an estimate whose whole job is to be free (P54).
 */
export const RECURRENCE_DIVISIONS = 16;

/** The finest grid the quantization will use, whatever the shortest period is. */
export const MIN_RECURRENCE_GRID_SECS = 0.01;

/**
 * Where the search stops, in grid ticks. Under 2**53, so every accepted multiple is an exact
 * integer; past it the answer is the last unit on the scale rather than a number, because a
 * figure computed on inexact integers is a lie with decimal places (principle 5).
 */
export const MAX_RECURRENCE_TICKS = 2 ** 52;

/** Euclid, on the positive integers the quantization produces. */
function gcd(left: number, right: number): number {
  let a = left;
  let b = right;
  while (b > 0) [a, b] = [b, a % b];
  return a;
}

/**
 * When every period next lines up, in real seconds — or null when the search hit its cap. The
 * periods are quantized onto one coarse grid and the least common multiple is taken on that, so
 * two periods that are nearly commensurate are treated as commensurate: crude beats slow, and
 * the number this produces is read as an order of magnitude rather than as a countdown.
 *
 * Periods that are not a positive finite length — a lane that never moved, a loop of no length,
 * a deck stopped dead at no rate — hold no cycle and take no part. No periods at all is not a
 * recurrence of forever; it is nothing going round, which is zero seconds.
 */
export function recurrenceSecs(periods: readonly number[]): number | null {
  const usable = periods.filter((period) => Number.isFinite(period) && period > 0);
  const shortest = usable[0] === undefined ? 0 : Math.min(...usable);
  if (shortest <= 0) return 0;
  const grid = Math.max(MIN_RECURRENCE_GRID_SECS, shortest / RECURRENCE_DIVISIONS);
  let ticks = 1;
  for (const period of usable) {
    const step = Math.max(1, Math.round(period / grid));
    // Divided before it is multiplied, so the intermediate is never larger than the answer.
    const next = (ticks / gcd(ticks, step)) * step;
    if (next > MAX_RECURRENCE_TICKS) return null;
    ticks = next;
  }
  return ticks * grid;
}

/**
 * One unit and one figure, never a breakdown: the largest unit the duration fills at least once,
 * and how many of it that is. A figure is dropped entirely at the top of the scale — past the
 * cap, and past the last unit itself, the answer is the unit.
 */
export type Recurrence = { figure: number | null; unit: string };

/**
 * The two ends of the scale: what a figure too small for any unit is still said in, and the last
 * one. The scale is a non-empty tuple, so both ends are the type system's rather than a check's.
 */
const [smallest] = DURATION_SCALE;
const beyond = DURATION_SCALE.at(-1) ?? smallest;

/** The last unit on the scale: the one the estimate reaches when it stops being one. */
export const BEYOND_MEASURE: Recurrence = { figure: null, unit: beyond[0] };

/**
 * The duration `secs` is, in the largest unit that fits it. `null` seconds is the capped search
 * and reads as the last unit; so does anything that fills it, which nothing under the cap can.
 */
export function describeRecurrence(secs: number | null): Recurrence {
  if (secs === null || secs >= beyond[1]) return BEYOND_MEASURE;
  let chosen: DurationUnit = smallest;
  for (const entry of DURATION_SCALE) {
    if (secs < entry[1]) break;
    chosen = entry;
  }
  return { figure: secs / chosen[1], unit: chosen[0] };
}

/**
 * The estimate as the one line beside the strip. Deadpan: the unit does the work, so the figure
 * is one decimal while it is small enough to matter and a whole number once it is not.
 */
export function recurrenceLabel({ figure, unit }: Recurrence): string {
  if (figure === null) return unit;
  return `${figure < 10 ? figure.toFixed(1) : String(Math.round(figure))} ${unit}`;
}

/** How many loop periods the strip shows, and how many the overlay pulls back to. */
export const MOIRE_STRIP_CYCLES = 4;
export const MOIRE_OVERLAY_CYCLES = 48;

/**
 * How many cycles of the slowest row a window shows however few loop periods that is. Below two
 * the slowest row never repeats inside the picture, and a row that ticks once is a line rather
 * than a band — which is the one thing this picture must not read as.
 */
export const MIN_ROW_CYCLES = 2;

/**
 * How wide a window the rows are drawn across, in real seconds: a few periods of `reference` —
 * the deck's own loop, which is what a listener is counting in — pulled back where that would not
 * be enough for the slowest row to come round twice. A deck with no loop has no reference and
 * falls back to its slowest row. At close zoom the pattern reads as static, which is why the
 * overlay asks for more periods than the strip rather than fewer.
 */
export function moireWindowSecs(
  reference: number,
  periods: readonly number[],
  cycles: number,
): number {
  const usable = periods.filter((period) => Number.isFinite(period) && period > 0);
  const longest = usable[0] === undefined ? 0 : Math.max(...usable);
  if (longest <= 0) return 0;
  const base = Number.isFinite(reference) && reference > 0 ? reference : longest;
  return Math.max(base * cycles, longest * MIN_ROW_CYCLES);
}
