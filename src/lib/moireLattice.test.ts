/**
 * @role Tests the cell the lattice is a repeat of: that the gutter and the rim are the crest and
 *   the inside the trough, that the tile's every edge is gutter so it repeats without a seam, and
 *   that the readings the rack and the output give it are bounded.
 * @instead Where the cell is asked for and drawn as a pattern → src/ui/moireCanvas.test.ts. The
 *   shards beside it → src/lib/moireShards.test.ts.
 */
import { describe, expect, it } from "vitest";

import { DRIFT_DISPERSE_REACH } from "./moire.ts";
import { FRACTAL_GEOMETRIES } from "./moireFractal.ts";
import {
  CELL,
  cellFold,
  isFieldGeometry,
  LATTICE_CELLS,
  LATTICE_CUT,
  LATTICE_GEOMETRY,
  LATTICE_LEAN,
  LATTICE_REACH,
  LATTICE_RIM,
  LATTICE_TILE_PX,
  latticeCells,
  latticeCut,
  latticeLean,
  latticeRim,
  latticeTile,
  latticeTurns,
  rim,
  roundedBox,
} from "./moireLattice.ts";
import { DRIFT_PICKED_GEOMETRIES } from "./playerDrift.ts";

describe("the cell the lattice repeats", () => {
  it("folds a point into its cell, and measures it against a rounded box", () => {
    const { cx, cy, qx, qy } = cellFold(1.3, 0.7, 2);
    expect([cx, cy]).toEqual([2, 1]);
    expect(qx).toBeCloseTo(0.1);
    expect(qy).toBeCloseTo(-0.1);
    expect(() => cellFold(1, 1, 0)).toThrow("not folded");
    expect(roundedBox(0, 0, CELL.half, CELL.round)).toBeLessThan(0);
    expect(roundedBox(CELL.half, 0, CELL.half, CELL.round)).toBeCloseTo(0);
    expect(roundedBox(0.49, 0.49, CELL.half, CELL.round)).toBeGreaterThan(0);
    expect(rim(0, 0.05)).toBe(1);
    expect(rim(0.2, 0.05)).toBeLessThan(0.01);
  });

  it("stands the gutter and the rim on the crest and the inside on the trough, over a ramp", () => {
    const width = 0.05;
    expect(latticeTurns(0.49, 0, width)).toBe(0.5);
    expect(latticeTurns(CELL.half, 0, width)).toBe(0.5);
    expect(latticeTurns(0, 0, width)).toBe(0);
    // Monotone from the middle to the rim: no step anywhere the strip could alias.
    let last = -1;
    for (let qx = 0; qx <= 0.5; qx += 0.005) {
      const turn = latticeTurns(qx, 0, width);
      expect(turn).toBeGreaterThanOrEqual(last);
      expect(turn).toBeLessThanOrEqual(0.5);
      last = turn;
    }
    expect(latticeTurns(CELL.half - width / 2, 0, width)).toBeCloseTo(0.25);
  });

  it("bakes a cell whose every edge is gutter, and whose middle lets the field through", () => {
    const size = 32;
    const alpha = new Uint8ClampedArray(size * size * 4);
    latticeTile(alpha, size, "plain", 0.05);
    const at = (x: number, y: number): number => alpha[(y * size + x) * 4 + 3] ?? -1;
    for (let along = 0; along < size; along++) {
      expect(at(along, 0)).toBe(255);
      expect(at(along, size - 1)).toBe(255);
      expect(at(0, along)).toBe(255);
      expect(at(size - 1, along)).toBe(255);
    }
    expect(at(size / 2, size / 2)).toBe(0);
    // Only the alpha byte is written, and the whole tile is.
    expect(alpha[0]).toBe(0);
    expect(() => {
      latticeTile(alpha, size, "plain", 0);
    }).toThrow("lights nothing");
    expect(LATTICE_TILE_PX).toBeGreaterThan(size);
  });

  it("names the three field geometries and none of the four an effect may pick", () => {
    for (const geometry of FRACTAL_GEOMETRIES) expect(isFieldGeometry(geometry)).toBe(true);
    expect(isFieldGeometry(LATTICE_GEOMETRY)).toBe(true);
    for (const geometry of DRIFT_PICKED_GEOMETRIES) expect(isFieldGeometry(geometry)).toBe(false);
  });

  it("tightens with the rack standing, and every other reading stays on its band", () => {
    expect(latticeCells(0)).toBe(LATTICE_CELLS[0]);
    expect(latticeCells(1)).toBe(LATTICE_CELLS[0]);
    expect(latticeCells(LATTICE_REACH.value)).toBe(LATTICE_CELLS[1]);
    expect(latticeCells(LATTICE_REACH.value * 3)).toBe(LATTICE_CELLS[1]);
    const half = latticeCells((1 + LATTICE_REACH.value) / 2);
    expect(half).toBeGreaterThan(LATTICE_CELLS[0]);
    expect(half).toBeLessThan(LATTICE_CELLS[1]);
    expect(latticeCut(0)).toBe(LATTICE_CUT[0]);
    expect(latticeCut(1)).toBe(LATTICE_CUT[1]);
    expect(latticeCut(7)).toBe(LATTICE_CUT[1]);
    expect(latticeLean(0.5)).toBe(0);
    expect(latticeLean(1)).toBeCloseTo(LATTICE_LEAN.value / 2);
    expect(latticeLean(0)).toBeCloseTo(-LATTICE_LEAN.value / 2);
    expect(latticeRim(0)).toBe(LATTICE_RIM[0]);
    expect(latticeRim(DRIFT_DISPERSE_REACH)).toBe(LATTICE_RIM[1]);
    expect(latticeRim(DRIFT_DISPERSE_REACH * 2)).toBe(LATTICE_RIM[1]);
  });
});
