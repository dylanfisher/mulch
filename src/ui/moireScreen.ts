/**
 * @role The screen the drift picture is filmed off: one repeating tile carrying what a camera
 *   pointed at a monitor actually shows — a grating on each axis, the beat those grids make with
 *   the camera's own into a lattice of blobs, the monitor's three channels across every cell and
 *   again across every blob — a lattice each, a lag apart, which is what stops a picture inked in
 *   one token reading as one hue — and one broad rolling band. The tile is a whole beat cell wide and is written a pixel at a time,
 *   because a beat is a low frequency no arrangement of fills can carry (0129); that pass runs on
 *   the rebuild — a resize, a scheme, a display, or a knob an effect turns colour with, rounded
 *   onto its own steps so it is a rebuild and not a frame (0141) — and a frame still costs one
 *   `fillStyle` and no loop over anything.
 *
 *   Nothing here carries a clock. The band rolls on the reference row's phase — the deck's own
 *   read position — and the other four motions each belong to the parameter whose fold claims them
 *   (0126, 0128), so a halted yard's screen stands exactly as still as its picture. All four move
 *   the tile as a whole: the lean was once per row drawn, and no row is drawn on its own any more.
 * @instead The picture this is the ink for — one grating per row, and the field their product
 *   makes → src/ui/moireCanvas.ts, which is this file's only caller and which cuts every one of
 *   those gratings back out of what `inkThrough` lays down. What a row is, the fold it is drawn
 *   from, and the cosine both this file and that one are built out of → src/lib/moire.ts.
 */
// Over the soft cap and well under the hard one: one tile, written a pixel at a time, and every
// grating, lattice and band below is a term of that one pass. Splitting it would hand a helper the
// pixel loop's whole state on a path that must not allocate (0129). See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import {
  cosTurn,
  DRIFT_DISPERSE_REACH,
  DRIFT_FRINGE_REACH,
  DRIFT_HUE_REACH,
  DRIFT_REST,
  DRIFT_STEPS,
  rowOffset,
  TAU,
  turnedScale,
  turnsOf,
  wrap,
  type MoireRow,
} from "@/lib/moire";
import { gratingKeep } from "@/lib/moireGrating";
import { washedToward } from "@/lib/moireSound";
import { snapToStep } from "@/lib/range";
import { viewOf } from "@/ui/canvasSurface";

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
 * The screen's three lit channels, in the order they sit across one pitch. Token names and not
 * colours: what each one is lives in `src/ui/tokens.css`, which is still the only file that says
 * (0130, docs/boundaries.md). Registered there as `<color>`, or the scheme would arrive here
 * unresolved and the canvas would drop it without a word.
 */
const CHANNEL_TOKENS = ["--screen-red", "--screen-green", "--screen-blue"] as const;

/**
 * The two inks the picture travels between, cool first. A second colour per scheme and the fourth
 * crossing of the colour boundary (docs/boundaries.md), taken deliberately and written down first
 * ([0141](../../docs/decisions/0141-colour-is-something-an-effect-turns.md)): the picture was one
 * resolved `text-*` token and a fringe over it, so every yard read as the same hue whatever it was
 * playing. Token names and not colours, for the reason `CHANNEL_TOKENS` are, and registered as
 * `<color>` beside them.
 */
const INK_TOKENS = ["--drift-cool", "--drift-hot"] as const;

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

/**
 * How far the lattice turns off the picture's own axis, in turns of a circle, and how far its pitch
 * breathes, in device pixels. Both small, and both sweeping *through* rest rather than around it,
 * so what they do to the lattice passes through square instead of sitting at one offset.
 */
const TURN_TURNS = 0.006;
const BREATH_PX = 0.5;

/**
 * How far the lattice leans, in the same turns. Once over the whole tile rather than once per row
 * drawn: no row is drawn on its own any more, so there is nothing for a per-row lean to be under
 * (0128 amended). It costs the matrix write it was already making and no longer costs a
 * `setTransform` and a `fillStyle` per row.
 */
const SHEAR_TURNS = 0.02;

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
  blobFrom(latticeAxis(x / beatPx(pitch) - lag), latticeAxis(y / beatPx(rowPitch) - lag), depth);

/**
 * How bright one axis of a lattice is at `turn` of its own beat cell: half of `cosTurn`, which is
 * the one cosine this app's gratings are built out of and not a painter's private copy of it.
 */
const latticeAxis = (turn: number): number => 0.5 + 0.5 * cosTurn(turn);

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
    mix(latticeAxis(across), latticeAxis(harmonic * across + slope * down), disperse),
    mix(latticeAxis(down), latticeAxis(harmonic * down - slope * across), disperse),
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
 * The motions the screen has, one entry each and named nowhere else. The band's roll is not among
 * them: that one is the reference row's, the deck's own read position (0126).
 */
export const SCREEN_TERMS = ["crawl", "turn", "breath", "shear"] as const;

export type ScreenTerm = (typeof SCREEN_TERMS)[number];

/**
 * Where the row that owns `term` stands in its cycle. Which row that is comes out of the fold the
 * parameter already carries: `rowOffset` spreads it across a turn to pick a waveform, and this
 * takes the same turn in as many slices as there are terms, so a parameter drives exactly one
 * motion and a rack of them drives all four against each other (0128).
 *
 * No row in a term's slice leaves that motion still, which is the answer rather than a fallback to
 * some other row's phase: nothing is automating it, so nothing is turning the lattice. The
 * reference row is skipped because it already owns the roll.
 */
export function termTurns(rows: readonly MoireRow[], term: ScreenTerm): number {
  const slot = SCREEN_TERMS.indexOf(term);
  for (const row of rows) {
    // A row with no depth of its own belongs to no parameter, so it turns no motion of the screen:
    // the field's own row is a reading spread over the picture, and a reading may not own one of
    // the four motions a parameter owns (0128, 0213).
    if (row.reference || row.period <= 0 || row.depth <= 0) continue;
    if (Math.floor(rowOffset(row.shape) * SCREEN_TERMS.length) !== slot) continue;
    return turnsOf(row);
  }
  return 0;
}

/**
 * Where the tile has rolled to, in turns of its own height. The picture's own motion carries it and
 * never a clock of its own: a halted yard is painted and not animated (0040), so a band on a second
 * clock would travel across a frozen picture, and there is no second frame loop to run one. The
 * reference row is the deck's read position, so the band drifts while the deck plays and stops
 * where it stops. Exactly one traverse per reference cycle, the only rate at which a band riding a
 * phase that wraps arrives back where it left — what beats against it is every other row, each on
 * its own period, which is the picture's whole subject.
 */
export function bandTurns(rows: readonly MoireRow[]): number {
  for (const row of rows) {
    // And never a row with no depth of its own: the session's layer is an axis so that it is never
    // fanned, but what the band rides has to be this deck's read position, and that row's phase is
    // the session's clock (`sessionInto`, src/ui/moireRowsField.ts, 0228).
    if (!row.reference || row.period <= 0 || row.depth <= 0) continue;
    return turnsOf(row);
  }
  return 0;
}

/**
 * The row that says the most about one thing a picture can only say once — the ink's three
 * lattices, or the lens the finished field is bent through: those are one tile and one field over
 * the whole picture, so unlike a pitch or a depth they cannot be per row. **The boldest claim
 * wins** rather than the mean or the first — an effect that says nothing leaves the picture where
 * it rests, and a mean would let it dilute the one that does, which is exactly the knob whose
 * travel these dimensions exist to spend (0141, 0142). A row with no period is not drawn and does
 * not vote.
 */
export function boldestRow(
  rows: readonly MoireRow[],
  pick: (row: MoireRow) => number,
  rest: number,
): MoireRow | null {
  let bold: MoireRow | null = null;
  for (const row of rows) {
    if (row.period <= 0) continue;
    if (Math.abs(pick(row) - rest) > Math.abs((bold === null ? rest : pick(bold)) - rest)) {
      bold = row;
    }
  }
  return bold;
}

/**
 * That row's own claim, or where the picture rests when every row does. The row itself is what the
 * lens the painter draws its slices through asks for — a slide has a phase, so it needs the row and
 * not only the amount — and the three colour readings below need the number alone.
 */
const boldest = (
  rows: readonly MoireRow[],
  pick: (row: MoireRow) => number,
  rest: number,
): number => {
  const bold = boldestRow(rows, pick, rest);
  return bold === null ? rest : pick(bold);
};

// Named here rather than written at each call, which would allocate a closure a frame (0070).
const fringeOf = (row: MoireRow): number => row.fringe;
const disperseOf = (row: MoireRow): number => row.disperse;
const hueOf = (row: MoireRow): number => row.hue;

/** How far apart the three channel lattices of this picture's screen stand. */
export const screenFringe = (rows: readonly MoireRow[]): number =>
  boldest(rows, fringeOf, DRIFT_REST.fringe);

/**
 * How far those three lattices' own pitches and angles have diverged: the boldest row's claim,
 * carried toward the reach by however washed the field has become — the one dimension of the screen
 * that moves with a reading rather than with a parameter, and it moves with the depth of every row
 * at once rather than with any one of them (0128, 0213).
 */
export const screenDisperse = (rows: readonly MoireRow[], wash: number): number =>
  washedToward(boldest(rows, disperseOf, DRIFT_REST.disperse), DRIFT_DISPERSE_REACH, wash);

/** Where between the picture's cool ink and its hot one this picture is drawn. */
export const screenHue = (rows: readonly MoireRow[]): number =>
  boldest(rows, hueOf, DRIFT_REST.hue);

/**
 * A knob-driven key rounded onto the ladder every tile in the picture is keyed through
 * (`DRIFT_STEPS`, src/lib/moire.ts). Exported because the picture's own tiles are keyed the same
 * way and by the same argument (0142): one fact about what may reach a tile, declared once
 * (principle 1).
 */
export const stepped = (value: number, reach: number): number =>
  snapToStep(value, 0, reach, reach / DRIFT_STEPS);

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
 * **Doubled for the wash**, which is the one thing that moves a tint with no hand on it: how washed
 * a yard is carries `disperse` across its own stops while it plays (0213), and both surfaces of
 * both yards visit them. Held together they cost a build apiece, once; evicted they would cost the
 * pixel loop on a frame, which is the one thing 0129 forbids. A tile is one beat wide, so the room
 * is a few kilobytes rather than a picture.
 */
const TILE_CACHE = 24;

/**
 * What a screen is set to that is colour rather than shape — one object refilled, because it is
 * read on the frame path and a per-frame paint allocates nothing (0070). Their per-row meanings
 * are in `src/lib/moire.ts`; these are the whole picture's, one tile being one screen.
 */
type Tint = { fringe: number; disperse: number; hue: number };

const tinted: Tint = {
  fringe: DRIFT_REST.fringe,
  disperse: DRIFT_REST.disperse,
  hue: DRIFT_REST.hue,
};

/** The pattern each canvas fills through — per canvas, because a pattern belongs to a context. */
const screens = new WeakMap<HTMLCanvasElement, { pattern: CanvasPattern; key: string }>();

/** The tile's transform, one object refilled: a per-frame paint allocates nothing (0070). */
const rolled = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/** One colour the theme resolved, as the four channels a pixel is written in. */
type Ink = [number, number, number, number];

/** What a third of a cell does to each of the row's own channels, when no token says otherwise. */
const FLAT_GAIN: readonly [number, number, number] = [1, 1, 1];

/**
 * What one lit channel does to the row's ink, as a multiplier per channel. The token says which
 * channel this third of the cell is and how pure it is; the gain is what a subpixel does, so the
 * three thirds average back to the colour that was sent (0130). A token with no light in it would
 * divide by nothing, and is the third that changes nothing rather than a pixel of no colour: a
 * missing fringe shows the wrong token where a blank screen would hide it.
 */
function channelGain(lit: Ink): readonly [number, number, number] {
  const total = lit[0] + lit[1] + lit[2];
  if (total <= 0) return FLAT_GAIN;
  const rest = 1 - CHANNEL_MIX;
  const share = CHANNEL_MIX * CHANNEL_TOKENS.length;
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
function inkOf(css: string): Ink {
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
 * The ink the picture is actually laid down in: the one its caller resolved, carried toward the
 * cool token or the hot one by however far a row's own value claimed. At rest it is the caller's
 * ink and neither token is read; at either end of a claiming knob's travel it is that token. The
 * alpha stays the caller's, because how solid the picture is belongs to the surface it is on and
 * not to what colour it went (0141).
 */
function towardInk(ink: Ink, style: CSSStyleDeclaration, hue: number): Ink {
  const amount = Math.min(1, Math.abs(hue - DRIFT_REST.hue) / DRIFT_REST.hue);
  if (amount <= 0) return ink;
  const toward = inkOf(
    style.getPropertyValue(hue > DRIFT_REST.hue ? INK_TOKENS[1] : INK_TOKENS[0]).trim(),
  );
  return [
    mix(ink[0], toward[0], amount),
    mix(ink[1], toward[1], amount),
    mix(ink[2], toward[2], amount),
    ink[3],
  ];
}

/**
 * The screen `canvas` is drawn through: the tile for what it is of, and this canvas's own pattern
 * over it. Nothing is built unless the colour, the height, the density or the tint has moved, so a
 * frame costs one `fillStyle` (0070) — and the channel tokens are read on a build for that same reason,
 * a `getComputedStyle` per frame being the style flush 0070 exists to keep out. The only thing
 * that moves those three is the scheme, which moves `color` with it, so the key catches them.
 *
 * A canvas whose engine hands back no tile context and no pattern is drawn in flat ink, which is
 * the picture this file's caller drew before the screen was over it.
 */
function screenOf(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  color: string,
  pitch: number,
  rowPitch: number,
  tint: Tint,
): CanvasPattern | null {
  const height = tilePx(canvas.height, rowPitch);
  const key = `${color}|${height}|${pitch}|${rowPitch}|${tint.fringe}|${tint.disperse}|${tint.hue}`;
  const held = screens.get(canvas);
  if (held !== undefined && held.key === key) return held.pattern;
  const width = beatPx(pitch);
  const made = tiles.get(key) ?? build(key, width, height, canvas, color, pitch, rowPitch, tint);
  if (made === null) return null;
  const pattern = context.createPattern(made, "repeat");
  if (pattern === null) return null;
  screens.set(canvas, { pattern, key });
  return pattern;
}

/**
 * One tile, written a pixel at a time — the one loop over the pixels there is, and it runs on a
 * rebuild and never on a frame (0129). Every pixel is the row's own ink, pushed onto whichever of
 * the three channels lights its third of the cell, and dimmed by the gratings, the blob and the
 * band crossing at that point.
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
  tint: Tint,
): HTMLCanvasElement | null {
  const tile = document.createElement("canvas");
  tile.width = width;
  tile.height = height;
  const ink = tile.getContext("2d");
  if (ink === null) return null;
  const style = getComputedStyle(canvas);
  const row = towardInk(inkOf(color), style, tint.hue);
  const gains = CHANNEL_TOKENS.map((token) =>
    channelGain(inkOf(style.getPropertyValue(token).trim())),
  );
  const field = ink.createImageData(width, height);
  const pixels = field.data;
  for (let y = 0; y < height; y++) {
    const down = rowKeep(y, rowPitch) * bandKeep(y, height);
    for (let x = 0; x < width; x++) {
      // How dark the blob is: one lattice, and the only one the alpha knows about.
      const keep = down * columnKeep(x, pitch) * blobKeep(x, y, pitch, rowPitch);
      // Which colour its flanks are: three lattices a lag apart, each carrying its own channel of
      // the row's ink and never more of it than the row had.
      const lit = channelFringe(x, y, pitch, rowPitch, tint.fringe, tint.disperse);
      const gain = gains[channelAt(x, pitch)] ?? FLAT_GAIN;
      const at = (y * width + x) * 4;
      pixels[at] = row[0] * gain[0] * lit[0];
      pixels[at + 1] = row[1] * gain[1] * lit[1];
      pixels[at + 2] = row[2] * gain[2] * lit[2];
      pixels[at + 3] = row[3] * keep;
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

/**
 * Set the ink every row will be filled with: the screen, moved to where the picture's own phases
 * have carried it, or the flat colour where the engine would not build one. Sub-pixel throughout,
 * and nothing rounded to whole device pixels as the roll once was — the beat between the lattice
 * and the pixels it lands on is the effect now, and a term rounded to whole pixels is precisely
 * the one with no beat left in it. Leaves `fillStyle` set to the screen, or to the flat colour
 * where the engine would not build one, which is the picture its caller drew before there was a
 * screen behind it.
 */
export function inkThrough(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  rows: readonly MoireRow[],
  color: string,
  wash: number,
): void {
  context.fillStyle = color;
  const dpr = viewOf(canvas).devicePixelRatio;
  const pitch = gridPitchPx(dpr);
  const rowPitch = rowPitchPx(dpr);
  // What the rows say about colour, rounded onto their own steps so a knob moves the tile rather
  // than rebuilding it a pixel at a time on every pointer move.
  tinted.fringe = stepped(screenFringe(rows), DRIFT_FRINGE_REACH);
  tinted.disperse = stepped(screenDisperse(rows, wash), DRIFT_DISPERSE_REACH);
  tinted.hue = stepped(screenHue(rows), DRIFT_HUE_REACH);
  const pattern = screenOf(canvas, context, color, pitch, rowPitch, tinted);
  if (pattern === null) return;
  // Each over the span the term comes round in, so every one of them arrives back where it left
  // rather than jumping: the band over the tile's own height, the crawl over one cell of the grid.
  rolled.f = bandTurns(rows) * tilePx(canvas.height, rowPitch);
  rolled.e = termTurns(rows, "crawl") * beatPx(pitch);
  turnedScale(
    rolled,
    1 + (BREATH_PX / pitch) * Math.sin(TAU * termTurns(rows, "breath")),
    TAU * TURN_TURNS * Math.sin(TAU * termTurns(rows, "turn")),
  );
  // The lean, added to the term the turn already wrote: a skew on the tile as a whole, sweeping
  // through rest like the other three rather than sitting at one offset.
  rolled.c += TAU * SHEAR_TURNS * Math.sin(TAU * termTurns(rows, "shear"));
  pattern.setTransform(rolled);
  context.fillStyle = pattern;
}
