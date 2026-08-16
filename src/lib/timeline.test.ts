import { describe, expect, it } from "vitest";

import {
  columnRange,
  cycleTimeAt,
  cyclesAt,
  insideLoop,
  playbackRate,
  playheadAt,
  pxSpanToSecs,
  pxToSecs,
  secsToPx,
  seekTarget,
  translateLoop,
  type PlayPlan,
} from "./timeline";

/** A plan at 1× with nothing behind its anchor — what a play, rather than a rebase, posts. */
const plan = (partial: Partial<PlayPlan>): PlayPlan => ({
  startTime: 0,
  offset: 0,
  period: 0,
  rate: 1,
  phase: 0,
  ...partial,
});

describe("playheadAt", () => {
  it("sits at the offset while the start is still scheduled ahead", () => {
    expect(playheadAt(0.9, plan({ startTime: 1, offset: 0.25 }), 4)).toBe(0.25);
  });

  it("advances a one-shot from its offset and holds at the end of the buffer", () => {
    expect(playheadAt(2, plan({ startTime: 1, offset: 0.5 }), 4)).toBeCloseTo(1.5, 9);
    expect(playheadAt(100, plan({ startTime: 1, offset: 0.5 }), 4)).toBe(4);
  });

  it("wraps a loop within [offset, offset + period)", () => {
    const looping = plan({ startTime: 0.05, offset: 1, period: 0.25 });
    const position = playheadAt(2.6, looping, 4);
    expect(position).toBeGreaterThanOrEqual(1);
    expect(position).toBeLessThan(1.25);
    expect(position).toBeCloseTo(1 + ((2.6 - 0.05) % 0.25), 9);
  });

  it("clamps a loop whose offset + period overruns the buffer", () => {
    expect(playheadAt(2, plan({ offset: 3, period: 3 }), 4)).toBe(4);
  });

  it("spends buffer seconds at the plan's rate, not at one per second", () => {
    expect(playheadAt(2, plan({ rate: 2 }), 8)).toBeCloseTo(4, 9);
    expect(playheadAt(2, plan({ rate: 0.5 }), 8)).toBeCloseTo(1, 9);
  });

  it("resumes from the phase a rebase anchored, so a rate change moves nothing", () => {
    const before = plan({ offset: 1, period: 2, rate: 1 });
    const at = 1.3;
    const rebased = plan({
      startTime: at,
      offset: 1,
      period: 2,
      rate: 4,
      phase: playheadAt(at, before, 8) - 1,
    });
    expect(playheadAt(at, rebased, 8)).toBeCloseTo(playheadAt(at, before, 8), 9);
    // And carries on four times as fast from exactly there.
    expect(playheadAt(at + 0.1, rebased, 8)).toBeCloseTo(playheadAt(at, before, 8) + 0.4, 9);
  });
});

describe("playbackRate", () => {
  it("is the speed alone at no pitch shift", () => {
    expect(playbackRate(0.5, 0)).toBe(0.5);
  });

  it("doubles every twelve semitones, on top of whatever speed asked for", () => {
    expect(playbackRate(1, 12)).toBeCloseTo(2, 12);
    expect(playbackRate(1, -12)).toBeCloseTo(0.5, 12);
    expect(playbackRate(0.75, 12)).toBeCloseTo(1.5, 12);
  });
});

describe("cyclesAt / cycleTimeAt", () => {
  it("counts nothing for a one-shot, whatever the rate", () => {
    expect(cyclesAt(100, plan({ rate: 4 }))).toBe(0);
  });

  it("crosses a boundary once per period / rate seconds", () => {
    expect(cyclesAt(1, plan({ period: 0.5, rate: 1 }))).toBe(2);
    expect(cyclesAt(1, plan({ period: 0.5, rate: 2 }))).toBe(4);
    expect(cyclesAt(1, plan({ period: 0.5, rate: 0.5 }))).toBe(1);
  });

  it("counts nothing before the anchor", () => {
    expect(cyclesAt(-5, plan({ period: 0.5, rate: 2 }))).toBe(0);
  });

  it("places a boundary at the time the rate makes it fall", () => {
    expect(cycleTimeAt(3, plan({ startTime: 1, period: 0.5, rate: 2 }))).toBeCloseTo(1.75, 9);
    expect(cycleTimeAt(3, plan({ startTime: 1, period: 0.5, rate: 0.5 }))).toBeCloseTo(4, 9);
  });

  it("inverts itself — the nth boundary is where the nth cycle completes", () => {
    const looping = plan({ startTime: 0.05, period: 0.3, rate: 1.5, phase: 0.2 });
    for (const nth of [1, 2, 7]) {
      expect(cyclesAt(cycleTimeAt(nth, looping) + 1e-9, looping)).toBe(nth);
    }
  });
});

describe("secsToPx / pxToSecs", () => {
  it("round-trips a position through pixels", () => {
    expect(pxToSecs(secsToPx(1.5, 4, 800), 4, 800)).toBeCloseTo(1.5, 9);
  });

  it("clamps to the buffer on both sides", () => {
    expect(secsToPx(-1, 4, 800)).toBe(0);
    expect(secsToPx(9, 4, 800)).toBe(800);
    expect(pxToSecs(-20, 4, 800)).toBe(0);
    expect(pxToSecs(900, 4, 800)).toBe(4);
  });

  it("maps nothing when there is nothing to map", () => {
    expect(secsToPx(1, 0, 800)).toBe(0);
    expect(pxToSecs(400, 4, 0)).toBe(0);
  });
});

describe("pxSpanToSecs", () => {
  it("measures a distance rather than a point, so it is not clamped into the buffer", () => {
    expect(pxSpanToSecs(400, 4, 800)).toBe(2);
    expect(pxSpanToSecs(-16, 4, 800)).toBe(-0.08);
    expect(pxSpanToSecs(1600, 4, 800)).toBe(8);
    expect(pxSpanToSecs(16, 4, 0)).toBe(0);
  });
});

describe("insideLoop", () => {
  const loop = { in: 1, out: 3 };

  it("is half-open: `in` is read, `out` is the edge it wraps at", () => {
    expect(insideLoop(1, loop)).toBe(true);
    expect(insideLoop(2.999, loop)).toBe(true);
    expect(insideLoop(3, loop)).toBe(false);
    expect(insideLoop(0.999, loop)).toBe(false);
  });
});

describe("seekTarget", () => {
  const loop = { in: 1, out: 3 };

  it("takes any point of the buffer when no loop is being performed", () => {
    expect(seekTarget(1.5, null, 4)).toBe(1.5);
    expect(seekTarget(-1, null, 4)).toBe(0);
    expect(seekTarget(9, null, 4)).toBe(4);
  });

  it("takes a point inside the loop", () => {
    expect(seekTarget(1, loop, 4)).toBe(1);
    expect(seekTarget(2.5, loop, 4)).toBe(2.5);
  });

  it("refuses a point outside the loop, `out` included — the cycle wraps there", () => {
    expect(seekTarget(0.5, loop, 4)).toBeNull();
    expect(seekTarget(3, loop, 4)).toBeNull();
    expect(seekTarget(3.5, loop, 4)).toBeNull();
  });

  it("asks for nothing when there is nothing loaded", () => {
    expect(seekTarget(1, null, 0)).toBeNull();
  });
});

describe("translateLoop", () => {
  const loop = { in: 1, out: 1.5 };

  it("slides the whole segment, both edges by the same amount", () => {
    expect(translateLoop(loop, 0.75, 4)).toEqual({ in: 1.75, out: 2.25 });
    expect(translateLoop(loop, -0.5, 4)).toEqual({ in: 0.5, out: 1 });
  });

  it("leaves a loop exactly where it is under no movement", () => {
    expect(translateLoop(loop, 0, 4)).toEqual(loop);
  });

  it("stops against the start at its full length rather than being trimmed by it", () => {
    expect(translateLoop(loop, -9, 4)).toEqual({ in: 0, out: 0.5 });
  });

  it("stops against the end at its full length rather than being trimmed by it", () => {
    expect(translateLoop(loop, 9, 4)).toEqual({ in: 3.5, out: 4 });
  });

  it("keeps the length to the float, wherever a fractional slide lands", () => {
    for (const delta of [0.1, 0.7, 1.3, -0.9, 2.9]) {
      const slid = translateLoop(loop, delta, 4);
      expect(slid.out - slid.in).toBeCloseTo(loop.out - loop.in, 12);
      expect(slid.in).toBeGreaterThanOrEqual(0);
      expect(slid.out).toBeLessThanOrEqual(4);
    }
  });

  it("pins a loop longer than the buffer to the start instead of inverting it", () => {
    expect(translateLoop({ in: 0, out: 6 }, 2, 4)).toEqual({ in: 0, out: 6 });
  });
});

describe("columnRange", () => {
  it("hands a pixel every column it covers when the canvas is narrower than the peaks", () => {
    expect(columnRange(0, 800, 2048)).toEqual([0, 2]);
    expect(columnRange(400, 800, 2048)).toEqual([1024, 1026]);
  });

  it("tiles the columns exactly when the canvas is narrower — no column skipped or repeated", () => {
    for (const width of [3, 799, 800, 2048]) {
      let expected = 0;
      for (let x = 0; x < width; x++) {
        const [from, to] = columnRange(x, width, 2048);
        expect(from).toBe(expected);
        expect(to).toBeGreaterThan(from);
        expected = to;
      }
      expect(expected).toBe(2048);
    }
  });

  it("stretches one column across several pixels when the canvas is wider", () => {
    expect(columnRange(0, 4096, 2048)).toEqual([0, 1]);
    expect(columnRange(1, 4096, 2048)).toEqual([0, 1]);
    expect(columnRange(2, 4096, 2048)).toEqual([1, 2]);
  });

  it("is never empty, and clamps the last pixel into range", () => {
    expect(columnRange(800, 800, 2048)).toEqual([2047, 2048]);
    expect(columnRange(0, 0, 2048)).toEqual([0, 2048]);
    const [from, to] = columnRange(1500, 800, 2048);
    expect(to).toBeGreaterThan(from);
    expect(to).toBeLessThanOrEqual(2048);
  });
});
