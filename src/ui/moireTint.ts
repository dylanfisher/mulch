/**
 * @role The bands of the ramp washed across the finished picture once a frame: how strong they lie
 *   over the screen's own ink, how many picture widths one pass of the ramp spans, and where along
 *   the picture it has swept to — three readings of the field travelled on the set beside the ink
 *   (0302) — and **one band per coloured row**, standing where its own row stands (0229), each one
 *   fill through the ink the cut left and never over the ground. No bake a frame: the band is one
 *   tile written once a colour and moved on its own transform, exactly as the screen is (0129,
 *   0070), and no row's hue reaches that tile's key. And, because the bands are the one place left
 *   where what a frame fills grows with what a rack holds, **the whole frame's ceiling on that**:
 *   `PICTURE_FILL_COVER`, the screen's own ink and every band it may lay over it (0369).
 * @instead The ramp itself, and the orbit the whole picture's ink runs on → src/lib/moireColour.ts
 *   and `sceneStops` in src/ui/moireScreenStops.ts, which this reads and never restates — the band is
 *   the yard's own scene's ramp, so the wash and the tile under it cannot disagree about what the
 *   ramp is (0329). The
 *   screen the band lies over → src/ui/moireScreen.ts. Where the reading rests → `MoireRowSet` in
 *   src/ui/moireRowsField.ts; keeping it across a rebuilt set → src/ui/moireCarry.ts.
 */
import {
  DRIFT_DISPERSE_REACH,
  DRIFT_REST,
  easedToward,
  type MoireRow,
  type ScreenInk,
} from "@/lib/moire";
import { standing } from "@/lib/moireArrival";
import { type Ink, ramp } from "@/lib/moireColour";
import { centreAcross } from "@/lib/moireGeometry";
import { heardLevel } from "@/lib/moireSound";
import { tunable } from "@/lib/moireTuning";
import { clamp, denormalize } from "@/lib/range";
import { sceneStops } from "@/ui/moireScreenStops";
import { sceneOf } from "@/lib/scene/scenes";
import type { YardScene } from "@/lib/yardScene";

/**
 * One coloured row's band: where on the picture its own row stands, how hard that row is working
 * right now, which ink it claims, and how much of the row is in the picture at all. All four are
 * the row's own per-frame reading and none of them is durable — `centre` already carries the throw
 * its pulse gives the row's anchor (0229, `driftedCentre`), so the band stands where the row does
 * rather than where its knob was set, and `share` is the row's arrival, so a colour joins and
 * leaves with the grating it names rather than six seconds ahead of it and a frame after it.
 */
export type MoireTintBand = { centre: number; pulse: number; hue: number; share: number };

/**
 * The bands as the field reads them: how strongly they lie over the ink on 0..1 and how many
 * picture widths one pass of the ramp there and back spans — those two being one screen's and no
 * row's — and **the row-side half**: one entry per coloured row standing, and how many of them are
 * lit this frame. The entries are a fixed array refilled in place and read up to `lit`, because the
 * read is per frame and allocates nothing (0070).
 */
export type MoireTint = {
  strength: number;
  spread: number;
  bands: MoireTintBand[];
  lit: number;
};

/**
 * How many coloured rows wash at once. A ceiling and not a target: a picture's rows are taken in
 * the order it holds them and the rest are dropped, because each band is a fill of its own and a
 * rack that grew a run of thirty would otherwise buy thirty (0070 bounds what a frame costs, and
 * this is the number that bounds it here). Eight is a full rack's instances and then some.
 */
export const TINT_BANDS = 8;

/**
 * How wide one row's band stands, as a share of the picture's width. Wide enough that a band reads
 * as a region of the picture being warm rather than as a stripe drawn on it, and narrow enough that
 * two rows a picture apart are two colours and not one mixture — the centres themselves only ever
 * land in the middle half of the picture (`CENTRE_INSET`, src/lib/moireGeometry.ts).
 */
export const TINT_BAND = tunable("colour.band", 0.4, { min: 0.05, max: 2, step: 0.05 });

/**
 * How much of the picture a frame may fill in all, counted in pictures and clipped to the picture:
 * the screen's own ink is one — laid in the strips the gust leans apart, which sum to the picture
 * (`inkThrough`, src/ui/moireScreen.ts) — and every lit band is at most one more, `colour.band` of
 * the picture wide and the whole of it deep, of which only the part over the canvas is filled. So
 * a full eight coloured rows is nine pictures of fill on one frame, and that is the ceiling.
 *
 * A reading of what a frame lays over the picture, against one declared budget, is what every
 * checkpoint in this block leaves behind (docs/plan.md §1); this is the last one's. It is a
 * **cover** and not a count, because what a band costs is the pixels it composites and not the call
 * that asks for them — the count of the bands themselves is `TINT_BANDS`, and that a row claiming
 * no colour lights none of them is asserted where 0368 put it. Checkpoint A bounded the stamp's own
 * picture-sized draws at one (`STAMP_PICTURE_DRAWS`, src/ui/moireCanvasMarks.ts, 0353) after thirty
 * picture-sized passes stopped the frame loop of a window 2560 × 1440 at two device pixels
 * outright; 0368 then put a fill per coloured row on the frame, which is the one place left where
 * what a frame fills grows with what a rack holds (0369).
 */
export const PICTURE_FILL_COVER = 1 + TINT_BANDS;

/**
 * How far a row at rest brings its own band down from the strength the field travelled to, as a
 * share — the same shape `TINT_LEVEL` has, one step further in: at nothing every coloured row
 * washes alike however hard it is working, and at one only a row at full pulse washes at all. Half,
 * so a coloured row standing quiet still carries its colour and a row surging brings it up.
 */
export const TINT_PULSE = tunable("colour.pulse", 0.5, { min: 0, max: 1, step: 0.05 });

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

/**
 * How many picture widths one pass of the ramp there and back spans on a yard whose channels have
 * not dispersed. Under one, so the strip — thousands wide — holds more than one whole ramp at once
 * and reads as colour changing along it rather than as one tint; a dispersed yard stretches it to
 * as much as twice this, so a washed picture holds less of the ramp at once and more of one stop.
 */
export const TINT_SPREAD = tunable("colour.spread", 0.6, { min: 0.1, max: 3, step: 0.05 });

/** How far the band's strength has to travel: one, a share having no further to go. */
const TINT_REACH = 1;

/**
 * Where the bands stand before the yard has sounded: at nothing, one resting span wide, and none of
 * them lit. The entries are built here once and refilled every frame after (0070).
 */
export const tintRest = (): MoireTint => ({
  strength: 0,
  spread: TINT_SPREAD.value,
  bands: Array.from({ length: TINT_BANDS }, () => ({
    centre: DRIFT_REST.centre,
    pulse: 0,
    hue: DRIFT_REST.hue,
    share: 0,
  })),
  lit: 0,
});

/**
 * One step of the band's travel. The strength is what the output's own level and the standing
 * rack's saturation ask for, on the ink's own rate (`DRIFT_INK_SECS`), so a loud transient swells
 * the colour rather than flashing it; the spread is the ink's travelled dispersion read straight,
 * that term having already walked its ladder (`inkTravelInto`); and which rows wash is read off the
 * rows themselves. **And nothing at all on a yard that is not sounding**: the strength's target is nought
 * and `over` is nought, so it arrives there outright and a halted picture is painted on a commit
 * in the screen's own ink (0144, 0266).
 *
 * Written in place: read once a picture on the frame path and allocates nothing (0070).
 */
export function tintTravelInto(
  tint: MoireTint,
  ink: Readonly<ScreenInk>,
  rows: readonly MoireRow[],
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
  tint.lit = litInto(tint.bands, rows);
}

/**
 * Which rows wash, refilled in place: a row standing in the picture and claiming a hue of its own,
 * and no other. Standing is the one test every reader of a row's claim opens with — a row not drawn
 * or wholly left would otherwise hold its colour on the picture for as long as the yard stood
 * unrebuilt (`standing`, src/lib/moireArrival.ts). The second guard is this step's own: a row
 * resting at `DRIFT_REST.hue` is in the picture's own ink and has claimed nothing, so it washes
 * nothing rather than laying the middle of the ramp over itself.
 *
 * Returns how many entries were filled. No allocation and no sort: the picture's own order, up to
 * `TINT_BANDS`.
 */
function litInto(bands: MoireTintBand[], rows: readonly MoireRow[]): number {
  let lit = 0;
  for (const row of rows) {
    if (lit >= bands.length) break;
    if (!standing(row)) continue;
    if (row.hue === DRIFT_REST.hue) continue;
    const band = bands[lit];
    if (band === undefined) break;
    band.centre = row.centre;
    band.pulse = row.pulse;
    band.hue = row.hue;
    band.share = clamp(row.arrival, 0, 1);
    lit++;
  }
  return lit;
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
 * Which stop of the ramp is written at a share `along` the tile, and where a stop is written in it —
 * one fact and its inverse, stated together because the band's own translation is that inverse: a
 * band slides the pattern so that `tileAlong(hue)` lands on its row's centre, and it would land on
 * the wrong ink if either were changed alone. Forward over the first half and back over the second,
 * so the two ends of the tile are the same stop.
 */
const rampAt = (along: number): number => (along < 0.5 ? 2 * along : 2 - 2 * along);
const tileAlong = (hue: number): number => hue / 2;

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
  // src/ui/moireScreenStops.ts): the band and the tile under it cannot disagree about what the ramp is.
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
    ramp(stops, rampAt(along), read);
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
 * What one of `lit` bands lays, so that the wash over a pixel every one of them covers is the
 * strength the field travelled to and no more. **The bands compose**: each is its own `source-atop`
 * fill, they are wider than a third of the picture and their centres are confined to the middle
 * half of it (`CENTRE_INSET`, src/lib/moireGeometry.ts), so three coloured rows already put two
 * bands over one pixel and eight put eight. Laid at the whole strength each, the screen's own ink
 * under them survives at `(1 - strength)` to the eighth — which is the band replacing the screen
 * and washing away the three channel lattices, the one thing `TINT_STRENGTH` is held under one to
 * prevent (0130). So each lays the share that composites back to it, and one band lays it whole.
 */
const bandStrength = (strength: number, lit: number): number =>
  lit <= 1 ? strength : 1 - (1 - strength) ** (1 / lit);

/**
 * Lay one band per coloured row over the finished picture: `source-atop`, so each lands only where
 * the cut left ink and the ground stays the ground, at the strength the field has travelled to
 * brought down by how hard that row is working, one span scaled to `spread` picture widths and slid
 * so that the row's own hue lands where the row stands (0229) — `hue / 2` being where a hue sits in
 * the tile, the ramp being read forward over its first half.
 *
 * One fill each, which is the count the picture's coloured rows
 * set and nothing else (0070). The context is handed back exactly as it was found. A band at no
 * strength lays nothing and builds nothing, which is every halted yard, and **so does a picture no
 * row has claimed a colour in** — the tile below is already in the ink the yard asked for, and a
 * wash of the middle of the ramp over it would say a colour nobody turned a knob for.
 */
export function tintThrough(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  color: string,
  tint: Readonly<MoireTint>,
  yard: Readonly<YardScene>,
): void {
  if (tint.strength <= 0 || tint.lit <= 0) return;
  const pattern = washOf(canvas, context, color, yard);
  if (pattern === null) return;
  const { width, height } = canvas;
  const span = tint.spread * width;
  const reach = TINT_BAND.value * width;
  const each = bandStrength(tint.strength, tint.lit);
  rolled.a = span / TINT_TILE_PX;
  context.globalCompositeOperation = "source-atop";
  for (let at = 0; at < tint.lit; at++) {
    const band = tint.bands[at];
    if (band === undefined) break;
    const centre = centreAcross(band.centre, width);
    rolled.e = centre - tileAlong(band.hue) * span;
    pattern.setTransform(rolled);
    // The style is set after the transform and once a band, not once for all of them: one pattern
    // object is moved between the fills, and the paint that reads it is the assignment's.
    context.fillStyle = pattern;
    context.globalAlpha =
      each * denormalize(band.pulse, 1 - TINT_PULSE.value, 1) * clamp(band.share, 0, 1);
    context.fillRect(centre - reach / 2, 0, reach, height);
  }
  context.globalAlpha = 1;
  context.globalCompositeOperation = "source-over";
}
