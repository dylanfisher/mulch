/**
 * @role The coordinate a fractal row's grating is cut along, and the seed it is cut from: the
 *   escape-time field of `z → z² + c` with an orbit trap through it, the folded coordinate a
 *   box-within-box family recurses on, and the five numbers a run of effects an automator is
 *   standing folds into. Pure arithmetic — no canvas, no clock, no context.
 * @instead The straight, ring, spoke and spiral coordinates this stands beside, and the pixel loop
 *   all of them are written through → src/lib/moireGeometry.ts, which reads this and which this
 *   never reads. What a row *is* → src/lib/moire.ts; how deep a stack of gratings cuts →
 *   src/lib/moireGrating.ts. How many scales one straight row is drawn at, which is the
 *   self-similarity built into the ink rather than into its axis → src/lib/moireOctaves.ts.
 */
import { fold } from "./copy.ts";
import { cosTurn, FOLD_SPENT, foldStop, type DriftGeometry } from "./moire.ts";
import { clamp, denormalize } from "./range.ts";

/**
 * As much of a run as a fractal row reads: every place standing, its own id and how far in it is.
 * Structural rather than the audio tier's own `GrownRun`, because lib may import nothing
 * (docs/map.md) — and it is the whole of what this needs.
 */
export type FractalRun = ReadonlyMap<
  string,
  readonly { readonly presence: number; readonly instance: string }[]
>;

/**
 * The two coordinates in this file, and whether a row is cut along one of them. **No effect claims
 * either** and none may (`DRIFT_GEOMETRIES`, src/lib/moire.ts): what an escape field or a folded
 * plane is a picture of is the whole population a run is standing, which belongs to the field and
 * to no plugin — so the one row cut along one of these is built beside the wash and the session's
 * (`fractalInto`, src/ui/moireRowsField.ts).
 */
export const FRACTAL_GEOMETRIES = ["escape", "nested"] as const satisfies readonly DriftGeometry[];

export const isFractalGeometry = (geometry: DriftGeometry): boolean =>
  FRACTAL_GEOMETRIES.some((named) => named === geometry);

/**
 * How many times the escape field is iterated before a point counts as never leaving. **The one
 * number this coordinate's cost is**: it is read once per pixel of a picture-sized tile, and that
 * tile is baked at most once a painting (`BAKES_PER_PAINTING`, src/ui/driftTiles.ts). Two dozen is
 * where the filigree along the boundary is finer than the lattice drawn over it — past that the
 * detail is smaller than a fringe and nothing in the picture can show it.
 */
export const FRACTAL_ITERATIONS = 48;

/**
 * How far a point must get before it counts as escaped, squared. **Large on purpose**: the smooth
 * iteration count below is only smooth when the bailout is well past the escape radius of two, and
 * at a bailout of two the bands stand in visible steps rather than in one continuous field.
 */
const FRACTAL_ESCAPE = 256;
const FRACTAL_ESCAPE_SQUARED = FRACTAL_ESCAPE * FRACTAL_ESCAPE;
const FRACTAL_LOG_ESCAPE = Math.log(FRACTAL_ESCAPE);

/**
 * How much of the orbit trap is added to the escape count. **It is what gives the inside of the set
 * a coordinate at all**: the escape count is flat everywhere the orbit never leaves, so without
 * this the whole interior is one unbroken window and the set reads as a shape pasted on rather than
 * as the picture's own structure. Added to both branches rather than swapped in for one, so the
 * coordinate is continuous across the boundary — the escape count tends to `FRACTAL_ITERATIONS` as
 * a point approaches the set from outside, and the trap is continuous everywhere.
 */
const FRACTAL_TRAP = 0.3;

/** The closest approach a trap is read at, so a point that lands on the origin has a coordinate. */
const FRACTAL_NEAR = 2 ** -12;

/**
 * How many fringes stand between one step of the escape count and the next. **An escape field has
 * no one pitch**, for the reason a ring family cut on a logarithm has none (`geometryRef`): the
 * count runs from nothing to `FRACTAL_ITERATIONS` across the picture whatever size that picture is,
 * so what says how fine the bands are is how many of them a whole escape is worth and not a spacing
 * in pixels. A half is a dozen bands across the field — the contour banding of the reference, fine
 * enough to beat against the lattice and coarse enough that the filigree along the boundary is not
 * crowded past what a pixel can hold.
 */
const FRACTAL_BAND_CYCLES = 30;

/**
 * How far a fractal row's picture reaches across the plane, in units per reference radius. A curved
 * row's own coordinates run to about two at the corners (`geometryRef`), so this stands the picture
 * a little over half a unit wide — which at the centres below is the boundary of the set filling
 * the picture rather than the whole set sitting small in the middle of it.
 */
const FRACTAL_SPAN = 0.35;

/**
 * Where the picture is stood on the plane, and how far the seed may carry it. **On the boundary of
 * the set and nowhere else, and that is measured rather than chosen.** The escape field is smooth
 * everywhere the orbit leaves quickly and flat everywhere it never leaves; the only place it has
 * structure is the boundary between those, and the boundary is a *curve* in a plane, so a centre
 * picked from a square lands off it almost always. Seeded off a Julia set's own `c` instead —
 * which was the first shape of this — a run drew a smooth sweep with no filigree in it at all,
 * because a `c` off the boundary is a dust or a disc and the band is mostly neither (0246).
 *
 * The rest is the seahorse valley: the notch between the cardioid and the first bulb, which is
 * boundary at every scale it is looked at. What the population carries is where along that notch
 * the picture stands, which is a different structure at every place and structure at all of them.
 */
const FRACTAL_REST_X = -0.745;
const FRACTAL_REST_Y = 0.113;
export const FRACTAL_WANDER = 0.03;
const FRACTAL_WANDER_STOPS = 9;

/**
 * How many times a nested row folds the plane into itself, and how many fringes stand between one
 * nesting level and the next.
 *
 * **A dozen fringes a level, and the count is the whole point.** At three the structure was a
 * dozen cycles across the picture and every other row was ninety — and two gratings that far apart
 * do not beat, they stack: a coarse shape laid over a fine weave, which is the thing a mask was
 * (`PITCH_COMPRESS`, src/lib/moireGrating.ts, 0131). At a dozen the levels stand about as far
 * apart as the lattice does, so the two *fringe* against each other and the boxes come out of the
 * interference rather than over it. That is what "the moiré is built into the structure" means and
 * it is a spacing, not a weight (0246).
 */
export const FRACTAL_FOLDS = 6;
export const FRACTAL_LEVEL_CYCLES = 12;

/**
 * How far each fold contracts what it folds. **Over one**, because a fold divides: this is the
 * scale from one nesting level out to the next, so a box at this ratio holds the next one inside
 * it with room for `FRACTAL_LEVEL_CYCLES` fringes between the two.
 */
export const FRACTAL_RATIO_BAND: readonly [number, number] = [1.35, 2.1];
const FRACTAL_RATIO_STOPS = 7;

/** And how far each fold turns the plane, in turns of a circle. */
export const FRACTAL_TURN_BAND: readonly [number, number] = [-0.25, 0.25];
const FRACTAL_TURN_STOPS = 8;

/**
 * How deep a fractal row cuts before anything has been heard, as its share of the depth every row
 * is cut at. **Under one, with the rest of the way left to the sound**: the row is one grating among
 * the picture's own (0131) and `gratingDepth` shares the picture's weight out over it like any
 * other, so this is where a dull output stands and `FRACTAL_BITE_CEILING` is where a sharp one
 * reaches. Equal to the ceiling it would leave the output nothing to say.
 */
export const FRACTAL_BITE = 0.7;

/**
 * How much of a rack has to be standing before the row cuts its whole share. **Two places**,
 * because that is `auto.least` — the smallest run an automator's own defaults ever hold
 * (src/audio/effects/automatorParams.ts). Under it the cut ramps, so a first arriving place fades
 * the structure in rather than stamping it on.
 */
export const FRACTAL_REACH = 2;

/**
 * How far apart the two copies of the structure are opened, as a ratio of their clocks. **Two and
 * not one, and this is the whole of what makes it a moiré rather than a picture of a fractal.** One
 * copy is a grating whose axis is a fractal, and it beats against the lattice — but the lattice is
 * straight, so what comes out is the weave gently bent. Two copies of the *same* structure at close
 * scales beat against **each other**, and the fringes of that are the structure's own shape at
 * every scale it holds: box against box, spiral against spiral (0131).
 *
 * Near one, for the reason every other beat in this picture is near one: two gratings only fringe
 * into something slow when their spacings are close (`PITCH_COMPRESS`, src/lib/moireGrating.ts). It
 * is a ratio of *periods* and not a scale applied at the bake, so the two copies open at slightly
 * different rates and their beat travels — the same way two rows on close periods have always made
 * one (0246).
 */
export const FRACTAL_BEAT = 1.11;

/** How far up a fold each read is taken from, above the bits src/lib/moire.ts spends. */
const FRACTAL_CX_SHIFT = FOLD_SPENT;
const FRACTAL_CY_SHIFT = FRACTAL_CX_SHIFT * FRACTAL_WANDER_STOPS;
const FRACTAL_RATIO_SHIFT = FRACTAL_CY_SHIFT * FRACTAL_WANDER_STOPS;
const FRACTAL_TURN_SHIFT = FRACTAL_RATIO_SHIFT * FRACTAL_RATIO_STOPS;

/**
 * The five numbers a fractal row is cut from — where the picture stands on the plane, how
 * far each level contracts, how far it turns, and how far into the structure the picture has opened.
 * Flat numbers rather than a shape of their own because every one of them rides through to a baked
 * tile's key and through a worker's own copy of the place it is baked at
 * (`DriftPlace`, src/lib/moireGeometry.ts).
 */
export type FractalSeed = {
  /** Where the picture stands on the plane — the escape field's centre, or the fold's own. */
  cx: number;
  cy: number;
  /** What one nesting level does to the next, as a scale over one. */
  ratio: number;
  /** And how far it turns it, in turns. */
  turn: number;
  /** How far the picture has opened into the structure, as a scale. Never at or below nothing. */
  zoom: number;
};

/** The seed a picture with nothing standing in it would be cut from, and never is. */
export const fractalRest = (): FractalSeed => ({
  cx: FRACTAL_REST_X,
  cy: FRACTAL_REST_Y,
  ratio: FRACTAL_RATIO_BAND[0],
  turn: 0,
  zoom: 1,
});

/**
 * The four resting halves of a seed into `out`, folded off the one number a row's identity already
 * is (0076) — one fold, independent slices, exactly as a rack card's period and its anchor are
 * drawn — and the opening its phase has carried it to.
 *
 * Written in place and answering nothing, because it is filled once a painting for the one row in
 * the picture that has a seed, and a painting allocates nothing (0070).
 */
export function fractalSeedInto(out: FractalSeed, seed: number, zoom: number): void {
  const stop = (shift: number, stops: number): number =>
    foldStop(seed, shift, stops) / Math.max(1, stops - 1);
  out.cx = FRACTAL_REST_X + FRACTAL_WANDER * (stop(FRACTAL_CX_SHIFT, FRACTAL_WANDER_STOPS) - 0.5);
  out.cy = FRACTAL_REST_Y + FRACTAL_WANDER * (stop(FRACTAL_CY_SHIFT, FRACTAL_WANDER_STOPS) - 0.5);
  out.ratio = denormalize(stop(FRACTAL_RATIO_SHIFT, FRACTAL_RATIO_STOPS), ...FRACTAL_RATIO_BAND);
  out.turn = denormalize(stop(FRACTAL_TURN_SHIFT, FRACTAL_TURN_STOPS), ...FRACTAL_TURN_BAND);
  out.zoom = zoom > 0 ? zoom : 1;
}

/** The same seed, allocated — what a caller with nowhere to put one asks for. */
export function fractalSeed(seed: number, zoom: number): FractalSeed {
  const out = fractalRest();
  fractalSeedInto(out, seed, zoom);
  return out;
}

/**
 * How much a rack is standing, whole: every place's presence, everywhere, added up. **The one
 * number "how busy is the rack" has**, because two of them would be two answers — a fractal row
 * reads it as how hard it cuts (`fractalCut`) and the row set reads it as how many scales every
 * straight row is drawn at (`spreadOctaves`, src/lib/moireOctaves.ts, 0244), and an automator whose
 * run cut the picture without spreading the rows would be one hand on two dials.
 *
 * Allocating nothing and answering a number, because it is walked once a painting (0070).
 */
export function runStanding(grown: FractalRun): number {
  let standing = 0;
  for (const held of grown.values()) {
    for (const place of held) standing += clamp(place.presence, 0, 1);
  }
  return standing;
}

/**
 * The identity a fractal row is folded from: every place standing anywhere in the rack, in the
 * order the read holds them. **The population and not one place of it** — the structure is what the
 * whole run is standing, so a run of six draws one set and the same six less one draws another.
 *
 * A word rather than an arithmetic mix, because that is what `fold` is for and what every other
 * identity in the picture is taken off (0076). Read once when the population turns over and never
 * on a frame (0204), which is the whole of why a row may be folded off a string at all.
 */
export function fractalShape(grown: FractalRun): number {
  let word = "the picture standing on";
  for (const held of grown.values()) {
    for (const place of held) {
      if (clamp(place.presence, 0, 1) > 0) word += ` ${place.instance}`;
    }
  }
  return fold(word);
}

/**
 * How hard a fractal row cuts, off how much of the rack is standing: nothing at all where nothing
 * is, and the whole of `bite` once `FRACTAL_REACH` places are up. Linear, because presence is
 * already the run's own ramp and a curve on top of it would be a second fade the ear cannot hear.
 */
export const fractalCut = (standing: number, bite = FRACTAL_BITE): number =>
  bite * clamp(standing / FRACTAL_REACH, 0, 1);

/**
 * How far into its own structure a fractal row opens across one turn of its cycle, as a scale, and
 * how many stops it opens through.
 *
 * **A breath and not a ramp**: the row is carried by its phase like every other row in the picture
 * (`turnsOf`), and a phase is a cycle — an opening that ramped would fall back to nothing every
 * time the phase came round, which is a jump the whole picture would blink on. Cut on a cosine, the
 * picture opens into the structure and closes back out of it, and its slope comes back where it
 * left. That is the expanding and the growing: the same set at every depth, and never the same
 * picture twice, because what it is opening *into* is folded off a population that moves.
 *
 * **Stepped**, for the reason a curved row's spacing is (`steppedRings`): the coordinate is baked
 * into a picture-sized tile, one bake a painting is the whole budget (`BAKES_PER_PAINTING`,
 * src/ui/driftTiles.ts), and an unstepped zoom would ask for one at every frame and take it from
 * every other curved row. Between two stops the structure is the same structure scaled, so what the
 * steps cost is nothing the eye can find.
 */
export const FRACTAL_OPENING = 4;
const FRACTAL_ZOOM_STEPS = 12;
export const fractalZoom = (turns: number): number =>
  FRACTAL_OPENING **
  (Math.round((0.5 - 0.5 * cosTurn(turns)) * FRACTAL_ZOOM_STEPS) / FRACTAL_ZOOM_STEPS);

/**
 * Where a point stands along an escape-time row's own axis, in cycles: the smooth iteration count
 * of `z → z² + c` taken with the *point itself* as `c`, with the orbit's own closest approach added
 * through it. `u` and `v` are the point's offset from the row's anchor in reference radii; the
 * picture is the plane the constant is read across, standing at `cx, cy` and `zoom` deep. It takes
 * no pitch, for the reason above (`FRACTAL_BAND_CYCLES`).
 *
 * **The whole of what makes this a grating rather than a picture of a set.** The count is a
 * continuous field over the plane — banded, it is the contour of the escape time — so cutting a
 * cosine along it draws fringes that trace the boundary's own filigree, and every other row in the
 * picture beats against those fringes exactly as two straight gratings beat (0131). Nothing here is
 * an outline and nothing is a mask: the set is the shape the lattice takes.
 *
 * The trap is added to both branches rather than standing in for one, so the coordinate is
 * continuous across the boundary: the escape count tends to `FRACTAL_ITERATIONS` as a point
 * approaches the set from outside, and the trap is continuous everywhere.
 */
export function escapeTurns(u: number, v: number, cx: number, cy: number, zoom: number): number {
  const span = FRACTAL_SPAN / Math.max(FRACTAL_NEAR, zoom);
  // The point *is* the parameter: the orbit starts at nothing and the picture is the plane the
  // constant is read across. Which is why nothing here has to land on an interesting value — the
  // interesting values are the picture, and the seed only says where it is standing.
  const px = cx + u * span;
  const py = cy + v * span;
  let zx = 0;
  let zy = 0;
  let trap = Number.POSITIVE_INFINITY;
  let count = FRACTAL_ITERATIONS;
  for (let step = 0; step < FRACTAL_ITERATIONS; step += 1) {
    const xx = zx * zx;
    const yy = zy * zy;
    const squared = xx + yy;
    // From the first *step* and not from the seed: the orbit starts at nothing, so a trap that
    // counted where it started would be nought at every pixel of the picture and the inside of the
    // set would be one flat window again — which is the thing the trap is here to prevent.
    if (step > 0 && squared < trap) trap = squared;
    if (squared > FRACTAL_ESCAPE_SQUARED) {
      // The smooth escape count: the step it left on, less the fraction of a step it overshot by.
      count = step + 1 - Math.log2(Math.log(squared) / (2 * FRACTAL_LOG_ESCAPE));
      break;
    }
    zy = 2 * zx * zy + py;
    zx = xx - yy + px;
  }
  const near = 0.5 * Math.log(Math.max(trap, FRACTAL_NEAR));
  // Banded on the *logarithm* of the count, which is the whole of why the contours read. The count
  // itself rises without bound as a point approaches the boundary, so bands cut evenly along it
  // crowd past a pixel there while the open plane gets two of them — measured, a tenth of the
  // picture moving by two whole fringes between neighbouring pixels, which is noise and not a
  // grating. A logarithm spaces them through the approach instead: even bands out in the open, and
  // still finer ones close in, which is the contour banding of the reference (0246).
  return FRACTAL_BAND_CYCLES * (Math.log1p(count) + FRACTAL_TRAP * near);
}

/**
 * How far a folded point may get before it counts as having left the structure. The fold expands,
 * so every point leaves eventually — where it leaves is which nesting level it belongs to, and that
 * is the coordinate.
 */
const FRACTAL_BOUND = 4;

/**
 * And where a point stands along a nested row's axis: how many times the plane can be folded into
 * itself — reflected into one quadrant, turned, opened out and carried — before the point has left
 * the structure altogether, plus the fraction of a fold it overshot by.
 *
 * **This is the box within box.** The fold is a reflection and an expansion, so the level a point
 * escapes at is a box inside the box the level before it escaped at, all the way down: one level is
 * exactly `FRACTAL_LEVEL_CYCLES` fringes wherever it stands and at whatever scale, so the structure
 * opens out from the middle of the picture and the same boxes are drawn at every scale it holds.
 * That is a *grating whose axis recurses*, and not a shape repeated.
 *
 * The reflection is what makes it a fractal rather than a spiral — `|x|` is the one map here that is
 * not invertible, so the levels are copies of each other rather than one continuous winding — and
 * the overshoot is what makes it continuous, so a grating cut along it draws no hard ring at any
 * level's edge (the same reason the escape count above is smoothed).
 *
 * It escapes *outward* rather than contracting inward, and that is measured rather than chosen: a
 * contracting fold read on the size of what it left carries every point in the picture to within a
 * hair of one fixed point, and the whole of it comes to **one fringe across the picture** — which
 * is a flat field with a fractal's arithmetic behind it and nothing to see (0246).
 */
export function nestedTurns(
  u: number,
  v: number,
  cx: number,
  cy: number,
  ratio: number,
  turn: number,
  zoom: number,
): number {
  const cos = cosTurn(turn);
  const sin = cosTurn(turn - 0.25);
  const step = Math.max(1 + FRACTAL_NEAR, ratio);
  let x = u * Math.max(FRACTAL_NEAR, zoom);
  let y = v * Math.max(FRACTAL_NEAR, zoom);
  let level = FRACTAL_FOLDS;
  for (let at = 0; at < FRACTAL_FOLDS; at += 1) {
    const folded = Math.abs(x);
    const under = Math.abs(y);
    x = (folded * cos - under * sin) * step - cx;
    y = (folded * sin + under * cos) * step - cy;
    const box = Math.max(Math.abs(x), Math.abs(y));
    if (box > FRACTAL_BOUND) {
      // The fraction of this fold the point went past the bound by, so the level is continuous.
      level = at + 1 - Math.log(box / FRACTAL_BOUND) / Math.log(step);
      break;
    }
  }
  return FRACTAL_LEVEL_CYCLES * level;
}
