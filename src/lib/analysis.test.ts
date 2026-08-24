import { describe, expect, it } from "vitest";

import {
  analyzeBeats,
  ANALYSIS_HOP,
  MAX_BPM,
  MAX_ONSETS,
  MIN_BPM,
  MIN_ONSET_GAP_SECS,
  snapLoop,
  snapSecs,
} from "./analysis";
import { renderGen } from "./waveform";

const RATE = 48_000;

/**
 * The fixture: a click train. Its clicks land on `round(rate/hz)` sample boundaries by
 * construction (src/lib/waveform.ts), so both the tempo and every onset position are exact
 * arithmetic — no browser, no clock, no tolerance for timing (0025).
 */
const clicks = (hz: number, secs = 2) => [renderGen("click-train", { secs, sampleRate: RATE, hz })];

/** Where the generator actually put its clicks, in seconds, at this rate. */
const expectedOnsets = (hz: number, secs = 2): number[] => {
  const period = Math.round(RATE / hz);
  const frames = Math.round(secs * RATE);
  const at: number[] = [];
  for (let start = 0; start < frames; start += period) at.push(start / RATE);
  return at;
};

describe("analyzeBeats on the deterministic click fixture", () => {
  it("finds every click at its exact sample, and one tempo, at four click rates", () => {
    for (const hz of [2, 3, 4, 8]) {
      const analysis = analyzeBeats(clicks(hz), RATE);
      // Exact equality, not a tolerance: an onset is a sample index divided by the rate, and
      // so is the expectation. A hop-boundary answer would fail this.
      expect(analysis.onsets).toEqual(expectedOnsets(hz));
      // Clicks per second is beats per second; folded into range, 2/3/4/8Hz are all 120/180.
      expect(analysis.bpm).toBe(hz === 3 ? 180 : 120);
      expect(analysis.bpm).toBeGreaterThanOrEqual(MIN_BPM);
      expect(analysis.bpm).toBeLessThanOrEqual(MAX_BPM);
    }
  });

  it("reports the first click at zero, so a source that opens on a transient is not missed", () => {
    expect(analyzeBeats(clicks(4), RATE).onsets[0]).toBe(0);
  });

  it("is deterministic: the same samples measure the same twice", () => {
    expect(analyzeBeats(clicks(4), RATE)).toEqual(analyzeBeats(clicks(4), RATE));
  });

  it("scales its onset seconds with the sample rate it is told", () => {
    const rate = 44_100;
    const samples = [renderGen("click-train", { secs: 2, sampleRate: rate, hz: 4 })];
    const analysis = analyzeBeats(samples, rate);
    expect(analysis.bpm).toBe(120);
    expect(analysis.onsets[1]).toBeCloseTo(0.25, 10);
  });

  it("measures the final partial hop, so a transient at the very last sample is found", () => {
    // 48000 frames is 187.5 hops: a floored hop count would never read the last 128 samples,
    // and every click in them would be silently missing from a list a loop edge snaps to.
    const frames = 48_000;
    for (const at of [frames - ANALYSIS_HOP - 1, frames - 1]) {
      const data = new Float32Array(frames);
      data[0] = 1;
      data[at] = 1;
      expect(analyzeBeats([data], RATE).onsets).toEqual([0, at / RATE]);
    }
  });

  it("keeps candidates at least MIN_ONSET_GAP_SECS apart", () => {
    const { onsets } = analyzeBeats(clicks(8), RATE);
    for (let i = 1; i < onsets.length; i++) {
      expect((onsets[i] ?? 0) - (onsets[i - 1] ?? 0)).toBeGreaterThanOrEqual(MIN_ONSET_GAP_SECS);
    }
    expect(onsets.length).toBeLessThanOrEqual(MAX_ONSETS);
  });
});

describe("analyzeBeats on sources with no beat", () => {
  it("states no tempo for silence and finds nothing to snap to", () => {
    const silence = [renderGen("silence", { secs: 1, sampleRate: RATE })];
    expect(analyzeBeats(silence, RATE)).toEqual({ bpm: 0, onsets: [], crest: 0 });
  });

  it("states no tempo for a steady sine, which has one onset and no interval", () => {
    const sine = [renderGen("sine", { secs: 1, sampleRate: RATE, hz: 440 })];
    expect(analyzeBeats(sine, RATE).bpm).toBe(0);
  });

  it("states no tempo for a buffer too short to hold two hops", () => {
    expect(analyzeBeats([new Float32Array(64)], RATE)).toEqual({ bpm: 0, onsets: [], crest: 0 });
  });
});

describe("analyzeBeats refuses malformed input", () => {
  it("needs at least one channel", () => {
    expect(() => analyzeBeats([], RATE)).toThrow(/at least one channel/u);
  });

  it("needs channels of one length", () => {
    expect(() => analyzeBeats([new Float32Array(4_096), new Float32Array(2_048)], RATE)).toThrow(
      /differ in length/u,
    );
  });

  it("needs a positive sample rate", () => {
    expect(() => analyzeBeats([new Float32Array(4_096)], 0)).toThrow(
      /sample rate is not a positive/u,
    );
  });
});

describe("snapSecs", () => {
  const onsets = [0, 0.25, 0.5, 0.75, 1];

  it("moves an edge onto the nearest candidate inside the tolerance", () => {
    expect(snapSecs(0.27, onsets, 0.05)).toBe(0.25);
    expect(snapSecs(0.73, onsets, 0.05)).toBe(0.75);
  });

  it("leaves an edge exactly where it was when nothing is close enough", () => {
    expect(snapSecs(0.4, onsets, 0.05)).toBe(0.4);
  });

  it("leaves an edge alone with no candidates or no tolerance", () => {
    expect(snapSecs(0.27, [], 0.05)).toBe(0.27);
    expect(snapSecs(0.27, onsets, 0)).toBe(0.27);
  });

  it("keeps the earlier candidate when two are equidistant", () => {
    expect(snapSecs(0.375, onsets, 0.2)).toBe(0.25);
  });

  it("snaps past both ends of the list", () => {
    expect(snapSecs(-0.01, onsets, 0.05)).toBe(0);
    expect(snapSecs(1.01, onsets, 0.05)).toBe(1);
  });
});

describe("snapLoop", () => {
  const onsets = [0, 0.25, 0.5, 0.75, 1];

  it("snaps both edges of a gesture together", () => {
    expect(snapLoop(0.27, 0.73, onsets, 0.05)).toEqual({ in: 0.25, out: 0.75 });
  });

  it("refuses to collapse a loop onto one candidate, keeping the raw edges", () => {
    // Both edges are within tolerance of 0.5, and a zero-length loop is a cleared loop.
    expect(snapLoop(0.48, 0.52, onsets, 0.05)).toEqual({ in: 0.48, out: 0.52 });
  });

  it("passes an unsnappable gesture through unchanged", () => {
    expect(snapLoop(0.3, 0.4, onsets, 0.01)).toEqual({ in: 0.3, out: 0.4 });
  });
});
