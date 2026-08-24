/**
 * @role The shape of a row's own axis, for the rows that are not straight gratings: where a row is
 *   anchored on the picture, the coordinate its grating is cut along at a point — a straight line,
 *   a ring, a spoke or a spiral — the sweep a chirp bends that coordinate into, the motion each
 *   geometry's phase is carried by, and the slices the finished field is drawn back through. Pure
 *   maths: no canvas, no context, no clock.
 * @instead What a row is, the profile it is cut to and the pitch it is drawn at → src/lib/moire.ts,
 *   which this reads its geometries and its one cosine from and which never reads this. Cutting the
 *   gratings these describe, and the tiles the curved ones are baked into → src/ui/moireCanvas.ts.
 */
import { cosTurn, TAU, wrap, type DriftGeometry } from "./moire";
import { clamp } from "./range";

/**
 * How far in from the edges a row's anchor may be carried, as a fraction of the picture. A knob at
 * either end of its travel puts the anchor a quarter of the way in rather than in the corner: a
 * ring family centred outside the picture is a set of arcs indistinguishable from a coarse straight
 * grating, which is the one thing a curved row must not read as.
 */
export const CENTRE_INSET = 0.25;

/** Where a centre turn lands on an axis `span` device pixels long. */
export const centreAcross = (turn: number, span: number): number =>
  (CENTRE_INSET + (1 - 2 * CENTRE_INSET) * clamp(turn, 0, 1)) * span;

/**
 * The radius a curved row's pitch is stated at, in device pixels: a quarter of the picture's
 * diagonal. A ring family cut on the logarithm of the radius has no one pitch — that is what makes
 * it a family of rings rather than a comb bent round — so the pitch every other row is drawn at is
 * held at one radius and the rings open out either side of it.
 */
export const geometryRef = (width: number, height: number): number =>
  Math.max(1, Math.hypot(width, height) / 4);

/** How many rings one reference radius holds. The logarithm's own scale, in cycles. */
export const gratingRings = (pitch: number, ref: number): number => ref / Math.max(1, pitch);

/**
 * How many spokes a fan is cut into: enough that they stand a pitch apart at the reference radius.
 * A whole number, because a fan that does not close on itself has a seam down one side of it.
 */
export const gratingSpokes = (pitch: number, ref: number): number =>
  Math.max(1, Math.round((TAU * ref) / Math.max(1, pitch)));

/**
 * How close to its own anchor a curved row is read, in reference radii. The logarithm has no value
 * at the centre and every ring in the family crowds into the last pixel before it, so the anchor
 * itself is one flat disc rather than a point of infinite pitch.
 */
const MIN_RADIUS = 1 / 64;

/**
 * Where a point stands along a row's own axis, in cycles — the whole of what a geometry is, and the
 * one place any of them is a number. `u` and `v` are the point's offset from the row's anchor in
 * reference radii; `rings` and `spokes` are what its pitch comes to in each of the two curved
 * coordinates.
 *
 * A ring family is cut on the logarithm of the radius rather than on the radius itself, which is
 * what lets one baked tile carry every phase it will ever be drawn at: scaling a logarithm is
 * adding to it, so a row's motion is a zoom of a couple of percent and not a rebuild
 * ([0142](../../docs/decisions/0142-a-row-is-cut-on-a-coordinate-of-its-own.md)).
 */
export function geometryTurns(
  geometry: DriftGeometry,
  u: number,
  v: number,
  rings: number,
  spokes: number,
): number {
  if (geometry === "linear") return u * rings;
  const spoke = geometry === "radial" ? 0 : (spokes * Math.atan2(v, u)) / TAU;
  if (geometry === "fan") return spoke;
  return spoke + rings * Math.log(Math.max(Math.hypot(u, v), MIN_RADIUS));
}

/**
 * The chirp `cycles` cycles of a grating come to a fraction `t` of the way across a picture: the
 * same total count however hard it is swept — so the tile closes on itself — with the fringes
 * open through the middle of it and crowded at both edges. A chirp of nothing is the even comb it
 * bends.
 *
 * Swept on a sine rather than on a ramp, and that is the whole of why: a tile is repeated, so a
 * sweep whose *slope* does not close on itself as well as its value draws a hard kink in the
 * spacing wherever one copy of it meets the next — continuous in the fringes and discontinuous in
 * how far apart they stand, which reads as a line down the picture. A sine's slope comes back where
 * it left, at every edge and at every chirp.
 */
export const chirpTurns = (t: number, cycles: number, chirp: number): number =>
  cycles * (t + (chirp / TAU) * Math.sin(TAU * t));

/**
 * The zoom a ring family's phase is carried by: one turn of the row is one ring's spacing, which on
 * a logarithmic family is a scale rather than a slide. Never below one, because the tile is drawn
 * about the row's own anchor and a scale under one would leave the picture's far corner uncovered.
 */
export const geometryZoom = (geometry: DriftGeometry, turns: number, rings: number): number =>
  geometry === "linear" || geometry === "fan"
    ? 1
    : Math.exp((1 - wrap(turns, 1)) / Math.max(1, rings));

/**
 * How far a fan's apex wanders, in device pixels, to carry its phase. A fan is the one geometry a
 * scale does nothing to — it is the same fan at every size — so its phase is its apex travelling a
 * small circle instead, which sweeps every spoke past every point of the picture once a turn. The
 * circle is one pitch across, which is exactly one cycle at the reference radius.
 */
export const geometrySlideX = (geometry: DriftGeometry, turns: number, pitch: number): number =>
  geometry === "fan" ? pitch * cosTurn(turns) : 0;

/** The other half of that circle. A quarter turn behind is the sine of the same angle. */
export const geometrySlideY = (geometry: DriftGeometry, turns: number, pitch: number): number =>
  geometry === "fan" ? pitch * cosTurn(turns - 0.25) : 0;

/**
 * How far past the picture a curved row's tile is baked and drawn, as a ratio. The tile is the
 * picture's own size and is placed about an anchor inside it, so a hair over one covers every pixel
 * of it under the zoom and the wander above, and no more of one than that is resolution thrown
 * away.
 */
export const GEOMETRY_COVER = 1.05;

/**
 * How far past the picture one row's tile actually reaches: the ratio above, and room for the
 * wander on top of it for the one geometry that has one. A tile is placed about an anchor the
 * picture holds, so a scale of one already covers every pixel of it — everything past one here is
 * the row's own motion, and a tile that did not allow for it would draw an unerased band down
 * whichever edge the apex walked away from.
 */
export const geometryCover = (
  geometry: DriftGeometry,
  pitch: number,
  width: number,
  height: number,
): number =>
  GEOMETRY_COVER +
  (geometry === "fan" ? (2 * pitch) / (CENTRE_INSET * Math.max(1, Math.min(width, height))) : 0);

/**
 * How many slices the finished field is drawn back through, and how far the widest claim slides one
 * of them, as a fraction of the picture's width. Sixty-four is fine enough that the offsets read as
 * one continuous bend of the picture rather than as bands, and one drawImage each is the whole cost
 * of it.
 */
export const LENS_SLICES = 64;
export const LENS_SPAN = 0.05;

/** How far one slice of the field slides, as a fraction of its width: one wave down the picture. */
export const lensSlide = (amount: number, turns: number, slice: number, slices: number): number =>
  amount * LENS_SPAN * cosTurn(turns + slice / Math.max(1, slices));
