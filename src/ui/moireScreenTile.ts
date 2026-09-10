/**
 * @role One tile of the screen the drift picture is filmed off: what it is made of — a grating on
 *   each axis, the beat those grids make with the camera's own into a lattice of blobs, the
 *   monitor's three channels across every cell and again across every blob, and one broad rolling
 *   band — the scene's own five stops resolved under the yard's air, and the one pass that writes
 *   the whole of it a pixel at a time. **The scene is the colour and the film is the alpha**
 *   (0332): where on its ramp a pixel is read is the yard's name's business, and how much of it
 *   stands there is the film's alone.
 *
 *   That pass runs on the rebuild — a resize, a scheme, a display, a knob an effect turns colour
 *   with, or a tuning slider a ground is baked under — and never on a frame (0129), which is why
 *   everything here allocates once and refills in place.
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
import { gratingKeep } from "@/lib/moireGrating";
import {
  type Scene,
  type SceneTerms,
  SCENE_LIGHT_TERMS,
  SCENE_RAMP_STOPS,
  SCENE_REACH_TERMS,
  SCENE_WIND_TERMS,
  sceneAxis,
} from "@/lib/moireScene";
import { standShade, standSpeck } from "@/lib/moireStand";
import { subscribeTuning, tunable } from "@/lib/moireTuning";
import { clamp, denormalize } from "@/lib/range";
import type { ScreenInk } from "@/lib/moire";
import type { YardScene } from "@/lib/yardScene";
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
 * The least of the picture's ink the whole screen may leave standing, averaged over a tile. Its
 * terms reach a long way down where they cross, which is the point, but a screen that took most of
 * a row would be a grille with a picture behind it. Asserted in `moireScreen.test.ts` against what
 * the painter builds, so tuning any one term past what the picture carries fails here.
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
 * How much of a pixel the film leaves standing: the four keep terms eased toward one by the share,
 * applied **once to their product** and never per term, so the beat between the gratings survives
 * at every setting and only its depth moves. The one place the share is spent — the bench reads
 * this same function rather than restating it (principle 1).
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
 */
const CHANNEL_MIX = 0.16;

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
});

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
): HTMLCanvasElement | null {
  return tiles.get(key) ?? build(key, width, height, canvas, color, pitch, rowPitch, tint, yard);
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
 * The one pixel every colour is read through. Its own rather than a corner of the tile: the tile is
 * a hundred pixels by a thousand and lives on the GPU, and reading a pixel back off it brings the
 * whole of it down.
 */
let swatch: CanvasRenderingContext2D | null = null;

/**
 * What `css` actually is, as the four channels a pixel is written in — read back out of a pixel the
 * engine painted it into rather than parsed here. Any colour a token can hold is a colour the
 * canvas already knows how to lay down, and a painter with its own colour parser would be a second
 * reading of the theme (principle 1). A canvas that will not give a context back leaves the colour
 * black and transparent, which draws nothing rather than drawing a guess.
 */
export function inkOf(css: string): Ink {
  if (swatch === null) {
    const pixel = document.createElement("canvas");
    pixel.width = 1;
    pixel.height = 1;
    swatch = pixel.getContext("2d", { willReadFrequently: true });
  }
  if (swatch === null) return [0, 0, 0, 0];
  swatch.clearRect(0, 0, 1, 1);
  swatch.fillStyle = css;
  swatch.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0, a = 0] = swatch.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a];
}

/**
 * The one ink a whole tile is read into: refilled by `ramp` at every pixel and written straight out
 * into the field, because the loop below runs width × height times and a build allocates a ramp and
 * no more (0129, 0070).
 */
const read: Ink = [0, 0, 0, 0];

/** The five stops, resolved: one list refilled on a build, so a build allocates a ramp and no more. */
const stops: Ink[] = Array.from({ length: SCENE_RAMP_STOPS }, (): Ink => [0, 0, 0, 0]);

/**
 * The scene's own five stops, resolved and mixed toward the light the yard's air puts it under —
 * **when the air is one the field is stood in**. A light that falls *through* the field mixes no
 * stop at all: it is spent on where the read stands rather than on what colour is there, down the
 * tile from its top edge, and a stop mixed here as well would be that light paid for twice
 * (`build` below, 0324's two air words).
 * Refilled in place and handed back, for the reason every other matrix in this file is: this runs
 * on a build, and a build allocates a ramp and no more.
 *
 * Every one of the five is a token the scene names and none of them is the caller's own ink (0332):
 * a scene that wants the yard's own ink names the token the surface resolves it from, and the light
 * reaches that stop like any other, because an air is what the whole field is seen through and a
 * light that spared one stop would leave part of every yard the same colour under every sky.
 */
export function sceneStops(
  scene: Scene,
  yard: Readonly<YardScene>,
  style: CSSStyleDeclaration,
): readonly Ink[] {
  const light = SCENE_LIGHT_TERMS[yard.light];
  const wash = yard.spread === "wash" ? light.token : null;
  const lit = wash === null ? null : inkOf(style.getPropertyValue(wash).trim());
  scene.ramp.forEach((token, at) => {
    const stop = inkOf(style.getPropertyValue(token).trim());
    const own = stops[at] ?? [0, 0, 0, 0];
    for (const channel of [0, 1, 2, 3]) {
      const from = stop[channel] ?? 0;
      own[channel] = lit === null ? from : from + ((lit[channel] ?? 0) - from) * light.amount;
    }
    stops[at] = own;
  });
  return stops;
}

/**
 * One tile, written a pixel at a time — the one loop over the pixels there is, and it runs on a
 * rebuild and never on a frame (0129). Every pixel is the scene's own ramp read **where that
 * pixel's ground stands on it**, pushed onto whichever of the three channels lights its third of
 * the cell, and cut back by the gratings, the blob and the band crossing at that point.
 *
 * **The scene is the colour and the film is the alpha** (0332). What a yard's name says is which
 * five stops the picture is read along and where on them each pixel stands; the gratings, the beat
 * they make, the three channels and the rolling band are terms every scene reads and the only
 * things the alpha knows about — so a canopy goes as dark as its own stops allow without spending a
 * thing against `SCREEN_FLOOR`, and a parameter that moved the screen still moves the scene (0329).
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
  const flock = yard.specks === "flock";
  const kept = yard.specks === "kept";
  const field = ink.createImageData(width, height);
  const pixels = field.data;
  for (let y = 0; y < height; y++) {
    const down = rowKeep(y, rowPitch) * bandKeep(y, height);
    // The fall, once a row: strongest at the tile's top edge and nought at its foot — which on a
    // tile laid as a repeating pattern is its middle, because a fall down a picture that never
    // repeats is a bright line at every join (0334, `sceneAxis(y / height)`).
    const through = falling * sceneAxis(y / height);
    for (let x = 0; x < width; x++) {
      // How dark the film is here: the gratings, the lattice and the band, and nothing else. The
      // scene spends none of it — where the field stands is a colour and not an amount (0332).
      const keep = down * columnKeep(x, pitch) * blobKeep(x, y, pitch, rowPitch);
      // And which colour it is: this pixel's own place on the scene's ramp, carried along it by
      // however far the picture's own hue has travelled — and then pulled toward the scene's own
      // first stop by whatever shade the thing the yard stands by casts here: the wall, the steps,
      // the grille or the mass, in the field's own darkest ink and never as an object (0335).
      // **After the travel and not before it**, because a shadow a claimed colour could light is
      // not a shadow: the two ends of the travel would read a shaded band at the dark stop and at
      // the hot one, and the field's own shade would swing further than the field.
      const stood = sceneHue(scene.ground(x, y, terms), tint.hue) * (1 - standShade(x, y, terms));
      // And how far up that ramp the air and the detail carry it: the light falling through the
      // field, and then whatever bright points the name ends on — a flock of the scene's own or the
      // one kept thing at the foot of the shade, lifted to the top stop and read after the shade,
      // because a speck standing in a shadow is a speck nobody put there.
      const air = stood + (1 - stood) * through;
      const point = kept ? standSpeck(x, y, terms) : flock ? scene.specks(x, y, terms) : 0;
      const row = ramp(lift, air + (1 - air) * point, read);
      // Which colour its flanks are: three lattices a lag apart, each carrying its own channel of
      // the ink read above and never more of it than that ink had.
      const lit = channelFringe(x, y, pitch, rowPitch, tint.fringe, tint.disperse);
      const gain = gains[channelAt(x, pitch)] ?? FLAT_GAIN;
      const at = (y * width + x) * 4;
      pixels[at] = row[0] * gain[0] * lit[0];
      pixels[at + 1] = row[1] * gain[1] * lit[1];
      pixels[at + 2] = row[2] * gain[2] * lit[2];
      // The alpha stays the caller's, because how solid the picture is belongs to the surface it is
      // on and not to what colour it went (0141) — and of that, the film spends only its own share
      // (0339): at nought the scene stands solid and at one this is `own[3] * keep`, as before.
      pixels[at + 3] = own[3] * filmStand(keep, share);
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
