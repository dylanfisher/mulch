/** @role Tests the recurrence estimate at both ends, and the loop period the rate divides. */
import { describe, expect, it } from "vitest";

import { DURATION_SCALE } from "./copy";
import {
  BEYOND_MEASURE,
  describeRecurrence,
  loopPeriodSecs,
  MAX_RECURRENCE_TICKS,
  recurrenceLabel,
  recurrenceLength,
} from "./recurrence";

/** The estimate as it is actually read: the one line the strip puts beside the picture. */
const said = (periods: readonly number[]) =>
  recurrenceLabel(describeRecurrence(recurrenceLength(periods)));

/** One length said the way the strip says it. */
const label = (secs: number) => recurrenceLabel(describeRecurrence({ secs }));

/** The exact seconds, or the failure of the case that asked for them. */
const exactly = (periods: readonly number[]): number => {
  const length = recurrenceLength(periods);
  if (!("secs" in length)) throw new Error(`expected an exact length, got 10**${length.log10Secs}`);
  return length.secs;
};

// One flat list of the estimate's cases (0007).
// oxlint-disable-next-line max-lines-per-function
describe("recurrence", () => {
  it("divides a loop by the rate it is read at, and refuses a rate of none", () => {
    // Rate scales buffer time and not lane time, so half speed is twice as long a loop (0035).
    expect(loopPeriodSecs({ in: 1, out: 3 }, 0.5)).toBe(4);
    expect(loopPeriodSecs({ in: 1, out: 3 }, 2)).toBe(1);
    expect(loopPeriodSecs(null, 1)).toBe(0);
    expect(loopPeriodSecs({ in: 1, out: 3 }, 0)).toBe(0);
    // A loop of no length is no period, not a period of zero that the estimate then divides by.
    expect(loopPeriodSecs({ in: 2, out: 2 }, 1)).toBe(0);
  });

  it("returns nothing going round for no periods at all", () => {
    expect(exactly([])).toBe(0);
    expect(exactly([0, -1, Number.NaN, Number.POSITIVE_INFINITY])).toBe(0);
  });

  it("returns the one period a single row runs on", () => {
    expect(exactly([4])).toBeCloseTo(4, 6);
    expect(exactly([0.1])).toBeCloseTo(0.1, 6);
    expect(exactly([600])).toBeCloseTo(600, 6);
  });

  it("returns the longer of two periods that are exact multiples", () => {
    expect(exactly([2, 4])).toBeCloseTo(4, 6);
    expect(exactly([1, 2, 8])).toBeCloseTo(8, 6);
    // Identical periods line up on themselves, however many of them there are.
    expect(exactly([3, 3, 3])).toBeCloseTo(3, 6);
  });

  it("multiplies periods that share nothing", () => {
    // Quantized onto a grid of 3/16, so 3 and 5 stay 16 and 27 ticks: coprime, and their product
    // of 432 ticks is 81 seconds — the least common multiple of 3 and 5 twenty-seven times over
    // is not the honest answer, and the estimate never claimed to be one.
    expect(exactly([3, 5])).toBeGreaterThan(5);
  });

  it("keeps counting past the last unit, as an exponent rather than a flat answer", () => {
    // Twenty lanes whose tick counts share almost nothing: the multiple runs off the end of the
    // scale, and past the last unit the estimate keeps counting in multiples of it.
    const many = Array.from({ length: 20 }, (_, index) => 0.5 + index * 0.61);
    expect(said(many)).toMatch(/^10\^\d+ × the age of the universe$/u);
    expect(BEYOND_MEASURE[0]).toBe("the age of the universe");
    // The old flat answer is gone: the last unit is never the whole reading any more.
    expect(said(many)).not.toBe(BEYOND_MEASURE[0]);
  });

  it("no longer reaches the end of the scale for a deck it can still count", () => {
    // Eleven lanes on a full rack of ridden knobs: their multiple leaves the exact integers, and
    // that used to be the whole answer — the search stopped and the last unit swallowed it. It is
    // an ordinary duration, and the logarithms are what can still say so.
    const eleven = [0.5, 1.1, 1.7, 2.3, 2.9, 3.7, 4.3, 5.9, 6.7, 7.1, 8.3];
    expect("secs" in recurrenceLength(eleven)).toBe(false);
    expect(said(eleven)).toBe("2.2 geological epochs");
    expect(said(eleven.slice(0, 10))).toBe("566 millennia");
  });

  it("crosses from exact integers into logarithms at the cap, and agrees either side of it", () => {
    // A shortest period of 16 puts the grid at exactly one second, so a period is its own tick
    // count and the crossing can be stood on rather than approached.
    const under = exactly([16, MAX_RECURRENCE_TICKS]);
    expect(under).toBe(MAX_RECURRENCE_TICKS);
    expect(said([16, MAX_RECURRENCE_TICKS])).toBe("29 geological epochs");
    // Half as much again and the product is past the cap, where an integer stops being exact.
    const past = [16, 1.5 * MAX_RECURRENCE_TICKS];
    const over = recurrenceLength(past);
    if ("secs" in over) throw new Error("the cap did not cross");
    // The two sides meet: the log of the last exact answer, plus the factor that broke it.
    expect(over.log10Secs).toBeCloseTo(Math.log10(under) + Math.log10(1.5), 9);
    // And it is still an ordinary duration — leaving the integers is not reaching the end of the
    // scale, and the reading does not jump when the arithmetic does.
    expect(said(past)).toBe("43 geological epochs");
    expect(MAX_RECURRENCE_TICKS).toBeLessThan(Number.MAX_SAFE_INTEGER);
  });

  it("takes no period as a factorisation it cannot finish, however long that period is", () => {
    // A tick count past the safe integers has no factors to divide out — a trial division of it
    // would never come back — so it joins the multiple as its own magnitude instead.
    const length = recurrenceLength([0.1, 1e307]);
    if ("secs" in length) throw new Error("1e307 seconds stayed exact");
    expect(length.log10Secs).toBeCloseTo(308, 6);
    expect(said([0.1, 1e307])).toMatch(/^10\^\d+ × the age of the universe$/u);
  });

  it("refuses a length that is longer than a number, however exact its tick count", () => {
    // Eight coprime tick counts on a grid this coarse: the multiple is a modest exact integer and
    // the seconds it stands for are past what a double holds. A length that is not a length is no
    // answer (principle 5), so the logs that were kept alongside it are what answers.
    const periods = [16, 17, 19, 23, 29, 31, 37, 41].map((step) => (1e300 * step) / 16);
    const length = recurrenceLength(periods);
    if ("secs" in length) throw new Error("an infinite length was reported as seconds");
    expect(Number.isFinite(length.log10Secs)).toBe(true);
    expect(said(periods)).toMatch(/^10\^\d+ × the age of the universe$/u);
  });

  it("never runs away on a period the exact integers cannot reach", () => {
    // Each period is coprime with the last on the grid the shortest sets, so this is the shape
    // that would loop forever or overflow if the multiple were carried as a product.
    const many = Array.from({ length: 64 }, (_, index) => 1 + index * 0.37);
    const length = recurrenceLength(many);
    if ("secs" in length) throw new Error("64 coprime periods stayed exact");
    expect(Number.isFinite(length.log10Secs)).toBe(true);
    expect(said(many)).toMatch(/^10\^\d+ × the age of the universe$/u);
  });

  it("says one unit and one figure, at both ends of the scale", () => {
    expect(label(4)).toBe("4.0 seconds");
    expect(label(90)).toBe("1.5 minutes");
    expect(label(7200)).toBe("2.0 hours");
    expect(label(86_400 * 40)).toBe("1.3 months");
    expect(label(31_556_952 * 4300)).toBe("4.3 millennia");
    expect(label(31_556_952 * 40_000_000)).toBe("8.0 geological epochs");
    expect(label(9_460_730_472_580_800 * 3)).toBe("3.0 light years");
    // Past the last unit the scale runs out of names and starts counting in the last one instead.
    expect(label(BEYOND_MEASURE[1] * 2.5)).toBe("2.5 × the age of the universe");
    // The two notations never both say ten: a figure that rounds to ten is already the exponent.
    expect(label(BEYOND_MEASURE[1] * 9.9)).toBe("9.9 × the age of the universe");
    expect(label(BEYOND_MEASURE[1] * 9.99)).toBe("10^1 × the age of the universe");
    // And past ten of those the figure is said as its own order of magnitude, deadpan.
    expect(label(BEYOND_MEASURE[1] * 1e30)).toBe("10^30 × the age of the universe");
    expect(recurrenceLabel(describeRecurrence({ log10Secs: 200 }))).toBe(
      "10^182 × the age of the universe",
    );
    // Under the smallest unit it is still said in that unit rather than in a smaller invented one.
    expect(label(0.25)).toBe("0.3 seconds");
    // A big figure loses its decimal: the unit is doing the work, not the precision.
    expect(label(3600 * 11.4)).toBe("11 hours");
  });

  it("names every unit once, ascending", () => {
    const units = DURATION_SCALE.map(([unit]) => unit);
    expect(new Set(units).size).toBe(units.length);
    // Ascending, strictly: a scale that doubled back would make a unit above the fold
    // unreachable, and one that repeated a length would pick between them by position.
    const secs = DURATION_SCALE.map(([, at]) => at);
    expect(secs.every((at, index) => index === 0 || at > (secs[index - 1] ?? 0))).toBe(true);
  });
});
