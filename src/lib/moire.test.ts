/** @role Tests the recurrence estimate at both ends, and the loop period the rate divides. */
import { describe, expect, it } from "vitest";

import { DURATION_SCALE } from "./copy";
import {
  BEYOND_MEASURE,
  describeRecurrence,
  loopPeriodSecs,
  MAX_RECURRENCE_TICKS,
  moireWindowSecs,
  MOIRE_STRIP_CYCLES,
  recurrenceLabel,
  recurrenceSecs,
} from "./moire";

// One flat list of the estimate's cases (0007).
// oxlint-disable-next-line max-lines-per-function
describe("moire", () => {
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
    expect(recurrenceSecs([])).toBe(0);
    expect(recurrenceSecs([0, -1, Number.NaN, Number.POSITIVE_INFINITY])).toBe(0);
  });

  it("returns the one period a single row runs on", () => {
    expect(recurrenceSecs([4])).toBeCloseTo(4, 6);
    expect(recurrenceSecs([0.1])).toBeCloseTo(0.1, 6);
    expect(recurrenceSecs([600])).toBeCloseTo(600, 6);
  });

  it("returns the longer of two periods that are exact multiples", () => {
    expect(recurrenceSecs([2, 4])).toBeCloseTo(4, 6);
    expect(recurrenceSecs([1, 2, 8])).toBeCloseTo(8, 6);
    // Identical periods line up on themselves, however many of them there are.
    expect(recurrenceSecs([3, 3, 3])).toBeCloseTo(3, 6);
  });

  it("multiplies periods that share nothing", () => {
    // Quantized onto a grid of 3/16, so 3 and 5 stay 16 and 27 ticks: coprime, and their product
    // of 432 ticks is 81 seconds — the least common multiple of 3 and 5 twenty-seven times over
    // is not the honest answer, and the estimate never claimed to be one.
    const secs = recurrenceSecs([3, 5]);
    expect(secs).not.toBeNull();
    expect(secs).toBeGreaterThan(5);
  });

  it("caps the search and answers with the unit rather than a number", () => {
    // Eleven lanes whose tick counts share almost nothing: a deck with a full rack of ridden
    // knobs. Ten of them still answer in a unit; the eleventh runs the multiple past the cap.
    const periods = [0.5, 1.1, 1.7, 2.3, 2.9, 3.7, 4.3, 5.9, 6.7, 7.1, 8.3];
    expect(recurrenceSecs(periods.slice(0, 10))).toBeGreaterThan(0);
    expect(recurrenceSecs(periods)).toBeNull();
    expect(describeRecurrence(null)).toEqual(BEYOND_MEASURE);
    expect(BEYOND_MEASURE.figure).toBeNull();
    expect(recurrenceLabel(BEYOND_MEASURE)).toBe("the age of the universe");
    // The cap is what bounds it, and nothing under the cap is ever reported as beyond measure.
    expect(MAX_RECURRENCE_TICKS).toBeLessThan(Number.MAX_SAFE_INTEGER);
  });

  it("never runs away on a period the cap cannot reach", () => {
    // Each period is coprime with the last on the grid the shortest sets, so this is the shape
    // that would loop forever or overflow if the multiple were not bounded.
    const many = Array.from({ length: 64 }, (_, index) => 1 + index * 0.37);
    expect(recurrenceSecs(many)).toBeNull();
  });

  it("says one unit and one figure, at both ends of the scale", () => {
    expect(recurrenceLabel(describeRecurrence(4))).toBe("4.0 seconds");
    expect(recurrenceLabel(describeRecurrence(90))).toBe("1.5 minutes");
    expect(recurrenceLabel(describeRecurrence(7200))).toBe("2.0 hours");
    expect(recurrenceLabel(describeRecurrence(86_400 * 40))).toBe("1.3 months");
    expect(recurrenceLabel(describeRecurrence(31_556_952 * 4300))).toBe("4.3 millennia");
    expect(recurrenceLabel(describeRecurrence(31_556_952 * 40_000_000))).toBe(
      "8.0 geological epochs",
    );
    expect(recurrenceLabel(describeRecurrence(9_460_730_472_580_800 * 3))).toBe("3.0 light years");
    // Past the last unit there is nothing left to divide by, so the unit is the whole answer.
    expect(recurrenceLabel(describeRecurrence(1e30))).toBe("the age of the universe");
    // Under the smallest unit it is still said in that unit rather than in a smaller invented one.
    expect(recurrenceLabel(describeRecurrence(0.25))).toBe("0.3 seconds");
    // A big figure loses its decimal: the unit is doing the work, not the precision.
    expect(recurrenceLabel(describeRecurrence(3600 * 11.4))).toBe("11 hours");
  });

  it("names every unit once, ascending", () => {
    const units = DURATION_SCALE.map(([unit]) => unit);
    expect(new Set(units).size).toBe(units.length);
    // Ascending, strictly: a scale that doubled back would make a unit above the fold
    // unreachable, and one that repeated a length would pick between them by position.
    const secs = DURATION_SCALE.map(([, at]) => at);
    expect(secs.every((at, index) => index === 0 || at > (secs[index - 1] ?? 0))).toBe(true);
  });

  it("draws a window a few cycles of its longest row wide", () => {
    expect(moireWindowSecs([2, 5], MOIRE_STRIP_CYCLES)).toBe(5 * MOIRE_STRIP_CYCLES);
    expect(moireWindowSecs([], MOIRE_STRIP_CYCLES)).toBe(0);
    expect(moireWindowSecs([0, -3], MOIRE_STRIP_CYCLES)).toBe(0);
  });
});
