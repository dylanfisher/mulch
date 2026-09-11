/**
 * @role The second lattice of marks, the one the rack brings: the same alphabet on a cell the row
 *   pitch wide where the picture's own is the column pitch wide — seven device pixels against five
 *   — unioned into the tile's alpha so grid beats against grid the way the two gratings under the
 *   screen already do (0131). Its presence is the rack's lattice fold and no look's: it arrives as
 *   the rack fills and never for one effect (0278). The ratio is those two whole pixel counts and
 *   never a dial, because a bit laid at a fraction of a pixel is the smear 0346 took out, and the
 *   tile grows to the two cells' common multiple so both come round at its edge.
 * @instead The tile this is unioned into, its one loop over the pixels and the first lattice's own
 *   cell → src/lib/moireScreenField.ts, this file's only caller. Where a cell's read is cut into a
 *   mark and the rack's passes run over it → `cellRead`, src/lib/moireScreenCells.ts. The marks
 *   themselves → src/lib/moireGlyph.ts. How full the rack is, as a turn → `latticeFold`,
 *   src/lib/moireLattice.ts.
 */
import { type RunningCells, runCellPasses } from "@/lib/moireCells";
import { markBlur, markCoverage } from "@/lib/moireGlyph";
import { sceneCells } from "@/lib/moireScene";
import { cellBlocks, type CellGrid, cellRead } from "@/lib/moireScreenCells";

/** The greatest common divisor of two whole numbers, for the width below and nothing else. */
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/**
 * How wide a tile carrying both lattices is: the smallest multiple of the gratings' own beat cell
 * that is also a whole number of the second lattice's cells. **Both constraints and not one** — the
 * tile is laid as a repeating pattern, so a width that did not come round on the beat would run a
 * seam down the picture (`beatPx`) and one that did not come round on the coarse cell would step
 * that lattice by a fraction of a cell at every join, which is the same artefact one lattice down.
 * How many beat cells wide that comes to is the two pitches' own business and never one number:
 * seven at every whole display ratio, eleven at three halves, and one at four, where the coarse
 * cell already divides the beat.
 */
export const beatTilePx = (wide: number, cell: number): number =>
  cell > 0 ? (wide * cell) / gcd(wide, cell) : wide;

/**
 * The second lattice over one tile: the coarse grid's marks, how far the rack's fold has brought
 * them in, and the per-column reads the union below spends. Held as one object because the loop it
 * feeds runs width × height times and a bake allocates nothing per pixel (0129, 0070).
 */
export type BeatLattice = {
  at: number;
  cell: number;
  cols: number;
  marks: Uint8Array;
  blur: number;
};

/**
 * That lattice, read out of the same body the first one is: one box read per coarse cell, cut into
 * the same ten marks, with the standing rack's own passes run over them — the one reading there is
 * (`cellRead`), at another cell size. Never a second alphabet: what the second lattice says is
 * where it stands, and it says it in the marks the picture is already written in.
 *
 * The cell divides the tile on both axes by construction (`beatTilePx`, `tilePx`), so the count is
 * exact and the coarse lattice is whole device pixels — but it is counted through `sceneCells`
 * all the same, because a quotient rounded twice is two chances to disagree about where a tile
 * comes round (principle 1).
 */
export function beatLattice(
  body: Float32Array,
  width: number,
  height: number,
  cell: number,
  hue: number,
  falling: number,
  cells: readonly RunningCells[],
  at: number,
): BeatLattice {
  const read = beatBlocks(width, height, cell, at);
  cellRead(read.grid, body, width, height, cell, cell, read.cols, hue, falling, 0, read.rows);
  runCellPasses(read.grid.marks, read.cols, read.rows, cells);
  return read;
}

/**
 * The same lattice mid-read: its grid allocated and its block count, so a bake in slices can fill it
 * a band of rows at a time through `cellRead` and run the rack's passes once the last band has
 * landed (0354, src/ui/moireScreenShop.ts). One reading and not two — `beatLattice` above is this
 * with every band taken in one task.
 */
export type BeatRead = BeatLattice & { rows: number; grid: CellGrid };

/** The blocks the second lattice of a tile `width` by `height` on `cell` is read in. */
export function beatBlocks(width: number, height: number, cell: number, at: number): BeatRead {
  const cols = sceneCells(width, cell);
  const rows = sceneCells(height, cell);
  const grid = cellBlocks(cols, rows);
  return { at, cell, cols, rows, grid, marks: grid.marks, blur: markBlur(cell) };
}

/**
 * How much ink the second lattice lays at one pixel of the tile: its mark's coverage there, brought
 * in by how full the rack is. Unioned with the first lattice's by its caller rather than added to
 * it — two lattices are one picture in one ink, and a cell under both of them is as solid as the
 * solider of the two and no solider (0345).
 */
export function beatInk(beat: BeatLattice, x: number, y: number): number {
  const col = Math.floor(x / beat.cell);
  const row = Math.floor(y / beat.cell);
  const mark = beat.marks[row * beat.cols + col] ?? 0;
  return beat.at * markCoverage(mark, x / beat.cell - col, y / beat.cell - row, beat.blur);
}
