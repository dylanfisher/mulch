/**
 * The moves the drift bench's pictures are built out of, pinned where no canvas can hide them: a
 * fold that does not tile, a rim that is not on the box's edge or a warp that is not the identity
 * at nought would put a wrong picture on eight stages and a static render would draw it happily.
 */
import { describe, expect, it } from "vitest";

import type { Ink } from "@/ui/moireScreen";
import {
  cellFold,
  FIELD_ASPECT,
  kaleido,
  lit,
  ramp,
  rim,
  roundedBox,
  smin,
  terrace,
  through,
  tunnel,
  warp,
  weave,
  WEAVE,
} from "@/ui/sketch/sketchField";

describe("the stand-in weave", () => {
  it("is the bench's own box, three wide at one high, cut by two gratings a little apart", () => {
    expect(FIELD_ASPECT).toBe(3);
    expect(WEAVE).toHaveLength(2);
    const [one, two] = WEAVE;
    expect(Math.abs((one?.cycles ?? 0) - (two?.cycles ?? 0))).toBeLessThan(4);
    expect(one?.turn).not.toBe(two?.turn);
  });

  it("lets light through between nought and one, and beats along a row", () => {
    let least = 1;
    let most = 0;
    for (let x = 0; x < FIELD_ASPECT; x += 0.01) {
      const light = weave(x, 0.5);
      expect(light).toBeGreaterThan(0);
      expect(light).toBeLessThanOrEqual(1);
      least = Math.min(least, light);
      most = Math.max(most, light);
    }
    // Two gratings close in pitch cross somewhere and stand apart somewhere else: that is the beat.
    expect(most - least).toBeGreaterThan(0.5);
    expect(through(0)).toBe(1);
    expect(lit(1)).toBe(0);
    expect(lit(0)).toBe(1);
  });
});

describe("the fold, the box and the rim", () => {
  it("folds a point into its cell and a place inside it, and refuses no cells at all", () => {
    const { cx, cy, qx, qy } = cellFold(1.3, 0.7, 2);
    expect([cx, cy]).toEqual([2, 1]);
    expect(qx).toBeCloseTo(0.1);
    expect(qy).toBeCloseTo(-0.1);
    expect(() => cellFold(1, 1, 0)).toThrow("not folded");
  });

  it("is negative inside the box, nought on its rim and positive outside", () => {
    expect(roundedBox(0, 0, 0.45, 0.09)).toBeLessThan(0);
    expect(roundedBox(0.45, 0, 0.45, 0.09)).toBeCloseTo(0);
    expect(roundedBox(0.49, 0.49, 0.45, 0.09)).toBeGreaterThan(0);
    expect(rim(0, 0.05)).toBe(1);
    expect(rim(0.2, 0.05)).toBeLessThan(0.01);
  });
});

describe("the warp and the mirror", () => {
  it("is the identity at no amount and moves the point at any other", () => {
    expect(warp(1.2, 0.4, 0)).toEqual([1.2, 0.4]);
    const [x, y] = warp(1.2, 0.4, 0.2);
    expect(Math.hypot(x - 1.2, y - 0.4)).toBeGreaterThan(0.01);
  });

  it("keeps the radius, lands inside one sector, and refuses a fold that does not close", () => {
    for (const sectors of [2, 3, 6, 12]) {
      for (let turn = 0; turn < 1; turn += 0.05) {
        const angle = turn * Math.PI * 2;
        const [x, y] = kaleido(Math.cos(angle) * 0.7, Math.sin(angle) * 0.7, sectors);
        expect(Math.hypot(x, y)).toBeCloseTo(0.7);
        expect(Math.atan2(y, x)).toBeGreaterThanOrEqual(-1e-9);
        expect(Math.atan2(y, x)).toBeLessThanOrEqual(Math.PI / sectors + 1e-9);
      }
    }
    expect(() => kaleido(1, 0, 1)).toThrow("does not close");
    expect(() => kaleido(1, 0, 2.5)).toThrow("does not close");
  });
});

describe("the smooth minimum and the terrace", () => {
  it("is never above the plain minimum and is exactly it at no rounding", () => {
    expect(smin(0.3, 0.5, 0)).toBe(0.3);
    for (let a = -1; a <= 1; a += 0.25) {
      for (let b = -1; b <= 1; b += 0.25) {
        expect(smin(a, b, 0.2)).toBeLessThanOrEqual(Math.min(a, b) + 1e-12);
      }
    }
  });

  it("cuts a ramp into as many flats as asked, lights every riser, and refuses no steps", () => {
    const flats = new Set<number>();
    for (let value = 0; value <= 1; value += 0.001) {
      flats.add(Math.round(terrace(value, 4, 0.0001) * 1000) / 1000);
    }
    // Four flats and nothing between them once the risers are as thin as this.
    expect(
      [...flats].filter((flat) => [0, 1 / 3, 2 / 3, 1].some((at) => Math.abs(flat - at) < 0.01))
        .length,
    ).toBe(flats.size);
    // The riser is at the foot of every step, and the middle of a step is its flat.
    expect(terrace(0.26, 4, 0.12)).toBeGreaterThan(terrace(0.375, 4, 0.12));
    expect(() => terrace(0.5, 0, 0.1)).toThrow("not cut");
  });
});

describe("the ramp and the tunnel", () => {
  it("reads nought as the first ink and one as the last, and refuses a ramp of none", () => {
    const stops: readonly Ink[] = [
      [0, 0, 0, 255],
      [100, 50, 0, 255],
      [255, 255, 255, 255],
    ];
    expect(ramp(stops, 0)).toEqual([0, 0, 0, 255]);
    expect(ramp(stops, 1)).toEqual([255, 255, 255, 255]);
    expect(ramp(stops, 0.5)).toEqual([100, 50, 0, 255]);
    expect(ramp(stops, 0.25)).toEqual([50, 25, 0, 255]);
    expect(ramp(stops.slice(1, 2), 0.9)).toEqual([100, 50, 0, 255]);
    expect(() => ramp([], 0)).toThrow("reads nothing");
  });

  it("sums a flat picture to itself and refuses a zoom of nothing", () => {
    expect(tunnel(() => 0.4, 1, 0.5, [1.5, 0.5], 1.1, 0.8, 10)).toBeCloseTo(0.4);
    expect(() => tunnel(() => 0.4, 1, 0.5, [1.5, 0.5], 0, 0.8, 10)).toThrow("draws nothing");
  });
});
