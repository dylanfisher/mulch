/**
 * @role Taking the rows' finished product back out of the screen: whole, or through the slices a
 *   lens bends it in, a scattering rack breaks it along, a swaying one warps it through and an
 *   automator tears it across. The last pass of a painting, and the one place the field is read
 *   from somewhere other than where it is laid.
 * @instead The painting itself, every grating in it and the frame before it laid back in →
 *   src/ui/moireCanvas.ts, which this split out of at the 800-line hard cap (0045) and which is this
 *   file's only caller. The slices, the lens's slide and the shatter's own →
 *   src/lib/moireGeometry.ts; the warp's two sines → src/lib/moireWarp.ts; the shards' throw table
 *   and its numbers → src/lib/moireShards.ts. How much of the standing rack is scattering, how much
 *   of it is swaying and how many automators are tearing it, as the looks their entries declare →
 *   src/ui/moireLooks.ts; what a look is → src/lib/moireLook.ts.
 */
import { DRIFT_REST, turnsOf, wrap, type MoireRow } from "@/lib/moire";
import { fractalRest, fractalSeedInto, type FractalStops } from "@/lib/moireFractal";
import {
  geometryRef,
  LENS_SLICES,
  lensSlide,
  shatterPieces,
  shatterSlide,
} from "@/lib/moireGeometry";
import { LOOKS } from "@/lib/moireLook";
import { SHARD_CAP, SHARD_LAYER, shardsInto } from "@/lib/moireShards";
import { warpShare, warpSlideX, warpSlideY } from "@/lib/moireWarp";
import {
  looksCrowd,
  looksShards,
  looksShatter,
  looksShatterSize,
  looksWarp,
  type MoireLook,
} from "@/ui/moireLooks";
import { boldestRow } from "@/ui/moireScreenInk";
import type { MoireShape } from "@/ui/moireShape";

/** How far one row asks the finished field to be bent, read off the row that asks it loudest. */
const lensOf = (row: MoireRow): number => row.lens;

/**
 * The shards' own scratch, kept rather than made: how far each automator throws each slice across
 * and each column down, a layer per automator (`shardsInto`, src/lib/moireShards.ts), how present
 * each automator standing is and how much its run holds, and the seed the count is read off — the
 * painter's roamed stops denormalised once a painting, at the zoom of one and the fly of nought the
 * tear reads at. A painting allocates nothing (0070).
 */
const throws = new Float64Array(SHARD_CAP * SHARD_LAYER);
const presences = new Float64Array(SHARD_CAP);
const helds = new Float64Array(SHARD_CAP);
const thrown = fractalRest();

/**
 * The two surfaces a bent or torn field goes through on its way out, one pair per field and kept at
 * the field's own size: an across pass slides its bands into the first, a down pass slides that one's
 * columns into the second — or into the screen, on the last layer — and the next layer's across pass
 * reads the second back (0298). Made the first time a picture takes a layer and never for one that
 * does not, so a picture with no sway and no automator behind it pays nothing for passes it does not
 * take.
 */
const betweens = new WeakMap<
  HTMLCanvasElement,
  [HTMLCanvasElement | null, HTMLCanvasElement | null]
>();

function betweenFor(field: HTMLCanvasElement, which: 0 | 1): HTMLCanvasElement {
  const pair = betweens.get(field) ?? [null, null];
  betweens.set(field, pair);
  // Made one at a time: a single layer lands in the screen and never asks for the second.
  const held = pair[which] ?? document.createElement("canvas");
  pair[which] = held;
  if (held.width !== field.width) held.width = field.width;
  if (held.height !== field.height) held.height = field.height;
  return held;
}

/** A surface's context, cleared for a layer to land in; `null` where the engine will not make one. */
function clearedInk(surface: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const ink = surface.getContext("2d");
  if (ink === null) return null;
  ink.globalCompositeOperation = "source-over";
  ink.globalAlpha = 1;
  ink.clearRect(0, 0, surface.width, surface.height);
  return ink;
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
 * whole rack standing, and the warp, the shatter and the shards are cut through the slices this
 * file already reads the field back in (0278, 0269, 0296) — so a rack of those alone hands the cut
 * the field it was given and draws the picture it drew before there was a chain. Reverb's bloom is
 * the first that does take one (0280), and every later pass arrives into this same loop by
 * declaring itself into `LOOKS`.
 *
 * **And every pass is handed the same two numbers whether it reads them or not**: which way the
 * whole picture is being blown (0282) and how long the deck behind it has sounded, which is the one
 * clock the picture moves on (0126, 0285). A pass that wants neither takes four arguments.
 *
 * **And one number that is the slot's own**: how many looks of this pass's kind stand in the same
 * rack (`looksCrowd`, 0294). Counted here because this is where the chain is, and per slot rather
 * than once for the set, because the answer is a different one for each kind — the loop is at most
 * a rack long and this runs once a painting, not once a row.
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
    declared.pass(ink, source, at, terms, veer, clock, looksCrowd(looks, look));
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
 * evenly (`shatterPieces`, src/lib/moireGeometry.ts). How many pieces it comes apart into is the
 * scatter's own Span — eighths of the picture at the shut end of it and halves at the open one
 * (`shatterBands`, 0290).
 *
 * **And the warp is the same slices, twice.** The sketch's warp bends x by a sine of y and then y
 * by a sine of x, and warping the rows' product is warping every row by the same warp — so the
 * first sine is one more term on the slide every band already takes, and the second is the same
 * thing down the columns of what the first pass left, through one surface between (0278). No
 * bake, no key, and a straight row warps as a curved one does.
 *
 * **And the shards are the same slices once more, thrown by the structure** (0296). Every band is
 * slid across by a table read once a painting off the escape count down the picture's centre
 * column, and every column of what that left is slid down by the same count along its centre row,
 * in shares of the height (`shardsInto`, src/lib/moireShards.ts). The count is read off `stops`,
 * which is where the painter's own roam has carried the plane the picture already stands on: the
 * tear moves with the field and never on its own. So a straight row is torn as a curved one is, and
 * nothing is baked for it — the column pass is taken for the shards exactly as for the warp.
 *
 * **And every automator tears what the ones before it left** (0298). The first automator's throw
 * rides the warp's two passes; each further one is two passes of its own — its across throw over
 * the surface the last layer landed in, its down throw out of that — so the second tears pieces of
 * the first's pieces, the way a flattened picture is torn again, and never adds its table to the
 * first's. Two surfaces between suffice whatever the count: a layer reads one and writes the other.
 */
export function cutField(
  context: CanvasRenderingContext2D,
  field: HTMLCanvasElement,
  rows: readonly MoireRow[],
  looks: readonly MoireLook[],
  shape: Readonly<MoireShape>,
  veer: number,
  clock: number,
  stops: Readonly<FractalStops>,
): void {
  const { height, width } = field;
  // The chain first: the finished field through every pass the standing looks take, in rack order,
  // each handed the one direction the whole picture is blowing in (0282) and the one clock it moves
  // on (0126). What comes back is the field itself wherever no standing look takes a slot.
  const passed = passLooks(field, looks, veer, clock);
  const shatter = looksShatter(looks);
  const piece = looksShatterSize(looks);
  const bold = boldestRow(rows, lensOf, DRIFT_REST.lens);
  const lens = bold === null ? 0 : bold.lens;
  const broken = shatterPieces(shatter, piece);
  const bent = warpShare(looksWarp(looks));
  const standing = looksShards(looks, presences, helds);
  if (lens <= 0 && broken <= 0 && bent <= 0 && standing <= 0) {
    context.drawImage(passed, 0, 0);
    return;
  }
  // The throw table, filled once for the whole painting where anything is tearing it: the stops
  // the painter roams, at the zoom of one and the fly of nought the tear reads at (0261, 0296).
  if (standing > 0) {
    fractalSeedInto(thrown, stops, 1, 0);
    shardsInto(
      throws,
      thrown,
      geometryRef(width, height),
      width,
      height,
      presences,
      helds,
      standing,
    );
  }
  // A yard scattering with no row asking for a lens has nothing to take a phase off, and needs
  // none: the slices stand where they are and the field is drawn out of order through them.
  const turns = bold === null || lens <= 0 ? 0 : turnsOf(bold);
  // How many two-pass layers the picture goes through: one for a bend or the first tear, and one
  // more for every further automator. None, and the bands land straight in the screen.
  const layers = Math.max(standing, bent > 0 ? 1 : 0);
  if (layers === 0) {
    slideAcross(context, passed, lens, turns, shatter, piece, 0, shape.sway, -1);
    return;
  }
  // Each layer: the across pass into the first surface between, the down pass out of it into the
  // second — or into the screen, on the last. The lens, the shatter and the warp ride the first
  // layer only; an engine that will not make a surface's context draws no picture at all, and an
  // empty canvas says so (src/ui/moireCanvas.ts).
  let source = passed;
  for (let layer = 0; layer < layers; layer++) {
    const across = betweenFor(field, 0);
    const ink = clearedInk(across);
    const last = layer === layers - 1;
    const down = last ? context : clearedInk(betweenFor(field, 1));
    if (ink === null || down === null) {
      context.clearRect(0, 0, width, height);
      return;
    }
    const tear = layer < standing ? layer : -1;
    if (layer === 0) {
      slideAcross(ink, source, lens, turns, shatter, piece, bent, shape.sway, tear);
      slideDown(down, across, bent, shape.sway, tear);
    } else {
      slideAcross(ink, source, 0, 0, 0, 0, 0, shape.sway, tear);
      slideDown(down, across, 0, shape.sway, tear);
    }
    if (!last) source = betweenFor(field, 1);
  }
}

/**
 * One across pass: every band of `source` slid into `ink` by the lens's own slide, the warp's first
 * sine and — where `tear` names a layer of the throw table — that automator's throw across, in shares
 * of the height as the warp's is; and, where the band belongs to a piece the shatter's share has
 * broken, the whole piece the walk draws that piece from. Wrapped into one picture before it is
 * drawn: the band is covered by the copy either side of the edge it is slid over, which is only
 * true of an offset inside one width of it.
 */
function slideAcross(
  ink: CanvasRenderingContext2D,
  source: HTMLCanvasElement,
  lens: number,
  turns: number,
  shatter: number,
  piece: number,
  bent: number,
  sway: number,
  tear: number,
): void {
  const { height, width } = source;
  for (let slice = 0; slice < LENS_SLICES; slice++) {
    const top = Math.floor((slice * height) / LENS_SLICES);
    const deep = Math.floor(((slice + 1) * height) / LENS_SLICES) - top;
    if (deep <= 0) continue;
    const slid =
      lensSlide(lens, turns, slice, LENS_SLICES) * width +
      warpSlideX(bent, sway, (top + deep / 2) / height) * height +
      (tear >= 0 ? (throws[tear * SHARD_LAYER + slice] ?? 0) * height : 0);
    const off = shatterSlide(shatter, piece, slice, LENS_SLICES);
    cutAcross(
      ink,
      source,
      top,
      deep,
      off > 0 || tear >= 0 ? wrap(slid / width + off, 1) * width : slid,
    );
  }
}

/**
 * One down pass: every column of `between` slid into `context` by the warp's second sine and — where
 * `tear` names a layer — that automator's throw down, in shares of the height.
 */
function slideDown(
  context: CanvasRenderingContext2D,
  between: HTMLCanvasElement,
  bent: number,
  sway: number,
  tear: number,
): void {
  const { height, width } = between;
  for (let slice = 0; slice < LENS_SLICES; slice++) {
    const left = Math.floor((slice * width) / LENS_SLICES);
    const wide = Math.floor(((slice + 1) * width) / LENS_SLICES) - left;
    if (wide <= 0) continue;
    cutDown(
      context,
      between,
      left,
      wide,
      warpSlideY(bent, sway, (left + wide / 2) / height) * height +
        (tear >= 0 ? (throws[tear * SHARD_LAYER + LENS_SLICES + slice] ?? 0) * height : 0),
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
