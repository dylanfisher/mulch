/**
 * @role One tile of the screen the drift picture is filmed off: what it is made of — a grating on
 *   each axis, the beat those grids make with the camera's own into a lattice of blobs, the
 *   monitor's three channels across every cell and again across every blob, and one broad rolling
 *   band — the scene's own five stops resolved under the yard's air, and the one pass that writes
 *   the whole of it a pixel at a time. **The scene is the body of the picture and this screen is
 *   a shade laid over it** (0340, amending 0332): where on its ramp a pixel is read is the yard's
 *   name's business, the four terms here pull that read toward the field's own first stop by the
 *   film's share — and since 0345 the tile is written **a mark at a time**: a cell of the field is
 *   one of ten marks chosen by where its centre stands on the ramp, the mark's coverage is the
 *   alpha, and the page shows between marks. The sound's own gratings are still cut outside this
 *   file (`cutField`).
 *
 *   That pass runs on the rebuild — a resize, a scheme, a display, a knob an effect turns colour
 *   with, or a tuning slider a ground is baked under — and never on a frame (0129), which is why
 *   everything here allocates once and refills in place. **And the scene's own maths runs once per
 *   what the scene is of, not once per tile** (0344): the ink walks its ladders all the while a
 *   yard sounds, every step is a tile, and a tile is the scene's body read through the ink rather
 *   than the ground, the shade and the streaks run again.
 * @instead Where a tile is put and what moves it — the pattern, the roll, the crawl, the breath and
 *   the lean, each riding the phase of the parameter that claims it → src/ui/moireScreen.ts, which
 *   this split out of at the 800-line cap (0045, 0332) and which is this file's only caller in the
 *   painter. The ink the tile is keyed through → src/ui/moireScreenInk.ts. The grounds the scenes
 *   lay down → src/ui/scene/, and what a scene is → src/lib/moireScene.ts. The shade whatever the
 *   yard stands by casts over any of them → src/lib/moireStand.ts. The ramp a stop list is
 *   read through → src/lib/moireColour.ts.
 */
// One tile, written a pixel at a time, and every grating, lattice, band and ground below is a term
// of that one pass. Splitting it further would hand a helper the pixel loop's whole state on a path
// that must not allocate (0129). See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { DRIFT_REST, TAU, wrap } from "@/lib/moire";
import { type Ink, ramp } from "@/lib/moireColour";
import { GLYPH_COUNT, GLYPH_PHASE, markAt, markCoverage } from "@/lib/moireGlyph";
import { gratingKeep } from "@/lib/moireGrating";
import {
  type Scene,
  type SceneTerms,
  SCENE_LIGHT_TERMS,
  SCENE_RAMP_STOPS,
  SCENE_REACH_TERMS,
  SCENE_WIND_TERMS,
  sceneAxis,
  sceneCells,
  sceneRepeat,
} from "@/lib/moireScene";
import { standShade, standSpeck } from "@/lib/moireStand";
import { subscribeTuning, tunable } from "@/lib/moireTuning";
import { clamp, denormalize } from "@/lib/range";
import type { ScreenInk } from "@/lib/moire";
import type { YardScene } from "@/lib/yardScene";
import { hold } from "@/ui/driftTiles";
import { inkOf, sceneStops } from "@/ui/moireScreenStops";
import { sceneOf } from "@/ui/scene/scenes";

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
 * (0130, docs/boundaries.md). Registered there as `<color>`, or the scheme would arrive here
 * unresolved and the canvas would drop it without a word.
 */
const CHANNEL_TOKENS = ["--screen-red", "--screen-green", "--screen-blue"] as const;

/**
 * How far the yard's own hue travel carries the read off where the ground put it, in units of the
 * ramp. **A half**, which is one stop of five: the travel swings a half either side of
 * `DRIFT_REST.hue`, so a claim at either end moves the read by a quarter of the ramp and no further
 * ([0301](../../docs/decisions/0301-the-ink-orbits-a-ramp-of-five.md),
 * [0141](../../docs/decisions/0141-colour-is-something-an-effect-turns.md)). It was a whole ramp
 * when a scene was read once a tile and the read was the picture's only colour; a field that is
 * already two hues at full strength has one stop of travel to spend and not four (0332).
 */
const SCENE_HUE_REACH = 0.5;

/**
 * Where on the ramp a pixel whose ground stands at `ground` is read, at where the picture's hue has
 * travelled to. An offset on the ground and never a position of its own, so an effect claiming a
 * hue slides the whole field along its ramp rather than replacing what the field said.
 */
export const sceneHue = (ground: number, hue: number): number =>
  clamp(ground + SCENE_HUE_REACH * (hue - DRIFT_REST.hue), 0, 1);

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
export const CHANNEL_LAG = 1 / (2 * CHANNEL_TOKENS.length);

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
 * choice** — the tile is one beat cell wide and a whole number of them tall, so anything but an
 * integer here is a hue seam riding down a picture whose whole point is that its tile repeats
 * without one.
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
 * than multiplying the four again (principle 1). `build` is the exception and says so: it lifts
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
  Math.min(CHANNEL_TOKENS.length - 1, Math.floor((wrap(x, pitch) / pitch) * CHANNEL_TOKENS.length));

/**
 * The tiles built so far, by what they are of rather than by who asked: a screen is the same screen
 * on every canvas of the same height, colour, density and tint, and a rack card added or removed
 * remounts the strips — which under a cache keyed by the canvas rebuilt an identical tile every
 * time, measurably. Two heights are two entries rather than one slot they fight over, which is what
 * a per-canvas cache was for (0126). Capped, and the oldest goes.
 */
const tiles = new Map<string, HTMLCanvasElement>();

/**
 * Room for most of one drag's steps beside the height the other surface draws at. Not all of them:
 * a colour dimension has `DRIFT_STEPS` + 1 stops and two surfaces are two heights, so a long drag
 * still evicts — and because the oldest goes rather than the least used, the tile it evicts first
 * is the one every resting yard shares. What that costs is a rebuild on a later remount and never
 * one on a frame, which is `stepped` doing the work rather than this number.
 *
 * **Doubled for what moves a tint with no hand on it**: how washed a yard is carries `disperse`
 * across its own stops while it plays (0213), the age carries `hue`, and every one of them walks its
 * own ladder when a claim moves (`inkTravelInto`, 0266) — so a travel visits its stops in
 * turn rather than its two ends, and both surfaces of both yards visit them. Held together they cost a build apiece, once; evicted they would cost the
 * pixel loop on a frame, which is the one thing 0129 forbids. A tile is one beat wide, so the room
 * is a few kilobytes rather than a picture.
 *
 * **A fourth ladder walks it now** (0283): a standing pop saturates the ink, and pop's own Sheen is
 * declared into `hue` as well, so one drag of it walks two of these ladders at once. This room was
 * never enough to hold a whole travel — three ladders already asked more of it than it holds — and
 * what a miss costs is the build above on a later paint.
 *
 * **Doubled again for the orbit** (0301): the hue's ladder is `HUE_STEPS` rather than eight, and
 * the picture's rest walks it both ways all the while the yard sounds, so a full swing is up to
 * `2 · INK_WANDER · HUE_STEPS` stops visited twice an orbit — held, each is one build a session
 * and never one a frame. Still a few kilobytes: a tile is one beat wide.
 *
 * **And a scene is part of what a tile is of, so a rack of yards no longer shares one** (0329). Two
 * yards named for different plants, or under different airs, hold two tiles where before this they
 * held the same one — so this room is spent across as many `(scene, light, wind)` triples as the
 * page is showing, and the eviction that first evicted the tile every resting yard shared now
 * evicts a yard's own. What a miss costs is still the build below on a later paint and never one on
 * a frame: the tile is one beat wide, and the room is kilobytes.
 */
const TILE_CACHE = 48;

/**
 * How many times a tunable has moved since the page loaded. **Part of every tile's key**, because a
 * scene's numbers are read inside the build and nothing else in that key names them: without this,
 * a slider the bench argues a ground on would be inert here — the held pattern would answer for a
 * ground that is no longer what the scene draws, and the tiles map would hand back one baked under
 * the number before the move (`moireTuning.ts` @instead: a number a tile is baked under). One
 * counter and not the values themselves, because the key is written on the frame path and reading
 * a dozen handles there would allocate (0070).
 */
let tuned = 0;
subscribeTuning(() => {
  tuned += 1;
  tiles.clear();
  bodies.clear();
  fringes.clear();
});

/**
 * The scene's own body of a tile, baked once per what the *scene* is of and read by every tile of
 * it: where on its ramp each pixel stands, how far the shade over it and the film's four terms
 * pull that read back, and how bright a point stands there — three numbers a pixel, before the ink
 * has touched any of them. **This is the loop that costs**, the ground, the shade and the streaks,
 * and none of it moves with the ink: what walks while a yard sounds is the hue, the fringe, the
 * dispersion and the saturation (`inkTravelInto`, 0266, 0301), and every step of those was a whole
 * bake — measured at twenty to forty-six milliseconds apiece, three times a second, on the thread
 * the hand is on. Split so, a step re-reads this body and re-runs nothing of the scene.
 *
 * Room for both sizes of both yards a page shows with a little over: a body is three floats a
 * pixel and an overlay's is a megabyte, so this is the one cache here that is not kilobytes.
 */
const BODY_CACHE = 8;
const bodies = new Map<string, Float32Array>();

/**
 * And the three channels' lattices over one beat cell, baked once per how far the ink stands them
 * apart: the fringe repeats with the cell by construction (`channelKeep`), so a tile reads one cell
 * of it at `(x, y mod cell)` rather than running the three cosines at every pixel. A cell is
 * kilobytes.
 */
const FRINGE_CACHE = 16;
const fringes = new Map<string, Float32Array>();

/**
 * How many numbers a pixel of a body, and of a fringe cell, carries: the ground, the pull and the
 * point; or one multiplier per channel.
 */
const PER_PIXEL = 3;

/**
 * The body `terms` and `yard` describe, at `width` by `height`, under the film's `share`: the one
 * held, or one baked now. Everything the scene's maths reads is in the key and nothing the ink
 * moves is.
 */
function bodyOf(
  width: number,
  height: number,
  pitch: number,
  rowPitch: number,
  terms: SceneTerms,
  yard: Readonly<YardScene>,
  scene: Scene,
  share: number,
): Float32Array {
  const key = `${yard.scene}|${yard.wind}|${yard.reach}|${yard.stand}|${yard.specks}|${width}|${height}|${terms.seen}|${pitch}|${rowPitch}|${share}`;
  const held = bodies.get(key);
  if (held !== undefined) return held;
  const flock = yard.specks === "flock";
  const kept = yard.specks === "kept";
  const body = new Float32Array(width * height * PER_PIXEL);
  for (let y = 0; y < height; y++) {
    const down = rowKeep(y, rowPitch) * bandKeep(y, height);
    for (let x = 0; x < width; x++) {
      // How dark the film is here: the gratings, the lattice and the band, and nothing else — the
      // `screenKeep` product with its row half hoisted into `down` (0129). The scene spends none
      // of it: where the field stands is a colour and not an amount (0332).
      const keep = down * columnKeep(x, pitch) * blobKeep(x, y, pitch, rowPitch);
      const at = (y * width + x) * PER_PIXEL;
      // This pixel's own place on the scene's ramp, before the picture's hue has carried it.
      body[at] = scene.ground(x, y, terms);
      // And how far it is pulled toward the scene's own first stop, twice over: by whatever shade
      // the thing the yard stands by casts here, the wall, the steps, the grille or the mass, in
      // the field's own darkest ink and never as an object (0335); and then by the film's own
      // share of what its four terms take here, which is a shade over the field and no longer a
      // window cut in it (0340).
      body[at + 1] = (1 - standShade(x, y, terms)) * filmStand(keep, share);
      // And whatever bright points the name ends on — a flock of the scene's own or the one kept
      // thing at the foot of the shade.
      body[at + 2] = kept ? standSpeck(x, y, terms) : flock ? scene.specks(x, y, terms) : 0;
    }
  }
  return hold(bodies, key, body, BODY_CACHE);
}

/** One beat cell of the three channels' lattices, at how far apart the ink stands them. */
function fringeOf(pitch: number, rowPitch: number, spread: number, disperse: number): Float32Array {
  const key = `${pitch}|${rowPitch}|${spread}|${disperse}`;
  const held = fringes.get(key);
  if (held !== undefined) return held;
  const wide = beatPx(pitch);
  const deep = beatPx(rowPitch);
  const cell = new Float32Array(wide * deep * PER_PIXEL);
  for (let y = 0; y < deep; y++) {
    for (let x = 0; x < wide; x++) {
      const lit = channelFringe(x, y, pitch, rowPitch, spread, disperse);
      const at = (y * wide + x) * PER_PIXEL;
      cell[at] = lit[0];
      cell[at + 1] = lit[1];
      cell[at + 2] = lit[2];
    }
  }
  return hold(fringes, key, cell, FRINGE_CACHE);
}

/** How many times a tunable has moved, for the key its caller writes (`screenOf`). */
export const tuneStamp = (): number => tuned;

/**
 * The tile `key` names: the one already built, or one built now and held. The cache is here rather
 * than beside the key because a tile is what this file makes, and a caller that reached into the
 * map would be a second thing that decides when a build happens (principle 1).
 */
export function screenTile(
  key: string,
  width: number,
  height: number,
  canvas: HTMLCanvasElement,
  color: string,
  pitch: number,
  rowPitch: number,
  tint: Readonly<ScreenInk>,
  yard: Readonly<YardScene>,
  cell: number,
): HTMLCanvasElement | null {
  return (
    tiles.get(key) ?? build(key, width, height, canvas, color, pitch, rowPitch, tint, yard, cell)
  );
}

/** What a third of a cell does to each of the row's own channels, when no token says otherwise. */
const FLAT_GAIN: readonly [number, number, number] = [1, 1, 1];

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
function channelGain(lit: Ink, saturate: number): readonly [number, number, number] {
  const total = lit[0] + lit[1] + lit[2];
  if (total <= 0) return FLAT_GAIN;
  const pushed = channelMix(saturate);
  const rest = 1 - pushed;
  const share = pushed * CHANNEL_TOKENS.length;
  return [
    rest + (share * lit[0]) / total,
    rest + (share * lit[1]) / total,
    rest + (share * lit[2]) / total,
  ];
}

/**
 * The one ink a whole tile is read into: refilled by `ramp` at every pixel and written straight out
 * into the field, because the loop below runs width × height times and a build allocates a ramp and
 * no more (0129, 0070).
 */
const read: Ink = [0, 0, 0, 0];

/**
 * One tile, written a pixel at a time — the one loop over the pixels there is, and it runs on a
 * rebuild and never on a frame (0129). Every pixel is the scene's own ramp read **where that
 * pixel's ground stands on it**, pushed onto whichever of the three channels lights its third of
 * the cell, and shaded back by the gratings, the blob and the band crossing at that point.
 *
 * **The scene is the body of the picture and the screen is a shade over it** (0340, amending
 * 0332). What a yard's name says is which five stops the picture is read along and where on them
 * each pixel stands; the gratings, the beat they make and the rolling band pull that read toward
 * the field's own first stop by the film's share and take none of the alpha, so a canopy's grille
 * is dark leaf between lit leaf rather than a window onto the page, and a parameter that moved the
 * screen still moves the scene (0329). The three channels are a fringe on the colour and never
 * touched the alpha either (0130).
 *
 * The ink is one array refilled by `ramp` rather than one returned per pixel: this loop runs
 * width × height times and a build allocates a ramp and no more (0129, 0070).
 */
// oxlint-disable-next-line max-lines-per-function
function build(
  key: string,
  width: number,
  height: number,
  canvas: HTMLCanvasElement,
  color: string,
  pitch: number,
  rowPitch: number,
  tint: Readonly<ScreenInk>,
  yard: Readonly<YardScene>,
  cell: number,
): HTMLCanvasElement | null {
  const tile = document.createElement("canvas");
  tile.width = width;
  tile.height = height;
  const ink = tile.getContext("2d");
  if (ink === null) return null;
  const style = getComputedStyle(canvas);
  const scene = sceneOf(yard.scene);
  const terms: SceneTerms = {
    width,
    height,
    seen: Math.min(height, canvas.height),
    lean: SCENE_WIND_TERMS[yard.wind].lean,
    reach: SCENE_REACH_TERMS[yard.reach],
    stand: yard.stand,
  };
  // Resolved once a tile, as they were before the read moved into the loop: what costs per pixel is
  // the mix between two of them and never a `getComputedStyle`.
  const own = inkOf(color);
  const lift = sceneStops(scene, yard, style);
  const gains = CHANNEL_TOKENS.map((token) =>
    channelGain(inkOf(style.getPropertyValue(token).trim()), tint.saturate),
  );
  // How far a light that falls through the field slides the read up the scene's own ramp, and
  // nought where the air is a wash or the name says no air at all.
  const falling = yard.spread === "fall" ? SCENE_LIGHT_TERMS[yard.light].amount : 0;
  // Read once a tile and not once a pixel: the share is baked in, `tuneStamp()` keys the tile, and
  // a handle read in the pixel loop would be a property read three hundred thousand times (0070).
  const share = FILM_SHARE.value;
  // The scene's body and the channels' cell, both held across every tile of the same scene: what
  // this loop does per pixel is read the ink along the ramp and split it, and nothing heavier.
  const body = bodyOf(width, height, pitch, rowPitch, terms, yard, scene, share);
  const lattices = fringeOf(pitch, rowPitch, tint.fringe, tint.disperse);
  const deep = beatPx(rowPitch);
  // The lattice of marks (0345): a cell snapped on each axis so a whole number of them span the
  // tile and the pattern comes round (`sceneRepeat`), and the mark's four soft reads a quarter of
  // a device pixel apart. **A cell says everything it says once, and says the mean of it**: where
  // on the ramp it stands is the read — the ground under its shade, its air and its bright points
  // — averaged over every pixel in it, the box a lattice of marks reads its picture through. Not
  // its centre pixel, which reads a grating a cell's own pitch apart at one phase in every cell;
  // and not its brightest, which lights a cell a speck only grazes and turns a flock into a
  // blanket. A point smaller than a mark is a mark one step denser, which is what a point is at
  // this scale. So one colour and one mark from edge to edge, refilled once a cell row and not
  // once a pixel.
  const across = sceneRepeat(width, cell);
  const downCell = sceneRepeat(height, cell);
  const cols = sceneCells(width, cell);
  const blur = 0.25 / across;
  const phase = GLYPH_PHASE.value;
  const flat = GLYPH_FLAT.value;
  const mid = lift[Math.floor(SCENE_RAMP_STOPS / 2)] ?? [0, 0, 0, 0];
  const colOf = Int32Array.from({ length: width }, (_, x) =>
    Math.min(cols - 1, Math.floor(x / across)),
  );
  const uAt = Float32Array.from({ length: width }, (_, x) => (x % across) / across);
  const cellInk = new Float32Array(cols * PER_PIXEL);
  const cellMark = new Uint8Array(cols);
  let filled = -1;
  // The fall, once a row: strongest at the tile's top edge and nought at its foot — which on a
  // tile laid as a repeating pattern is its middle, because a fall down a picture that never
  // repeats is a bright line at every join (0334, `sceneAxis(y / height)`).
  const throughAt = Float32Array.from(
    { length: height },
    (_, y) => falling * sceneAxis(y / height),
  );
  // Which channel lights each column, resolved once a column rather than once a pixel.
  const gainAt = Array.from({ length: width }, (_, x) => gains[channelAt(x, pitch)] ?? FLAT_GAIN);
  const field = ink.createImageData(width, height);
  const pixels = field.data;
  for (let y = 0; y < height; y++) {
    const cellRow = Math.floor(y / downCell);
    if (cellRow !== filled) {
      filled = cellRow;
      const y0 = Math.floor(cellRow * downCell);
      const y1 = Math.min(height, Math.ceil((cellRow + 1) * downCell));
      for (let c = 0; c < cols; c++) {
        const x0 = Math.floor(c * across);
        const x1 = Math.min(width, Math.ceil((c + 1) * across));
        let sum = 0;
        for (let yy = y0; yy < y1; yy++) {
          const through = throughAt[yy] ?? 0;
          for (let xx = x0; xx < x1; xx++) {
            const into = (yy * width + xx) * PER_PIXEL;
            // Where on the ramp this pixel stands: its own place, carried along it by however far
            // the picture's own hue has travelled — and then pulled toward the scene's own first
            // stop by the shade and the film the body already holds (`bodyOf`). **After the
            // travel and not before it**, because a shadow a claimed colour could light is not a
            // shadow: the two ends of the travel would read a shaded band at the dark stop and at
            // the hot one, and the field's own shade would swing further than the field.
            const shaded = sceneHue(body[into] ?? 0, tint.hue) * (body[into + 1] ?? 0);
            // And how far up that ramp the air and the detail carry it: the light falling through
            // the field, and then whatever bright point the name ends on, lifted to the top stop
            // and read after the shade, because a speck in a shadow is a speck nobody put there.
            const air = shaded + (1 - shaded) * through;
            sum += air + (1 - air) * (body[into + 2] ?? 0);
          }
        }
        const stood = sum / Math.max(1, (y1 - y0) * (x1 - x0));
        const inked = ramp(lift, stood, read);
        // Pulled toward the ramp's middle stop by however flat the picture is asked to be; and
        // the mark: where the cell stands on its ramp, cut into as many steps as there are marks
        // and wrapped, so the ground and the peaks are sparse and the band between is dense.
        const at = c * PER_PIXEL;
        cellInk[at] = inked[0] + (mid[0] - inked[0]) * flat;
        cellInk[at + 1] = inked[1] + (mid[1] - inked[1]) * flat;
        cellInk[at + 2] = inked[2] + (mid[2] - inked[2]) * flat;
        cellMark[c] = markAt(stood, GLYPH_COUNT, phase);
      }
    }
    const v = (y - cellRow * downCell) / downCell;
    const lattice = (y % deep) * width;
    for (let x = 0; x < width; x++) {
      const col = colOf[x] ?? 0;
      const inked = col * PER_PIXEL;
      // Which colour its flanks are: three lattices a lag apart, each carrying its own channel of
      // the ink read above and never more of it than that ink had — one cell of them, repeated.
      const lit = (lattice + x) * PER_PIXEL;
      const gain = gainAt[x] ?? FLAT_GAIN;
      const at = (y * width + x) * 4;
      pixels[at] = (cellInk[inked] ?? 0) * gain[0] * (lattices[lit] ?? 1);
      pixels[at + 1] = (cellInk[inked + 1] ?? 0) * gain[1] * (lattices[lit + 1] ?? 1);
      pixels[at + 2] = (cellInk[inked + 2] ?? 0) * gain[2] * (lattices[lit + 2] ?? 1);
      // The alpha is the mark's coverage of the caller's whole (0345, amending 0340): how solid the
      // picture is still belongs to the surface it is on (0141), and what a mark leaves uncovered
      // is the page, which is the ground this lattice is written on. The screen's own four terms
      // still reach none of it: what they spend, they spend as darkness up on the read (0340).
      pixels[at + 3] = own[3] * markCoverage(cellMark[col] ?? 0, uAt[x] ?? 0, v, blur);
    }
  }
  ink.putImageData(field, 0, 0);
  tiles.set(key, tile);
  for (const oldest of tiles.keys()) {
    if (tiles.size <= TILE_CACHE) break;
    tiles.delete(oldest);
  }
  return tile;
}
