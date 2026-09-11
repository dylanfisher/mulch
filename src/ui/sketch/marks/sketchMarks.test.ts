/**
 * The plain field every entry of the bench was measured against, as arithmetic: the real marks over
 * the shipped bloom, writing nought or one at every point in the one ink. Every entry has landed,
 * so what is left to prove is that the reference itself is still the lattice it claims — the file
 * goes with the bench (0247).
 */
import { describe, expect, it } from "vitest";

import { FIELD_ASPECT } from "@/ui/sketch/sketchField";
import { CELL, COLS, plainField, ROWS, stood } from "@/ui/sketch/marks/sketchMarks";

/**
 * A grid over the whole picture at about a bit of a mark, so every bit of every mark is landed in
 * — and no finer, because the fields at three settings apiece are read across it under the
 * gate's own load, and a test that reads a picture at the pixel is a test that times out there.
 */
const GRID: readonly [number, number][] = ((): [number, number][] => {
  const points: [number, number][] = [];
  for (let y = 0.01; y < 1; y += 0.02) {
    for (let x = 0.01; x < FIELD_ASPECT; x += 0.02) points.push([x, y]);
  }
  return points;
})();

describe("the marks bench's plain field", () => {
  it("writes nought or one at every point, and is neither blank nor a block", () => {
    let inked = 0;
    for (const [x, y] of GRID) {
      const ink = plainField(x, y);
      expect(ink === 0 || ink === 1, `the plain field wrote ${ink} at ${x},${y}`).toBe(true);
      inked += ink;
    }
    expect(inked, "the plain field writes nothing").toBeGreaterThan(0);
    expect(inked, "the plain field is a block").toBeLessThan(GRID.length);
  });

  it("is a lattice whose cell is the screen's own pitch, with a whole number of cells down", () => {
    expect(ROWS * CELL).toBeCloseTo(1, 12);
    expect(COLS).toBeGreaterThanOrEqual(FIELD_ASPECT * ROWS);
    for (let row = 0; row < ROWS; row += 1) {
      const value = stood(0, row);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});
