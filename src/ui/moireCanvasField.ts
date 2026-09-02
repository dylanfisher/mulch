/**
 * @role Taking the rows' finished product back out of the screen: whole, or through the slices a
 *   lens bends it in, a scattering rack breaks it along and a swaying one warps it through. The
 *   last pass of a painting, and the one place the field is read from somewhere other than where
 *   it is laid.
 * @instead The painting itself, every grating in it and the frame before it laid back in →
 *   src/ui/moireCanvas.ts, which this split out of at the 800-line hard cap (0045) and which is this
 *   file's only caller. The slices, the lens's slide and the shatter's own →
 *   src/lib/moireGeometry.ts; the warp's two sines → src/lib/moireWarp.ts. How much of the standing
 *   rack is scattering and how much of it is swaying, as the looks their entries declare →
 *   src/ui/moireLooks.ts; what a look is → src/lib/moireLook.ts.
 */
import { DRIFT_REST, turnsOf, wrap, type MoireRow } from "@/lib/moire";
import { LENS_SLICES, lensSlide, shatterPieces, shatterSlide } from "@/lib/moireGeometry";
import { LOOKS } from "@/lib/moireLook";
import { warpShare, warpSlideX, warpSlideY } from "@/lib/moireWarp";
import { looksShatter, looksWarp, type MoireLook } from "@/ui/moireLooks";
import { boldestRow } from "@/ui/moireScreenInk";
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
 * The two surfaces the chain ping-pongs between, one pair per field and kept at the field's own
 * size — never the field itself, which every pass reads from, and never the warp's surface between,
 * which is written after the chain has finished. Made the first time a chain has a pass to run and
 * never for one that has none.
 */
const chains = new WeakMap<HTMLCanvasElement, [HTMLCanvasElement, HTMLCanvasElement]>();

function chainFor(field: HTMLCanvasElement, source: HTMLCanvasElement): HTMLCanvasElement {
  const pair = chains.get(field) ?? [
    document.createElement("canvas"),
    document.createElement("canvas"),
  ];
  chains.set(field, pair);
  const into = pair[0] === source ? pair[1] : pair[0];
  if (into.width !== field.width) into.width = field.width;
  if (into.height !== field.height) into.height = field.height;
  return into;
}

/**
 * The chain, and the whole of it: every standing look that takes a slot, in the order the rack holds
 * it — which is the order the sound goes through the rack, so a crush before a reverb blurs the
 * blocks and a reverb before a crush pixelates the bloom. Each pass reads one surface and writes the
 * other, at the presence the picture has travelled to and the terms its entry declared, and the last
 * one written is what the lens, the shatter and the warp cut into the screen below (0279).
 *
 * **Most of the looks that exist take no slot, and say so at the declaration.** The lattice is the
 * whole rack standing, the fold is a bake on a curved row's coordinate before any field exists, and
 * the warp and the shatter are cut through the slices this file already reads the field back in
 * (0278, 0269) — so a rack of those alone hands the cut the field it was given and draws the
 * picture it drew before there was a chain. Reverb's bloom is the first that does take one (0280),
 * and every later pass arrives into this same loop by declaring itself into `LOOKS`.
 *
 * **And every pass is handed the same two numbers whether it reads them or not**: which way the
 * whole picture is being blown (0282) and how long the deck behind it has sounded, which is the one
 * clock the picture moves on (0126, 0285). A pass that wants neither takes four arguments.
 */
function passLooks(
  field: HTMLCanvasElement,
  looks: readonly MoireLook[],
  veer: number,
  clock: number,
): HTMLCanvasElement {
  let source = field;
  for (const { look, at, terms } of looks) {
    const declared = LOOKS[look];
    if (declared.at !== "pass") continue;
    const into = chainFor(field, source);
    const ink = into.getContext("2d");
    // An engine that will not hand back this surface's context draws the picture the chain has got
    // to and no further, which is louder than a pass silently skipped and quieter than a blank.
    if (ink === null) return source;
    ink.setTransform(1, 0, 0, 1, 0, 0);
    ink.globalCompositeOperation = "source-over";
    ink.globalAlpha = 1;
    // Smoothing with them, and for the same reason: the chain has two surfaces and a pass is handed
    // whichever one its own slot lands on, so a pass that turned smoothing off to draw a grid of
    // flat cells (0281) leaves it off for whatever writes that surface next — two slots later in
    // this chain, or in the next frame's. A bloom drawn nearest-neighbour is not a bloom, so every
    // pass starts from the same context whichever ran on it before — the alpha with them, which the
    // echoes are the first pass to leave anywhere but one (0282).
    ink.imageSmoothingEnabled = true;
    ink.clearRect(0, 0, into.width, into.height);
    declared.pass(ink, source, at, terms, veer, clock);
    source = into;
  }
  return source;
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
  looks: readonly MoireLook[],
  shape: Readonly<MoireShape>,
  veer: number,
  clock: number,
): void {
  const { height, width } = field;
  // The chain first: the finished field through every pass the standing looks take, in rack order,
  // each handed the one direction the whole picture is blowing in (0282) and the one clock it moves
  // on (0126). What comes back is the field itself wherever no standing look takes a slot.
  const passed = passLooks(field, looks, veer, clock);
  const shatter = looksShatter(looks);
  const bold = boldestRow(rows, lensOf, DRIFT_REST.lens);
  const lens = bold === null ? 0 : bold.lens;
  const broken = shatterPieces(shatter);
  const bent = warpShare(looksWarp(looks));
  if (lens <= 0 && broken <= 0 && bent <= 0) {
    context.drawImage(passed, 0, 0);
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
    cutAcross(ink, passed, top, deep, off > 0 ? wrap(slid / width + off, 1) * width : slid);
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
