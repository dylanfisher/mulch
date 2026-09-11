/**
 * @role The frame-side marks: the sound's own cut stamped over the picture as a second lattice in
 *   the lattice's own alphabet. The boxed field — one pixel per cell, the mean the gratings leave
 *   (0346) — is read through one threshold pass per mark, and each pass is laid in that mark's own
 *   bits, so a frame pays ten passes whatever the cell count and never a draw per cell (0129).
 *   The passes run on the marks' own bit grid and go onto the picture once (0353). Read **without
 *   the wrap**: a cell the rows leave quiet falls in the first band, whose
 *   mark carries no ink at all, so a quiet cell writes nothing. The cut itself stays — the picture
 *   is still the rows' product (0131) — and this is what the product adds where it is strong.
 * @instead The cut and the box the stamp reads → `cutField`, src/ui/moireCanvasField.ts, and
 *   `boxField`, src/ui/moireCanvas.ts, which reads this file's own cell count. The marks
 *   themselves and how much of a cell each covers → src/lib/moireGlyph.ts. The lattice the tile is
 *   baked in, a cell at a time, which is the lattice this one stands over →
 *   src/ui/moireScreenTile.ts. The whole-field lattice that is nothing but a pattern →
 *   src/ui/moireCanvasPattern.ts.
 */
import { GLYPH_COUNT, GLYPH_GRID, markCoverage } from "@/lib/moireGlyph";
import { tunable } from "@/lib/moireTuning";

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

/**
 * The surfaces one canvas stamps through. **None of them is ever larger than the picture**: the
 * ten passes run on the marks' own bit grid — `bitPx` pixels a cell, which is one pixel per bit a
 * mark inks and so the finest thing the stamp can say — and what they come to is blown up to the
 * picture once, at the end (0353). On the display the budget was measured at that grid is a
 * quarter of the picture's area; on a display of one it is the picture's own size, which is what
 * the stamp used to hold four of.
 */
export type Stamp = {
  /** The field boxed to one pixel a cell, read once a frame and thresholded ten times. */
  read: HTMLCanvasElement;
  /** One pass's own band of that read, at the same size. */
  band: HTMLCanvasElement;
  /** And every band already stamped, which the next one is cut out of. */
  higher: HTMLCanvasElement;
  /** The band blown up to the bit grid, which one mark's own sheet is cut down to. */
  mask: HTMLCanvasElement;
  /** And the ten passes laid together on that same grid, which the picture is stamped from. */
  layer: HTMLCanvasElement;
  /** The marks' own tiles, one per mark, minted with the surfaces and never on a later frame. */
  tiles: (HTMLCanvasElement | null)[];
  /** The bit grid's cell and the ink they were minted in: a frame that moved either mints them
   *  again. */
  minted: { bit: number; color: string };
};
const stamps = new WeakMap<HTMLCanvasElement, Stamp>();

/**
 * How many draws the size of the picture the stamp lays on a frame. **One**, and it is a declared
 * constant rather than a count because a pass added at the picture's size is what a hand cannot
 * feel until the window is large: at 2560 × 1440 on two device pixels the thirty that 0350 laid
 * stopped the frame loop outright, and the gate has to fail on the thirty-first before a person
 * does (plan §1, checkpoint A; 0353).
 */
export const STAMP_PICTURE_DRAWS = 1;

/** A held surface at `width` × `height`, cleared by the resize when its size moved. */
function sized(held: HTMLCanvasElement, width: number, height: number): HTMLCanvasElement {
  if (held.width !== width) held.width = width;
  if (held.height !== height) held.height = height;
  return held;
}

/**
 * How many pixels of the bit grid one cell is: one per bit a mark inks, or the whole cell where a
 * cell is narrower than the alphabet — **never more**, so the one blow-up at the end is a blow-up
 * and never a decimation. A display of one puts a cell at five device pixels, which is exactly the
 * bits; below one, at a browser zoomed out, a cell is three or two and the tile carries the bits
 * rounded into it the way it always did.
 */
export const bitPx = (cell: number): number => Math.min(GLYPH_GRID, cell);

/**
 * The five surfaces `canvas` stamps through, minted once: three on the cell grid, and two on the
 * bit grid that grid blows up to. Four picture-sized surfaces and a pass on each is what wedged a
 * window 2560 × 1440 at two device pixels (0353).
 */
function stampFor(canvas: HTMLCanvasElement, wide: number, deep: number, bit: number): Stamp {
  const held = stamps.get(canvas) ?? {
    read: document.createElement("canvas"),
    band: document.createElement("canvas"),
    higher: document.createElement("canvas"),
    mask: document.createElement("canvas"),
    layer: document.createElement("canvas"),
    tiles: [],
    minted: { bit: 0, color: "" },
  };
  stamps.set(canvas, held);
  sized(held.read, wide, deep);
  sized(held.band, wide, deep);
  sized(held.higher, wide, deep);
  sized(held.mask, wide * bit, deep * bit);
  sized(held.layer, wide * bit, deep * bit);
  return held;
}

/**
 * One mark's tile: a `bit` square of the picture's own ink, one filled square per bit the mark
 * inks — the bits read back through `markCoverage` at each bit's own middle, so this file holds no
 * second copy of what a mark is (principle 1). The bits and not the coverage, because a tile
 * repeated over a surface is laid on whole pixels: the lattice under it bakes its marks softened by
 * a quarter of a pixel, and a stamp softened the same way would be a mark drawn twice over itself
 * at every cell the two lattices share.
 *
 * A `bit` square and no longer a cell square, because the passes it is laid through run on the bit
 * grid and the one blow-up at the end puts it back at the cell's own size. **Every bit's edges are
 * still rounded to a whole pixel**, which is a bit apiece wherever a cell is at least the alphabet
 * wide and the same rounding this tile always did below that. Minted with the surfaces and never on
 * a frame, ink and all: a mark recoloured once a frame would be a surface minted on the frame.
 */
function markTile(mark: number, bit: number, color: string): HTMLCanvasElement | null {
  const made = document.createElement("canvas");
  made.width = bit;
  made.height = bit;
  const ink = made.getContext("2d");
  if (ink === null) return null;
  const edge = (at: number): number => Math.round((at * bit) / GLYPH_GRID);
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
 * Lay one mark over the whole of `sheet` — its tile at the corner and then the sheet doubled onto
 * itself, across and then down, so a surface of any size is covered in about two of its own areas
 * and in the logarithm of its width in draws.
 *
 * **Doubled and never filled through a repeating pattern.** A `CanvasPattern` fill is what stopped
 * the popped-out picture painting at all: ten of them a frame over a surface the picture's size ran
 * the renderer's frame loop to a standstill, and the same ten passes with the fills swapped for
 * plain draws ran at eighty-eight frames a second (0353). Every draw here is a blit of whole pixels
 * from the surface onto itself, which is the one thing a canvas does quickly at any size.
 */
function sheetOf(
  ink: CanvasRenderingContext2D,
  sheet: HTMLCanvasElement,
  tile: HTMLCanvasElement,
): void {
  const { height, width } = sheet;
  const bit = tile.width;
  ink.globalCompositeOperation = "copy";
  ink.drawImage(tile, 0, 0);
  ink.globalCompositeOperation = "source-over";
  for (let across = bit; across < width; across *= 2) {
    const span = Math.min(across, width - across);
    ink.drawImage(sheet, 0, 0, span, bit, across, 0, span, bit);
  }
  for (let down = bit; down < height; down *= 2) {
    const span = Math.min(down, height - down);
    ink.drawImage(sheet, 0, 0, width, span, 0, down, width, span);
  }
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
  const bit = bitPx(cell);
  const stamp = stampFor(canvas, wide, deep, bit);
  const read = stamp.read.getContext("2d");
  if (read === null) return null;
  if (stamp.minted.bit !== bit || stamp.minted.color !== color) {
    stamp.minted.bit = bit;
    stamp.minted.color = color;
    for (let mark = 0; mark < GLYPH_COUNT; mark++) stamp.tiles[mark] = markTile(mark, bit, color);
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
 * band of the read cut out of the bands above it, blown up to the **bit grid** with no smoothing and
 * cut out of a sheet of that mark — one sheet a pass, so a frame pays ten whatever the cell count —
 * and laid into the one layer every pass shares. The layer goes onto the picture once, at
 * `CELL_ROWS` of a whole mark, blown up from the bit grid to the cell grid it stands for.
 *
 * **One picture-sized draw a frame and not thirty** (0353). The passes say nothing finer than a
 * mark's own bit, so running them at a pixel a bit and blowing the answer up once says exactly what
 * running them at the picture's size said — at two device pixels to the CSS one a bit is two pixels
 * square and the blow-up is exact — and it is what the popped-out picture at 2560 × 1440 can
 * actually pay. **The depth is spent pass by pass into the layer and the layer goes on whole**, so
 * what reaches the picture is what ten draws at `CELL_ROWS` reached it with: a cell on a band's
 * shoulder carries a share of two marks (`STAMP_STEPS`), and folding those two together at full
 * ink before the one draw would lay less on the bits both marks ink than the ten draws did.
 *
 * Laid **over** and never cut out: the cut is what makes the picture the rows' product (0131), and
 * this is that same product written in the alphabet the lattice under it is written in — so a row
 * going by is a run of marks going by rather than a run of holes.
 *
 * A painting whose alphabet the engine would not mint stamps nothing at all, exactly as a picture
 * whose lattice cell is still baking draws no lattice (`cutLattice`): half an alphabet is a
 * different picture, where none of it is the picture as it stood before this pass existed.
 */
export function stampMarks(context: CanvasRenderingContext2D, stamp: Stamp, cell: number): void {
  const band = stamp.band.getContext("2d");
  const higher = stamp.higher.getContext("2d");
  const mask = stamp.mask.getContext("2d");
  const layer = stamp.layer.getContext("2d");
  if (band === null || higher === null || mask === null || layer === null) return;
  for (let mark = 0; mark < GLYPH_COUNT; mark++) if (!stamp.tiles[mark]) return;
  const wide = stamp.read.width;
  const deep = stamp.read.height;
  const bitWide = stamp.mask.width;
  const bitDeep = stamp.mask.height;
  higher.clearRect(0, 0, wide, deep);
  layer.clearRect(0, 0, bitWide, bitDeep);
  layer.globalCompositeOperation = "source-over";
  layer.globalAlpha = CELL_ROWS.value;
  // Heaviest mark first, so each band is cut out of the bands above it and the lightest — the
  // empty mark the quiet cells fall in — is whatever is left.
  for (let mark = GLYPH_COUNT - 1; mark >= 0; mark--) {
    const tile = stamp.tiles[mark];
    if (!tile) return;
    cutBand(stamp, band, mark, wide, deep);
    sheetOf(mask, stamp.mask, tile);
    mask.globalCompositeOperation = "destination-in";
    mask.imageSmoothingEnabled = false;
    mask.drawImage(stamp.band, 0, 0, wide, deep, 0, 0, bitWide, bitDeep);
    mask.imageSmoothingEnabled = true;
    layer.drawImage(stamp.mask, 0, 0);
    higher.globalCompositeOperation = "source-over";
    higher.drawImage(stamp.band, 0, 0);
  }
  context.globalCompositeOperation = "source-over";
  // Whole: the depth was spent on the way into the layer, and spending it twice would be a stamp
  // at `CELL_ROWS` squared. Set rather than assumed, because the pass before this one leaves the
  // canvas at whatever depth its own cut wanted.
  context.globalAlpha = 1;
  // On whole cells and never smoothed, the way the box laid its own blocks back out: a bit is a
  // whole number of device pixels wherever the cell is a whole number of bits, and a smoothed
  // blow-up would be the quarter-pixel softening this file mints its tiles to avoid.
  context.imageSmoothingEnabled = false;
  context.drawImage(stamp.layer, 0, 0, wide * cell, deep * cell);
  context.imageSmoothingEnabled = true;
}
