/**
 * @role The scatter: the scene's bright points as a layer of big marks over the fine lattice. The
 *   body's third channel — a flock of the scene's own specks, or the one kept thing (`bodyOf`) —
 *   read a box at a time over three-by-three cells and cut into the same ten marks **without the
 *   wrap**, so a peak reads as a block and a shoulder as a dot rather than wrapping back round to
 *   the sparse mark the ground is written in (0345). Unioned into the tile's alpha the way the
 *   second lattice is, in the picture's own ink and never a colour of its own.
 *
 *   **A speck is smaller than a mark, and that is the whole of the argument** (0345): read into
 *   the fine lattice a flock is a blanket at one cell and lost at the next, because a cell's read
 *   is the mean of its box and one bright point in twenty-five pixels moves it by a fortieth. Read
 *   nine cells at a time it is a shape. There is no dial: where the scatter stands and how far it
 *   reaches is what the yard's own detail already says (`SCENE_SPECKS`), and a channel standing at
 *   nought is the mark that inks nothing, so a yard with no flock and no kept thing draws exactly
 *   the tile 0351 shipped. The threshold is what the specks themselves reach — between the
 *   channel's own mean over the tile and its own most — because a speck is a tenth of its own cell
 *   wide and nine cells full of them still stand a hundredth of the way up the ramp, so a block is
 *   only a block where the flock is thicker than the flock.
 * @instead The tile this is unioned into and the body it is read out of → `bodyOf` and the one
 *   pixel loop, src/ui/moireScreenTile.ts, this file's only caller. The other lattice over the same
 *   body, on the rows' own pitch → src/ui/moireScreenBeat.ts. The fine lattice's own read, its cut
 *   and the rack's passes over it → `cellGrid`, src/ui/moireScreenCells.ts. The marks themselves
 *   and the wrapped ramp the other two lattices are cut by → src/lib/moireGlyph.ts. What a scene's
 *   bright points are and what a name's detail makes of them → src/lib/moireScene.ts.
 */
import { GLYPH_COUNT, markAt, markBlur, markCoverage } from "@/lib/moireGlyph";
import { sceneCells, sceneRepeat } from "@/lib/moireScene";
import { PER_PIXEL } from "@/ui/moireScreenCells";

/**
 * How many cells a side one big mark of the scatter spans. **Three**, which is the span the marks
 * bench drew this under: at one the scatter is the fine lattice again and says nothing the cut has
 * not already said, and at five a flock is four blocks across a tile. Said in cells of the picture's
 * own lattice and never in pixels of its own, so the coarse grid is the fine one read in blocks —
 * within the snap that makes it come round on the tile, which is the same snap the fine cell's own
 * pitch is held to (`sceneRepeat`).
 */
export const SCATTER_SPAN = 3;

/**
 * The scatter over one tile: the coarse grid's marks, the stride of its cell on each axis, and the
 * blur its coverage is read at. One object for the loop it feeds, which runs width × height times
 * and may allocate nothing per pixel (0129, 0070).
 */
export type ScatterLattice = {
  across: number;
  down: number;
  cols: number;
  marks: Uint8Array;
  blur: number;
};

/**
 * That scatter, read off the same `body` the other two lattices are: the third channel's mean over
 * each block of `SCATTER_SPAN` cells, cut into the ten marks at no phase at all.
 *
 * The cell is the fine cell's own stride times the span, snapped by the one snap the tile comes
 * round on (`sceneRepeat`, `sceneCells`) rather than by a second rounding of the same quotient
 * (principle 1): a tile is laid as a repeating pattern, so a coarse cell that did not come round
 * at the tile's edge would step by a fraction of itself at every join.
 */
export function scatterLattice(
  body: Float32Array,
  width: number,
  height: number,
  cellAcross: number,
  cellDown: number,
): ScatterLattice {
  const across = sceneRepeat(width, cellAcross * SCATTER_SPAN);
  const down = sceneRepeat(height, cellDown * SCATTER_SPAN);
  const cols = sceneCells(width, cellAcross * SCATTER_SPAN);
  const rows = sceneCells(height, cellDown * SCATTER_SPAN);
  const stood = new Float32Array(cols * rows);
  let most = 0;
  let whole = 0;
  for (let row = 0; row < rows; row++) {
    const y0 = Math.floor(row * down);
    const y1 = Math.min(height, Math.ceil((row + 1) * down));
    for (let col = 0; col < cols; col++) {
      const x0 = Math.floor(col * across);
      const x1 = Math.min(width, Math.ceil((col + 1) * across));
      let sum = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) sum += body[(y * width + x) * PER_PIXEL + 2] ?? 0;
      }
      const mean = sum / Math.max(1, (y1 - y0) * (x1 - x0));
      stood[row * cols + col] = mean;
      whole += mean;
      most = Math.max(most, mean);
    }
  }
  const marks = new Uint8Array(cols * rows);
  // Read between the channel's own mean and its own most, and cut **at no phase**: a speck is a
  // point a tenth of its own cell wide, so a block of nine cells holding a whole flock still stands
  // a hundredth of the way up the ramp, and a read taken against the ramp would be the blank mark
  // everywhere. Against the flock's own spread, a block where the flock is thickest is the block
  // mark, one where it is no thicker than usual inks nothing, and a flock spread evenly over a tile
  // — which has no peaks to scatter — draws none of this at all. **That is the threshold, and it is
  // the specks' own**: the one number a dial would have set is what the yard's detail already says.
  const floor = whole / Math.max(1, marks.length);
  const reach = most - floor;
  if (reach > 0) {
    for (let at = 0; at < marks.length; at++) {
      marks[at] = markAt(((stood[at] ?? 0) - floor) / reach, GLYPH_COUNT, 0);
    }
  }
  return { across, down, cols, marks, blur: markBlur(across) };
}

/**
 * How much ink the scatter lays at one pixel of the tile: its big mark's coverage there. Unioned
 * with the lattices under it by its caller rather than added to them — every lattice here is one
 * picture in one ink, and a cell under two of them is as solid as the solider and no solider
 * (0345).
 */
export function scatterInk(scatter: ScatterLattice, x: number, y: number): number {
  // Held to the grid on both axes the way the fine lattice's column is (`colOf`,
  // src/ui/moireScreenTile.ts): a column past the last one would land on the next row's first
  // block rather than off the end, which no `?? 0` can catch.
  const col = Math.min(scatter.cols - 1, Math.floor(x / scatter.across));
  const row = Math.floor(y / scatter.down);
  const mark = scatter.marks[row * scatter.cols + col] ?? 0;
  return markCoverage(mark, x / scatter.across - col, y / scatter.down - row, scatter.blur);
}
