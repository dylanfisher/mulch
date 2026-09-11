/**
 * @role The frame-side marks: the sound's own cut stamped over the picture as a second lattice in
 *   the lattice's own alphabet. The boxed field — one pixel per cell, the mean the gratings leave
 *   (0346) — is read through one threshold pass per mark, and each pass is filled with that mark's
 *   own pattern, so a frame pays ten fills whatever the cell count and never a draw per cell
 *   (0129). Read **without the wrap**: a cell the rows leave quiet falls in the first band, whose
 *   mark carries no ink at all, so a quiet cell writes nothing. The cut itself stays — the picture
 *   is still the rows' product (0131) — and this is what the product adds where it is strong.
 * @instead The cut and the box the stamp reads → `cutField`, src/ui/moireCanvasField.ts, and
 *   `boxField`, src/ui/moireCanvas.ts, which reads this file's own cell count. The marks
 *   themselves and how much of a cell each covers → src/lib/moireGlyph.ts. The lattice the tile is
 *   baked in, a cell at a time, which is the lattice this one stands over →
 *   src/ui/moireScreenTile.ts. The pattern cache a mark's tile is held in, and the whole-field
 *   lattice that is nothing but a pattern → src/ui/moireCanvasPattern.ts.
 */
import { GLYPH_COUNT, GLYPH_GRID, markCoverage } from "@/lib/moireGlyph";
import { tunable } from "@/lib/moireTuning";
import { gratingOf } from "@/ui/moireCanvasPattern";

/**
 * How deep the sound's rows are stamped over the picture, as the share of the ink a whole mark is
 * laid at. The rows are the picture's own product either way — the cut is what makes the fringes
 * (0131) — so this is how far the same reading is also written as marks: at nothing the picture is
 * the lattice 0346 shipped with holes cut in it, and at one every strong cell carries a whole mark
 * of its own. It rests at a half, where the zoomed drift keeps the page between the marks: a row
 * going by reads as a run of marks going by rather than as a second solid lattice closing the
 * ground the first one is written on.
 */
export const CELL_ROWS = tunable("cells.rows", 0.5, { min: 0, max: 1, step: 0.05 });

/**
 * How many cells of the marks span `span` pixels at `cell` pixels each. **One declaration and two
 * readings of it** (principle 1): the box writes the field's mean one pixel per cell
 * (`boxField`, src/ui/moireCanvas.ts) and the stamp reads that same grid back, so a count rounded
 * one way there and another way here is a stamp a cell out of step with the picture it is of.
 * Ceiled and never rounded, because a part cell at the far edge is still a cell of the picture.
 */
export const boxCells = (span: number, cell: number): number => Math.max(1, Math.ceil(span / cell));

/**
 * How steep the edge of a threshold pass is, in doublings of the read: a cell's mean is taken down
 * to the pass's own level and back up sixteen-fold, so the level itself comes out whole and a cell
 * a sixteenth under it comes out at nothing. Four, because the shallowest band the marks ask for
 * is a tenth of the ramp and sixteen is the first power of two that clears a tenth.
 */
const STAMP_SLOPE = 4;

/**
 * And how hard that ramp is folded into a step, in squarings of what the slope leaves: at two, a
 * cell nine tenths of the way to its level keeps two thirds of a mark and one at three quarters
 * keeps a third, so a band's edge is a shoulder rather than a knife and a cell crossing it does
 * not flash. A cell on a shoulder carries a share of its band's mark and the rest of the one under
 * it, and never more ink than one mark: every band is cut out of the bands above it, so what the
 * two shares come to is the one mark's worth the cell would have carried either way.
 */
const STAMP_STEPS = 2;

/** The surfaces one canvas stamps through, kept at its size the way its field is. */
export type Stamp = {
  /** The field boxed to one pixel a cell, read once a frame and thresholded ten times. */
  read: HTMLCanvasElement;
  /** One pass's own band of that read, at the same size. */
  band: HTMLCanvasElement;
  /** And every band already stamped, which the next one is cut out of. */
  higher: HTMLCanvasElement;
  /** The band blown back up to the picture's size, which one mark's pattern is filled through. */
  mask: HTMLCanvasElement;
  /** The marks' own tiles, one per mark, minted with the surfaces and never on a later frame. */
  tiles: (HTMLCanvasElement | null)[];
  /** And what each is filed under in the pattern cache, joined with them and never on a frame. */
  keys: string[];
  /** The cell and the ink they were minted for: a frame that moved either mints them again. */
  minted: { cell: number; color: string };
};
const stamps = new WeakMap<HTMLCanvasElement, Stamp>();

/**
 * The patterns this frame's passes fill through, refilled in place: a per-frame paint allocates
 * nothing (0070), and every one of them is resolved before a pixel is stamped, so a painting the
 * engine will not hand a pattern to lays nothing down at all rather than half a lattice.
 */
const patterns: (CanvasPattern | null)[] = Array.from({ length: GLYPH_COUNT }, () => null);

/** What one mark's tile is filed under: the mark, the cell it is a square of, and the ink it is in. */
const tileKey = (mark: number, cell: number, color: string): string => `${mark}|${cell}|${color}`;

/** A held surface at `width` × `height`, cleared by the resize when its size moved. */
function sized(held: HTMLCanvasElement, width: number, height: number): HTMLCanvasElement {
  if (held.width !== width) held.width = width;
  if (held.height !== height) held.height = height;
  return held;
}

/** The four surfaces `canvas` stamps through, minted once and kept at the field's own size. */
function stampFor(
  canvas: HTMLCanvasElement,
  wide: number,
  deep: number,
  span: number,
  down: number,
): Stamp {
  const held = stamps.get(canvas) ?? {
    read: document.createElement("canvas"),
    band: document.createElement("canvas"),
    higher: document.createElement("canvas"),
    mask: document.createElement("canvas"),
    tiles: [],
    keys: [],
    minted: { cell: 0, color: "" },
  };
  stamps.set(canvas, held);
  sized(held.read, wide, deep);
  sized(held.band, wide, deep);
  sized(held.higher, wide, deep);
  sized(held.mask, span, down);
  return held;
}

/**
 * One mark's tile: a cell square of the picture's own ink, one filled square per bit the mark
 * inks — the bits read back through `markCoverage` at each bit's own middle, so this file holds no
 * second copy of what a mark is (principle 1). The bits and not the coverage, because a tile
 * repeated as a pattern is laid on whole device pixels: the lattice under it bakes its marks
 * softened by a quarter of a pixel, and a stamp softened the same way would be a mark drawn twice
 * over itself at every cell the two lattices share.
 *
 * **Every bit's edges are rounded to a whole pixel**, so a cell that is not five pixels across —
 * eight, at a display of one and a half — is five bits of one and two pixels and not five smeared
 * ones. Minted with the surfaces and never on a frame, ink and all: what a pattern fill costs is a
 * fill, and a mark recoloured once a frame would cost a second one.
 */
function markTile(mark: number, cell: number, color: string): HTMLCanvasElement | null {
  const made = document.createElement("canvas");
  made.width = cell;
  made.height = cell;
  const ink = made.getContext("2d");
  if (ink === null) return null;
  const bit = cell / GLYPH_GRID;
  const edge = (at: number): number => Math.round(at * bit);
  ink.fillStyle = color;
  for (let down = 0; down < GLYPH_GRID; down++) {
    for (let across = 0; across < GLYPH_GRID; across++) {
      const inked = markCoverage(mark, (across + 0.5) / GLYPH_GRID, (down + 0.5) / GLYPH_GRID, 0);
      if (inked > 0) {
        ink.fillRect(
          edge(across),
          edge(down),
          edge(across + 1) - edge(across),
          edge(down + 1) - edge(down),
        );
      }
    }
  }
  return made;
}

/**
 * Where a mark's band starts on the boxed read, on nought to one: the ramp cut into as many steps
 * as there are marks and read straight, which is `markAt` without a phase — so the quiet end of
 * the read is the first band and the first mark is the one that carries no ink.
 */
export const bandFloor = (mark: number): number => mark / GLYPH_COUNT;

/**
 * Cut `mark`'s own band out of the boxed read: the read taken down to the band's floor and back up
 * `STAMP_SLOPE` doublings, folded into a step, and then the bands already stamped taken out of it —
 * so the ten bands are disjoint and a cell is written in the heaviest mark it stands above. The
 * first band is the whole picture less what the others took, which is every cell the rows left
 * quiet; its mark is the empty one, so what it fills is nothing.
 */
function cutBand(
  stamp: Stamp,
  ink: CanvasRenderingContext2D,
  mark: number,
  wide: number,
  deep: number,
): void {
  const floor = bandFloor(mark);
  ink.globalAlpha = 1;
  ink.globalCompositeOperation = "copy";
  // Filled through whatever colour the surface was left at and never one of its own: every fill
  // here is read for its alpha alone — the mask is a shape, and what colours it is the mark's own
  // tile, which is the picture's ink (docs/boundaries.md).
  if (floor <= 0) {
    ink.fillRect(0, 0, wide, deep);
  } else {
    ink.drawImage(stamp.read, 0, 0);
    // Down to the band's own floor, so the floor itself comes back up whole and everything under
    // it comes back up short: a multiply, because taking alpha out is the one arithmetic a canvas
    // does on it without a loop over the pixels.
    ink.globalCompositeOperation = "destination-out";
    ink.globalAlpha = 1 - 1 / (floor * (1 << STAMP_SLOPE));
    ink.fillRect(0, 0, wide, deep);
    ink.globalAlpha = 1;
    ink.globalCompositeOperation = "lighter";
    for (let up = 0; up < STAMP_SLOPE; up++) ink.drawImage(stamp.band, 0, 0);
    ink.globalCompositeOperation = "destination-in";
    for (let fold = 0; fold < STAMP_STEPS; fold++) ink.drawImage(stamp.band, 0, 0);
  }
  ink.globalCompositeOperation = "destination-out";
  ink.drawImage(stamp.higher, 0, 0);
}

/**
 * Read the boxed field into the stamp's own grid, beside the box that made it (`boxField`): the
 * product one pixel a cell, the mean the rows' gratings leave over each (0346), brought back down
 * to the grid the box wrote it on. `cell` is the cell that box was read at, which is the lattice's
 * own, and `color` is the ink the picture is drawn in — the marks are laid in it, so the marks'
 * tiles are minted here with the surfaces rather than on a frame.
 *
 * Read where the box is made and stamped where the cut is laid, because it is the same reading:
 * the surfaces one painting mints are the surfaces every painting of that canvas mints, whatever
 * the rack is doing, which is what keeps a pass's own surface where its case looks for it.
 * Nothing at all at no depth: a stamp nobody asked for mints no surface and reads no field.
 */
export function readMarks(
  canvas: HTMLCanvasElement,
  field: HTMLCanvasElement,
  cell: number,
  color: string,
): Stamp | null {
  if (CELL_ROWS.value <= 0) return null;
  const wide = boxCells(field.width, cell);
  const deep = boxCells(field.height, cell);
  const stamp = stampFor(canvas, wide, deep, field.width, field.height);
  const read = stamp.read.getContext("2d");
  if (read === null) return null;
  if (stamp.minted.cell !== cell || stamp.minted.color !== color) {
    stamp.minted.cell = cell;
    stamp.minted.color = color;
    for (let mark = 0; mark < GLYPH_COUNT; mark++) {
      stamp.keys[mark] = tileKey(mark, cell, color);
      stamp.tiles[mark] = markTile(mark, cell, color);
    }
  }
  // **Over the boxed span and never the field's own.** The box wrote its blocks on whole cells and
  // laid them back out to `wide * cell`, which overhangs the field by up to a cell (`boxField`);
  // read over `field.width` instead and every block after the first is sampled a little to the left
  // of where it stands, until the last cell of a picture whose width is not a whole number of cells
  // reports its neighbour. The overhang itself reads as nothing, which is what a part cell at the
  // far edge is.
  read.globalCompositeOperation = "copy";
  read.imageSmoothingEnabled = true;
  read.drawImage(field, 0, 0, wide * cell, deep * cell, 0, 0, wide, deep);
  return stamp;
}

/**
 * Stamp that reading over the picture as marks, once the cut has been laid. One pass per mark: a
 * band of the read cut out of the bands above it, blown back up to the picture on whole cells with
 * no smoothing, filled through that mark's own pattern — one fill a pass, so a frame pays ten
 * whatever the cell count — and laid over the picture at `CELL_ROWS` of a whole mark.
 *
 * Laid **over** and never cut out: the cut is what makes the picture the rows' product (0131), and
 * this is that same product written in the alphabet the lattice under it is written in — so a row
 * going by is a run of marks going by rather than a run of holes.
 *
 * A painting the engine will not hand every pattern to stamps nothing at all, exactly as a picture
 * whose lattice cell is still baking draws no lattice (`cutLattice`): half an alphabet is a
 * different picture, where none of it is the picture as it stood before this pass existed.
 */
export function stampMarks(context: CanvasRenderingContext2D, stamp: Stamp, cell: number): void {
  const band = stamp.band.getContext("2d");
  const higher = stamp.higher.getContext("2d");
  const mask = stamp.mask.getContext("2d");
  if (band === null || higher === null || mask === null) return;
  for (let mark = 0; mark < GLYPH_COUNT; mark++) {
    const fill = gratingOf(stamp.mask, mask, stamp.keys[mark] ?? "", stamp.tiles[mark] ?? null);
    if (fill === null) return;
    patterns[mark] = fill;
  }
  const wide = stamp.read.width;
  const deep = stamp.read.height;
  higher.clearRect(0, 0, wide, deep);
  context.globalCompositeOperation = "source-over";
  // Heaviest mark first, so each band is cut out of the bands above it and the lightest — the
  // empty mark the quiet cells fall in — is whatever is left.
  for (let mark = GLYPH_COUNT - 1; mark >= 0; mark--) {
    const fill = patterns[mark] ?? null;
    if (fill === null) return;
    cutBand(stamp, band, mark, wide, deep);
    mask.globalCompositeOperation = "copy";
    mask.imageSmoothingEnabled = false;
    mask.drawImage(stamp.band, 0, 0, wide, deep, 0, 0, wide * cell, deep * cell);
    mask.imageSmoothingEnabled = true;
    mask.globalCompositeOperation = "source-in";
    mask.fillStyle = fill;
    mask.fillRect(0, 0, stamp.mask.width, stamp.mask.height);
    context.globalAlpha = CELL_ROWS.value;
    context.drawImage(stamp.mask, 0, 0);
    higher.globalCompositeOperation = "source-over";
    higher.drawImage(stamp.band, 0, 0);
  }
  context.globalAlpha = 1;
}
