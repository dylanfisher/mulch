import { describe, expect, it } from "vitest";

import { GROWTH_LEFT_LABEL, growthLeft, holdLeft } from "./copyAuto.ts";

/**
 * The one spelling of how long is left, which the automator's own rows, the three arrangement rows
 * and the walk's eyebrow all read (P162). A clock and nothing else: the word for what it counts is
 * the slot's label, said once at mount, because a countdown carrying it wrapped the column the
 * arrangement reserves for it onto a second line — and a row whose clock moves the buttons beside
 * it is a row nothing can be pressed on.
 */
describe("growthLeft", () => {
  it("says a countdown in three shapes and no more precision than each deserves", () => {
    // Hours, where nobody reads the seconds; minutes and seconds once an hour is off it; and the
    // seconds alone at the end, which is when a row is worth watching.
    expect(growthLeft(3 * 3600 + 4 * 60)).toBe("3h 04m");
    expect(growthLeft(12 * 60 + 3.2)).toBe("12m 04s");
    expect(growthLeft(8.4)).toBe("9s");
    // Both ends: a run already over counts nothing rather than counting backwards, and the hour
    // boundary reads as an hour rather than as sixty minutes.
    expect(growthLeft(-5)).toBe("0s");
    expect(growthLeft(3600)).toBe("1h 00m");
  });

  it("says no word for what it is counting, in any of the three", () => {
    // The word is the column's label and not the clock's, so no shape of the clock carries it —
    // including the two that reach it through a hold.
    for (const secs of [3 * 3600 + 4 * 60, 12 * 60 + 3.2, 8.4, 0]) {
      expect(growthLeft(secs)).not.toContain("left");
    }
    expect(GROWTH_LEFT_LABEL).toContain("left");
  });

  it("keeps a hold's two ends as words about a state", () => {
    // `held` and `running` are not clocks and are untouched by the word coming off the number; the
    // hold's counting case is the clock itself.
    expect(holdLeft(Number.POSITIVE_INFINITY)).toBe("held");
    expect(holdLeft(0)).toBe("running");
    expect(holdLeft(90)).toBe("1m 30s");
  });
});
