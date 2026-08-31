import { describe, expect, it } from "vitest";

import { crestFactor, peakMagnitude, peaks, rmsMagnitude, spectralTilt } from "./peaks";

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

/** One window of `length` samples, `fill` written across it — the shape an analyser hands over. */
const windowOf = (length: number, fill: (at: number) => number): Float32Array =>
  Float32Array.from({ length }, (_, at) => fill(at));

/** A sine of `cycles` whole cycles across a window of `length`, so its frequency is exact. */
const sineOf = (length: number, cycles: number): Float32Array =>
  windowOf(length, (at) => Math.sin((2 * Math.PI * cycles * at) / length));

describe("rmsMagnitude", () => {
  it("takes the power the window carries and not its loudest sample", () => {
    // A sine's RMS is its peak over root two, which is the whole difference between a meter's
    // number and the one a picture of the output rests on.
    const sine = sineOf(1024, 64);
    expect(rmsMagnitude(sine)).toBeCloseTo(peakMagnitude(sine) / Math.SQRT2, 4);
    // A window at one level reads that level; a silent or empty one reads 0 rather than nothing.
    expect(rmsMagnitude(windowOf(64, () => 0.5))).toBeCloseTo(0.5, 6);
    expect(rmsMagnitude(new Float32Array(64))).toBe(0);
    expect(rmsMagnitude(new Float32Array(0))).toBe(0);
  });

  it("is the power `crestFactor` reads, and not a second scan of its own", () => {
    // Principle 1: the crest is the peak over this, so the two answers cannot disagree.
    for (const window of [sineOf(1024, 64), windowOf(1024, (at) => (at < 4 ? 1 : 0))]) {
      expect(crestFactor(window)).toBeCloseTo(peakMagnitude(window) / rmsMagnitude(window), 6);
    }
  });
});

describe("spectralTilt", () => {
  /**
   * P167: how bright a window is, in the time domain and never a spectrum — an FFT a channel a
   * frame to move one grating is a large bill for a scalar. Differencing is a one-pole high pass,
   * so a sine at *f* answers `2·sin(π f/sr)` times itself and halving lands it on 0..1.
   */
  it("reads a sine by its own frequency, an octave up as brighter, and noise as bright", () => {
    const LENGTH = 4096;
    const low = spectralTilt(sineOf(LENGTH, 32));
    const octaveUp = spectralTilt(sineOf(LENGTH, 64));
    // The maths itself: a sine of `cycles` across `length` samples stands at cycles/length of the
    // rate, so the answer is sin(π f/sr) and the reading is that and not an approximation of it.
    expect(low).toBeCloseTo(Math.sin(Math.PI * (32 / LENGTH)), 3);
    expect(octaveUp).toBeCloseTo(Math.sin(Math.PI * (64 / LENGTH)), 3);
    // A dark mix reads near nothing and each octave up reads brighter than the one under it.
    expect(low).toBeLessThan(0.05);
    expect(octaveUp).toBeGreaterThan(low);
    // Noise carries power at every frequency, so it stands well above a tone near the bottom of
    // the band; the brightest thing a window can hold — alternating samples — reads at one.
    let seed = 7;
    const noise = windowOf(LENGTH, () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 1073741824 - 1;
    });
    expect(spectralTilt(noise)).toBeGreaterThan(octaveUp);
    expect(spectralTilt(windowOf(LENGTH, (at) => (at % 2 === 0 ? 1 : -1)))).toBeCloseTo(1, 6);
  });

  it("reads silence as 0 rather than as a ratio of two zeroes, and is bounded", () => {
    // The same sentinel `crestFactor` uses for "measured nothing", and not a reading a window with
    // sound in it can produce.
    expect(spectralTilt(new Float32Array(1024))).toBe(0);
    expect(spectralTilt(new Float32Array(0))).toBe(0);
    expect(spectralTilt(Float32Array.of(0.5))).toBe(0);
    // Bounded whatever arrives: a window hotter than full scale is still a window, and the picture
    // it drives may not be pushed past either end of the band by one.
    for (const window of [sineOf(1024, 500), windowOf(1024, (at) => (at % 2 === 0 ? 9 : -9))]) {
      expect(spectralTilt(window)).toBeGreaterThanOrEqual(0);
      expect(spectralTilt(window)).toBeLessThanOrEqual(1);
    }
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
