/**
 * @role What a look does to the marks a tile is cut into: the one contract a pass over the cell
 *   grid is (`CellPass`), the terms any of them may read (`CELL_TERMS`), and the runner that puts
 *   the standing passes over one grid in the rack's own order (`runCellPasses`). **A pass reads the
 *   cells as they stand and raises them**: it writes a mark and never a pixel, it reads no frame
 *   and no clock, and the cell is left in the heaviest of what stands on it — so what a rack says
 *   at this level is which mark a cell is written in and nothing else, and the lattice still stands
 *   still (0346, 0349).
 * @instead Each pass itself, one file apiece → src/lib/moireCellEchoes.ts and
 *   src/lib/moireCellBloom.ts, each declared as `cells` on its own look in src/lib/moireLook.ts.
 *   Which of them a standing rack runs, at what the picture has travelled to, and the key a tile is
 *   held under → `rackCells`, src/ui/moireCells.ts. Where the grid is baked, a cell's mark chosen
 *   and these run → `cellGrid`, src/ui/moireScreenCells.ts. The marks themselves and the wrapped
 *   ramp onto them → src/lib/moireGlyph.ts. What a look does to the *cut* rather than to the marks
 *   — the field passes the chain draws — → src/lib/moireLook.ts.
 */
import { wrap } from "@/lib/moire";
import type { LookName, LookTerm, LookTerms } from "@/lib/moireLook";

/**
 * Every term a cell pass may read. A subset of `LOOK_TERMS` and never a set of its own: a pass is
 * one more thing its look does, so its numbers are the look's own numbers off the entry's own knobs
 * (`lookFrom`) and a term nobody declared is nought. Named here once because the tile is *held*
 * under them — the key a rack writes carries exactly these, stepped, so a knob turned is a rebake
 * and a knob held is not (`cellsKey`, src/ui/moireCells.ts).
 */
export const CELL_TERMS: readonly LookTerm[] = ["spacing", "count", "radius"];

/**
 * One pass over the cell grid: `marks` is the picture as it stands before this pass and is never
 * written; `into` arrives holding a copy of it and is what the pass raises. Two grids and not one,
 * so every cell a pass reads is the picture it is a pass *of* — a pass reading its own output
 * halfway through would make a cell's mark depend on which corner the loop started in.
 *
 * `at` is how present the look is, as the picture has travelled to it and stepped (0266); `terms`
 * are that look's own, stepped with it. Both arrive already rounded, because the tile is held under
 * exactly the numbers the pass is run with.
 */
export type CellPass = (
  marks: Readonly<Uint8Array>,
  into: Uint8Array,
  cols: number,
  rows: number,
  at: number,
  terms: LookTerms,
) => void;

/** One standing pass: which look declared it, where the picture has got to, and its terms. */
export type MoireCells = {
  look: LookName;
  at: number;
  terms: LookTerms;
  pass: CellPass;
};

/**
 * Where cell (`x`, `y`) is in a grid `cols` by `rows` — **wrapped on both axes**, because the tile
 * is laid as a repeating pattern: the cell past the right edge is the one at the left edge of the
 * tile beside it, and a pass that stopped at the edge would draw a seam down every repeat (0346).
 */
export const cellAt = (cols: number, rows: number, x: number, y: number): number =>
  wrap(y, rows) * cols + wrap(x, cols);

/** One cell left in the heaviest of what stands on it: a pass raises a mark and never lightens one. */
export const cellRaise = (into: Uint8Array, at: number, mark: number): void => {
  if (mark > (into[at] ?? 0)) into[at] = mark;
};

/**
 * Every standing pass over one grid, in the rack's own order — which is the order the sound goes
 * through it, for `rackLooks`' reason. Each reads the grid the one before it left and writes into a
 * copy of it, so two delays are two ladders and never one ladder of a ladder.
 *
 * **A rack that declares no pass runs nothing at all**, and the one scratch grid is not made: this
 * is a bake, but it is the bake every resting yard pays, and the picture with nothing in its rack
 * is the lattice 0346 shipped down to the byte.
 */
export function runCellPasses(
  marks: Uint8Array,
  cols: number,
  rows: number,
  cells: readonly MoireCells[],
): void {
  if (cells.length === 0) return;
  const into = new Uint8Array(marks.length);
  for (const cell of cells) {
    into.set(marks);
    cell.pass(marks, into, cols, rows, cell.at, cell.terms);
    marks.set(into);
  }
}
