import { describe, expect, it } from "vitest";

import { columnAt, hitTest, playheadAt, pxToSecs, secsToPx } from "./timeline";

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

  it("picks the nearer marker within tolerance", () => {
    expect(hitTest(205, loop, 4, 800, 8)).toBe("in");
    expect(hitTest(595, loop, 4, 800, 8)).toBe("out");
  });

  it("picks `in` when equidistant, so a collapsed loop drags open to the right", () => {
    expect(hitTest(200, { in: 1, out: 1 }, 4, 800, 8)).toBe("in");
  });
});

describe("columnAt", () => {
  it("resamples a pixel onto the fixed peak columns", () => {
    expect(columnAt(0, 800, 2048)).toBe(0);
    expect(columnAt(400, 800, 2048)).toBe(1024);
  });

  it("clamps the last pixel into the last column", () => {
    expect(columnAt(800, 800, 2048)).toBe(2047);
    expect(columnAt(0, 0, 2048)).toBe(0);
  });
});
