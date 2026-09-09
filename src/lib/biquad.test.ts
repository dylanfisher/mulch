import { describe, expect, it } from "vitest";
import { biquadCoefficients, magnitudeAt, magnitudeDbAt } from "./biquad";

const RATE = 48_000;
const peaking = (frequency: number, gainDb: number, q: number) =>
  biquadCoefficients("peaking", frequency, gainDb, q, RATE);
const db = (frequency: number, gainDb: number, q: number, at: number) =>
  magnitudeDbAt(peaking(frequency, gainDb, q), at, RATE);

/** The lower or upper frequency where the response has fallen to half the boost, in dB. */
function halfGainEdge(frequency: number, gainDb: number, q: number, side: "low" | "high"): number {
  let inside = frequency;
  let outside = side === "low" ? 1 : RATE / 2;
  for (let step = 0; step < 200; step++) {
    const middle = (inside + outside) / 2;
    if (db(frequency, gainDb, q, middle) > gainDb / 2) inside = middle;
    else outside = middle;
  }
  return (inside + outside) / 2;
}

describe("peaking biquad response", () => {
  it("boosts exactly the declared gain at the centre frequency", () => {
    expect(db(1_000, 12, 2, 1_000)).toBeCloseTo(12, 6);
    expect(db(120, 6, 0.7, 120)).toBeCloseTo(6, 6);
    expect(db(8_000, 18, 6, 8_000)).toBeCloseTo(18, 6);
  });

  it("leaves the rest of the spectrum alone", () => {
    for (const at of [20, 100, 20_000, RATE / 2]) {
      expect(db(1_000, 12, 4, at)).toBeCloseTo(0, 1);
    }
  });

  it("passes everything through untouched at zero gain", () => {
    for (const at of [20, 250, 1_000, 4_000, 19_000]) {
      expect(magnitudeAt(peaking(1_000, 0, 0.5), at, RATE)).toBeCloseTo(1, 12);
    }
  });

  it("cuts by exactly as much as it boosts", () => {
    for (const at of [200, 900, 1_000, 1_100, 6_000]) {
      expect(db(1_000, -15, 3, at)).toBeCloseTo(-db(1_000, 15, 3, at), 10);
    }
  });

  it("narrows its bandwidth as Q rises, at the centre frequency over Q", () => {
    let previous = Infinity;
    for (const q of [0.5, 1, 2, 4, 12]) {
      const width = halfGainEdge(1_000, 12, q, "high") - halfGainEdge(1_000, 12, q, "low");
      // The half-gain points of a peaking biquad are f0/Q apart — the definition of Q itself.
      // Compared proportionally: the discrete-time formulae warp the analogue width by under a
      // percent even at the widest Q this instrument offers.
      expect(Math.abs(width - 1_000 / q) / (1_000 / q)).toBeLessThan(0.02);
      expect(width).toBeLessThan(previous);
      previous = width;
    }
  });

  it("refuses a frequency, Q or rate the formulae are undefined for", () => {
    expect(() => peaking(0, 6, 1)).toThrow(/frequency/u);
    expect(() => peaking(1_000, 6, 0)).toThrow(/q/u);
    expect(() => peaking(24_000, 6, 1)).toThrow(/Nyquist/u);
    expect(() => biquadCoefficients("peaking", 1_000, 6, 1, 0)).toThrow(/sampleRate/u);
    expect(() => magnitudeAt(peaking(1_000, 6, 1), 30_000, RATE)).toThrow(/Nyquist/u);
  });
});

/**
 * The three shapes the band gained with `eq.shape` (0322). The node is what actually filters, and
 * the browser smoke measures it; what is asserted here is that the maths this file states is that
 * filter and not another one, to a precision a dB window cannot reach.
 */
describe("the pass shapes", () => {
  const shaped = (
    shape: "lowpass" | "highpass" | "bandpass",
    frequency: number,
    q: number,
    at: number,
  ) => magnitudeDbAt(biquadCoefficients(shape, frequency, 0, q, RATE), at, RATE);

  it("keeps one side of the corner and takes the other away", () => {
    // A low-pass passes what is under its corner and falls away above it — and at the bottom of the
    // Q knob the corner itself stands at unity, which is what makes that unit a lift and not a
    // factor: the value is the height of the peak in decibels, so a tenth of one is flat.
    expect(shaped("lowpass", 1_000, 0.1, 1_000)).toBeCloseTo(0.1, 2);
    expect(shaped("lowpass", 1_000, 0.1, 60)).toBeCloseTo(0, 1);
    expect(shaped("lowpass", 1_000, 0.1, 8_000)).toBeLessThan(-30);
    // And a high-pass is the same line the other way about, off the same corner.
    expect(shaped("highpass", 1_000, 0.1, 1_000)).toBeCloseTo(0.1, 2);
    expect(shaped("highpass", 1_000, 0.1, 16_000)).toBeCloseTo(0, 1);
    expect(shaped("highpass", 1_000, 0.1, 60)).toBeLessThan(-30);
    // A band-pass keeps its own middle whole and takes both skirts, which is the one shape whose
    // cut is two-sided — and its peak is unity, because the specification normalizes it there.
    expect(shaped("bandpass", 1_000, 1, 1_000)).toBeCloseTo(0, 2);
    expect(shaped("bandpass", 1_000, 1, 120)).toBeLessThan(-15);
    expect(shaped("bandpass", 1_000, 1, 8_000)).toBeLessThan(-15);
  });

  it("reads Q as the resonant peak in decibels on a pass, and as a width on a band-pass", () => {
    // The one place the specification's units part company with the peaking shape's: a low-pass's
    // Q is stated in dB, and it is the height of the lift at the corner rather than a factor.
    for (const decibels of [3, 6, 12]) {
      expect(shaped("lowpass", 1_000, decibels, 1_000)).toBeCloseTo(decibels, 0);
    }
    // A band-pass's is a quality factor: higher is narrower, which is a deeper cut a fixed
    // distance off the middle.
    const wide = shaped("bandpass", 1_000, 0.5, 2_000);
    const narrow = shaped("bandpass", 1_000, 4, 2_000);
    expect(narrow).toBeLessThan(wide);
  });

  it("leaves the gain out of every shape but the peaking one", () => {
    for (const shape of ["lowpass", "highpass", "bandpass"] as const) {
      expect(biquadCoefficients(shape, 1_000, 12, 1, RATE)).toEqual(
        biquadCoefficients(shape, 1_000, -12, 1, RATE),
      );
    }
    expect(biquadCoefficients("peaking", 1_000, 12, 1, RATE)).not.toEqual(
      biquadCoefficients("peaking", 1_000, -12, 1, RATE),
    );
  });
});
