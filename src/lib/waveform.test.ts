import { describe, expect, it } from "vitest";

import {
  AMPLITUDE,
  CLICK_SECS,
  effectiveGenHz,
  GEN_KINDS,
  isGenSecs,
  MAX_SECS,
  MIN_SECS,
  renderGen,
  SWEEP_END_HZ,
  toneSample,
} from "./waveform";

const RATE = 48_000;
const spec = (over: { secs?: number; sampleRate?: number; hz?: number } = {}) => ({
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

  it("refuses a valid portable length if an invalid sample rate still rounds it to zero frames", () => {
    // The source contract covers Web Audio rates; this remains a loud last defense for a bad
    // context rather than letting createBuffer turn an empty result into a DOMException.
    expect(() => renderGen("sine", spec({ secs: MIN_SECS, sampleRate: 1 }))).toThrow(/sample/u);
  });

  it("refuses a rate that is not a rate, rather than rendering a zero-length buffer", () => {
    // NaN * secs is NaN, `NaN < 1` is false, and `new Float32Array(NaN)` has length 0 — the
    // frames guard cannot see it, so the rate is checked before the frame count is derived.
    expect(() => renderGen("sine", spec({ sampleRate: Number.NaN }))).toThrow(/sampleRate/u);
    expect(() => renderGen("sine", spec({ sampleRate: 0 }))).toThrow(/sampleRate/u);
  });

  it("exposes a portable lower bound to callers before rendering", () => {
    expect(isGenSecs(MIN_SECS)).toBe(true);
    expect(isGenSecs(MIN_SECS / 2)).toBe(false);
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
    expect(effectiveGenHz("sine", 0)).toBe(440);
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

/**
 * One frequency's amplitude in a buffer, by Goertzel — the whole of a DFT at a single bin, which
 * is what a claim about one frequency needs and an FFT is not. Over a window that is a whole
 * number of cycles of the spacing between the candidates, the bins are orthogonal: a component at
 * one of them reads zero at every other, which is what makes a quarter of a hertz visible here.
 */
const amplitudeAt = (samples: Float32Array, sampleRate: number, hz: number) => {
  const turn = 2 * Math.PI * (hz / sampleRate);
  const coefficient = 2 * Math.cos(turn);
  let previous = 0;
  let older = 0;
  for (let i = 0; i < samples.length; i++) {
    const current = (samples[i] ?? 0) + coefficient * previous - older;
    older = previous;
    previous = current;
  }
  const power = previous * previous + older * older - coefficient * previous * older;
  return (2 * Math.sqrt(Math.max(0, power))) / samples.length;
};

describe("tone", () => {
  /**
   * The generator that is an instrument rather than a fixture: its pitch is dialled in fractions
   * of a hertz, so that two yards a fraction apart beat against each other instead of one of them
   * stepping over the dissonance (P70). Four seconds resolves a quarter of a hertz exactly, so
   * every neighbouring candidate below is orthogonal to the one that was asked for.
   */
  it("renders the frequency it was asked for, at a quarter of a hertz", () => {
    const asked = 440.25;
    const samples = renderGen("tone", spec({ secs: 4, hz: asked }));
    const heard = [439.75, 440, asked, 440.5, 441].map((hz) => ({
      hz,
      amplitude: amplitudeAt(samples, RATE, hz),
    }));
    const loudest = heard.reduce((a, b) => (b.amplitude > a.amplitude ? b : a));
    expect(loudest.hz).toBe(asked);
    // Not "loudest by a nose": a pitch rounded to a whole hertz would put the energy at 440,
    // and a component that is not there reads as nothing at all.
    for (const candidate of heard) {
      if (candidate.hz !== asked) expect(candidate.amplitude).toBeLessThan(0.01);
    }
    expect(loudest.amplitude).toBeGreaterThan(0.5);
  });

  it("carries harmonics above that fundamental, which is what parts it from the sine", () => {
    const hz = 440.25;
    const samples = renderGen("tone", spec({ secs: 4, hz }));
    const sine = renderGen("sine", spec({ secs: 4, hz }));
    // Odd harmonics, and nothing at DC — a phase bent by the second harmonic is symmetric.
    expect(amplitudeAt(samples, RATE, 3 * hz)).toBeGreaterThan(0.05);
    expect(amplitudeAt(sine, RATE, 3 * hz)).toBeLessThan(0.01);
    expect(samples.reduce((sum, value) => sum + value, 0) / samples.length).toBeCloseTo(0, 5);
    // And still peaks where every generator does, so swapping one for the other is not a gain
    // change (the amplitude claim `every generator` makes, at the tolerance a peak deserves).
    expect(peak(samples)).toBeCloseTo(AMPLITUDE, 3);
  });

  it("is the same wave the deck draws — one function, so the picture cannot lie about the sound", () => {
    const hz = 440.25;
    const samples = renderGen("tone", spec({ secs: 0.01, hz }));
    for (const frame of [0, 7, 123, 400]) {
      expect(samples[frame]).toBeCloseTo(toneSample((2 * Math.PI * hz * frame) / RATE), 6);
    }
  });
});
