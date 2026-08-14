import { describe, expect, it } from "vitest";

import { AMPLITUDE, CLICK_SECS, GEN_KINDS, MAX_SECS, renderGen, SWEEP_END_HZ } from "./waveform";

const RATE = 48_000;
const spec = (over: { secs?: number; hz?: number } = {}) => ({
  secs: 1,
  sampleRate: RATE,
  ...over,
});

/** Zero crossings per second is a frequency measurement that needs no FFT: 2 per cycle. */
const crossingsPerSecond = (samples: Float32Array, sampleRate: number) => {
  let crossings = 0;
  for (let i = 1; i < samples.length; i++) {
    if (Math.sign(samples[i] ?? 0) !== Math.sign(samples[i - 1] ?? 0)) crossings++;
  }
  return (crossings / samples.length) * sampleRate;
};

const peak = (samples: Float32Array) => Math.max(...samples.map((s) => Math.abs(s)));

describe("every generator", () => {
  it("renders exactly the requested length and stays inside the amplitude it promises", () => {
    for (const kind of GEN_KINDS) {
      const samples = renderGen(kind, spec({ secs: 0.5 }));
      expect(samples).toHaveLength(RATE / 2);
      expect(peak(samples)).toBeLessThanOrEqual(AMPLITUDE);
    }
  });

  it("refuses a length the wire could ask for by typo, before it allocates it", () => {
    expect(() => renderGen("sine", spec({ secs: 0 }))).toThrow(/secs/u);
    expect(() => renderGen("sine", spec({ secs: -1 }))).toThrow(/secs/u);
    expect(() => renderGen("sine", spec({ secs: MAX_SECS + 1 }))).toThrow(/secs/u);
    expect(() => renderGen("sine", spec({ secs: Number.NaN }))).toThrow(/secs/u);
  });

  it("refuses a positive length that still rounds to zero frames", () => {
    // secs > 0 alone is not enough: below half a sample period the buffer would be empty,
    // and createBuffer would turn that into a DOMException two files away.
    expect(() => renderGen("sine", spec({ secs: 1e-6 }))).toThrow(/sample/u);
  });
});

describe("sine", () => {
  it("oscillates at the frequency it was asked for", () => {
    const samples = renderGen("sine", spec({ hz: 440 }));
    expect(crossingsPerSecond(samples, RATE)).toBeCloseTo(880, -1);
    expect(peak(samples)).toBeCloseTo(AMPLITUDE, 3);
  });

  it("falls back to its default pitch rather than dividing by a zero frequency", () => {
    const samples = renderGen("sine", spec({ hz: 0 }));
    expect(crossingsPerSecond(samples, RATE)).toBeCloseTo(880, -1);
  });
});

describe("click-train", () => {
  it("puts a click onset on an exact sample, every 1/hz — the timing edge a loop test reads", () => {
    const samples = renderGen("click-train", spec({ hz: 4 }));
    const period = RATE / 4;
    for (let click = 0; click < 4; click++) {
      expect(samples[click * period]).toBeCloseTo(AMPLITUDE, 5);
    }
    // Silent between clicks: the decay is CLICK_SECS long, so half a period later is nothing.
    expect(samples[Math.round(period / 2)]).toBe(0);
  });

  it("decays over CLICK_SECS rather than lasting a single sample", () => {
    const samples = renderGen("click-train", spec({ hz: 1 }));
    const decay = Math.round(RATE * CLICK_SECS);
    expect(samples[decay - 1]).toBeGreaterThan(0);
    expect(samples[decay]).toBe(0);
  });
});

describe("sweep", () => {
  it("starts at its `hz` and ends near the top of the range, not at twice the rate", () => {
    const samples = renderGen("sweep", spec({ secs: 2, hz: 100 }));
    const window = RATE / 10;
    expect(crossingsPerSecond(samples.subarray(0, window), RATE)).toBeCloseTo(200, -2);
    const last = crossingsPerSecond(samples.subarray(samples.length - window), RATE);
    expect(last).toBeGreaterThan(SWEEP_END_HZ);
    expect(last).toBeLessThan(SWEEP_END_HZ * 2.4);
  });
});

describe("noise", () => {
  it("is seeded, so the same command renders the same samples — offline can fingerprint it", () => {
    const first = renderGen("noise", spec({ secs: 0.1 }));
    const second = renderGen("noise", spec({ secs: 0.1 }));
    expect([...first.subarray(0, 16)]).toEqual([...second.subarray(0, 16)]);
    // …and is actually noise, not a constant the equality above would also pass.
    expect(new Set(first.subarray(0, 64)).size).toBeGreaterThan(32);
  });
});

describe("silence", () => {
  it("is all zeros — the source that proves a chain adds nothing of its own", () => {
    const samples = renderGen("silence", spec({ secs: 0.1 }));
    expect(samples.every((s) => s === 0)).toBe(true);
  });
});
