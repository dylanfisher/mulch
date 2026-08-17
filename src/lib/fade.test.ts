import { describe, expect, it } from "vitest";

import { applyFades, assertFadeSecs } from "./fade";

const RATE = 100;
/** One second of full-scale ones, so every assertion below reads the fade's gain directly. */
const ones = (): Float32Array[] => [new Float32Array(RATE).fill(1)];
const at = (channels: readonly Float32Array[], index: number, channel = 0): number | undefined =>
  channels[channel]?.[index];

// One `it` per fade shape, each three lines over the one-second buffer above (0007).
// oxlint-disable-next-line max-lines-per-function
describe("applyFades", () => {
  it("leaves every sample alone when neither end is faded", () => {
    const channels = ones();
    applyFades(channels, RATE, 0, 0);
    expect(at(channels, 0)).toBe(1);
    expect(at(channels, 99)).toBe(1);
  });

  it("silences the first sample and reaches full scale by the end of a fade in", () => {
    const channels = ones();
    applyFades(channels, RATE, 0.5, 0);
    expect(at(channels, 0)).toBe(0);
    expect(at(channels, 25)).toBeCloseTo(0.5, 6);
    // Past the ramp, untouched: a fade in shapes its own half and nothing after it.
    expect(at(channels, 50)).toBe(1);
    expect(at(channels, 99)).toBe(1);
  });

  it("silences the last sample and leaves everything before a fade out alone", () => {
    const channels = ones();
    applyFades(channels, RATE, 0, 0.5);
    expect(at(channels, 0)).toBe(1);
    expect(at(channels, 49)).toBe(1);
    // The ramp counts back from the last sample, so the halfway gain lands one frame in.
    expect(at(channels, 75)).toBeCloseTo(0.48, 6);
    expect(at(channels, 99)).toBe(0);
  });

  it("fades both ends of the same buffer", () => {
    const channels = ones();
    applyFades(channels, RATE, 0.25, 0.25);
    expect(at(channels, 0)).toBe(0);
    expect(at(channels, 50)).toBe(1);
    expect(at(channels, 99)).toBe(0);
  });

  it("fades every channel the same way", () => {
    const channels = [new Float32Array(RATE).fill(1), new Float32Array(RATE).fill(-1)];
    applyFades(channels, RATE, 0.5, 0);
    expect(at(channels, 25, 0)).toBeCloseTo(0.5, 6);
    expect(at(channels, 25, 1)).toBeCloseTo(-0.5, 6);
  });

  it("clamps a fade longer than the buffer rather than refusing it", () => {
    const channels = ones();
    applyFades(channels, RATE, 10, 0);
    expect(at(channels, 0)).toBe(0);
    expect(at(channels, 99)).toBeCloseTo(0.99, 6);
  });

  it("multiplies the two ramps where they overlap", () => {
    const channels = ones();
    applyFades(channels, RATE, 1, 1);
    // Halfway is half of the way up, then very nearly half of the way down.
    expect(at(channels, 50)).toBeCloseTo(0.5 * 0.49, 6);
    expect(at(channels, 0)).toBe(0);
    expect(at(channels, 99)).toBe(0);
  });

  /** The same refusal a caller makes before it spends a render on a fade it cannot apply. */
  it("answers whether a fade is a length before there is a buffer to put it on", () => {
    expect(assertFadeSecs(0.25, "a fade in")).toBe(0.25);
    expect(() => assertFadeSecs(-1, "a fade in")).toThrow(/a fade in is negative/u);
    expect(() => assertFadeSecs(Number.NaN, "a fade out")).toThrow(/not a finite number/u);
  });

  it("refuses a fade that is not a length rather than ramping the wrong way", () => {
    expect(() => {
      applyFades(ones(), RATE, -0.1, 0);
    }).toThrow(/a fade in is negative/u);
    expect(() => {
      applyFades(ones(), RATE, 0, Number.NaN);
    }).toThrow(/a fade out is not a finite number/u);
  });

  it("refuses a buffer nothing can be measured against", () => {
    expect(() => {
      applyFades([], RATE, 1, 0);
    }).toThrow(/a fade needs at least one channel/u);
    expect(() => {
      applyFades(ones(), 0, 1, 0);
    }).toThrow(/fade sample rate/u);
  });
});
