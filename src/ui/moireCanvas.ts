/**
 * @role The one painter of drift: a canvas kept sized to its element and to the display, holding
 *   one *grating* per row it is handed — a lane, an instance in the rack, the loop — each at its
 *   own angle, its own pitch and its own phase, all of them across the whole canvas rather than
 *   inside a band of it. The picture is what they make together: every pair of gratings beats into
 *   a family of fringes, so a yard's items are not drawn one beside another but read off each
 *   other. One painter serves the strip and the overlay across the one window both ask for.
 *
 *   Every grating is cut out of ink already laid down — `destination-out` multiplies what is under
 *   it, which is what makes the field the rows' product rather than their sum — and that ink is
 *   the screen a camera would have been pointed at (P90, P92), which this file asks for and does
 *   not draw.
 * @instead The screen itself — its lattice, its three channels and the motions its parameters own
 *   → src/ui/moireScreen.ts, this file's only reach outside itself while painting. What a row is,
 *   and the angle, pitch, depth and bend one turns into → src/lib/moire.ts, which holds all of it
 *   as maths Node can test without a canvas. The canvas this paints on — its size, its density,
 *   its colour and its frame loop → src/ui/canvasSurface.ts, which every surface that draws itself
 *   moving shares. Peaks → src/ui/peakCanvas.ts, which is this file's sibling and not its source.
 */
import {
  gratingBend,
  gratingDepth,
  gratingKeep,
  gratingPitch,
  gratingTurns,
  TAU,
  turnsOf,
  type MoireRow,
} from "@/lib/moire";
import { inkThrough } from "@/ui/moireScreen";

/**
 * How wide the one grating tile is, in its own pixels: one whole cosine cycle across it, constant
 * down its single row. Wide enough that the cycle is smooth under the filtering a rotated pattern
 * gets, and no wider, because every row's pitch is a *scale* on this rather than a tile of its own.
 */
export const TILE_PX = 64;

/**
 * The one tile every grating in every picture is drawn with, built once. A row's pitch arrives as
 * a scale on the pattern's matrix, its angle as a rotation and its phase as a translate, so an
 * arbitrary pitch is exact and seamless — which a tile cut to a whole number of device pixels is
 * not — and one tile serves every row rather than one being built per row per frame.
 *
 * Only its alpha is ever read. The picture is cut out of ink already laid down, and
 * `destination-out` leaves `under × (1 - alpha)` and discards the colour entirely: so this tile
 * names no colour, and what the picture is drawn in stays the token its caller resolved
 * (docs/boundaries.md).
 */
let tile: HTMLCanvasElement | null = null;

/** The pattern each canvas cuts through — per canvas, because a pattern belongs to a context. */
const gratings = new WeakMap<HTMLCanvasElement, CanvasPattern>();

/**
 * The surface the rows' product is built on, one per canvas drawn and kept at its size. The
 * picture is **one minus** that product — a stack of gratings blocks light and passes it only
 * where every one of their slits lines up, so the ink is dense and the fringes are the windows
 * through it. Built the other way up, the field spent most of itself near the floor and read as a
 * wash: measured in the app at a mean alpha of 0.111 first and 0.362 after the floors were
 * rebalanced, and flat both times, because a floor high enough to be seen leaves gratings too
 * shallow to beat. This inverts the distribution instead of fighting it, which is what a moiré on
 * a light ground actually looks like.
 *
 * A product cannot be inverted in place — `destination-out` needs it as a source — so it is built
 * here and cut out of the screen once. That is one more full-canvas fill per frame and still no
 * loop over any pixel.
 */
const fields = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();

/** The grating's transform, one object refilled: a per-frame paint allocates nothing (0070). */
const aimed = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/**
 * The tile itself: one cycle of `gratingKeep` at full depth, written as alpha. Through the same
 * function the screen's own gratings are drawn with, so there is one cosine in this app and not a
 * painter's private copy of it.
 */
function gratingTile(): HTMLCanvasElement | null {
  if (tile !== null) return tile;
  const made = document.createElement("canvas");
  made.width = TILE_PX;
  made.height = 1;
  const ink = made.getContext("2d");
  if (ink === null) return null;
  const field = ink.createImageData(TILE_PX, 1);
  for (let x = 0; x < TILE_PX; x++) {
    // The trough, not the crest: what is cut away is one minus what the grating keeps.
    field.data[x * 4 + 3] = Math.round(255 * (1 - gratingKeep(x, TILE_PX, 1)));
  }
  ink.putImageData(field, 0, 0);
  tile = made;
  return tile;
}

/** The pattern `surface` cuts its gratings through, built once per surface and held against it. */
function gratingOf(
  surface: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
): CanvasPattern | null {
  const held = gratings.get(surface);
  if (held !== undefined) return held;
  const made = gratingTile();
  if (made === null) return null;
  const pattern = context.createPattern(made, "repeat");
  if (pattern === null) return null;
  gratings.set(surface, pattern);
  return pattern;
}

/** The surface `canvas` builds its product on, kept at the canvas's own size. */
function fieldFor(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const held = fields.get(canvas) ?? document.createElement("canvas");
  if (held.width !== canvas.width) held.width = canvas.width;
  if (held.height !== canvas.height) held.height = canvas.height;
  fields.set(canvas, held);
  return held;
}

/**
 * Point one grating: turned to its own angle, scaled to its own pitch, and slid to where its phase
 * has carried it — along its own axis, so a row travels across its fringes rather than sideways
 * through them. Backwards, so the field runs the way the rows' own crests used to.
 */
function aim(pattern: CanvasPattern, row: MoireRow, pitch: number): void {
  const angle = TAU * gratingTurns(row);
  const scale = pitch / TILE_PX;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  aimed.a = scale * cos;
  aimed.b = scale * sin;
  aimed.c = -scale * sin;
  aimed.d = scale * cos;
  const slide = -turnsOf(row) * pitch;
  aimed.e = slide * cos;
  aimed.f = slide * sin;
  pattern.setTransform(aimed);
}

/** How many of `rows` are actually drawn: a row with no period of its own is not a grating. */
export const drawnRows = (rows: readonly MoireRow[]): number =>
  rows.filter((row) => row.period > 0).length;

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
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.globalCompositeOperation = "source-over";
  context.globalAlpha = 1;
  context.clearRect(0, 0, width, height);
  const count = drawnRows(rows);
  if (count === 0 || windowSecs <= 0) return;
  // Before any ink goes down: a canvas whose engine will not build the product cannot draw this
  // picture at all, and an empty canvas says so where a filled rectangle would hide it.
  const field = fieldFor(canvas);
  const ink = field.getContext("2d");
  if (ink === null) return;
  const grating = gratingOf(field, ink);
  if (grating === null) return;
  // The rows' product, on its own surface. Filled in the caller's own resolved ink and never a
  // colour of this file's: only the alpha of it is ever read, because what this becomes is the
  // mask the picture is cut with (docs/boundaries.md).
  ink.setTransform(1, 0, 0, 1, 0, 0);
  ink.globalCompositeOperation = "source-over";
  ink.globalAlpha = 1;
  ink.clearRect(0, 0, width, height);
  ink.fillStyle = color;
  ink.fillRect(0, 0, width, height);
  const dpr = devicePixelRatio;
  ink.globalCompositeOperation = "destination-out";
  ink.globalAlpha = gratingDepth(count);
  for (const row of rows) {
    if (row.period <= 0) continue;
    aim(grating, row, gratingPitch(row.period, windowSecs, width, dpr) * gratingBend(row));
    ink.fillStyle = grating;
    ink.fillRect(0, 0, width, height);
  }
  // The screen, and then the product taken back out of it — so what is left is the ink everywhere
  // the gratings block and a window everywhere they agree, which is the picture.
  inkThrough(canvas, context, rows, color);
  context.fillRect(0, 0, width, height);
  context.globalCompositeOperation = "destination-out";
  context.drawImage(field, 0, 0);
  context.globalCompositeOperation = "source-over";
}
