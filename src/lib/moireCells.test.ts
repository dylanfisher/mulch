/**
 * @role Tests the passes a look makes over the cells a tile is cut into (0349): that a rack
 *   declaring none leaves the lattice exactly as it was, that the standing ones run in the rack's
 *   own order each off what the one before it left, and that neither of the two the block lands
 *   ever lightens a cell — the delay's ladder along the row, the reverb's halo around it.
 * @instead That the passes reach the bake at all, that they move no ink, and that a look declaring
 *   none bakes the tile 0346 shipped → src/ui/moireCanvasMarks.test.ts. Which passes a standing
 *   rack runs and the key its tile is held under → src/ui/moireCells.test.ts. The marks themselves
 *   → src/lib/moireGlyph.test.ts.
 */
import { describe, expect, it } from "vitest";

import { bloomCells, bloomReach } from "@/lib/moireCellBloom";
import { echoCells, echoRungs } from "@/lib/moireCellEchoes";
import { type CellPass, type RunningCells, runCellPasses } from "@/lib/moireCells";
import { LOOKS } from "@/lib/moireLook";

/** One standing pass, at the whole of itself unless a case says otherwise. */
const standing = (
  look: RunningCells["look"],
  terms: RunningCells["terms"],
  at = 1,
): RunningCells => ({ look, at, terms, pass: LOOKS[look].cells ?? (() => {}) });

/** A grid `cols` by `rows` with one cell written in `mark` at (`x`, `y`) and the page everywhere else. */
const oneCell = (cols: number, rows: number, x: number, y: number, mark: number): Uint8Array => {
  const marks = new Uint8Array(cols * rows);
  marks[y * cols + x] = mark;
  return marks;
};

// One flat list of the passes' cases, both of them and the runner under them (0007).
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the passes a look makes over the cells", () => {
  it("runs nothing at all where the rack declares no pass", () => {
    // The step's own refusal, and the picture every resting yard is: with nothing standing, the
    // lattice is the one 0346 shipped down to the byte.
    const marks = oneCell(6, 3, 2, 1, 7);
    const before = Uint8Array.from(marks);
    runCellPasses(marks, 6, 3, []);
    expect(marks).toEqual(before);
  });

  it("runs the standing passes in the rack's own order, each off what the one before it left", () => {
    const read: (readonly number[])[] = [];
    const lift: CellPass = (marks, into, cols, rows) => {
      read.push([...marks]);
      for (let at = 0; at < cols * rows; at++) into[at] = (marks[at] ?? 0) + 1;
    };
    const marks = new Uint8Array([0, 1, 2, 3]);
    runCellPasses(marks, 4, 1, [
      { look: "echoes", at: 1, terms: {}, pass: lift },
      { look: "bloom", at: 1, terms: {}, pass: lift },
    ]);
    // The second pass reads what the first left and never the grid the first read, which is what
    // makes two delays two ladders rather than one ladder of a ladder.
    expect(read[0]).toEqual([0, 1, 2, 3]);
    expect(read[1]).toEqual([1, 2, 3, 4]);
    expect([...marks]).toEqual([2, 3, 4, 5]);
  });

  it("repeats a cell's mark along its own row, one mark lighter a rung", () => {
    // The delay's ladder: at the top of both knobs, three rungs a cell apart.
    expect(echoCells(0, 8)).toBe(1);
    expect(echoRungs(1, 1, 8, 1)).toBe(3);
    const cols = 8;
    const marks = oneCell(cols, 2, 0, 0, 4);
    runCellPasses(marks, cols, 2, [standing("echoes", { spacing: 0, count: 1 })]);
    // Behind it and never in front of it, each rung one mark lighter, and the ladder ending where
    // the mark runs out rather than writing the page.
    expect([...marks].slice(0, cols)).toEqual([4, 3, 2, 1, 0, 0, 0, 0]);
    // And along the row and never down it: a delay is a displacement in time, and the row is where
    // time runs.
    expect([...marks].slice(cols)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    // The step's own case: on every row, no cell is lighter than the cell one spacing to its left
    // less one — the ladder's whole claim, read on the wrapped row the tile repeats along.
    for (let x = 0; x < cols; x++) {
      const left = marks[(x + cols - 1) % cols] ?? 0;
      expect(marks[x] ?? 0, `cell ${x}`).toBeGreaterThanOrEqual(left - 1);
    }
  });

  it("stands the rungs a whole spacing apart and draws none at all where nothing has arrived", () => {
    const cols = 9;
    const wide = oneCell(cols, 1, 0, 0, 9);
    runCellPasses(wide, cols, 1, [standing("echoes", { spacing: 1, count: 0 })]);
    // One rung at the widest spacing the band states, and nothing between it and the cell it came
    // from: a rung that fell between two cells would be a rung in neither.
    expect(echoCells(1, cols)).toBe(2);
    expect(echoRungs(1, 0, cols, 2)).toBe(1);
    expect([...wide]).toEqual([9, 0, 8, 0, 0, 0, 0, 0, 0]);
    // And a delay the picture has not travelled to at all is no ladder: the travel is in the count
    // of rungs, because a mark has no alpha to carry it.
    const absent = oneCell(cols, 1, 0, 0, 9);
    runCellPasses(absent, cols, 1, [standing("echoes", { spacing: 1, count: 1 }, 0)]);
    expect([...absent]).toEqual([9, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("spreads a cell's mark into its neighbours, one lighter per cell of distance", () => {
    expect(bloomCells(1)).toBe(3);
    expect(bloomReach(1, 1, 9)).toBe(3);
    const cols = 9;
    const rows = 9;
    const marks = oneCell(cols, rows, 4, 4, 9);
    const before = Uint8Array.from(marks);
    runCellPasses(marks, cols, rows, [standing("bloom", { radius: 1 })]);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const away = Math.abs(x - 4) + Math.abs(y - 4);
        const stands = marks[y * cols + x] ?? 0;
        // Nothing is lightened, and every cell within the reach is raised to the heaviest less how
        // far it stands from it — a diamond, so a corner is not as bright as an edge.
        expect(stands, `cell ${x},${y}`).toBeGreaterThanOrEqual(before[y * cols + x] ?? 0);
        expect(stands, `cell ${x},${y}`).toBe(away <= 3 ? 9 - away : 0);
      }
    }
  });

  it("blooms nothing where the reverb has not arrived, and wraps at the tile's own edges", () => {
    const absent = oneCell(5, 5, 2, 2, 9);
    runCellPasses(absent, 5, 5, [standing("bloom", { radius: 1 }, 0)]);
    expect(absent[2 * 5 + 2]).toBe(9);
    expect(absent.reduce((sum, mark) => sum + mark, 0)).toBe(9);
    // The tile is laid as a repeating pattern, so the cell past the right edge is the one at the
    // left edge of the tile beside it: a halo that stopped at the edge would draw a seam down every
    // repeat (0346).
    const edge = oneCell(5, 5, 0, 0, 9);
    runCellPasses(edge, 5, 5, [standing("bloom", { radius: 0 })]);
    expect(bloomReach(1, 0, 5)).toBe(1);
    expect(edge[4], "the cell past the left edge").toBe(8);
    expect(edge[4 * 5], "the cell above the top edge").toBe(8);
  });

  it("holds both passes inside the row the tile actually is, at every width it is baked at", () => {
    // The review's finding, and the one thing the grid's wrap makes possible: a tile is one beat
    // cell wide and so `pitch + 1` cells across — six on a 1× display, eleven on a 2× one (0346).
    // A ladder longer than the row writes its last rungs back onto the cells it started from, and
    // a halo wider than the row puts every cell inside every other cell's halo.
    for (let cols = 3; cols <= 17; cols++) {
      const step = echoCells(1, cols);
      const rungs = echoRungs(1, 1, cols, step);
      expect(rungs, `a row of ${cols} draws no ladder`).toBeGreaterThan(0);
      expect(rungs * step, `a ladder wraps on a row of ${cols}`).toBeLessThanOrEqual(cols - 1);
      // Read off the pass itself and not off its arithmetic: one bright cell, and every rung a
      // cell of its own behind it with the source left where it was.
      const marks = oneCell(cols, 1, 0, 0, 9);
      runCellPasses(marks, cols, 1, [standing("echoes", { spacing: 1, count: 1 })]);
      expect(marks[0], `the source moved on a row of ${cols}`).toBe(9);
      for (let rung = 1; rung <= rungs; rung++) {
        expect(marks[rung * step], `rung ${rung} of a row of ${cols}`).toBe(9 - rung);
      }
      // And the halo leaves the row somewhere to be the page.
      const reach = bloomReach(1, 1, cols);
      expect(2 * reach + 1, `a halo covers the whole of a row of ${cols}`).toBeLessThan(cols);
      const halo = oneCell(cols, 1, 0, 0, 9);
      runCellPasses(halo, cols, 1, [standing("bloom", { radius: 1 })]);
      expect(
        [...halo].filter((mark) => mark === 0).length,
        `a row of ${cols} flattened`,
      ).toBeGreaterThan(0);
    }
  });
});
