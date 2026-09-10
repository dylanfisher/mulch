/**
 * @role The screen a canvas is filled through: the tile for what it is *of*, this canvas's own
 *   pattern over it, and the five motions that move it — the band's roll, the crawl, the breath,
 *   the turn and the lean. A frame costs one `fillStyle` and no loop over anything (0070), because
 *   everything that is written a pixel at a time happens on the rebuild next door.
 *
 *   Nothing here carries a clock. The band rolls on the reference row's phase — the deck's own
 *   read position — and the other four motions each belong to the parameter whose fold claims them
 *   (0126, 0128), so a halted yard's screen stands exactly as still as its picture. All four move
 *   the tile as a whole: the lean was once per row drawn, and no row is drawn on its own any more.
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
import { SCENE_WIND_TERMS } from "@/lib/moireScene";
import { tunable } from "@/lib/moireTuning";
import type { YardScene } from "@/lib/yardScene";
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
 * so what they do to the lattice passes through square instead of sitting at one offset.
 */
const TURN_TURNS = tunable("screen.turn", 0.006, { min: 0, max: 0.05, step: 0.001 });
const BREATH_PX = tunable("screen.breath", 0.5, { min: 0, max: 3, step: 0.05 });

/**
 * How far the lattice leans, in the same turns. Once over the whole tile rather than once per row
 * drawn: no row is drawn on its own any more, so there is nothing for a per-row lean to be under
 * (0128 amended). It costs the matrix write it was already making and no longer costs a
 * `setTransform` and a `fillStyle` per row.
 */
const SHEAR_TURNS = tunable("screen.shear", 0.02, { min: 0, max: 0.1, step: 0.001 });

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
  tint: ScreenInk,
  yard: Readonly<YardScene>,
): CanvasPattern | null {
  const height = tilePx(canvas.height, rowPitch);
  // The hue itself and no longer where it lands on a scene's ramp: since 0332 the read is a
  // per-pixel offset on the ground rather than one position for the whole tile, so there is no
  // single read to key through and every step of the travel is its own tile.
  // `color` is load-bearing for a reason that is no longer obvious: none of its channels reach the
  // tile any more — the scene names all five stops and the caller's ink is the alpha alone — but it
  // is the computed `color` of the canvas (`viewOf`, src/ui/canvasSurface.ts), so it is the one
  // entry here the scheme moves, and every stop is resolved off that scheme (0332).
  // The yard's own reading is part of what a tile is *of*, so two yards in different fields hold
  // two tiles rather than one they fight over — and a name never changes, so a yard's three terms
  // move the key exactly once, when its picture is first drawn (0329).
  const key = `${color}|${height}|${pitch}|${rowPitch}|${tint.fringe}|${tint.disperse}|${tint.hue}|${tint.saturate}|${yard.scene}|${yard.light}|${yard.wind}|${tuneStamp()}`;
  const held = screens.get(canvas);
  if (held !== undefined && held.key === key) return held.pattern;
  const made = screenTile(key, beatPx(pitch), height, canvas, color, pitch, rowPitch, tint, yard);
  if (made === null) return null;
  const pattern = context.createPattern(made, "repeat");
  if (pattern === null) return null;
  screens.set(canvas, { pattern, key });
  return pattern;
}

/**
 * Set the ink every row will be filled with: the screen, moved to where the picture's own phases
 * have carried it, or the flat colour where the engine would not build one. Sub-pixel throughout,
 * and nothing rounded to whole device pixels as the roll once was — the beat between the lattice
 * and the pixels it lands on is the effect now, and a term rounded to whole pixels is precisely
 * the one with no beat left in it. Leaves `fillStyle` set to the screen, or to the flat colour
 * where the engine would not build one, which is the picture its caller drew before there was a
 * screen behind it.
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
  const pattern = screenOf(canvas, context, color, pitch, rowPitch, tinted, yard);
  if (pattern === null) return;
  // How far the yard's own adjective lets the field sway, on the two motions that are a sway: a
  // hushed yard breathes and leans a fraction of what a wild one does, and a still one all but
  // stands. The lean the same adjective bakes into the ground is the other half of the same
  // reading, and it is baked because what leans in a field is the field and not the light (0329).
  const sway = SCENE_WIND_TERMS[yard.wind].sway;
  // Each over the span the term comes round in, so every one of them arrives back where it left
  // rather than jumping: the band over the tile's own height, the crawl over one cell of the grid.
  rolled.f = bandTurns(rows) * tilePx(canvas.height, rowPitch);
  // And the wind on that same axis, added to the crawl rather than given one of its own: the crawl
  // sweeps a cell and comes back, and this is the same axis running one way — how far the standing
  // rack's own tail has blown the whole field (`windTravelInto`, src/ui/moireWind.ts, 0267). It is a
  // term on the transform and touches no key, so a field blowing all day bakes nothing (0129).
  rolled.e = (termTurns(rows, "crawl") + wind) * beatPx(pitch);
  turnedScale(
    rolled,
    1 + ((sway * BREATH_PX.value) / pitch) * Math.sin(TAU * termTurns(rows, "breath")),
    TAU * TURN_TURNS.value * Math.sin(TAU * termTurns(rows, "turn")),
  );
  // The lean, added to the term the turn already wrote: a skew on the tile as a whole, sweeping
  // through rest like the other three rather than sitting at one offset.
  rolled.c += sway * TAU * SHEAR_TURNS.value * Math.sin(TAU * termTurns(rows, "shear"));
  pattern.setTransform(rolled);
  context.fillStyle = pattern;
}
