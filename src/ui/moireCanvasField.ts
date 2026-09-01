/**
 * @role Taking the rows' finished product back out of the screen: whole, or through the slices a
 *   lens bends it in and a scattering rack breaks it along. The last pass of a painting, and the one
 *   place the field is read from somewhere other than where it is laid.
 * @instead The painting itself, every grating in it and the frame before it laid back in →
 *   src/ui/moireCanvas.ts, which this split out of at the 800-line hard cap (0045) and which is this
 *   file's only caller. The slices, the lens's slide and the shatter's own →
 *   src/lib/moireGeometry.ts. How much of the standing rack is scatter → src/ui/moireShatter.ts.
 */
import { DRIFT_REST, turnsOf, wrap, type MoireRow } from "@/lib/moire";
import { LENS_SLICES, lensSlide, shatterPieces, shatterSlide } from "@/lib/moireGeometry";
import { boldestRow } from "@/ui/moireScreen";

/** How far one row asks the finished field to be bent, read off the row that asks it loudest. */
const lensOf = (row: MoireRow): number => row.lens;

/**
 * Take the rows' product back out of the screen — in one go, or, where a row asks for a lens or the
 * rack standing behind it is scattering, through slices of it: slid one against the next on the
 * asking row's own phase, and a share of them drawn from somewhere else in the picture. The
 * field is already built when this runs, so both cost draws of what is already drawn and no second
 * pass over any row: they bend and break the picture whole rather than every grating in it.
 *
 * **The shatter is a slice of the field and never a second fill over it.** A broken piece is drawn
 * from somewhere else along the picture instead of from where it belongs — cut once either way, at
 * the one alpha every cut here is made at — so a shattered picture is the same picture read out of
 * order rather than a picture blended with a copy of itself, which would haze every window in it
 * evenly (`shatterPieces`, src/lib/moireGeometry.ts).
 */
export function cutField(
  context: CanvasRenderingContext2D,
  field: HTMLCanvasElement,
  rows: readonly MoireRow[],
  shatter: number,
): void {
  const { height, width } = field;
  const bold = boldestRow(rows, lensOf, DRIFT_REST.lens);
  const lens = bold === null ? 0 : bold.lens;
  const broken = shatterPieces(shatter);
  if (lens <= 0 && broken <= 0) {
    context.drawImage(field, 0, 0);
    return;
  }
  // A yard scattering with no row asking for a lens has nothing to take a phase off, and needs
  // none: the slices stand where they are and the field is drawn out of order through them.
  const turns = bold === null || lens <= 0 ? 0 : turnsOf(bold);
  for (let slice = 0; slice < LENS_SLICES; slice++) {
    const top = Math.floor((slice * height) / LENS_SLICES);
    const deep = Math.floor(((slice + 1) * height) / LENS_SLICES) - top;
    if (deep <= 0) continue;
    // The lens's own slide and, where this slice belongs to a piece the share has broken, the whole
    // eighth the walk draws that piece from. Wrapped into one picture before it is drawn: the band
    // is covered by the copy either side of the edge it is slid over, which is only true of an
    // offset inside one width of it.
    const slid = lensSlide(lens, turns, slice, LENS_SLICES) * width;
    const off = shatterSlide(shatter, slice, LENS_SLICES);
    cutSlice(context, field, top, deep, off > 0 ? wrap(slid / width + off, 1) * width : slid);
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
function cutSlice(
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
