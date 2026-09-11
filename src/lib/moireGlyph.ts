/**
 * @role The marks the drift picture is written in, and which of them a cell of the field gets: ten
 *   bit-grids ordered by how much ink each carries — nothing, a dot, a colon, a dash, a plus, a
 *   percent, an at, a hash, a star and a block — read at a cell's own normalised coordinates, and
 *   the wrapped ramp that turns where a cell stands on its scene's ramp into one of them. **The
 *   ramp wraps**: it starts partway along the marks and comes round, so the field's empty ground
 *   and its peaks both read as sparse marks and only the band between them reads dense, which is
 *   what makes a lattice of marks read as a picture and not as a halftone (0345).
 * @instead Where a mark is written into a tile, a cell at a time → src/ui/moireScreenTile.ts, and
 *   the cell's own size, which is the screen's column pitch (`gridPitchPx`) there too.
 *   Where on its ramp a cell stands → the scene's own ground, src/ui/scene/. The ramp a value is
 *   read through for its colour → src/lib/moireColour.ts. The repeat a cell snaps to across a
 *   tile → `sceneRepeat`, src/lib/moireScene.ts.
 */
import { wrap } from "./moire.ts";
import { tunable } from "./moireTuning.ts";
import { clamp } from "./range.ts";

/**
 * Where along the marks the ramp starts, as a share of their count: the mark the field's empty
 * ground is written in. A fifth is two marks in — the colon — so nought reads as a sparse colon,
 * the ramp's top comes round to the dot beneath it, and the band between wraps through the dense
 * marks. At nought the ramp does not wrap at all and the ground is left blank, which is a halftone.
 */
export const GLYPH_PHASE = tunable("glyph.phase", 0.2, { min: 0, max: 0.9, step: 0.1 });

/**
 * How hard a cell's read is pushed toward the ends of its ramp before it is cut into marks: a gain
 * about the ramp's middle, so most of a field falls onto the sparse mark its ground is written in
 * and only the band that was already bright wraps through the dense ones. At nought the read is
 * the scene's own and the lattice is the one 0346 shipped, where about three-quarters of a bloom
 * tile's cells are heavier than the plus; at the rest that share falls to about a fifth, which is
 * the reference's sparse ground with ribbons through it (0348).
 */
export const GLYPH_PUSH = tunable("glyph.push", 1, { min: 0, max: 4, step: 0.25 });

/**
 * A read pushed `push` harder about the ramp's middle and held to the ramp. At nought it is the
 * read itself, which is the one thing the dial promises: the push is a cut of the ramp and never
 * a second wrap, and it reaches the mark alone — the cell's colour is read at the scene's own
 * stand, so the ground the scene draws is untouched (0348).
 */
export const pushRead = (value: number, push: number): number =>
  clamp(value + (value - 0.5) * push, 0, 1);

/**
 * The ten marks, lightest first, each a square of `GLYPH_GRID` rows: nothing, a dot, a colon, a dash, a
 * plus, a percent, an at, a hash, a star and a block. **Bit-grids in the source and not a font**: a
 * mark rasterised from a face would be a different mark on every machine and none at all on the
 * recorder canvas the painter is tested against, and a picture that is gestural and digital is
 * written in marks nobody had to load (docs/plan.md, the scene block). **Five bits a side, because
 * the cell is the screen's own column pitch** — five CSS pixels, `gridPitchPx` — and a bit that is
 * a whole device pixel on every display is what keeps a stroke crisp under a pattern laid on whole
 * pixels (0346). The order is the one invariant: each carries strictly more ink than the one
 * before, asserted in its test, because the ramp below reads density and a mark out of order is a
 * step the ramp goes down.
 */
/** How many bits a mark is across and down — the count anything drawing one bit at a time reads. */
export const GLYPH_GRID = 5;

export const MARKS: readonly (readonly string[])[] = [
  [".....", ".....", ".....", ".....", "....."],
  [".....", ".....", "..#..", ".....", "....."],
  [".....", "..#..", ".....", "..#..", "....."],
  [".....", ".....", ".###.", ".....", "....."],
  [".....", "..#..", ".###.", "..#..", "....."],
  ["#...#", "...#.", "..#..", ".#...", "#...#"],
  [".###.", "#.#.#", "#.###", "#....", ".###."],
  [".#.#.", "#####", ".#.#.", "#####", ".#.#."],
  ["#.#.#", ".###.", "#####", ".###.", "#.#.#"],
  ["#####", "#####", "#####", "#####", "#####"],
];

/** How many marks there are to write a cell in. */
export const GLYPH_COUNT = MARKS.length;

/** The grids as bits, one byte a cell, read a few hundred thousand times a build. */
const bits: readonly Uint8Array[] = MARKS.map((rows) => {
  if (rows.length !== GLYPH_GRID || rows.some((row) => row.length !== GLYPH_GRID)) {
    throw new Error(`A mark is ${GLYPH_GRID} rows of ${GLYPH_GRID}, and one is not.`);
  }
  return Uint8Array.from(rows.join(""), (cell) => (cell === "#" ? 1 : 0));
});

/** How much of its square a mark inks, nought to one. */
export const markWeight = (index: number): number => {
  const mark = bits[index];
  if (mark === undefined) throw new Error(`There is no mark ${index}.`);
  return mark.reduce((sum, bit) => sum + bit, 0) / (GLYPH_GRID * GLYPH_GRID);
};

/** The bit of `index` under `(u, v)`, each on nought to one across the cell; outside it, nothing. */
const bitAt = (mark: Uint8Array, u: number, v: number): number => {
  if (u < 0 || u >= 1 || v < 0 || v >= 1) return 0;
  return mark[Math.floor(v * GLYPH_GRID) * GLYPH_GRID + Math.floor(u * GLYPH_GRID)] ?? 0;
};

/**
 * How much of the pixel at `(u, v)` of a cell the mark `index` covers, nought to one: the bit under
 * it, read at the four corners of a square `blur` either side and averaged. **Four reads and not
 * one**, because a bit is a device pixel or two and a bit read once is a hard edge that crawls when
 * the lattice moves; read a quarter of a pixel either way it is the same mark, soft. `blur` is the caller's, in cell units, because only the caller knows how many device
 * pixels its cell is. At nought it is one read, which is what the tests read.
 */
export function markCoverage(index: number, u: number, v: number, blur: number): number {
  const mark = bits[index];
  if (mark === undefined) throw new Error(`There is no mark ${index}.`);
  if (blur <= 0) return bitAt(mark, u, v);
  return (
    (bitAt(mark, u - blur, v - blur) +
      bitAt(mark, u + blur, v - blur) +
      bitAt(mark, u - blur, v + blur) +
      bitAt(mark, u + blur, v + blur)) /
    4
  );
}

/**
 * Which of `count` marks a cell standing at `value` on its ramp is written in: the ramp cut into
 * `count` steps, started `phase` of the way along the marks and wrapped, so the top step comes
 * round to the mark beneath the bottom one. The top of the ramp is the last step and not one past
 * it, so a field at its brightest is still one mark and not the mark its ground is written in.
 */
export function markAt(value: number, count: number, phase: number): number {
  const step = Math.min(count - 1, Math.floor(clamp(value, 0, 1) * count));
  return wrap(step + Math.floor(phase * count), count);
}
