import { describe, expect, it } from "vitest";

import { fadeCurve, mixCurve, mixGains } from "./crossfade";

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

describe("mixCurve", () => {
  it("reads over [-1, 1] with the mix range in the upper half, so 0 sits at the middle sample", () => {
    const dry = mixCurve("dry");
    const middle = (dry.length - 1) / 2;
    expect(Number.isInteger(middle)).toBe(true);
    expect(dry[middle]).toBeCloseTo(mixGains(0).dry, 12);
    expect(dry.at(-1)).toBeCloseTo(mixGains(1).dry, 12);
    expect(mixCurve("wet")[dry.length - 1]).toBeCloseTo(mixGains(1).wet, 12);
  });

  it("holds the endpoint below the mix range rather than continuing the law past it", () => {
    const wet = mixCurve("wet");
    const middle = (wet.length - 1) / 2;
    for (let i = 0; i <= middle; i++) expect(wet[i]).toBe(wet[0]);
    expect(wet[0]).toBeCloseTo(mixGains(0).wet, 12);
  });

  it("is the same law the numbers are, sampled — not a second curve beside it", () => {
    const dry = mixCurve("dry");
    const wet = Array.from(mixCurve("wet"));
    // Six places, not twelve: a curve is `Float32Array` because that is what a WaveShaper reads,
    // so the law survives the sampling to float32 precision and no further.
    for (const [i, side] of dry.entries()) {
      expect(side ** 2 + Number(wet[i]) ** 2).toBeCloseTo(1, 6);
    }
  });
});

describe("fadeCurve", () => {
  it("rises from silence and falls to it, over [0, 1] rather than the mix curve's [-1, 1]", () => {
    const rising = fadeCurve("in");
    const falling = fadeCurve("out");
    expect(rising[0]).toBeCloseTo(0, 12);
    expect(rising.at(-1)).toBeCloseTo(1, 12);
    expect(falling[0]).toBeCloseTo(1, 12);
    expect(falling.at(-1)).toBeCloseTo(0, 12);
  });

  it("moves one way the whole window, so a fade never doubles back on itself", () => {
    const rising = Array.from(fadeCurve("in"));
    const falling = Array.from(fadeCurve("out"));
    for (let i = 1; i < rising.length; i++) {
      expect(Number(rising[i])).toBeGreaterThan(Number(rising[i - 1]));
      expect(Number(falling[i])).toBeLessThan(Number(falling[i - 1]));
    }
  });

  it("crosses at equal power, which is what keeps a jump from reading as a dip (0089)", () => {
    const rising = fadeCurve("in");
    const falling = Array.from(fadeCurve("out"));
    expect(rising).toHaveLength(falling.length);
    for (const [i, side] of rising.entries()) {
      expect(side ** 2 + Number(falling[i]) ** 2).toBeCloseTo(1, 6);
    }
  });
});
