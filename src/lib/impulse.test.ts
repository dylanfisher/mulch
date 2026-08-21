import { describe, expect, it } from "vitest";

import { IMPULSE_CHANNELS, impulseResponse } from "./impulse";

const RATE = 48_000;
const spec = { decaySecs: 1, toneHz: 6_000, sampleRate: RATE };

/** The mean squared difference between neighbouring samples — how much high end a tail carries. */
function brightness(samples: Float32Array): number {
  let sum = 0;
  for (let index = 1; index < samples.length; index++) {
    sum += (samples[index]! - samples[index - 1]!) ** 2;
  }
  return sum / (samples.length - 1);
}

/** A block's mean power — what "60dB down" is measured on. */
const energy = (block: Float32Array): number =>
  block.reduce((sum, sample) => sum + sample ** 2, 0) / block.length;

// One flat list of cases against one pure function; splitting it would separate a case from the
// spec every one of them varies (0007).
// oxlint-disable-next-line max-lines-per-function
describe("impulseResponse", () => {
  it("gives the same samples for the same parameters, every time", () => {
    const first = impulseResponse(spec);
    const second = impulseResponse(spec);
    expect(second.length).toBe(IMPULSE_CHANNELS);
    for (const [channel, samples] of first.entries()) {
      expect([...second[channel]!]).toEqual([...samples]);
    }
  });

  it("draws each channel differently, so the tail has width", () => {
    const [left, right] = impulseResponse(spec);
    expect([...right!]).not.toEqual([...left!]);
  });

  it("is as long as the decay it was asked for", () => {
    expect(impulseResponse(spec)[0]).toHaveLength(RATE);
    expect(impulseResponse({ ...spec, decaySecs: 0.5 })[0]).toHaveLength(RATE / 2);
  });

  it("falls 60dB across that length, which is what a decay time means", () => {
    const samples = impulseResponse(spec)[0]!;
    const head = samples.slice(0, 1_000);
    const tail = samples.slice(samples.length - 1_000);
    const fallDb = 10 * Math.log10(energy(head) / energy(tail));
    expect(fallDb).toBeGreaterThan(50);
    expect(fallDb).toBeLessThan(70);
  });

  it("carries less high end at a darker tone", () => {
    const dark = impulseResponse({ ...spec, toneHz: 500 })[0]!;
    const bright = impulseResponse({ ...spec, toneHz: 12_000 })[0]!;
    expect(brightness(dark)).toBeLessThan(brightness(bright));
  });

  // What a convolution multiplies a signal by is the root of the sum of the squares, not the
  // peak: a peak-normalized tail gets louder the longer it is, which is the wet level becoming a
  // function of the decay nobody set it for.
  it("convolves at unity gain whatever the decay and tone", () => {
    for (const overrides of [{}, { decaySecs: 0.1 }, { decaySecs: 8 }, { toneHz: 300 }]) {
      for (const channel of impulseResponse({ ...spec, ...overrides })) {
        expect(Math.sqrt(energy(channel) * channel.length)).toBeCloseTo(1, 4);
      }
    }
  });

  it("refuses a decay, tone or rate that is not positive", () => {
    expect(() => impulseResponse({ ...spec, decaySecs: 0 })).toThrow(/positive decay/u);
    expect(() => impulseResponse({ ...spec, toneHz: -1 })).toThrow(/positive decay/u);
    expect(() => impulseResponse({ ...spec, sampleRate: Number.NaN })).toThrow(/positive decay/u);
  });
});
