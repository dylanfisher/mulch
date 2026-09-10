/**
 * @role The band of the ramp washed across the finished picture once a frame: how strong it lies
 *   over the screen's own ink, how many picture widths one pass of the ramp spans, and where along
 *   the picture it has swept to — three readings of the field travelled on the set beside the ink
 *   (0302) — and the one fill that lays it, through the ink the cut left and never over the ground.
 *   No bake a frame: the band is one tile written once a colour and moved on its own transform,
 *   exactly as the screen is (0129, 0070).
 * @instead The ramp itself, and the orbit the whole picture's ink runs on → src/lib/moireColour.ts
 *   and `sceneStops` in src/ui/moireScreenTile.ts, which this reads and never restates — the band is
 *   the yard's own scene's ramp, so the wash and the tile under it cannot disagree about what the
 *   ramp is (0329). The
 *   screen the band lies over → src/ui/moireScreen.ts. Where the reading rests → `MoireRowSet` in
 *   src/ui/moireRowsField.ts; keeping it across a rebuilt set → src/ui/moireCarry.ts.
 */
import { DRIFT_DISPERSE_REACH, easedToward, type ScreenInk, wrap } from "@/lib/moire";
import { type Ink, ramp } from "@/lib/moireColour";
import { heardLevel } from "@/lib/moireSound";
import { tunable } from "@/lib/moireTuning";
import { denormalize } from "@/lib/range";
import { sceneStops } from "@/ui/moireScreenTile";
import { sceneOf } from "@/ui/scene/scenes";
import type { YardScene } from "@/lib/yardScene";

/**
 * The band as the field reads it: how strongly it lies over the ink on 0..1, how many picture
 * widths one pass of the ramp there and back spans, and where along the picture it has swept to in
 * turns of one span. One screen is one band, so this is the field's and no row's.
 */
export type MoireTint = { strength: number; spread: number; phase: number };

/**
 * How much of the band lies over the screen's own ink, at the loudest the output gets. Under one
 * by a margin, because at one the band replaces the screen and the three channel lattices that
 * stop a picture reading as one hue are washed away with it (0130): this is where the fringe still
 * reads through the colour rather than under it.
 */
export const TINT_STRENGTH = tunable("colour.wash", 0.45, { min: 0, max: 1, step: 0.05 });

/**
 * How far a quiet output brings the band down from that, as a share: at nothing a sounding yard is
 * washed as strongly quiet as loud, and at one only the loudest output is washed at all. Half, so
 * a yard playing quietly still carries the band and a loud passage visibly brings it up.
 */
export const TINT_LEVEL = tunable("colour.level", 0.5, { min: 0, max: 1, step: 0.05 });

/** How many seconds of sounding one sweep of the band across its own span takes. */
export const TINT_SWEEP_SECS = tunable("colour.sweepSecs", 12, { min: 1, max: 120, step: 1 });

/**
 * How many picture widths one pass of the ramp there and back spans on a yard whose channels have
 * not dispersed. Under one, so the strip — thousands wide — holds more than one whole ramp at once
 * and reads as colour changing along it rather than as one tint; a dispersed yard stretches it to
 * as much as twice this, so a washed picture holds less of the ramp at once and more of one stop.
 */
export const TINT_SPREAD = tunable("colour.spread", 0.6, { min: 0.1, max: 3, step: 0.05 });

/** How far the band's strength has to travel: one, a share having no further to go. */
const TINT_REACH = 1;

/** Where the band stands before the yard has sounded: nowhere, at nothing, one resting span wide. */
export const tintRest = (): MoireTint => ({ strength: 0, spread: TINT_SPREAD.value, phase: 0 });

/**
 * One step of the band's travel. The strength is what the output's own level and the standing
 * rack's saturation ask for, on the ink's own rate (`DRIFT_INK_SECS`), so a loud transient swells
 * the colour rather than flashing it; the spread is the ink's travelled dispersion read straight,
 * that term having already walked its ladder (`inkTravelInto`); and the phase is the deck's own
 * seconds of sounding over the sweep, wrapped, so a halted yard's band stands where it stopped
 * (0126). **And nothing at all on a yard that is not sounding**: the strength's target is nought
 * and `over` is nought, so it arrives there outright and a halted picture is painted on a commit
 * in the screen's own ink (0144, 0266).
 *
 * Written in place: read once a picture on the frame path and allocates nothing (0070).
 */
export function tintTravelInto(
  tint: MoireTint,
  ink: Readonly<ScreenInk>,
  level: number,
  sounding: number,
  elapsed: number,
  over: number,
): void {
  const asked =
    sounding > 0
      ? TINT_STRENGTH.value *
        denormalize(Math.max(heardLevel(level), ink.saturate), 1 - TINT_LEVEL.value, 1)
      : 0;
  tint.strength = easedToward(tint.strength, asked, elapsed, over, TINT_REACH);
  tint.spread = TINT_SPREAD.value * (1 + ink.disperse / DRIFT_DISPERSE_REACH);
  tint.phase = sounding > 0 ? wrap(sounding / TINT_SWEEP_SECS.value, 1) : tint.phase;
}

/**
 * How many pixels one span of the band is written across, once. The pattern is scaled onto the
 * picture per frame, so this is resolution and not size: wide enough that a span stretched over a
 * whole overlay shows no step between two stops of the ramp.
 */
const TINT_TILE_PX = 1024;

/**
 * How many colours' bands are held: one per scheme a session has seen, and a spare — and, since the
 * band is read along the yard's own scene's ramp (0329), one per `(colour, scene, light)` a page is
 * showing rather than one per colour. A rack past that room re-bakes a band when a canvas's own key
 * moves, which is a scheme flip or a remount and never a frame; a band is one row of
 * `TINT_TILE_PX`, so the re-bake is a fraction of a tile's.
 */
const TINT_TILES = 4;

/** The band written once per colour, keyed by the ink it was written for. */
const bands = new Map<string, HTMLCanvasElement>();

/** The pattern each canvas washes through — per canvas, because a pattern belongs to a context. */
const washes = new WeakMap<HTMLCanvasElement, { pattern: CanvasPattern; key: string }>();

/** The band's transform, one object refilled: a per-frame paint allocates nothing (0070). */
const rolled = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/**
 * One span of the band, a pixel wide a stop: the ramp read forward over the first half and back
 * over the second, so the two ends of the tile are the same ink and the pattern repeats along the
 * picture with no seam. Written through `ramp` off the same tokens the screen reads, so the band
 * and the tile cannot disagree about what the ramp is, and no colour is spelled here (0236).
 */
function bandFor(
  canvas: HTMLCanvasElement,
  yard: Readonly<YardScene>,
  key: string,
): HTMLCanvasElement | null {
  const held = bands.get(key);
  if (held !== undefined) return held;
  const tile = document.createElement("canvas");
  tile.width = TINT_TILE_PX;
  tile.height = 1;
  const ink = tile.getContext("2d");
  if (ink === null) return null;
  const style = getComputedStyle(canvas);
  // The yard's own scene's five stops, read here and never restated (`sceneStops`,
  // src/ui/moireScreenTile.ts): the band and the tile under it cannot disagree about what the ramp is.
  // Local, because what comes back is that module's own buffer — held past this call it would name
  // whatever the next tile's ramp is (0070 keeps the buffer; this keeps it out of two files).
  const stops = sceneStops(sceneOf(yard.scene), yard, style);
  const field = ink.createImageData(TINT_TILE_PX, 1);
  const pixels = field.data;
  // One ink for the whole band, refilled at every step: `ramp` fills what it is handed rather than
  // returning a fresh array, for the reason the tile's own loop needs it to (0332, 0070).
  const read: Ink = [0, 0, 0, 0];
  for (let x = 0; x < TINT_TILE_PX; x++) {
    const along = x / TINT_TILE_PX;
    ramp(stops, along < 0.5 ? 2 * along : 2 - 2 * along, read);
    const at = x * 4;
    pixels[at] = read[0];
    pixels[at + 1] = read[1];
    pixels[at + 2] = read[2];
    pixels[at + 3] = 255;
  }
  ink.putImageData(field, 0, 0);
  bands.set(key, tile);
  for (const oldest of bands.keys()) {
    if (bands.size <= TINT_TILES) break;
    bands.delete(oldest);
  }
  return tile;
}

/** The pattern `canvas` washes through, built only where the colour has moved. */
function washOf(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  color: string,
  yard: Readonly<YardScene>,
): CanvasPattern | null {
  // The colour and the yard's own reading together: two yards in one colour stand in two fields,
  // so one band cannot answer for both (0329). The colour is no longer a stop of the ramp since
  // 0332 — it is the scheme's own stand-in here, the one thing that moves every token at once.
  // **And how that light spreads**, because a wash mixes every stop of the ramp toward the light's
  // token and a fall mixes none of them (`sceneStops`, 0336): two yards under one light in one
  // colour read two ramps, and a key that could not tell them apart would hand the second yard the
  // first one's band — the disagreement between the band and the tile below is the one thing this
  // is read off the same stops to prevent. The detail is not here: `sceneStops` never reads it.
  const key = `${color}|${yard.scene}|${yard.light}|${yard.spread}`;
  const held = washes.get(canvas);
  if (held !== undefined && held.key === key) return held.pattern;
  const band = bandFor(canvas, yard, key);
  if (band === null) return null;
  const pattern = context.createPattern(band, "repeat");
  if (pattern === null) return null;
  washes.set(canvas, { pattern, key });
  return pattern;
}

/**
 * Lay the band over the finished picture: `source-atop`, so it lands only where the cut left ink
 * and the ground stays the ground, at the strength the field has travelled to, one span scaled to
 * `spread` picture widths and slid along by the phase. One `fillStyle` and one fill (0070), and
 * the context handed back exactly as it was found. A band at no strength lays nothing and builds
 * nothing, which is every halted yard.
 */
export function tintThrough(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  color: string,
  tint: Readonly<MoireTint>,
  yard: Readonly<YardScene>,
): void {
  if (tint.strength <= 0) return;
  const pattern = washOf(canvas, context, color, yard);
  if (pattern === null) return;
  const { width, height } = canvas;
  const span = tint.spread * width;
  rolled.a = span / TINT_TILE_PX;
  rolled.e = -tint.phase * span;
  pattern.setTransform(rolled);
  context.globalCompositeOperation = "source-atop";
  context.globalAlpha = tint.strength;
  context.fillStyle = pattern;
  context.fillRect(0, 0, width, height);
  context.globalAlpha = 1;
  context.globalCompositeOperation = "source-over";
}
