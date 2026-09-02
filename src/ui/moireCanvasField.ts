/**
 * @role Taking the rows' finished product back out of the screen: whole, or through the slices a
 *   lens bends it in, a scattering rack breaks it along and a swaying one warps it through. The
 *   last pass of a painting, and the one place the field is read from somewhere other than where
 *   it is laid.
 * @instead The painting itself, every grating in it and the frame before it laid back in →
 *   src/ui/moireCanvas.ts, which this split out of at the 800-line hard cap (0045) and which is this
 *   file's only caller. The slices, the lens's slide and the shatter's own →
 *   src/lib/moireGeometry.ts; the warp's two sines → src/lib/moireWarp.ts. How much of the standing
 *   rack is scatter → src/ui/moireShatter.ts, and how much is sway → src/ui/moireShape.ts.
 */
import { DRIFT_REST, turnsOf, wrap, type MoireRow } from "@/lib/moire";
import { LENS_SLICES, lensSlide, shatterPieces, shatterSlide } from "@/lib/moireGeometry";
import { warpShare, warpSlideX, warpSlideY } from "@/lib/moireWarp";
import { boldestRow } from "@/ui/moireScreen";
import type { MoireShape } from "@/ui/moireShape";

/** How far one row asks the finished field to be bent, read off the row that asks it loudest. */
const lensOf = (row: MoireRow): number => row.lens;

/**
 * The surface a warped field is bent across on its way out, one per field and kept at the field's
 * own size: the first pass slides its bands into this, and the second slides this one's columns
 * into the screen. Made the first time a picture is warped and never for one that is not, so a
 * picture with no sway behind it pays nothing for the pass it does not take.
 */
const betweens = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();

function betweenFor(field: HTMLCanvasElement): HTMLCanvasElement {
  const held = betweens.get(field) ?? document.createElement("canvas");
  if (held.width !== field.width) held.width = field.width;
  if (held.height !== field.height) held.height = field.height;
  betweens.set(field, held);
  return held;
}

/**
 * Take the rows' product back out of the screen — in one go, or, where a row asks for a lens, the
 * rack standing behind it is scattering or swaying, through slices of it: slid one against the
 * next on the asking row's own phase, a share of them drawn from somewhere else in the picture,
 * and the whole of them bent by the sway's two sines. The field is already built when this runs,
 * so all three cost draws of what is already drawn and no second pass over any row: they bend and
 * break the picture whole rather than every grating in it.
 *
 * **The shatter is a slice of the field and never a second fill over it.** A broken piece is drawn
 * from somewhere else along the picture instead of from where it belongs — cut once either way, at
 * the one alpha every cut here is made at — so a shattered picture is the same picture read out of
 * order rather than a picture blended with a copy of itself, which would haze every window in it
 * evenly (`shatterPieces`, src/lib/moireGeometry.ts).
 *
 * **And the warp is the same slices, twice.** The sketch's warp bends x by a sine of y and then y
 * by a sine of x, and warping the rows' product is warping every row by the same warp — so the
 * first sine is one more term on the slide every band already takes, and the second is the same
 * thing down the columns of what the first pass left, through one surface between (0278). No
 * bake, no key, and a straight row warps as a curved one does.
 */
export function cutField(
  context: CanvasRenderingContext2D,
  field: HTMLCanvasElement,
  rows: readonly MoireRow[],
  shatter: number,
  shape: Readonly<MoireShape>,
): void {
  const { height, width } = field;
  const bold = boldestRow(rows, lensOf, DRIFT_REST.lens);
  const lens = bold === null ? 0 : bold.lens;
  const broken = shatterPieces(shatter);
  const bent = warpShare(shape.warp);
  if (lens <= 0 && broken <= 0 && bent <= 0) {
    context.drawImage(field, 0, 0);
    return;
  }
  // A yard scattering with no row asking for a lens has nothing to take a phase off, and needs
  // none: the slices stand where they are and the field is drawn out of order through them.
  const turns = bold === null || lens <= 0 ? 0 : turnsOf(bold);
  // Where the bands land: straight into the screen, or into the surface between when there is a
  // second pass to take. An engine that will not make that surface's context draws no picture at
  // all, and an empty canvas says so (src/ui/moireCanvas.ts).
  const between = bent > 0 ? betweenFor(field) : null;
  const ink = between === null ? context : between.getContext("2d");
  if (ink === null) {
    context.clearRect(0, 0, width, height);
    return;
  }
  if (between !== null) {
    ink.globalCompositeOperation = "source-over";
    ink.globalAlpha = 1;
    ink.clearRect(0, 0, width, height);
  }
  for (let slice = 0; slice < LENS_SLICES; slice++) {
    const top = Math.floor((slice * height) / LENS_SLICES);
    const deep = Math.floor(((slice + 1) * height) / LENS_SLICES) - top;
    if (deep <= 0) continue;
    // The lens's own slide, the warp's first sine across, and, where this slice belongs to a piece
    // the share has broken, the whole eighth the walk draws that piece from. Wrapped into one
    // picture before it is drawn: the band is covered by the copy either side of the edge it is
    // slid over, which is only true of an offset inside one width of it.
    const slid =
      lensSlide(lens, turns, slice, LENS_SLICES) * width +
      warpSlideX(bent, shape.sway, (top + deep / 2) / height) * height;
    const off = shatterSlide(shatter, slice, LENS_SLICES);
    cutAcross(ink, field, top, deep, off > 0 ? wrap(slid / width + off, 1) * width : slid);
  }
  if (between === null) return;
  // The second sine, down the columns of what the first pass left, and out to the screen.
  for (let slice = 0; slice < LENS_SLICES; slice++) {
    const left = Math.floor((slice * width) / LENS_SLICES);
    const wide = Math.floor(((slice + 1) * width) / LENS_SLICES) - left;
    if (wide <= 0) continue;
    cutDown(
      context,
      between,
      left,
      wide,
      warpSlideY(bent, shape.sway, (left + wide / 2) / height) * height,
    );
  }
}

/**
 * One band of the finished field cut out of the screen: taken from `top`, laid back at `top` slid
 * `slid` across, and again a picture over — so the column a slide left behind is cut by the far edge
 * of the field rather than left standing as a bar of uncut screen down the picture. A slide of a
 * whole picture is therefore the band exactly where it was, which is what lets the shatter's own
 * offsets run the width of it.
 *
 * Every band is cut exactly once wherever it lands, at the alpha the painting already set: two cuts
 * of one band would compose as a product rather than as a blend, and a picture hazed by a copy of
 * itself is what this pass exists not to draw.
 */
function cutAcross(
  context: CanvasRenderingContext2D,
  field: HTMLCanvasElement,
  top: number,
  deep: number,
  slid: number,
): void {
  const { width } = field;
  context.drawImage(field, 0, top, width, deep, slid, top, width, deep);
  if (slid !== 0) {
    const over = slid - Math.sign(slid) * width;
    context.drawImage(field, 0, top, width, deep, over, top, width, deep);
  }
}

/** And one column of it, slid `slid` down and again a picture over, for the same reason. */
function cutDown(
  context: CanvasRenderingContext2D,
  field: HTMLCanvasElement,
  left: number,
  wide: number,
  slid: number,
): void {
  const { height } = field;
  context.drawImage(field, left, 0, wide, height, left, slid, wide, height);
  if (slid !== 0) {
    const over = slid - Math.sign(slid) * height;
    context.drawImage(field, left, 0, wide, height, left, over, wide, height);
  }
}
