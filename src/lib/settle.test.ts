import { describe, expect, it } from "vitest";

import { feedbackSettleSecs, rackSettleSecs, SETTLE_DB, SETTLE_FLOOR_SECS } from "./settle.ts";

describe("feedbackSettleSecs", () => {
  it("counts the repeats a loop takes to fall the settling threshold", () => {
    // Half gain is 6.02dB a repeat, so 60dB is just under ten of them, each a loop long.
    const halved = feedbackSettleSecs(1, 0.5);
    expect(halved).toBeCloseTo(SETTLE_DB / (20 * Math.log10(2)), 6);
    expect(halved).toBeCloseTo(9.97, 2);
    // And the loop's own length is the unit: the same gain over two seconds takes twice as long.
    expect(feedbackSettleSecs(2, 0.5)).toBeCloseTo(halved * 2, 6);
  });

  it("is longer for a loop that decays more slowly", () => {
    expect(feedbackSettleSecs(1, 0.9)).toBeGreaterThan(feedbackSettleSecs(1, 0.5));
  });

  it("is infinite at unity and above, which is the whole point of it", () => {
    // A tape at Regen 1 or past it never decays — what it holds is everything it has been given,
    // and no window reconstructs that, so an export of one renders its whole history.
    expect(feedbackSettleSecs(1, 1)).toBe(Number.POSITIVE_INFINITY);
    expect(feedbackSettleSecs(0.3, 1.4)).toBe(Number.POSITIVE_INFINITY);
  });

  it("is one pass of the line at no feedback, and nothing without a line", () => {
    expect(feedbackSettleSecs(0.4, 0)).toBe(0.4);
    expect(feedbackSettleSecs(0, 0.5)).toBe(0);
  });
});

describe("rackSettleSecs", () => {
  it("takes the longest memory rather than their sum, because the stages run at once", () => {
    expect(rackSettleSecs([2, 8, 4])).toBe(8);
  });

  it("never goes under the floor, so a rack of nothing still settles", () => {
    expect(rackSettleSecs([])).toBe(SETTLE_FLOOR_SECS);
    expect(rackSettleSecs([0.001])).toBe(SETTLE_FLOOR_SECS);
  });

  it("carries one infinity out past everything else in the rack", () => {
    expect(rackSettleSecs([2, Number.POSITIVE_INFINITY, 4])).toBe(Number.POSITIVE_INFINITY);
  });
});
