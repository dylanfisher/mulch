/**
 * @role How a row is actually drawn: how deep a stack of gratings cuts so the picture weighs the
 *   same whatever a yard holds, how much light one grating lets through at a point, what angle a
 *   row's fold fans it to, and how far apart its fringes stand. The band every spacing in the
 *   picture is held inside lives here and has one owner.
 * @instead What a row *is*, and what a value reaches into it → src/lib/moire.ts. The pixel loop a
 *   curved row's tile is written through → src/lib/moireGeometry.ts.
 */
import { halfCosine, rowOffset, type MoireRow } from "./moire.ts";

/**
 * How much light a whole stack of gratings lets through on average — and so, since the picture is
 * one minus that, how much of it is a window rather than ink. Not a tuning: it is what
 * `gratingDepth` solves for, so how many rows a yard has does not say what the picture weighs.
 */
export const PICTURE_FLOOR = 0.3;

/**
 * How deep each of `count` gratings cuts, so that all of them multiplied leave `floor` of the ink
 * standing whatever `count` is. One grating keeps `1 - depth / 2` on average, so `count` of them
 * keep that to the power of `count`; this is that solved for the depth.
 *
 * Without it the picture's brightness would say how many rows a yard has — measured in headless
 * Chromium, five gratings at full depth leave 3% of the ink standing and eight leave 0.4%, which
 * is a black rectangle. It is also the answer to the depth² objection that kept the beat out of
 * the screen (0129): that held while a picture had to survive underneath the gratings, and here
 * the gratings *are* the picture. Measured across two to twelve rows, the field's mean holds at
 * the floor and the beat's own swing does not fall with it.
 *
 * Never past one: a grating cannot cut deeper than its own trough. A picture of one row is
 * therefore lighter than the floor, which is right — one grating has nothing to beat against.
 *
 * What this solves is the share the *count* takes, which is the part a yard's contents must not
 * say. A row then cuts its own fraction of that share (`MoireRow.depth`, 0139), so a yard whose
 * effects are turned down sits above the floor — that is the effect being heard less, which is a
 * thing the picture is supposed to say, where the number of rows is not.
 */
export const gratingDepth = (count: number, floor = PICTURE_FLOOR): number =>
  Math.min(1, 2 * (1 - floor ** (1 / Math.max(1, count))));

/**
 * One grating's transmission `at` a distance along its own axis, on `pitch`, cutting `depth`: a
 * soft cosine rather than an unlit bar, which is why crossings read as round blobs and not as a
 * mesh of squares. Here rather than in either painter because the picture and the screen over it
 * are both built out of these, and two copies would drift apart the first time one was tightened
 * (principle 1).
 */
export const gratingKeep = (at: number, pitch: number, depth: number): number =>
  1 - depth * halfCosine(at / pitch);

/** How wide a fan the picture's gratings are spread through, in turns of a circle. */
const FAN_TURNS = 0.05;

/**
 * How far off the reference axis a row's grating lies, in turns. The fold spreads the row through
 * the fan exactly as it used to spread it through the waveforms, and as 0128 slices the same turn
 * to hand out the screen's motions — so a row's angle is its parameter's identity, and two
 * parameters cross at an angle neither of them picked.
 *
 * A reference row is an axis itself and is never fanned: it is what the others are read
 * against, which is the whole of what being the reference means now that no row is drawn on top of
 * another. Two rows carry the flag — the loop's, which the band also rolls on, and the session's
 * own, which lies along it and beats against it rather than crossing it (`sessionInto`,
 * src/ui/moireRowsField.ts).
 */
export const gratingTurns = (row: MoireRow): number =>
  row.reference ? 0 : (rowOffset(row.shape) - 0.5) * FAN_TURNS;

/**
 * The pitch a lattice reads best at, in CSS pixels, and the most a period may move it either way,
 * as a ratio. CSS pixels for the reason `GRID_PX` is: how coarse the lattice looks is a
 * proportion, and one that moved with the display would draw a different picture on every screen.
 */
const PITCH_PX = 7;
export const PITCH_SPREAD = 2;

/**
 * The ratio that puts a row at the coarse end of that band whatever its period: `gratingPitch`
 * multiplies a row's own ratio into the spacing its period sets and clamps the product to the band,
 * so a ratio of the band's own spread lands at the top of it from anywhere inside. The broadest a
 * row is ever drawn, which is what the field's own row is drawn at so that what it makes with the
 * rest is a larger moiré over their small ones rather than a second hatch among them (0213).
 */
export const DRIFT_BROADEST_PITCH = PITCH_SPREAD;

/**
 * How much of the window's own spread of pitches survives into the picture. **Two gratings only
 * beat into something slow when their pitches are close**: at ten and eleven pixels they come back
 * into step over a hundred and ten, and at ten and a hundred and sixty they come back over eleven,
 * which is not a lattice but a second hatch. A yard's periods span better than tenfold — three
 * quarters of a second against twelve — and carried straight across the canvas they draw exactly
 * that: a fine comb over a coarse one, with no fringe anywhere in it. Measured in the real app,
 * which is the only way this was going to be found.
 */
const PITCH_COMPRESS = 0.25;

/**
 * How far apart one row's fringes stand, in device pixels. The window still carries the row's
 * period across the canvas — a row that comes round often is drawn finer than a slow one, and the
 * order is never disturbed — but the spread of it is pulled into the band a lattice actually
 * happens in, and clamped there. So what two rows beat into is still the ratio of their periods,
 * and it is now a ratio near enough one to be seen.
 *
 * `ratio` is what the row's own effect is set to, where the period is what the deck is running
 * (0139) — it moves the row inside the band rather than out of it, which is why it is an argument
 * here rather than a multiplication at the call site: the band has one owner.
 *
 * The band's own floor is what keeps a grating off the pixel grid: nothing here is ever drawn
 * finer than `PITCH_PX / PITCH_SPREAD`, which is why this needs no separate bound to decline a
 * tightening the pixels could not carry (0098 amended).
 */
/**
 * The finest a row is ever drawn, in device pixels — the floor of the band above, named so that a
 * row whose spacing is swept across the picture can be held to the same floor at its crowded end
 * rather than sweeping through it (0142).
 */
export const gratingFloor = (dpr: number): number => (PITCH_PX * Math.max(1, dpr)) / PITCH_SPREAD;

export const gratingPitch = (
  period: number,
  windowSecs: number,
  width: number,
  dpr: number,
  ratio = 1,
): number => {
  const middle = PITCH_PX * Math.max(1, dpr);
  const band = (pitch: number): number =>
    Math.min(middle * PITCH_SPREAD, Math.max(middle / PITCH_SPREAD, pitch));
  if (!(period > 0) || !(windowSecs > 0) || !(width > 0)) return band(middle * ratio);
  const across = (width * period) / windowSecs;
  return band(middle * (across / middle) ** PITCH_COMPRESS * ratio);
};
