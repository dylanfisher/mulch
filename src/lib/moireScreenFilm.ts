/**
 * @role The film over the picture: the two gratings, the beat they make into a lattice of blobs, the
 *   three channels the monitor lights a cell through, the one broad rolling band, and the pitches
 *   all of them are measured on. Every term is a multiplier on the read and none of them touches the
 *   alpha — the scene is the body of the picture and this screen is a shade laid over it (0340,
 *   amending 0332). Nothing here holds a canvas, a token or a theme, which is what lets the bake
 *   that spends these terms run in a worker (0354).
 * @instead The tile these terms are spent into, a mark at a time → src/lib/moireScreenField.ts, and
 *   the caches and canvas around it → src/ui/moireScreenTile.ts. Where a tile is put and what moves
 *   it → src/ui/moireScreen.ts. Which stops a scene names → src/lib/scene/, under
 *   src/lib/moireScene.ts. The colours those stops resolve to, which need the theme →
 *   src/ui/moireScreenStops.ts.
 */
import { DRIFT_REST, TAU, wrap } from "@/lib/moire";
import type { Ink } from "@/lib/moireColour";
import { gratingKeep } from "@/lib/moireGrating";
import { sceneAxis } from "@/lib/moireScene";
import { beatTilePx } from "@/lib/moireScreenBeat";
import { tunable } from "@/lib/moireTuning";
import { denormalize } from "@/lib/range";

/**
 * How far apart the lit columns of the screen this picture is filmed off are, in CSS pixels. CSS
 * pixels for the reason `REFERENCE_BAND_PX` is: how coarse the screen looks is a proportion, and
 * one that moved with the display would draw a different screen on every screen. Never under two
 * device pixels, because a pitch of one is a lit column with nowhere to put its gap.
 */
const GRID_PX = 5;

/**
 * How far apart the screen's rows run, in the same pixels. Near the columns and deliberately not
 * equal to them, and far enough off that the floor under both cannot round the two together on a
 * coarse display: one pitch on both axes is a square mesh, and the lattice is two.
 */
const ROW_PX = 7;

/**
 * How deep the display's own gratings cut — the fine stripes, one per pitch on each axis.
 * Shallow, because this screen is no longer what carries the picture: the rows' own gratings are
 * (P93), and every one of these multiplies into all of them. Measured before that change, the
 * screen alone kept 0.37 of the ink and the picture kept 0.30 of what was left, which is a mean of
 * 0.111 — a yard drawn in a tenth of its own colour, and the reason these three are now a film
 * over the picture rather than a second one competing with it.
 */
const GRATING_DEPTH = 0.16;

/**
 * How deep the beat cuts: the blobs, and the thing the whole effect is for. Deeper than the
 * gratings that make it, because it is what the eye reads at a distance and they are what it reads
 * up close — and its own term rather than left to fall out of the two grids multiplied, which is
 * where it physically comes from but which buries it (0129).
 */
const BLOB_DEPTH = 0.22;

/** How much of the ink the rolling band takes at its darkest. */
const BAND_DEPTH = 0.16;

/**
 * The least of the picture's lightness the screen's shade may leave standing, averaged over a
 * tile. Its terms reach a long way down where they cross, which is the point, but a screen that
 * took most of a row would be a grille with a picture behind it. **Re-aimed by 0340 and not
 * re-chosen**: it was the least of the tile's alpha while the screen cut a window, and it is the
 * least of its lightness now the screen is a shade — the same number, asserted on the read.
 * Asserted in `moireScreen.test.ts` on the four terms and in `moireCanvasFilm.test.ts` on the
 * tile the painter builds, so tuning any one term past what the picture carries fails there.
 */
export const SCREEN_FLOOR = 0.6;

/**
 * How much of the picture the film may spend. One number for the whole film and not one per term:
 * four dials for one question is the water group's lesson (0333), and a share per scene would make
 * the film four films (0329). At one the tile is exactly what 0332 bakes; at nought the film
 * spends nothing and the tile is the scene solid, which is what the bench draws. **It rests at
 * 0.15**, which is where the shots argued the scene becomes the body of the picture: at a half
 * and at a quarter the zoomed bloom is still a pale comb with the poppies a stipple in it, and at
 * 0.15 the heads stand in their own colour with the beat still crawling over them (0339). A
 * session preference and never durable (0329), and the bench's own dial is this handle's range.
 */
export const FILM_SHARE = tunable("film.share", 0.15, { min: 0, max: 1, step: 0.05 });

/**
 * How far every mark's colour is pulled toward the ramp's middle stop: at nought each cell is read
 * in the ramp colour its ground stands at, and at one the whole picture is one ink and the ramp is
 * spent on which mark a cell gets and nothing else (0345). **It rests at one** (0346): the reference
 * this lattice was drawn against is one ink on a pale page, and read off the zoomed drift the
 * covered pixels at one average the scene's own middle stop — a bloom's red, a canopy's green —
 * where at nought they average a mud of all five. A scene keeps its ink and loses its gradient,
 * which in a lattice of marks was never legible: a mark is five pixels and a stop is a tone. The
 * cases that read the film's shade in colour pin this at nought, because that is what they read.
 */
export const GLYPH_FLAT = tunable("glyph.flat", 1, { min: 0, max: 1, step: 0.05 });

/**
 * How much of a pixel's read the film leaves standing: the four keep terms eased toward one by
 * the share, applied **once to their product** and never per term, so the beat between the
 * gratings survives at every setting and only its depth moves. Spent on the read and not on the
 * alpha since 0340 — a shade toward the field's own first stop, exactly as `standShade` is spent.
 * The one place the share is spent — the bench reads this same function rather than restating it
 * (principle 1).
 */
export const filmStand = (keep: number, share: number): number => 1 - share * (1 - keep);

/**
 * The screen's three lit channels, in the order they sit across one pitch. Token names and not
 * colours: what each one is lives in `src/ui/tokens.css`, which is still the only file that says
 * (0130, docs/boundaries.md). Registered there as `<color>`, or the scheme would arrive unresolved
 * and the canvas would drop it without a word. Named here beside the terms that spend the count,
 * the way a scene names its own stops (src/lib/scene/), and read off the theme where there is one
 * (`screenTile`, src/ui/moireScreenTile.ts).
 */
export const CHANNEL_TOKENS: readonly string[] = [
  "--screen-red",
  "--screen-green",
  "--screen-blue",
];

/** How many lit channels the screen has across one pitch: those tokens, counted and not restated. */
export const CHANNEL_COUNT = CHANNEL_TOKENS.length;

/**
 * How far a third of a cell is pushed onto its own channel. A subpixel neither tints the picture
 * nor filters it: it carries the picture's own amount of one channel and none of the other two, so
 * each third gains in its channel what it gives up in the others and the cell comes back to the
 * row's colour. What changes is that every edge lands on one channel first, which is the fringe
 * (0130).
 *
 * Far shallower than the 0.45 it was written at, and for the reason 0130 could not have known: the
 * picture under it was one broad ribbon then and is a field of fine gratings now (P93), so where
 * the fringe once caught a handful of edges it now catches every crest in the picture. At 0.45 the
 * yard read as red and green candy stripes rather than as its own ink — the cell still averaged
 * back to the row's colour, exactly as 0130 says, but nothing in the picture is as wide as a cell
 * any more.
 *
 * **Nought since the picture became a lattice of marks** (0346): a mark's stroke is a device pixel
 * and a cell's third is under two, so at 0.16 every stroke of every mark took a different channel
 * and the zoomed drift read as a rainbow grille where the reference is one ink. A standing pop
 * still pushes the split to `CHANNEL_MIX_FULL`, which is where the chromatic lattice lives now.
 */
const CHANNEL_MIX = 0;

/**
 * And how far a wholly saturated picture pushes it — where a standing pop's Sheen carries the same
 * split, on the ink's own travel and the ink's own steps (`looksSaturate`, src/ui/moireLooks.ts,
 * 0283). Twice the resting split, so a saturated yard is visibly more chromatic than a plain one
 * and the cell still averages back to the row's colour at either end (0130). Short of the 0.45 the
 * split was first written at and by a wide margin, because that number is the one this picture
 * already knows reads as candy stripes rather than as its own ink.
 */
const CHANNEL_MIX_FULL = 0.32;

/** How far a third of a cell is pushed onto its own channel, at how saturated the picture is. */
const channelMix = (saturate: number): number =>
  denormalize(saturate, CHANNEL_MIX, CHANNEL_MIX_FULL);

/**
 * How far apart the three channels' blob lattices stand, as a fraction of one beat cell. **This is
 * what stops the picture going one colour.** The subpixel split above is a fringe at the cell's own
 * scale — a third of five CSS pixels — so the eye integrates the three back into the row's ink at
 * any distance, and a yard drawn in one token reads as that token everywhere (0130 says the cell
 * averages back to the row's colour, and it does). A camera pointed at a monitor does not sample
 * the three channels at the same instant or the same place, so the blobs it photographs are
 * separated by channel: one edge of a blob is red and the far edge is blue. Standing each channel's
 * lattice a sixth of a cell back does that at the *blob's* scale rather than the subpixel's, which
 * is a scale nothing averages away — and the three still come back to the row's colour over a whole
 * cell, because what is taken from one channel is what the other two gain.
 */
export const CHANNEL_LAG = 1 / (2 * CHANNEL_COUNT);

/**
 * How deep the three channels' own lattices cut into each other. Far deeper than `BLOB_DEPTH`, and
 * on its own term rather than sharing it, because the two are answering different questions: how
 * bright a blob is, is one lattice, and a blob so dark it separated its channels this far would be
 * a hole. Nothing here reaches the alpha — this is entirely a division of the ink the row was
 * already going to be drawn in among the three channels it is made of.
 */
export const CHANNEL_FRINGE = 0.55;

/** The screen's pitch in device pixels on a display of `dpr`: what a tile is measured in. */
export const gridPitchPx = (dpr: number): number => Math.max(2, Math.round(GRID_PX * dpr));

/** The same for the rows, and never under two for the reason the columns are not. */
export const rowPitchPx = (dpr: number): number => Math.max(2, Math.round(ROW_PX * dpr));

/**
 * The span a grating of `pitch` and the camera grid one device pixel off it come back into step
 * over — the beat cell, and the size of a blob. One pixel apart because further apart is a cell
 * small enough to read as texture rather than as the lattice the reference shows. A whole number
 * by construction, so a tile this wide repeats with no seam in either grating or in their beat.
 */
export const beatPx = (pitch: number): number => pitch * (pitch + 1);

/**
 * And how wide a whole tile of the screen stands: that beat cell, grown to a whole number of the
 * second lattice's cells as well wherever the rack stands one (`beatTilePx`,
 * src/lib/moireScreenBeat.ts). How many beat cells that is falls out of the two pitches and is not
 * one number — seven at every whole display ratio, eleven at three halves, and one at four, where
 * the coarse cell already divides the beat. At a fold of nought it is the beat cell alone, which is
 * the tile 0350 shipped at the width it shipped: a picture with an empty rack pays nothing for a
 * lattice it does not draw, and every tile it holds is the size it always was.
 */
export const screenTilePx = (pitch: number, rowPitch: number, beat: number): number =>
  beat > 0 ? beatTilePx(beatPx(pitch), rowPitch) : beatPx(pitch);

/**
 * One grating's transmission at `at`, on `pitch`: a soft cosine rather than an unlit column, which
 * is why the crossings read as round blobs rather than as a mesh of squares. The cosine is
 * `gratingKeep`'s, which the picture under this screen is also built out of — one cosine in the
 * app, not a painter's private copy (principle 1).
 */
const grating = (at: number, pitch: number): number => gratingKeep(at, pitch, GRATING_DEPTH);

/** The ink kept at device column `x`: the display's own grating, one stripe per pitch. */
export const columnKeep = (x: number, pitch: number): number => grating(x, pitch);

/** The same across the rows, on their own pitch: the other axis of the same grid. */
export const rowKeep = (y: number, rowPitch: number): number => grating(y, rowPitch);

/**
 * The blob at (`x`, `y`): the beat the display's grid and the camera's, one device pixel apart,
 * make across `beatPx` on each axis — bright where both slow terms crest, dark where either
 * troughs, which is the round lattice the reference shows (0129). `lag` stands the whole lattice
 * back by that fraction of one beat cell on both axes and `depth` says how far it cuts: how bright
 * a blob is, is the one lattice at `BLOB_DEPTH`, and which colour its flanks are is three of them
 * a lag apart at `CHANNEL_FRINGE` (P99).
 */
export const blobKeep = (
  x: number,
  y: number,
  pitch: number,
  rowPitch: number,
  lag = 0,
  depth = BLOB_DEPTH,
): number =>
  blobFrom(sceneAxis(x / beatPx(pitch) - lag), sceneAxis(y / beatPx(rowPitch) - lag), depth);

/** What a lattice keeps where its two axes stand at `across` and `down`, cutting at `depth`. */
const blobFrom = (across: number, down: number, depth: number): number =>
  1 - depth * (1 - across * down);

/**
 * What the three channels do to the ink at (`x`, `y`): one blob lattice each, a lag apart, as a
 * multiplier per channel. **Never above one.** A pixel's channel is eight bits with a ceiling, and
 * an ink near it — the primary token is `rgb(254, 154, 0)` in the dark scheme — has no room to be
 * boosted: dividing the three by their mean pinned red flat across 47% of a tile, which is the
 * bright half of every blob and exactly the half the fringe is for. Divided by their own largest
 * instead, so the channel cresting here keeps all of its light and the other two give some up. Each
 * of the three crests equally often across a cell, so no hue is favoured and the fringe is a
 * fringe rather than a tint (0130) — what the cell loses is a little light, not its colour.
 *
 * Refilled in place and returned, the way this file's other matrices are: this is called once per
 * pixel of a tile rebuild. A caller that keeps the answer copies it.
 */
const fringe: [number, number, number] = [1, 1, 1];

/** One term crossfaded into another: what `disperse` moves each channel's lattice along. */
const mix = (from: number, to: number, amount: number): number => from + (to - from) * amount;

/**
 * One channel's own blob lattice at (`x`, `y`), given how far the three stand apart and how far
 * their pitches and angles have diverged (0141). The spread is a ratio on `CHANNEL_LAG`: at nothing
 * the three lattices sit on top of each other and the row is one flat hue, and at
 * `DRIFT_FRINGE_REACH` they stand a third of a cell apart, which is as far apart as three lattices
 * go before they begin closing again.
 *
 * `spread` is that ratio and `disperse` crossfades this channel away from the lattice the other two are on and onto one of its
 * own: its pitch multiplied by a whole number of cycles per cell and its axes leaned into each
 * other by a whole cell of the other. **Whole either way, and that is the constraint rather than a
 * choice** — the tile is a whole number of beat cells across and a whole number of them down, so
 * anything but an integer here is a hue seam riding down a picture whose whole point is that its
 * tile repeats without one.
 */
export const channelKeep = (
  x: number,
  y: number,
  pitch: number,
  rowPitch: number,
  channel: number,
  spread: number = DRIFT_REST.fringe,
  disperse: number = DRIFT_REST.disperse,
): number => {
  const lag = (channel - 1) * CHANNEL_LAG * spread;
  if (disperse <= 0) return blobKeep(x, y, pitch, rowPitch, lag, CHANNEL_FRINGE);
  const across = x / beatPx(pitch) - lag;
  const down = y / beatPx(rowPitch) - lag;
  const harmonic = channel + 1;
  const slope = channel - 1;
  return blobFrom(
    mix(sceneAxis(across), sceneAxis(harmonic * across + slope * down), disperse),
    mix(sceneAxis(down), sceneAxis(harmonic * down - slope * across), disperse),
    CHANNEL_FRINGE,
  );
};

export function channelFringe(
  x: number,
  y: number,
  pitch: number,
  rowPitch: number,
  spread: number = DRIFT_REST.fringe,
  disperse: number = DRIFT_REST.disperse,
): readonly [number, number, number] {
  const red = channelKeep(x, y, pitch, rowPitch, 0, spread, disperse);
  const green = channelKeep(x, y, pitch, rowPitch, 1, spread, disperse);
  const blue = channelKeep(x, y, pitch, rowPitch, 2, spread, disperse);
  const top = Math.max(red, green, blue);
  fringe[0] = red / top;
  fringe[1] = green / top;
  fringe[2] = blue / top;
  return fringe;
}

/**
 * The ink the rolling band leaves at device row `y` of a tile `height` tall — one whole cosine
 * across the tile, so a tile laid end to end comes back round rather than arriving as an edge. A
 * tile of no height is a tile with no band in it, which is the lattice alone.
 */
export const bandKeep = (y: number, height: number): number =>
  height > 0 ? 1 - BAND_DEPTH * (0.5 + 0.5 * Math.cos(TAU * (y / height))) : 1;

/**
 * How tall the tile is for a canvas of `height` device pixels: rounded up to a whole number of row
 * beat cells, never under one. Cells and not pitches, because the grating and the beat both have
 * to come round at the tile's end or the tile does not repeat — and the tile is shifted rather
 * than rebuilt, so what would be left is a seam riding down the picture once a cycle: the artefact
 * these terms are here instead of. Up rather than down, so a strip shorter than one cell still has
 * a whole lattice in it; what spills past the bottom is a screen larger than the window onto it.
 */
export const tilePx = (height: number, rowPitch: number): number =>
  Math.max(1, Math.ceil(height / beatPx(rowPitch))) * beatPx(rowPitch);

/** Both of the terms one device row of the tile carries: the lattice, under the band. */
export function scanKeep(y: number, rowPitch: number, height: number): number {
  return rowKeep(y, rowPitch) * bandKeep(y, height);
}

/**
 * And all four of them at one pixel of a tile `height` device pixels deep: how much of that pixel
 * the whole screen leaves standing before the share eases it. **The one statement of the
 * product** — the bench's own picture and every case that reads a trough go through this rather
 * than multiplying the four again (principle 1). `bodyRows` is the exception and says so: it lifts
 * `scanKeep` out to the row it belongs to, because a bake reads three hundred thousand pixels and
 * a row's two terms do not change across one (0129, 0070).
 */
export const screenKeep = (
  x: number,
  y: number,
  pitch: number,
  rowPitch: number,
  height: number,
): number => columnKeep(x, pitch) * scanKeep(y, rowPitch, height) * blobKeep(x, y, pitch, rowPitch);

/** Which of the three channels lights device column `x` of a cell of `pitch`. */
export const channelAt = (x: number, pitch: number): number =>
  Math.min(CHANNEL_COUNT - 1, Math.floor((wrap(x, pitch) / pitch) * CHANNEL_COUNT));

/** What a third of a cell does to each of the row's own channels, when no token says otherwise. */
export const FLAT_GAIN: readonly [number, number, number] = [1, 1, 1];

/**
 * What one lit channel does to the row's ink, as a multiplier per channel. The token says which
 * channel this third of the cell is and how pure it is; the gain is what a subpixel does, so the
 * three thirds average back to the colour that was sent (0130). A token with no light in it would
 * divide by nothing, and is the third that changes nothing rather than a pixel of no colour: a
 * missing fringe shows the wrong token where a blank screen would hide it.
 *
 * `saturate` is how far the split is pushed past where it rests, which is how saturated the standing
 * rack's looks ask this picture to be (0283). It moves how *pure* each third is and never what the
 * three of them average to, so a saturated cell is the same colour more strongly said.
 */
export function channelGain(lit: Ink, saturate: number): readonly [number, number, number] {
  const total = lit[0] + lit[1] + lit[2];
  if (total <= 0) return FLAT_GAIN;
  const pushed = channelMix(saturate);
  const rest = 1 - pushed;
  const share = pushed * CHANNEL_COUNT;
  return [
    rest + (share * lit[0]) / total,
    rest + (share * lit[1]) / total,
    rest + (share * lit[2]) / total,
  ];
}
