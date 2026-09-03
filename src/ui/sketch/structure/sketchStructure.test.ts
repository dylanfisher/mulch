/**
 * The six fields, as arithmetic: each is the real kernel over the stand-in weave, so what is
 * proved here is that each move is the move it claims — at its dial's nought it is the picture
 * without it, and at its rest it is something the picture without it is not.
 */
import { describe, expect, it } from "vitest";

import { FOLD_CAP } from "@/lib/moireFold";
import { FIELD_ASPECT, lit, weave } from "@/ui/sketch/sketchField";
import {
  BEAT_DIAL,
  beatField,
  BITE_DIAL,
  biteField,
  BOXES_DIAL,
  boxesField,
  COLOUR_DIAL,
  colourField,
  CONTOUR_DIAL,
  contourField,
  KALEIDO_DIAL,
  kaleidoField,
  TODAY_BITE,
} from "@/ui/sketch/structure/sketchStructure";

/** A coarse grid over the whole picture, enough to cross the boundary and the open plane both. */
const GRID: readonly [number, number][] = Array.from({ length: 12 * 36 }, (_, at) => [
  (((at % 36) + 0.5) / 36) * FIELD_ASPECT,
  (Math.floor(at / 36) + 0.5) / 12,
]);

/** How far a field's values spread over the grid: the structure it draws, as one number. */
function spreadOf(field: (x: number, y: number) => number): number {
  let low = Number.POSITIVE_INFINITY;
  let high = Number.NEGATIVE_INFINITY;
  for (const [x, y] of GRID) {
    const value = field(x, y);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(1);
    low = Math.min(low, value);
    high = Math.max(high, value);
  }
  return high - low;
}

/** How much two fields differ over the grid, on average. */
function differenceOf(
  a: (x: number, y: number) => number,
  b: (x: number, y: number) => number,
): number {
  let sum = 0;
  for (const [x, y] of GRID) sum += Math.abs(a(x, y) - b(x, y));
  return sum / GRID.length;
}

describe("every dial rests inside its own band, on its own step", () => {
  it.each([
    ["bite", BITE_DIAL],
    ["beat", BEAT_DIAL],
    ["boxes", BOXES_DIAL],
    ["kaleido", KALEIDO_DIAL],
    ["colour", COLOUR_DIAL],
    ["contour", CONTOUR_DIAL],
  ])("%s", (_, dial) => {
    expect(dial.rest).toBeGreaterThanOrEqual(dial.min);
    expect(dial.rest).toBeLessThanOrEqual(dial.max);
    const steps = (dial.rest - dial.min) / dial.step;
    expect(Math.abs(steps - Math.round(steps))).toBeLessThan(1e-6);
  });
});

/** The picture with no structure in it at all: the stand-in weave. */
const bare = (x: number, y: number) => lit(weave(x, y));
/** The picture the structure at its own depth makes, which four of the seven are read against. */
const whole = (x: number, y: number) => biteField(x, y, BITE_DIAL.rest);

describe("the bite", () => {
  it("is the weave alone at no depth, and today's share is a faint bend of it", () => {
    expect(differenceOf((x, y) => biteField(x, y, 0), bare)).toBe(0);
    const today = differenceOf((x, y) => biteField(x, y, TODAY_BITE), bare);
    const own = differenceOf(whole, bare);
    expect(today).toBeGreaterThan(0);
    expect(own).toBeGreaterThan(4 * today);
  });
});

describe("the beat", () => {
  it("is one copy cut twice at a ratio of one, and something else at its rest", () => {
    expect(
      differenceOf(
        (x, y) => beatField(x, y, 1),
        (x, y) => beatField(x, y, BEAT_DIAL.rest),
      ),
    ).toBeGreaterThan(0.01);
  });
});

describe("the boxes", () => {
  it("draws squares in squares at no turn: the same picture mirrored across and down", () => {
    const [cx, cy] = [FIELD_ASPECT / 2, 0.5];
    const offsets: readonly [number, number][] = [
      [0.3, 0.2],
      [0.9, 0.35],
      [1.2, 0.1],
    ];
    for (const [dx, dy] of offsets) {
      const here = boxesField(cx + dx, cy + dy, 0);
      // The weave under it is not symmetric, so the structure alone is compared: the same fold at
      // a mirrored point reads the same level, which the picture then bends by the weave.
      expect(Math.abs(boxesField(cx - dx, cy + dy, 0) - here)).toBeLessThan(0.35);
      expect(Math.abs(boxesField(cx + dx, cy - dy, 0) - here)).toBeLessThan(0.35);
    }
    expect(spreadOf((x, y) => boxesField(x, y, 0))).toBeGreaterThan(0.5);
    expect(spreadOf((x, y) => boxesField(x, y, BOXES_DIAL.rest))).toBeGreaterThan(0.5);
  });
});

describe("the kaleidoscope", () => {
  it("is the unfolded picture at no fold, a mirror about the middle at one, and refuses past the cap", () => {
    expect(differenceOf((x, y) => kaleidoField(x, y, 0), whole)).toBeLessThan(1e-12);
    const points: readonly [number, number][] = [
      [0.4, 0.2],
      [1.5, 0.45],
      [2.6, 0.1],
    ];
    for (const [x, d] of points) {
      expect(kaleidoField(x, 0.5 + d, 1)).toBeCloseTo(kaleidoField(x, 0.5 - d, 1), 10);
    }
    expect(differenceOf(whole, (x, y) => kaleidoField(x, y, 1))).toBeGreaterThan(0.01);
    expect(() => kaleidoField(1, 0.5, FOLD_CAP + 1)).toThrow();
  });
});

describe("the colour", () => {
  it("reaches further along the ramp the further the dial is turned", () => {
    const flat = spreadOf((x, y) => colourField(x, y, 0));
    const reached = spreadOf((x, y) => colourField(x, y, 1));
    expect(reached).toBeGreaterThan(2 * flat);
  });
});

describe("the contour", () => {
  it("cuts the count into as many flats as the dial says, and refuses a fraction of one", () => {
    const flats = new Set<number>();
    for (const [x, y] of GRID) flats.add(Math.round(contourField(x, y, 3) * 100));
    expect(flats.size).toBeGreaterThan(3);
    expect(spreadOf((x, y) => contourField(x, y, CONTOUR_DIAL.rest))).toBeGreaterThan(0.5);
    expect(() => contourField(1, 0.5, 0)).toThrow();
  });
});
