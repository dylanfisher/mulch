import { describe, expect, it } from "vitest";

import { peaks } from "./peaks";

describe("peaks", () => {
  it("reduces each column to the extremes of the samples inside it", () => {
    const samples = Float32Array.of(0, 0.5, -0.25, 1, -1, 0.75);
    const { min, max } = peaks([samples], 3);
    expect([...max]).toEqual([0.5, 1, 0.75]);
    expect([...min]).toEqual([0, -0.25, -1]);
  });

  it("takes the extremes across every channel, so nothing loud is drawn quiet", () => {
    const left = Float32Array.of(0.5, 0);
    const right = Float32Array.of(0, -0.75);
    const { min, max } = peaks([left, right], 1);
    expect(max[0]).toBeCloseTo(0.5, 6);
    expect(min[0]).toBeCloseTo(-0.75, 6);
  });

  it("leaves a column with no samples flat rather than borrowing its neighbour's", () => {
    const { min, max } = peaks([Float32Array.of(1, -1)], 4);
    expect([...max]).toEqual([0, 1, 0, 0]);
    expect([...min]).toEqual([0, 0, 0, -1]);
  });

  it("refuses a column count it cannot lay out", () => {
    expect(() => peaks([Float32Array.of(1)], 0)).toThrow(/columns/u);
    expect(() => peaks([Float32Array.of(1)], 1.5)).toThrow(/columns/u);
  });
});
