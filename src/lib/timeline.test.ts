import { describe, expect, it } from "vitest";

import { columnRange, hitTest, playheadAt, pxToSecs, secsToPx, translateLoop } from "./timeline";

describe("playheadAt", () => {
  it("sits at the offset while the start is still scheduled ahead", () => {
    expect(playheadAt(0.9, { startTime: 1, offset: 0.25, period: 0 }, 4)).toBe(0.25);
  });

  it("advances a one-shot from its offset and holds at the end of the buffer", () => {
    expect(playheadAt(2, { startTime: 1, offset: 0.5, period: 0 }, 4)).toBeCloseTo(1.5, 9);
    expect(playheadAt(100, { startTime: 1, offset: 0.5, period: 0 }, 4)).toBe(4);
  });

  it("wraps a loop within [offset, offset + period)", () => {
    const plan = { startTime: 0.05, offset: 1, period: 0.25 };
    const position = playheadAt(2.6, plan, 4);
    expect(position).toBeGreaterThanOrEqual(1);
    expect(position).toBeLessThan(1.25);
    expect(position).toBeCloseTo(1 + ((2.6 - 0.05) % 0.25), 9);
  });

  it("clamps a loop whose offset + period overruns the buffer", () => {
    expect(playheadAt(2, { startTime: 0, offset: 3, period: 3 }, 4)).toBe(4);
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

describe("hitTest", () => {
  const loop = { in: 1, out: 3 };

  it("grabs nothing without a loop, or outside the tolerance", () => {
    expect(hitTest(200, null, 4, 800, 8)).toBe("none");
    expect(hitTest(400, loop, 4, 800, 8)).toBe("none");
  });

  it("grabs nothing on degenerate geometry — no duration or no width", () => {
    expect(hitTest(0, loop, 0, 800, 8)).toBe("none");
    expect(hitTest(0, loop, 4, 0, 8)).toBe("none");
  });

  it("picks the nearer marker within tolerance", () => {
    expect(hitTest(205, loop, 4, 800, 8)).toBe("in");
    expect(hitTest(595, loop, 4, 800, 8)).toBe("out");
  });

  it("picks `in` when equidistant, so a collapsed loop drags open to the right", () => {
    expect(hitTest(200, { in: 1, out: 1 }, 4, 800, 8)).toBe("in");
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
