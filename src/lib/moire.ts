/**
 * @role How long the whole loop takes: the periods a deck is running on — one per active lane, one
 *   per instance in its rack, plus the deck's own loop — the estimate of when they next line up,
 *   and the one human unit
 *   that estimate is said in. Plus what a row of the picture is made of that is not its period:
 *   the lane's own shape, sampled once. Pure maths: no context, no DOM, no clock.
 * @instead A lane's own period → laneSpan in src/lib/automation.ts, which this reads rather than
 *   restates. The words each unit is said in → DURATION_SCALE in src/lib/copy.ts. Drawing the
 *   rows these periods describe → src/ui/moireCanvas.ts.
 */
import { automationValueAt, laneSpan, type AutomationPoint } from "./automation";
import { DURATION_SCALE, type DurationUnit } from "./copy";
import { denormalize, normalize } from "./range";
import type { Loop } from "./timeline.ts";

/**
 * The loop's period in real seconds. Rate scales buffer time and not lane time, so the loop is
 * the one row of the strip that has to be divided by it (0035). A deck with no loop, or one read
 * at no rate at all, is running on no period rather than on a zero-length one.
 */
export function loopPeriodSecs(loop: Loop | null, rate: number): number {
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
 * Where the exact integers stop, in grid ticks. Under 2**53, so every product accepted below it
 * is an exact integer; past it the multiple is carried as a sum of logarithms instead, because a
 * figure computed on inexact integers is a lie with decimal places (principle 5) — and the
 * magnitude of a least common multiple needs no 2**53 (0080).
 */
export const MAX_RECURRENCE_TICKS = 2 ** 52;

/**
 * How long the pattern takes: the exact seconds while the multiple is still an exact integer, or
 * the base-ten logarithm of those seconds once it is not. Never both, never neither — the caller
 * cannot read a magnitude as a length by accident.
 */
export type RecurrenceLength = { readonly secs: number } | { readonly log10Secs: number };

/**
 * The largest power of each prime that divides `value`, folded into `into` as the running maximum
 * — which is exactly the factorisation of the least common multiple of everything folded in so
 * far. Trial division to the square root, so what is left over at the end is prime.
 *
 * A factorisation is the one form of a multiple that is both exact and unbounded: the product may
 * be past 2**53, the sum of its logs never is.
 */
function foldFactors(value: number, into: Map<number, number>): void {
  const raise = (prime: number, power: number): void => {
    into.set(prime, Math.max(into.get(prime) ?? 0, power));
  };
  let rest = value;
  for (let prime = 2; prime * prime <= rest; prime += prime === 2 ? 1 : 2) {
    let power = 0;
    while (rest % prime === 0) {
      rest /= prime;
      power++;
    }
    if (power > 0) raise(prime, power);
  }
  if (rest > 1) raise(rest, 1);
}

/**
 * When every period next lines up — in real seconds while that is exact, and as a magnitude once
 * it is not. The periods are quantized onto one coarse grid and the least common multiple is
 * taken on that, so two periods that are nearly commensurate are treated as commensurate: crude
 * beats slow, and the number this produces is read as an order of magnitude rather than as a
 * countdown.
 *
 * Periods that are not a positive finite length — a lane that never moved, a loop of no length,
 * a deck stopped dead at no rate — hold no cycle and take no part. No periods at all is not a
 * recurrence of forever; it is nothing going round, which is zero seconds.
 */
export function recurrenceLength(periods: readonly number[]): RecurrenceLength {
  const usable = periods.filter((period) => Number.isFinite(period) && period > 0);
  const shortest = usable[0] === undefined ? 0 : Math.min(...usable);
  if (shortest <= 0) return { secs: 0 };
  const grid = Math.max(MIN_RECURRENCE_GRID_SECS, shortest / RECURRENCE_DIVISIONS);
  const powers = new Map<number, number>();
  // A period whose tick count is past the safe integers has no factorisation to take: it is
  // already a magnitude, so it joins the multiple as its own log — coprime with everything, which
  // is this estimate erring the way it always errs. Divided in logs rather than before them,
  // because `period / grid` is the thing that overflowed.
  let log10Loose = 0;
  for (const period of usable) {
    const step = Math.round(period / grid);
    if (Number.isSafeInteger(step)) foldFactors(Math.max(1, step), powers);
    else log10Loose += Math.log10(period) - Math.log10(grid);
  }
  // The crossing, and the only one: the product is carried exactly for as long as it fits under
  // the cap, and the sum of logs is carried the whole way regardless, so the two agree either
  // side of the step rather than meeting at it.
  let ticks = 1;
  let log10Ticks = log10Loose;
  let exact = log10Loose === 0;
  for (const [prime, power] of powers) {
    log10Ticks += power * Math.log10(prime);
    if (!exact) continue;
    const next = ticks * prime ** power;
    if (next > MAX_RECURRENCE_TICKS) exact = false;
    else ticks = next;
  }
  // An exact tick count can still be more seconds than a double holds, and a length that is not a
  // length is no answer at all (principle 5): the logs were kept for exactly this.
  const secs = ticks * grid;
  return exact && Number.isFinite(secs) ? { secs } : { log10Secs: log10Ticks + Math.log10(grid) };
}

/**
 * One unit and one figure, never a breakdown. Three readings and no others: how many of the
 * largest unit the duration fills, how many of the last unit it is once the scale has run out of
 * names, and — once even that multiple has stopped being a number a person can hold — what power
 * of ten it is. The unit does the work in all three.
 */
export type Recurrence =
  | { readonly figure: number; readonly unit: string }
  | { readonly multiple: number; readonly unit: string }
  | { readonly exponent: number; readonly unit: string };

/**
 * The two ends of the scale: what a figure too small for any unit is still said in, and the last
 * one. The scale is a non-empty tuple, so both ends are the type system's rather than a check's.
 */
const [smallest] = DURATION_SCALE;

/**
 * The last unit on the scale. It is not an answer of its own any more: it is the unit a multiple
 * — and past that an exponent — counts in, so the estimate keeps counting past where a duration
 * is a duration instead of flattening onto it (0080).
 */
export const BEYOND_MEASURE: DurationUnit = DURATION_SCALE.at(-1) ?? smallest;

/** That unit's own magnitude, so a length already in logs never has to leave them to be placed. */
const LOG10_BEYOND = Math.log10(BEYOND_MEASURE[1]);

/**
 * How many of the last unit are still said as a figure, and how many decimals a figure carries.
 * At ten the figure is said as its own order of magnitude instead, which is where the decimal had
 * stopped meaning anything anyway.
 */
const EXPONENT_FROM = 10;
const FIGURE_DECIMALS = 1;

/**
 * The duration a length is, in the largest unit that fits it — and, past the largest unit there
 * is, in multiples of that one. A length carried as a magnitude is placed on the scale by its
 * logarithm rather than by leaving logs to be compared, which is the whole reason it is in them.
 */
export function describeRecurrence(length: RecurrenceLength): Recurrence {
  const log10Secs = "secs" in length ? Math.log10(length.secs) : length.log10Secs;
  if (log10Secs < LOG10_BEYOND) {
    const secs = "secs" in length ? length.secs : 10 ** log10Secs;
    let chosen: DurationUnit = smallest;
    for (const entry of DURATION_SCALE) {
      if (secs < entry[1]) break;
      chosen = entry;
    }
    return { figure: secs / chosen[1], unit: chosen[0] };
  }
  const log10Multiple = log10Secs - LOG10_BEYOND;
  // Decided on the figure as it will be read, not on the one behind it: 9.99 of them rounds to ten
  // on the way to the screen, and two adjacent answers must not both say ten in two notations.
  const multiple = 10 ** log10Multiple;
  if (Number(multiple.toFixed(FIGURE_DECIMALS)) < EXPONENT_FROM) {
    return { multiple, unit: BEYOND_MEASURE[0] };
  }
  return { exponent: Math.round(log10Multiple), unit: BEYOND_MEASURE[0] };
}

/**
 * The estimate as the one line beside the strip. Deadpan: the unit does the work, so the figure
 * is one decimal while it is small enough to matter, a whole number once it is not, and a power
 * of ten once the unit itself is the thing being counted. The exponent reads as a plain unit.
 */
export function recurrenceLabel(recurrence: Recurrence): string {
  if ("exponent" in recurrence) return `10^${recurrence.exponent} × ${recurrence.unit}`;
  const figure = "figure" in recurrence ? recurrence.figure : recurrence.multiple;
  const said =
    figure < EXPONENT_FROM ? figure.toFixed(FIGURE_DECIMALS) : String(Math.round(figure));
  return "figure" in recurrence ? `${said} ${recurrence.unit}` : `${said} × ${recurrence.unit}`;
}

/**
 * How many loop periods a window shows — one number, at both sizes. The strip once asked for a
 * few and the overlay for many, which made the small picture a different picture rather than a
 * smaller one: at four cycles across a strip's height the rows are wide enough to fill their own
 * band and read as a blob. The finer lines follow from the window, not from a second set of
 * drawing rules (0098).
 */
export const MOIRE_CYCLES = 48;

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
 * cycles asked for are many rather than few — and why both sizes ask for the same number.
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

/**
 * The band an instance in the rack draws its own row's period from, in real seconds: short enough
 * to beat against a bar and long enough to drift across several, so a rack of two is two rows that
 * cross rather than two of the same.
 */
export const EFFECT_ROW_PERIOD_SECS: readonly [number, number] = [0.75, 12];

/**
 * How many periods that band is divided into. Coarse on purpose: two rows a fraction of a percent
 * apart beat once every few thousand seconds, which is no fringe inside any window the strip draws
 * and reads as one row drawn twice. A grid of this many is a real ratio between neighbours.
 */
const EFFECT_ROW_PERIODS = 12;

/** How far up the fold the choice is read from: the low bits are already spent on the waveform. */
const EFFECT_ROW_SHIFT = 1024;

/**
 * The period an instance's own row runs on, folded out of the same number its name and its shape
 * are (0076): an effect is drawn whether or not anything is automating it, so a rack contributes
 * rows to the picture on its own. Read from the fold's quotient, because its remainder is already
 * spent picking the row's waveform — one fold, two independent halves, exactly as an effect's two
 * name pools are drawn (src/lib/copy.ts). Geometric across the band: what one period does to
 * another is a ratio, so an even spread of ratios is an even spread of beats.
 */
export function effectRowPeriod(seed: number): number {
  const turn = (Math.floor(seed / EFFECT_ROW_SHIFT) % EFFECT_ROW_PERIODS) / EFFECT_ROW_PERIODS;
  return denormalize(turn, ...EFFECT_ROW_PERIOD_SECS, "log");
}

/** How many samples of its own shape a row carries: enough to bend a wave, not to redraw a lane. */
export const BEND_SAMPLES = 16;

/** What a row with no shape of its own carries: the middle of the range, so it bends nothing. */
export const FLAT_BEND: readonly number[] = [0.5];

/**
 * A lane's own gesture across one cycle, normalized onto 0..1 — what bends a row's wave, so the
 * period sets the fringe pitch and the values decide where the fringes crowd. Read through
 * `automationValueAt`, which is the one reading of a lane there is (0035), and sampled once when
 * the rows are built: a lane's shape does not move, only its phase does, so nothing here is
 * per-frame work (0070). A lane holding one value bends nothing and reads flat.
 */
export function laneBend(lane: readonly AutomationPoint[]): readonly number[] {
  const span = laneSpan(lane);
  const base = lane[0]?.value ?? 0;
  if (span <= 0) return FLAT_BEND;
  const samples = Array.from({ length: BEND_SAMPLES }, (_, index) =>
    automationValueAt(lane, (index / BEND_SAMPLES) * span, base),
  );
  const low = Math.min(...samples);
  const high = Math.max(...samples);
  if (high <= low) return FLAT_BEND;
  return samples.map((value) => normalize(value, low, high));
}

/**
 * One row of the picture: how long its cycle is in real seconds, how far into that cycle it has
 * reached, the fold it is drawn from — its parameter's, or its instance's own id — which picks
 * both the waveform and where in its cycle it starts, the lane's own gesture across that cycle,
 * and whether it is the reference the others are read against. Allocated once per set of rows and
 * refilled in place, because `phase` is a per-frame read (0070) — and `shape` and `bend` are the
 * row's identity rather than its motion, so neither changes between frames.
 */
export type MoireRow = {
  period: number;
  phase: number;
  reference: boolean;
  shape: number;
  bend: readonly number[];
};

export const TAU = 2 * Math.PI;

/**
 * `value` inside one span of `span`, never negative — a turn as a fraction of itself, a device
 * pixel as its place in a tile. Here rather than in either painter because both of them wrap, and
 * the two would drift apart the first time one of them was tightened (principle 1).
 */
export const wrap = (value: number, span: number): number => ((value % span) + span) % span;

/** The width of the fold, so the whole of it is spread across one cycle rather than a corner. */
const FOLD_TURNS = 2 ** 32;

/**
 * Where in its own cycle a row starts, in turns. There are more parameters than there are
 * waveforms, so the waveform alone cannot keep two of them apart: the fold picks the waveform by
 * its remainder and the whole of it turns the row, exactly as an effect's two pools are drawn from
 * one fold (src/lib/copy.ts). Two parameters draw the same row only if they fold to the same
 * number, which is what the fold exists not to do — and it is the same turn the screen slices to
 * decide which parameter owns which of its motions (0128).
 */
export const rowOffset = (shape: number): number => (shape % FOLD_TURNS) / FOLD_TURNS;

/** Where a row stands in its own cycle, in turns — what every motion in the picture is read off. */
export const turnsOf = (row: MoireRow): number => wrap(row.phase / row.period, 1);
