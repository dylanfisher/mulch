/**
 * @role The one painter of drift: a canvas kept sized to its element and to the display, holding
 *   one *grating* per row it is handed — a lane, an instance in the rack, the loop — each at its
 *   own angle, its own pitch, its own phase and the profile its effect declared, all of them across
 *   the whole canvas rather than inside a band of it. The picture is what they make together: every pair of gratings beats into
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
  gratingPitch,
  gratingTurns,
  profileBlock,
  TAU,
  turnsOf,
  type DriftProfile,
  type MoireRow,
} from "@/lib/moire";
import { viewOf } from "@/ui/canvasSurface";
import { inkThrough } from "@/ui/moireScreen";

/**
 * How wide a grating tile is, in its own pixels: one whole cycle of the profile across it, constant
 * down its single row. Wide enough that the cycle is smooth under the filtering a rotated pattern
 * gets, and no wider, because every row's pitch is a *scale* on this rather than a tile of its own.
 */
export const TILE_PX = 64;

/**
 * One tile per profile a row can be cut to, each built once. A row's pitch arrives as a scale on
 * the pattern's matrix, its angle as a rotation and its phase as a translate, so an arbitrary pitch
 * is exact and seamless — which a tile cut to a whole number of device pixels is not — and one tile
 * per profile serves every row of that kind rather than one being built per row per frame. There
 * are as many as `DRIFT_PROFILES` has entries and never more, because a profile is declared beside
 * its effect and this file names none of them.
 *
 * Only their alpha is ever read. The picture is cut out of ink already laid down, and
 * `destination-out` leaves `under × (1 - alpha)` and discards the colour entirely: so these tiles
 * name no colour, and what the picture is drawn in stays the token its caller resolved
 * (docs/boundaries.md).
 */
const tiles = new Map<DriftProfile, HTMLCanvasElement | null>();

/**
 * The patterns each canvas cuts through, one per profile it has drawn — per canvas, because a
 * pattern belongs to a context.
 */
const gratings = new WeakMap<HTMLCanvasElement, Map<DriftProfile, CanvasPattern>>();

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
 * The tile for one profile: one cycle of `profileBlock` at full depth, written as alpha. Through
 * the same maths the screen's own gratings are drawn with, so there is one wave in this app and
 * not a painter's private copy of it.
 */
function gratingTile(profile: DriftProfile): HTMLCanvasElement | null {
  const already = tiles.get(profile);
  if (already !== undefined) return already;
  const made = document.createElement("canvas");
  made.width = TILE_PX;
  made.height = 1;
  const ink = made.getContext("2d");
  // The refusal is remembered too. This is asked per row per frame, and an engine that hands back
  // no context would otherwise mint a canvas every one of them — an allocation on the per-frame
  // path, which is the thing 0070 keeps out.
  if (ink === null) {
    tiles.set(profile, null);
    return null;
  }
  const field = ink.createImageData(TILE_PX, 1);
  for (let x = 0; x < TILE_PX; x++) {
    // What is cut away, which is what the profile blocks rather than what it lets past.
    field.data[x * 4 + 3] = Math.round(255 * profileBlock(profile, x / TILE_PX));
  }
  ink.putImageData(field, 0, 0);
  tiles.set(profile, made);
  return made;
}

/**
 * The pattern `surface` cuts a `profile`'s gratings through, built once per surface per profile and
 * held against the surface.
 */
function gratingOf(
  surface: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  profile: DriftProfile,
): CanvasPattern | null {
  const held = gratings.get(surface) ?? new Map<DriftProfile, CanvasPattern>();
  gratings.set(surface, held);
  const already = held.get(profile);
  if (already !== undefined) return already;
  const made = gratingTile(profile);
  if (made === null) return null;
  const pattern = context.createPattern(made, "repeat");
  if (pattern === null) return null;
  held.set(profile, pattern);
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
  const { height, width } = canvas;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.globalCompositeOperation = "source-over";
  context.globalAlpha = 1;
  context.clearRect(0, 0, width, height);
  const count = drawnRows(rows);
  if (count === 0 || windowSecs <= 0) return;
  // An engine that will not build the product cannot draw this picture at all, and an empty canvas
  // says so where a filled rectangle would hide it — here, and at the pattern inside the loop
  // below, whose fills so far are all on the field's own unseen surface.
  const field = fieldFor(canvas);
  const ink = field.getContext("2d");
  if (ink === null) return;
  // The rows' product, on its own surface, in the caller's own resolved ink and never a colour of
  // this file's: only its alpha is read, it being the mask the picture is cut with (boundaries).
  ink.setTransform(1, 0, 0, 1, 0, 0);
  ink.globalCompositeOperation = "source-over";
  ink.globalAlpha = 1;
  ink.clearRect(0, 0, width, height);
  ink.fillStyle = color;
  ink.fillRect(0, 0, width, height);
  const dpr = viewOf(canvas).devicePixelRatio;
  ink.globalCompositeOperation = "destination-out";
  ink.globalAlpha = gratingDepth(count);
  // Each cut to its own profile: only the shape of the wave says what kind of thing is running,
  // where the pitch says how fast and the angle says which parameter (0137).
  for (const row of rows) {
    if (row.period <= 0) continue;
    const grating = gratingOf(field, ink, row.profile);
    if (grating === null) return;
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
