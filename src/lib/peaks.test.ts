import { describe, expect, it } from "vitest";

import { peakMagnitude, peaks } from "./peaks";

describe("peakMagnitude", () => {
  it("takes the loudest magnitude, whichever side of zero it is on", () => {
    expect(peakMagnitude(Float32Array.of(0.25, -0.9, 0.5))).toBeCloseTo(0.9, 6);
    expect(peakMagnitude(Float32Array.of(-0.1, -0.2))).toBeCloseTo(0.2, 6);
  });

  it("reads a silent or empty window as 0 rather than as nothing", () => {
    expect(peakMagnitude(new Float32Array(0))).toBe(0);
    expect(peakMagnitude(new Float32Array(4))).toBe(0);
  });

  it("does not clamp a window hotter than full scale, which is what a meter must show", () => {
    expect(peakMagnitude(Float32Array.of(0.5, 1.4))).toBeCloseTo(1.4, 6);
  });
});

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

  it("refuses the channel shapes the rest of the tier refuses", () => {
    // The layout comes from channel 0, so a shorter channel would silently read as zeros
    // past its end and the answer would depend on channel order.
    expect(() => peaks([], 4)).toThrow(/channel/u);
    expect(() => peaks([Float32Array.of(1, -1), Float32Array.of(1)], 2)).toThrow(/length/u);
  });
});
