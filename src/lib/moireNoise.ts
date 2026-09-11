/**
 * @role The noise a picture with no pitch in it is drawn from: a value in nought to one from two
 *   whole numbers, the cell counts a tile is divided into, and the smooth streaked field four
 *   hashed corners of it make — read on wrapped cells, so a noise comes round at the tile the way
 *   a grating's period does. Pure maths, no canvas, no clock — written rather than drawn from a
 *   generator so that two shots of one picture are the same picture (0247).
 * @instead The grain a look bakes over the whole picture, which is a tile and not a function →
 *   src/lib/moireGrain.ts. The cosine every mark with a pitch is cut with, and the two snaps this
 *   reads → `sceneAxis`, `sceneRepeat` and `sceneSlope` in src/lib/moireScene.ts. The fields these
 *   are read into → src/lib/scene/.
 */
import { wrap } from "./moire.ts";
import { clamp } from "./range.ts";
import { sceneCells, sceneRepeat, sceneSlope } from "./moireScene.ts";

/**
 * A value in nought to one from two whole numbers — the stand-in for a seed, so a head bobs out of
 * phase with its neighbour and a seed catches the light where the one beside it does not. Written
 * rather than drawn from a generator for the fake walk's reason: two shots of one still have to be
 * the same picture (0247).
 */
export function hash2(a: number, b: number): number {
  const mixed = Math.sin(a * 127.1 + b * 311.7) * 43_758.545_3;
  return mixed - Math.floor(mixed);
}

/**
 * Which cell of `cells` a point stands in, wrapped: the whole index a sparse read is hashed on, so
 * the seed a tile's width along is the seed at its left edge. The rounded index and not the floored
 * one, because what these place is a mark at a cell's own centre.
 */
export const noiseCell = (at: number, across: number, cells: number): number =>
  across > 0 ? wrap(Math.round((at * cells) / across), cells) : 0;

/**
 * The hashed corner of a cell, on a lattice that comes round every `cols` across and every `rows`
 * down having slid `twist` cells sideways. A whole number of cells either way, so the corner a tile
 * along and the corner a tile down are the corner here.
 */
// oxlint-disable-next-line max-params
const seed = (ix: number, iy: number, cols: number, rows: number, twist: number): number =>
  hash2(wrap(ix - Math.floor(iy / rows) * twist, cols), wrap(iy, rows));

/**
 * Smooth value noise sampled anisotropically **on a field that comes round**: one cell is about
 * `wide` device pixels across and `tall` down, the counts snapped so a whole number of them span
 * `across` by `down`, and the four corners hashed on their wrapped indices. Four hashed corners
 * with a smooth step between them — the cheapest thing that is soft everywhere and has an edge
 * nowhere — leaning by `lean` pixels of x per pixel of y, snapped to a whole number of cells over
 * the whole depth (`sceneSlope`).
 *
 * **A hash does not repeat and the tile does.** The screen is laid down as a repeating pattern, so
 * a noise read on plain coordinates would meet a different value at each side of every join and run
 * a seam down the picture at full contrast, once a tile — which is the one artefact every term in
 * `src/lib/scene/` is snapped to avoid. Wrapping the cell indices is what a grating's `sceneRepeat`
 * is for a field with no pitch in it.
 *
 * **Two of the four scenes need this and no product of gratings can give it.** A mass of grass and
 * a wall of leaf are textures with no spacing in them; two gratings crossed always have one, and
 * what comes out is a comb, a herringbone or a moiré. A ripple and a lattice of poppies do have a
 * pitch, and stay on gratings.
 */
// Seven scalars and no object: this is read once per scale per device pixel of a bake, and a build
// allocates a ramp and no more (0129, 0070).
// oxlint-disable-next-line max-params
export function streakTiled(
  x: number,
  y: number,
  across: number,
  down: number,
  wide: number,
  tall: number,
  lean: number,
): number {
  const cols = sceneCells(across, wide);
  const rows = sceneCells(down, tall);
  // The lean snapped onto this scale's own cell, or the field steps by a fraction of a fibre at
  // every join down the picture — the constraint `sceneSlope` states for a grating, read here at
  // the width one cell of noise actually stands at.
  const slope = sceneSlope(down, sceneRepeat(across, wide), lean);
  const gx = across > 0 ? ((x + slope * y) * cols) / across : 0;
  const gy = down > 0 ? (y * rows) / down : 0;
  const ix = Math.floor(gx);
  const iy = Math.floor(gy);
  const fx = gx - ix;
  const fy = gy - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  // **The wrap leans with the field.** A sheared lattice comes round on a *twisted* pair of axes
  // and not on the plain ones: a tile deeper down, the field has slid `twist` whole cells sideways,
  // so the cell that has to be met at the join is the one that far back. Wrapping x on the plain
  // count instead is what makes a leaning noise meet a different value at every horizontal join —
  // a lean of a whole tile per tile is the only one a plain wrap admits, which is no lean at all.
  const twist = across > 0 ? Math.round((slope * down * cols) / across) : 0;
  const a = seed(ix, iy, cols, rows, twist);
  const b = seed(ix + 1, iy, cols, rows, twist);
  const c = seed(ix, iy + 1, cols, rows, twist);
  const d = seed(ix + 1, iy + 1, cols, rows, twist);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/**
 * How wide a speck's own edge is as a share of its radius, and how far off its cell's centre one
 * may be jittered. **Less than the room it has**: a disc offset further than half a cell less its
 * own radius overhangs a neighbour whose hash almost never lights it, and is chopped along the cell
 * boundary — a straight edge across a mark whose whole point is that it is not on a grid (0334).
 */
const SPECK_EDGE = 0.5;
const SPECK_JITTER = 0.3;

/**
 * A rare bright point standing on a field that comes round: cells about `cell` device pixels each
 * way, `wide` of one across as a share of it, and only the `rare` share of them holding a point at
 * all — jittered off their own centres, so what comes out is scattered rather than ruled. Nought to
 * one, unstepped, because what a caller does with the edge of a speck is the caller's: a canopy
 * gates its sky on how thin the leaf is and a flock gates on nothing.
 *
 * **Hashed on the wrapped cell, for `streakTiled`'s reason**: the tile is laid as a repeating
 * pattern and a hash does not repeat, so the speck a tile along has to be the speck at this edge.
 * The canopy's own specks of sky were the first reader and every scene's flock is the second
 * (0334, and the detail that fills a field with them).
 */
// Eight scalars and no object, for the reason above it: this is read once per device pixel of a bake.
// oxlint-disable-next-line max-params
export function speckTiled(
  x: number,
  y: number,
  across: number,
  down: number,
  cell: number,
  wide: number,
  rare: number,
  apart: number,
): number {
  const cols = sceneCells(across, cell);
  const rows = sceneCells(down, cell);
  const gx = across > 0 ? (x * cols) / across : 0;
  const gy = down > 0 ? (y * rows) / down : 0;
  const ix = Math.round(gx);
  const iy = Math.round(gy);
  // Which cell the point stands in is `noiseCell`'s and never a second rounding of the same
  // quotient (principle 1); the whole index is kept beside it because the jitter wants the
  // fraction the cell's own centre is off by, which a wrapped index cannot answer.
  const cx = noiseCell(x, across, cols);
  const cy = noiseCell(y, down, rows);
  const dx = gx - ix - SPECK_JITTER * (hash2(cx + apart, cy) - 0.5);
  const dy = gy - iy - SPECK_JITTER * (hash2(cx + apart + 9, cy + 3) - 0.5);
  const near = clamp((wide - (dx * dx + dy * dy)) / (wide * SPECK_EDGE), 0, 1);
  const chosen = clamp((hash2(cx + apart + 5, cy + 11) - rare) / 0.03, 0, 1);
  return near * chosen;
}
