import { describe, expect, it } from "vitest";
import { mixGains } from "@/lib/crossfade";

describe("delay wet/dry mix", () => {
  it("uses equal-power endpoints and midpoint", () => {
    expect(mixGains(0)).toEqual({ dry: 1, wet: 0 });
    expect(mixGains(1).dry).toBeCloseTo(0);
    expect(mixGains(1).wet).toBe(1);
    const middle = mixGains(0.5);
    expect(middle.dry ** 2 + middle.wet ** 2).toBeCloseTo(1);
  });
});
