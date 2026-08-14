import { describe, expect, it } from "vitest";

import {
  CLICK_DELTA,
  compareFingerprints,
  fingerprint,
  FLOOR_DB,
  MIN_SILENCE_SECS,
  TOLERANCE_DB,
  WINDOW_SECS,
} from "./fingerprint";

const RATE = 48_000;
const WINDOW = RATE * WINDOW_SECS;

/** `frames` of `value`, as one channel. */
const flat = (value: number, frames: number) => new Float32Array(frames).fill(value);

describe("fingerprint", () => {
  it("measures length, peak and DC exactly where they are, per channel", () => {
    const print = fingerprint([flat(0.5, RATE), flat(-0.25, RATE)], RATE);
    expect(print.frames).toBe(RATE);
    expect(print.sampleRate).toBe(RATE);
    // 0.5 is -6.02 dBFS, 0.25 is -12.04. A constant is all DC, so peak and DC agree.
    expect(print.peakDb).toEqual([-6.02, -12.04]);
    expect(print.dcDb).toEqual([-6.02, -12.04]);
  });

  it("floors a digital zero rather than reporting -Infinity, which JSON cannot carry", () => {
    const print = fingerprint([flat(0, RATE)], RATE);
    expect(print.peakDb).toEqual([FLOOR_DB]);
    expect(JSON.parse(JSON.stringify(print))).toEqual(print);
  });

  it("windows RMS at WINDOW_SECS, over every channel at once", () => {
    const loud = new Float32Array(RATE);
    // One full-scale window, then nothing.
    loud.fill(1, 0, WINDOW);
    const print = fingerprint([loud], RATE);
    expect(print.rmsDb).toHaveLength(1 / WINDOW_SECS);
    expect(print.rmsDb[0]).toBe(0);
    expect(print.rmsDb[1]).toBe(FLOOR_DB);
  });

  it("counts a discontinuity as a click and a steep-but-continuous ramp as none", () => {
    const edit = new Float32Array(RATE);
    // One step of 0.5 — twice CLICK_DELTA.
    edit.fill(0.5, RATE / 2);
    expect(fingerprint([edit], RATE).clicks).toBe(1);

    const ramp = new Float32Array(RATE);
    for (let i = 0; i < ramp.length; i++) ramp[i] = i * (CLICK_DELTA / 2);
    expect(fingerprint([ramp], RATE).clicks).toBe(0);
  });

  it("refuses input it cannot measure rather than measuring something else", () => {
    expect(() => fingerprint([], RATE)).toThrow(/channel/u);
    expect(() => fingerprint([flat(0, 10), flat(0, 11)], RATE)).toThrow(/length/u);
    expect(() => fingerprint([flat(0, 10)], 0)).toThrow(/sample rate/u);
  });

  it("refuses a NaN render loudly rather than fingerprinting it as digital silence", () => {
    // NaN compares false against every threshold, so peak, clicks and silence would all read
    // as a perfectly quiet render — the one shape of broken the measurements cannot see.
    expect(() => fingerprint([flat(Number.NaN, RATE)], RATE)).toThrow(/NaN/u);
  });
});

describe("silence spans", () => {
  it("reports a silent run only once it is long enough to be a dropout", () => {
    const gap = Math.round(MIN_SILENCE_SECS * RATE);
    const samples = flat(0.5, RATE);
    // One frame short of a span.
    samples.fill(0, 100, 100 + gap - 1);
    expect(fingerprint([samples], RATE).silence).toEqual([]);

    samples.fill(0, 100, 100 + gap);
    expect(fingerprint([samples], RATE).silence).toEqual([[100, 100 + gap]]);
  });

  it("calls a frame silent only when every channel is, so one live channel is not a dropout", () => {
    const gap = Math.round(MIN_SILENCE_SECS * RATE) + 10;
    const quiet = flat(0.5, RATE);
    quiet.fill(0, 0, gap);
    expect(fingerprint([quiet, flat(0.5, RATE)], RATE).silence).toEqual([]);
    expect(fingerprint([quiet, quiet], RATE).silence).toEqual([[0, gap]]);
  });
});

describe("compareFingerprints", () => {
  const golden = fingerprint([flat(0.5, RATE), flat(0.5, RATE)], RATE);

  it("agrees with itself, and with a rerun of the same maths", () => {
    expect(compareFingerprints(golden, golden)).toEqual([]);
    expect(
      compareFingerprints(golden, fingerprint([flat(0.5, RATE), flat(0.5, RATE)], RATE)),
    ).toEqual([]);
  });

  it("lets a dB field drift within tolerance and catches it just past", () => {
    const near = { ...golden, peakDb: golden.peakDb.map((db) => db + TOLERANCE_DB) };
    expect(compareFingerprints(golden, near)).toEqual([]);

    const past = { ...golden, peakDb: golden.peakDb.map((db) => db + TOLERANCE_DB + 0.01) };
    expect(compareFingerprints(golden, past)).toEqual([
      expect.stringContaining("peakDb: 2 of 2 beyond"),
    ]);
  });

  it("compares counts and spans exactly — a frame of drift is the whole point", () => {
    expect(compareFingerprints(golden, { ...golden, clicks: golden.clicks + 1 })).toEqual([
      expect.stringContaining("clicks"),
    ]);
    expect(compareFingerprints(golden, { ...golden, silence: [[0, 1]] })).toEqual([
      expect.stringContaining("silence"),
    ]);
    expect(compareFingerprints(golden, { ...golden, frames: golden.frames - 1 })).toEqual([
      expect.stringContaining("frames"),
    ]);
  });

  it("names the first span that moved rather than dumping both lists", () => {
    const spans = (...silence: [number, number][]) => ({ ...golden, silence });
    const moved = compareFingerprints(spans([0, 10], [20, 30]), spans([0, 10], [21, 30]));
    expect(moved).toEqual([
      expect.stringContaining("silence: 1 of 2 spans differ — first silence[1]"),
    ]);
  });

  it("reports a channel or window count difference once, not once per element", () => {
    const mono = fingerprint([flat(0.5, RATE)], RATE);
    expect(compareFingerprints(golden, mono)).toEqual([
      expect.stringContaining("channels: golden 2, actual 1"),
    ]);
  });
});
