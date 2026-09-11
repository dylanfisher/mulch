/**
 * @role The screen a canvas is filled through: the tile for what it is *of*, this canvas's own
 *   pattern over it, and the six motions that move it — the band's roll, the crawl, the breath,
 *   the turn, the lean and the gust that travels across the lean. A frame costs one `fillStyle` per
 *   vertical strip the gust is read in and no loop over a pixel (0070), because everything that is
 *   written a pixel at a time happens on the rebuild next door.
 *
 *   Nothing here carries a clock. The band rolls on the reference row's phase — the deck's own
 *   read position — the four named in `SCREEN_TERMS` each belong to the parameter whose fold claims
 *   them (0126, 0128), and the gust rides the lean's own row rather than a sixth of anything, so a
 *   halted yard's screen stands exactly as still as its picture. All of them move the tile as a
 *   whole: the lean was once per row drawn, and no row is drawn on its own any more.
 * @instead The tile itself — the two gratings, the beat they make, the three channels, the band,
 *   the scene's own stops and the one pass that writes them into a pixel field →
 *   src/ui/moireScreenTile.ts, which this split out of at the 800-line hard cap (0045, 0332). The
 *   ink a tile is keyed through — which row's claim about colour a whole picture takes, how
 *   saturated a standing rack asks it to be, and the ladder each is rounded onto →
 *   src/ui/moireScreenInk.ts. The picture this is the ink for — one grating per row, and the field
 *   their product makes → src/ui/moireCanvas.ts, which is this file's only caller and which cuts
 *   every one of those gratings back out of what `inkThrough` lays down. What a row is, the fold it
 *   is drawn from, and the cosine both this file and that one are built out of → src/lib/moire.ts.
 */
import {
  DRIFT_DISPERSE_REACH,
  DRIFT_FRINGE_REACH,
  rowOffset,
  TAU,
  turnedScale,
  turnsOf,
  type ScreenInk,
  type MoireRow,
} from "@/lib/moire";
import type { MoireCells } from "@/lib/moireCells";
import { SCENE_WIND_TERMS } from "@/lib/moireScene";
import { tunable } from "@/lib/moireTuning";
import type { YardScene } from "@/lib/yardScene";
import { cellsKey, rackCells } from "@/ui/moireCells";
import type { MoireLook } from "@/ui/moireLooks";
import { screenInkRest, SCREEN_SATURATE_REACH, stepped, steppedHue } from "@/ui/moireScreenInk";
import {
  beatPx,
  gridPitchPx,
  rowPitchPx,
  screenTile,
  tilePx,
  tuneStamp,
} from "@/ui/moireScreenTile";
import { viewOf } from "@/ui/canvasSurface";

/**
 * How far the lattice turns off the picture's own axis, in turns of a circle, and how far its pitch
 * breathes, in device pixels. Both small, and both sweeping *through* rest rather than around it,
 * so what they do to the lattice passes through square instead of sitting at one offset. **Both
 * rest at nought since the picture became a lattice of marks** (0346): a stroke one device pixel
 * wide resampled under any turn or scale is two pixels at half strength, and measured on the zoomed
 * drift no pixel of the marks stood above half alpha until they rested here. The dials stay, for a
 * hand that wants the blur.
 */
const TURN_TURNS = tunable("screen.turn", 0, { min: 0, max: 0.05, step: 0.001 });
const BREATH_PX = tunable("screen.breath", 0, { min: 0, max: 3, step: 0.05 });

/**
 * How far the lattice leans, in the same turns. Once over the whole tile rather than once per row
 * drawn: no row is drawn on its own any more, so there is nothing for a per-row lean to be under
 * (0128 amended). It costs the matrix write it was already making and no longer costs a
 * `setTransform` and a `fillStyle` per row. At rest nought since 0346, for the turn's reason; the
 * gust rides this term, so a yard's gust is a lean only when a hand has asked for one.
 */
const SHEAR_TURNS = tunable("screen.shear", 0, { min: 0, max: 0.1, step: 0.001 });

/**
 * How many vertical strips the frame is filled in, so that the gust has somewhere to be read. The
 * wave is a lean that varies across the picture and a pattern transform is affine (0331), so the
 * only place a lean can vary with x is between one fill and the next: the tile is still one and
 * still built on a rebuild, and what a strip costs is a `setTransform`, a `fillStyle` and a
 * `fillRect` over its own share of the canvas — the same pixels the one fill covered, in more
 * calls (0070). It is also what shrinks the step between two strips at the boundary between them,
 * so the count is the knob and the amplitude is the yard's own reading.
 *
 * **The ceiling is the count the profile was run at and not one more.** Eight is what was measured
 * against one, interleaved, and a group's own push drives every knob in it to its wild end — so a
 * ceiling above the measurement is a gesture that spends a frame nobody timed (0338).
 *
 * A wind with no gust in it is filled once, which is the frame every picture drew before this: a
 * wave of nought amplitude has nowhere to be, and a canvas full of identical fills is every one
 * after the first spent drawing the picture the first one already drew.
 */
const WIND_STRIPS = tunable("wind.strips", 8, { min: 1, max: 8, step: 1 });

/**
 * How far apart two neighbouring strips may read the tile where they meet, as a share of one beat
 * cell of it. A constant beside the tunables and not one of them: it is not a taste, it is the
 * width at which a boundary stops being a lean and starts being a line, and a hand given a slider
 * for it would be given a slider that draws the grid the whole film is built to avoid (0334).
 */
const GUST_BREAK = 0.12;

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
 * What a screen is keyed by that is colour rather than shape: the travelled ink above, rounded onto
 * the ladder a tile may be keyed through. One object refilled, because it is read on the frame path
 * and a per-frame paint allocates nothing (0070).
 */
const tinted: ScreenInk = screenInkRest();

/** The pattern each canvas fills through — per canvas, because a pattern belongs to a context. */
const screens = new WeakMap<HTMLCanvasElement, { pattern: CanvasPattern; key: string }>();

/** The tile's transform, one object refilled: a per-frame paint allocates nothing (0070). */
const rolled = { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };

/**
 * The screen `canvas` is drawn through: the tile for what it is of, and this canvas's own pattern
 * over it. Nothing is built unless the colour, the height, the density or the tint has moved, so a
 * frame costs a `fillStyle` per strip of the gust and no bake (0070) — and the channel tokens are
 * read on a build for that same reason,
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
  tint: ScreenInk,
  yard: Readonly<YardScene>,
  cells: readonly MoireCells[],
): CanvasPattern | null {
  const height = tilePx(canvas.height, rowPitch);
  // And the cell the marks are written in: the screen's own column pitch, so a bit of a mark is a
  // whole device pixel on every display and the tile is a whole number of cells wide (0345, 0346).
  const cell = pitch;
  // The hue itself and no longer where it lands on a scene's ramp: since 0332 the read is a
  // per-pixel offset on the ground rather than one position for the whole tile, so there is no
  // single read to key through and every step of the travel is its own tile.
  // `color` is load-bearing for a reason that is no longer obvious: none of its channels reach the
  // tile any more — the scene names all five stops and the caller's ink is the alpha alone — but it
  // is the computed `color` of the canvas (`viewOf`, src/ui/canvasSurface.ts), so it is the one
  // entry here the scheme moves, and every stop is resolved off that scheme (0332).
  // The yard's own reading is part of what a tile is *of*, so two yards in different fields hold
  // two tiles rather than one they fight over — and a name never changes, so a yard's five terms
  // move the key exactly once, when its picture is first drawn (0329, 0335).
  // The canvas's own height stands beside the tile's, because two canvases whose heights snap to
  // one tile are two pictures now: what a stand's shade is placed against is what is shown of the
  // tile and not the whole of it (`seen`, src/lib/moireScene.ts, 0335).
  // And the passes the rack declares over the cells, stepped; none adds nothing (`cellsKey`, 0349).
  const key = `${color}|${height}|${canvas.height}|${pitch}|${rowPitch}|${tint.fringe}|${tint.disperse}|${tint.hue}|${tint.saturate}|${yard.scene}|${yard.light}|${yard.wind}|${yard.reach}|${yard.stand}|${yard.spread}|${yard.specks}|${cell}|${tuneStamp()}${cellsKey(cells)}`;
  const held = screens.get(canvas);
  if (held !== undefined && held.key === key) return held.pattern;
  const made = screenTile(
    key,
    beatPx(pitch),
    height,
    canvas,
    color,
    pitch,
    rowPitch,
    tint,
    yard,
    cell,
    cells,
  );
  if (made === null) return null;
  const pattern = context.createPattern(made, "repeat");
  if (pattern === null) return null;
  screens.set(canvas, { pattern, key });
  return pattern;
}

/**
 * Lay the ink every row will be cut out of over the whole canvas: the screen, moved to where the
 * picture's own phases have carried it, or the flat colour where the engine would not build one.
 * Sub-pixel in its turn, breath and lean, which rest at nought since 0346; its two translations are
 * rounded to whole cells of the marks, because the picture is a lattice fixed to the screen and the
 * beat is now between that lattice and the sound's cut through it, not between the tile and the
 * pixels it lands on.
 *
 * **The fill is this file's and no longer its caller's**, because a gust is a lean that varies
 * across the picture and the only place a lean can vary is between one fill and the next: the
 * canvas is filled in `WIND_STRIPS` vertical strips under a wind that gusts and once under one
 * that does not, and a caller filling the rectangle itself could only fill it flat. Leaves
 * `fillStyle` set to the screen, or to the flat colour where the engine would not build one, which
 * is the picture its caller drew before there was a screen behind it.
 *
 * `wind` is how far the standing rack's own tail has blown the whole field, in turns of one cell of
 * the grid (0267). The one term here that does not come back: every other motion of the screen is a
 * cycle of a row's own phase, and this is a reading of the population running one way.
 */
export function inkThrough(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  rows: readonly MoireRow[],
  color: string,
  ink: Readonly<ScreenInk>,
  wind: number,
  yard: Readonly<YardScene>,
  looks: readonly MoireLook[],
): void {
  context.fillStyle = color;
  const dpr = viewOf(canvas).devicePixelRatio;
  const pitch = gridPitchPx(dpr);
  const rowPitch = rowPitchPx(dpr);
  // Where the picture's ink has travelled to, rounded onto its own steps so a knob moves the tile
  // rather than rebuilding it a pixel at a time on every pointer move. The *travelled* value is
  // what is rounded, which is what makes a jump walk the ladder instead of cutting across it
  // (`inkTravelInto`): the stops are the same eight — the hue's own finer ones — and they are
  // visited one at a time.
  tinted.fringe = stepped(ink.fringe, DRIFT_FRINGE_REACH);
  tinted.disperse = stepped(ink.disperse, DRIFT_DISPERSE_REACH);
  tinted.hue = steppedHue(ink.hue);
  tinted.saturate = stepped(ink.saturate, SCREEN_SATURATE_REACH);
  // And what the rack does to the marks, stepped onto the same ladders (`rackCells`, 0349).
  const pattern = screenOf(canvas, context, color, pitch, rowPitch, tinted, yard, rackCells(looks));
  // No screen is the flat ink over the whole canvas, laid here rather than left for the caller: the
  // picture that engine draws is the one this file's caller drew before there was a screen behind
  // it, and it is one fill whatever the wind says.
  if (pattern === null) {
    context.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }
  // How far the yard's own adjective lets the field sway, on the two motions that are a sway: a
  // hushed yard breathes and leans a fraction of what a wild one does, and a still one all but
  // stands. The lean the same adjective bakes into the ground is the other half of the same
  // reading, and it is baked because what leans in a field is the field and not the light (0329).
  const sway = SCENE_WIND_TERMS[yard.wind].sway;
  // Each over the span the term comes round in, so every one of them arrives back where it left
  // rather than jumping: the band over the tile's own height, the crawl over one cell of the grid.
  // **On whole cells of the marks since 0346** — the lattice is fixed to the screen and what moves
  // through it steps a cell at a time, which is what the reference's fixed glyph grid does with the
  // picture flowing under it; and a stroke a pixel wide laid at a fraction of a pixel is two pixels
  // at half strength. The cell is the column pitch, so a whole cell is a whole pixel too.
  rolled.f = Math.round((bandTurns(rows) * tilePx(canvas.height, rowPitch)) / pitch) * pitch;
  // And the wind on that same axis, added to the crawl rather than given one of its own: the crawl
  // sweeps a cell and comes back, and this is the same axis running one way — how far the standing
  // rack's own tail has blown the whole field (`windTravelInto`, src/ui/moireWind.ts, 0267). It is a
  // term on the transform and touches no key, so a field blowing all day bakes nothing (0129).
  rolled.e = Math.round(((termTurns(rows, "crawl") + wind) * beatPx(pitch)) / pitch) * pitch;
  turnedScale(
    rolled,
    1 + ((sway * BREATH_PX.value) / pitch) * Math.sin(TAU * termTurns(rows, "breath")),
    TAU * TURN_TURNS.value * Math.sin(TAU * termTurns(rows, "turn")),
  );
  // The lean, added to the term the turn already wrote: a skew on the tile as a whole, sweeping
  // through rest like the other three rather than sitting at one offset.
  const shear = TAU * SHEAR_TURNS.value;
  const turns = termTurns(rows, "shear");
  const lean = rolled.c + sway * Math.sin(TAU * turns) * shear;
  // And the gust over it: the same shear again, read one strip of the wave further on in each
  // vertical strip of the picture, so the lean travels across the field instead of standing over
  // the whole of it. The wave comes round exactly once across the canvas — the strips sample one
  // whole turn of it, so a strip past the last edge would be the first again — and it travels on
  // the shear row's own phase, because
  // the screen has no clock of its own (0126) and a gust on a second one would blow across a
  // halted yard.
  const gust = SCENE_WIND_TERMS[yard.wind].gust;
  const strips = gust > 0 ? WIND_STRIPS.value : 1;
  // **The gust is bowed about the picture's middle and not about its top row.** A shear carries a
  // point by its own depth, so two strips leaned by different amounts read the same tile a step
  // apart at the boundary between them, and that step grows all the way down: anchored at the top
  // it is widest at the foot, which is a vertical break standing at the bottom of the picture.
  // Pivoted, the two strips agree across the middle and part by half as much at either edge — the
  // only term that cuts the break by construction, the other being the strip count itself.
  const pivot = canvas.height / 2;
  // **And the swing is bounded by the tile rather than by the wind alone.** Halving the break is
  // not bounding it: what the break costs is measured in the tile's own beat cell and the picture
  // is not always the same size, so the wildest wind that parts two strips by a thirtieth of a
  // cell on a rack strip parts them by most of one on a full-bleed overlay — seven vertical breaks
  // through the middle of the picture, which is the ruled grid 0334 refused. So the wave swings as
  // far as the yard's reading asks or as far as `GUST_BREAK` of a beat cell allows, whichever is
  // less. It binds only on a tall picture at a strong wind: a strip at rest is nowhere near it.
  const swing = 2 * Math.sin(Math.PI / strips) * pivot;
  const asked = gust * shear;
  const bowed = swing > 0 ? Math.min(asked, (GUST_BREAK * beatPx(pitch)) / swing) : asked;
  const crawl = rolled.e;
  let edge = 0;
  for (let at = 0; at < strips; at += 1) {
    // Rounded to whole device pixels at both ends, so the strips tile the canvas exactly: a
    // fractional edge would leave a hairline of cleared canvas between two fills.
    const next = Math.round(((at + 1) * canvas.width) / strips);
    const bow = bowed * Math.sin(TAU * (turns + at / strips));
    rolled.c = lean + bow;
    rolled.e = crawl - bow * pivot;
    pattern.setTransform(rolled);
    // Re-set on every strip, which is the cost this step is: one `fillStyle` a frame becomes one
    // a strip, and the tile behind all of them is still the one the cache answered with.
    context.fillStyle = pattern;
    context.fillRect(edge, 0, next - edge, canvas.height);
    edge = next;
  }
}
