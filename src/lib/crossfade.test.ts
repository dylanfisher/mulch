import { describe, expect, it } from "vitest";

import { mixGains } from "./crossfade";

describe("mixGains", () => {
  it("hands the whole signal to one side at each end", () => {
    expect(mixGains(0)).toEqual({ dry: 1, wet: 0 });
    expect(mixGains(1).dry).toBeCloseTo(0, 12);
    expect(mixGains(1).wet).toBe(1);
  });

  it("holds constant power everywhere between them, which a linear fade does not", () => {
    for (let mix = 0; mix <= 1.0001; mix += 0.05) {
      const { dry, wet } = mixGains(Math.min(1, mix));
      expect(dry ** 2 + wet ** 2).toBeCloseTo(1, 12);
    }
  });

  it("crosses at -3dB rather than at half, so the middle does not dip", () => {
    const middle = mixGains(0.5);
    expect(middle.dry).toBeCloseTo(Math.SQRT1_2, 12);
    expect(middle.wet).toBeCloseTo(Math.SQRT1_2, 12);
  });
});
