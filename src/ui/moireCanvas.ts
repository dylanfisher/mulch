/**
 * @role The one painter of drift: a canvas kept sized to its element and to the display, holding
 *   one horizontal band per row it is handed — a lane, an instance in the rack, the loop — each a
 *   continuous wave: a phase field sampled across the window, never a run of ticks laid down one
 *   at a time. The rows are wider than their own band, so they
 *   overlap, beat against each other, and the fringes are the picture. One painter serves the
 *   strip and the overlay, across the one window both ask for: the large picture is the small one
 *   at size, never a second set of drawing rules.
 *
 *   The rows are not inked flat but through the screen a camera would have been pointed at (P90,
 *   P92), which this file asks for and does not draw.
 * @instead The screen itself — its lattice, its three channels, and the four motions each of its
 *   parameters owns → src/ui/moireScreen.ts, this file's only reach outside itself while painting.
 *   What a row is, the periods, how long they take to line up, and a lane's own bend →
 *   src/lib/moire.ts. The canvas this paints on — its size, its density, its colour and its frame
 *   loop → src/ui/canvasSurface.ts, which every surface that draws itself moving shares.
 *   Peaks → src/ui/peakCanvas.ts, which is this file's sibling and not its source: both sample a
 *   field across the canvas's columns, but peaks reduce recorded audio and this evaluates a closed
 *   form, so there is nothing of one to borrow for the other.
 */
import { rowOffset, TAU, wrap, type MoireRow } from "@/lib/moire";
import { inkThrough, leanUnder } from "@/ui/moireScreen";

/** How much of the ink the reference row gets: present, and plainly underneath (no literal). */
const REFERENCE_ALPHA = 0.35;

/**
 * How much of the ink a lane's row gets. Under one on purpose: overlapping rows are what make a
 * fringe, and a fringe is where two translucent crests land on the same pixel.
 */
const ROW_ALPHA = 0.55;

/**
 * How far a row's crest reaches from the middle of its own band, as a fraction of that band. Past
 * a half, so neighbouring rows overlap and interfere rather than sitting in stripes; the top and
 * bottom rows spill off the canvas at a crest, which is a wave running past the edge and not a
 * clipped rectangle.
 */
const ROW_SPREAD = 0.9;

/**
 * The band, in CSS pixels, the three proportions above were chosen at. Every one of them is read
 * against the band a row actually gets rather than left fixed, because a crest wider than the band
 * it beats against is a blob: at a fixed pitch a folded-down strip loses its fringes instead of
 * tightening them (P69). CSS pixels and not the canvas's own: how wide a crest is against its band
 * is a proportion, and a proportion that moved with the display would draw one yard three ways on
 * three screens and re-pitch itself under a browser zoom.
 */
const REFERENCE_BAND_PX = 48;

/** How much denser than that band the picture is ever drawn, before the pixels get a say. */
const MAX_DENSITY = 8;

/**
 * The narrowest a cycle of any row may be drawn, in device pixels. The pixels have the last word on
 * the density: the field is sampled every `SAMPLE_PX`, and a cycle narrower than a few of those is
 * aliasing rather than interference. How narrow a cycle a density buys depends on the window and
 * the fastest row in it, so the bound is taken there and not on the ratio.
 */
const MIN_CYCLE_PX = 8;

/**
 * The most of its own band a crest may reach: its neighbour, and its neighbour's neighbour, and no
 * further — past that every row covers the whole picture and the fringes wash out, which is the
 * blob again by the other road. And the most ink a row may spend over what it spends at the
 * reference band. The ink is a gain on each row rather than a ceiling both share, so the reference
 * stays underneath at every density instead of catching up with the rows at the top.
 */
const MAX_ROW_SPREAD = 1.8;
const MAX_INK_GAIN = 1.5;

/**
 * How many times its own pitch a row is drawn at, given the band of `bandPx` CSS pixels it has to
 * beat inside. One at the band the proportions were chosen at and more below it, so a minimised
 * strip is a denser moiré and not a coarser one; never under one, because a taller canvas is a
 * bigger picture of the same thing rather than a slower one. A band of no pixels is the densest
 * the picture goes rather than a division by zero.
 */
export function rowDensity(bandPx: number): number {
  if (!(bandPx > 0)) return MAX_DENSITY;
  return Math.min(MAX_DENSITY, Math.max(1, REFERENCE_BAND_PX / bandPx));
}

/** How far a crest reaches at that density: a denser picture spends more of its band overlapping. */
export const rowSpread = (density: number): number =>
  Math.min(MAX_ROW_SPREAD, ROW_SPREAD * density);

/**
 * How much ink one row carries at that density. The root of it, not the whole: a fringe is two
 * translucent crests multiplied, so the pair carries the density and neither row carries it alone.
 */
export const rowAlpha = (reference: boolean, density: number): number =>
  (reference ? REFERENCE_ALPHA : ROW_ALPHA) * Math.min(MAX_INK_GAIN, Math.sqrt(density));

/** How far the lane's own value bends the wave, in turns: a crowding of fringes, not a redraw. */
const BEND_TURNS = 0.35;

/** How many device pixels one sample of the phase field covers. */
const SAMPLE_PX = 2;

/**
 * The waveforms a row can be drawn with, picked by the parameter the lane belongs to, so two
 * lanes of the same period on different parameters never draw the same row. All continuous and
 * all bounded by ±1: what varies is where a cycle puts its ink, which is what a fringe is made of.
 */
export const ROW_SHAPES = [
  (turns: number) => Math.sin(TAU * turns),
  (turns: number) => 4 * Math.abs(wrap(turns, 1) - 0.5) - 1,
  (turns: number) => Math.sin(TAU * turns) ** 3,
  (turns: number) => 0.5 * (Math.sin(TAU * turns) + Math.sin(2 * TAU * turns)),
] as const satisfies readonly [(turns: number) => number, ...((turns: number) => number)[]];

/** How many samples of the phase field a canvas of `width` device pixels is drawn from. */
export const rowSamples = (width: number): number => Math.max(2, Math.ceil(width / SAMPLE_PX));

/**
 * The lane's normalized value a fraction `turns` of the way through its cycle, read out of the
 * table sampled when the row was built and interpolated, so what bends the wave is continuous
 * too. A table of one value is a lane that never moved and bends nothing.
 */
export function bendAt(bend: readonly number[], turns: number): number {
  const first = bend[0] ?? 0.5;
  if (bend.length < 2) return first;
  const at = wrap(turns, 1) * bend.length;
  const low = Math.floor(at);
  const lower = bend[low % bend.length] ?? first;
  const upper = bend[(low + 1) % bend.length] ?? first;
  return lower + (at - low) * (upper - lower);
}

/**
 * How much ink the row carries `at` seconds into the window, from 0 at a trough to 1 at a crest.
 * The period sets the pitch, the phase slides the whole field left as the deck plays, the lane's
 * own values bend it, and the parameter picks the waveform. `density` multiplies the pitch and
 * nothing else — every row of one picture is drawn at the same one, so what it tightens is the
 * whole field and never the ratio between two rows, which is where a fringe comes from. The row's
 * own offset is its identity rather than its pitch, so the density leaves it where it is.
 */
export function rowInk(row: MoireRow, at: number, density = 1): number {
  const turns = (density * (at + row.phase)) / row.period + rowOffset(row.shape);
  const shape = ROW_SHAPES[row.shape % ROW_SHAPES.length] ?? ROW_SHAPES[0];
  const bent = turns + BEND_TURNS * (bendAt(row.bend, turns) - 0.5);
  return Math.min(1, Math.max(0, 0.5 + 0.5 * shape(bent)));
}

/**
 * The densest the pixels will carry: the fastest row in the picture decides for all of them, since
 * one density is what keeps the ratios between rows intact. Never under one, so this bound only
 * ever declines the tightening a short band asked for — it can make the picture no coarser than
 * the pitch the rows already had.
 */
export function affordableDensity(
  rows: readonly MoireRow[],
  windowSecs: number,
  width: number,
): number {
  let shortest = Infinity;
  for (const row of rows) if (row.period > 0 && row.period < shortest) shortest = row.period;
  if (!Number.isFinite(shortest) || windowSecs <= 0) return MAX_DENSITY;
  return Math.max(1, (width * shortest) / (MIN_CYCLE_PX * windowSecs));
}

/** One row's field, grown when a bigger canvas asks and refilled after: 0070 allocates nothing. */
let field = new Float32Array(0);

/** Draw `rows` across a window of `windowSecs`, in `color` — a token the caller resolved. */
export function paintMoire(
  canvas: HTMLCanvasElement,
  rows: readonly MoireRow[],
  windowSecs: number,
  color: string,
): void {
  const context = canvas.getContext("2d");
  if (context === null) return;
  const { width, height } = canvas;
  context.clearRect(0, 0, width, height);
  if (rows.length === 0 || windowSecs <= 0) return;
  const screen = inkThrough(canvas, context, rows, color);
  const samples = rowSamples(width);
  if (field.length < samples + 1) field = new Float32Array(samples + 1);
  const rowHeight = height / rows.length;
  // Everything the picture's proportions are is read off the band one row gets, here and once
  // (P69): the pitch it is drawn at, how far it reaches out of that band, and how hard it inks.
  // Back in CSS pixels, because the backing store is sized to the display and the proportion is
  // not — the same strip is the same picture on every screen.
  const density = Math.min(
    rowDensity(rowHeight / devicePixelRatio),
    affordableDensity(rows, windowSecs, width),
  );
  const spread = rowHeight * rowSpread(density);
  rows.forEach((row, index) => {
    if (row.period <= 0) return;
    const middle = (index + 0.5) * rowHeight;
    context.globalAlpha = rowAlpha(row.reference, density);
    if (screen !== null) leanUnder(context, screen, row);
    for (let sample = 0; sample <= samples; sample++) {
      field[sample] = spread * rowInk(row, (sample / samples) * windowSecs, density);
    }
    // One ribbon rather than one rectangle per cycle: out along the crest and back along the
    // trough, so the row is a single filled path whose thickness is the wave itself.
    context.beginPath();
    context.moveTo(0, middle - (field[0] ?? 0));
    for (let sample = 1; sample <= samples; sample++) {
      context.lineTo((sample / samples) * width, middle - (field[sample] ?? 0));
    }
    for (let sample = samples; sample >= 0; sample--) {
      context.lineTo((sample / samples) * width, middle + (field[sample] ?? 0));
    }
    context.closePath();
    context.fill();
  });
  context.globalAlpha = 1;
}
