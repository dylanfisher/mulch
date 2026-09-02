/**
 * @role The shape of a row's own axis, for the rows that are not straight gratings: where a row is
 *   anchored on the picture, the coordinate its grating is cut along at a point — a straight line,
 *   a ring, a spoke, a spiral, or one of the two a fractal has — the sweep a chirp bends that
 *   coordinate into, the motion each geometry's phase is carried by, and the slices the finished
 *   field is drawn back through. Pure maths: no canvas, no context, no clock.
 * @instead The two fractal coordinates themselves and the seed they are cut from →
 *   src/lib/moireFractal.ts, which this reads and which never reads this. What a row is, the profile
 *   it is cut to and the pitch it is drawn at → src/lib/moire.ts,
 *   which this reads its geometries, its profiles and its one cosine from and which never reads
 *   this. Cutting the gratings these describe → src/ui/moireCanvas.ts; when a curved row's tile is
 *   baked and what is drawn until it exists → src/ui/driftTiles.ts.
 */
import { cosTurn, DRIFT_TRAVEL_CYCLES, TAU, wrap, type DriftGeometry } from "./moire.ts";
import { escapeTurns, nestedTurns, type FractalSeed } from "./moireFractal.ts";
import { type Folded, foldPlane } from "./moireFold.ts";
import { LATTICE_GEOMETRY, latticeTile } from "./moireLattice.ts";
import { profileBlock, type DriftProfile } from "./moireProfiles.ts";
import { clamp } from "./range.ts";

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
 * How many steps of its own octave a curved row's spacing is rounded onto before it reaches a tile.
 * Its sweep and its anchor take `stepped`, which the screen's own tile is already keyed through and
 * which holds the same fact this does: these move on a knob where a size and a density move on a
 * resize, and a tile past the sixty-four pixels a straight row's is takes a loop over its own
 * pixels to build, so unstepped a drag would rebuild one on every pointer move (0129, 0141). The
 * spacing steps geometrically rather than evenly, a ratio being what one spacing does to another.
 */
const RING_STEPS = 4;

/**
 * The ring counts a curved row is ever cut at, and therefore the only ones worth pricing or proving
 * anything about. Down here rather than beside the painter that calls it because the bench and the
 * equality harness both ask what the app can actually reach (0211).
 */
export const steppedRings = (rings: number): number =>
  2 ** (Math.round(Math.log2(Math.max(1, rings)) * RING_STEPS) / RING_STEPS);

/**
 * How close to its own anchor a curved row is read, in reference radii. The logarithm has no value
 * at the centre and every ring in the family crowds into the last pixel before it, so the anchor
 * itself is one flat disc rather than a point of infinite pitch.
 */
const MIN_RADIUS = 1 / 64;

/**
 * The same floor stated on the log of the *squared* radius, which is where the kernel reads it.
 * `log(max(hypot(u, v), MIN_RADIUS))` and `0.5 * max(log(u² + v²), 2 log MIN_RADIUS)` are the same
 * number in algebra — a logarithm is monotonic, so the clamp commutes through it, and halving the
 * log of the square is the log of the root — and **not** in doubles: they part by up to 8.9e-16
 * over the range this kernel reads, which is why the substitution is licensed by measurement rather
 * than by the identity
 * ([0211](../../docs/decisions/0211-the-pictures-kernel-is-gated-on-byte-equality.md)). What it
 * buys is `Math.hypot`, whose overflow-safe scaling this kernel's operands (a picture's worth of
 * reference radii) cannot need. Held as a constant because `Math.log` is not folded at parse time,
 * and the kernel reads this once a pixel.
 */
const MIN_LOG_SQUARED = 2 * Math.log(MIN_RADIUS);

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
  seed: FractalSeed,
): number {
  if (geometry === "linear") return u * rings;
  // The two fractal coordinates first among the curved ones, because neither is an angle: both are
  // read off the point itself and not off where it stands round the anchor, so the spoke below is
  // work neither of them spends (`escapeTurns`, `nestedTurns`, src/lib/moireFractal.ts, 0246).
  if (geometry === "escape") return escapeTurns(u, v, seed.cx, seed.cy, seed.zoom, seed.fly);
  if (geometry === "nested") {
    return nestedTurns(u, v, seed.cx, seed.cy, seed.ratio, seed.turn, seed.zoom, seed.fly);
  }
  const spoke = geometry === "radial" ? 0 : (spokes * Math.atan2(v, u)) / TAU;
  if (geometry === "fan") return spoke;
  return spoke + rings * (0.5 * Math.max(Math.log(u * u + v * v), MIN_LOG_SQUARED));
}

/**
 * Where one curved row stands on the picture it is baked for, in device pixels: its anchor, what
 * its pitch comes to in rings and in spokes, the spacing those two round it onto, and how far past
 * the picture its tile has to reach for the row's own motion never to uncover a corner of it. Every
 * field of it is rounded onto a step before it is filled, which is what makes it the whole of the
 * tile's key too (0142).
 *
 * The seed is spread flat into the place rather than nested inside it, and that is load-bearing:
 * the shop copies a place by `Object.assign` and by spread (`stand`, `askWorker`,
 * src/ui/driftTiles.ts), and a nested object would be copied by *reference* — every standing tile
 * would then share the one order's seed and follow it to the next row's structure.
 */
export type DriftPlace = FractalSeed & {
  x: number;
  y: number;
  pitch: number;
  cover: number;
  rings: number;
  spokes: number;
  /**
   * How many times the plane is folded about the anchor before the row is cut along it, on the
   * fold's own ladder (`steppedFolds`, src/lib/moireFold.ts): the automators standing, travelled.
   * A fraction is a fold arriving, and is two folded pictures crossfaded rather than one point
   * slid toward its image.
   */
  folds: number;
  /** How wide a lattice cell's rim is lit, in cell units — read by the lattice and nothing else. */
  rim: number;
};

/**
 * One curved row's tile, written a pixel at a time into `alpha` — an RGBA field `width` × `height`,
 * of which only the fourth byte of each pixel is ever touched, because the picture is cut out of ink
 * already laid down and `destination-out` discards the colour entirely.
 *
 * **This is the one loop over a curved row's pixels, and it runs on a bake and never on a frame**
 * (0129, 0142): everything a frame moves is a scale, a slide or a turn of what this laid down —
 * and a bake is not every commit but one a painting (0144). It is pure of the DOM on
 * purpose — a worker with an `OffscreenCanvas` and the main thread with a `<canvas>` bake the
 * identical field through this one function, so a browser without the worker draws the same picture
 * a beat later rather than a different one (0144).
 */
export function curvedField(
  alpha: Uint8ClampedArray,
  width: number,
  height: number,
  geometry: DriftGeometry,
  profile: DriftProfile,
  place: DriftPlace,
  ref: number,
): void {
  // One divide for the tile rather than one per pixel: `place.cover / ref` is the same number at
  // every pixel. Reassociating a multiply and a divide is not bit-exact either, and is licensed the
  // same way — the harness beside the maths holds both rewrites to a fraction of an alpha step
  // before the round, which is the bar every rewrite of this kernel is held to (0211).
  // The lattice is a cell and not a place: one tile, square, repeated by the painter (0278).
  if (geometry === LATTICE_GEOMETRY) {
    if (width !== height) throw new Error(`A lattice cell ${width} by ${height} is not a cell.`);
    latticeTile(alpha, width, profile, place.rim);
    return;
  }
  const scale = place.cover / ref;
  // The fold, resolved once for the tile: how many whole folds, and how far the next has arrived.
  // A whole fold is the plane folded before the row is cut along it; a fold arriving is the two
  // pictures either side of it crossfaded, never a point slid toward its mirror image — halfway
  // there every point would lie on the seam and the whole picture would be one stripe (0278).
  const whole = Math.floor(place.folds);
  const arriving = place.folds - whole;
  const flat = whole === 0 && arriving === 0;
  for (let y = 0; y < height; y++) {
    const v = (y - place.y) * scale;
    for (let x = 0; x < width; x++) {
      const u = (x - place.x) * scale;
      // The unfolded kernel is left exactly as it was, byte for byte: a fold of nought makes no
      // call and reads no scratch (0211).
      const block = flat
        ? profileBlock(profile, geometryTurns(geometry, u, v, place.rings, place.spokes, place))
        : foldedBlock(geometry, profile, place, u, v, whole, arriving);
      alpha[(y * width + x) * 4 + 3] = Math.round(255 * block);
    }
  }
}

/** The one folded point the kernel writes into, a pixel at a time: a bake allocates once (0070). */
const folded: Folded = { u: 0, v: 0 };

/**
 * How much one folded pixel blocks: the plane folded `whole` times about the anchor and the row
 * cut along the folded point — and, where a fold is `arriving`, that much of the way toward the
 * same pixel folded once more.
 */
function foldedBlock(
  geometry: DriftGeometry,
  profile: DriftProfile,
  place: DriftPlace,
  u: number,
  v: number,
  whole: number,
  arriving: number,
): number {
  foldPlane(folded, u, v, whole);
  const block = profileBlock(
    profile,
    geometryTurns(geometry, folded.u, folded.v, place.rings, place.spokes, place),
  );
  if (arriving <= 0) return block;
  foldPlane(folded, u, v, whole + 1);
  const next = profileBlock(
    profile,
    geometryTurns(geometry, folded.u, folded.v, place.rings, place.spokes, place),
  );
  return block + arriving * (next - block);
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
 * The zoom a ring family's phase is carried by: one turn of the row is `DRIFT_TRAVEL_CYCLES` rings'
 * spacing, which on a logarithmic family is a scale rather than a slide — and a whole number of
 * rings, so the end of a turn is the start's own picture (0273). Never below one, because the tile
 * is drawn about the row's own anchor and a scale under one would leave the picture's far corner
 * uncovered. Growing through the turn rather than shrinking: the rings open outward from the
 * anchor, which is the way through a structure the fractal flight already travels
 * (`fractalFlight`, src/lib/moireFractal.ts), so a ring family and a fold move the same way.
 */
export const geometryZoom = (geometry: DriftGeometry, turns: number, rings: number): number =>
  geometry === "radial" || geometry === "spiral"
    ? Math.exp((DRIFT_TRAVEL_CYCLES * wrap(turns, 1)) / Math.max(1, rings))
    : 1;

/**
 * How far a fan's apex wanders, in device pixels, to carry its phase. A fan is the one geometry a
 * scale does nothing to — it is the same fan at every size — so its phase is its apex travelling a
 * small circle instead, which sweeps every spoke past every point of the picture once a circle.
 * The circle is one pitch across, which is exactly one cycle at the reference radius, and it is
 * walked `DRIFT_TRAVEL_CYCLES` times a turn — a whole number, so a turn ends where it began. It is
 * walked about the row's own anchor, which is itself carried around its rest by the same phase
 * (0229): a fan therefore travels an ellipse rather than a circle, and the anchor is what says
 * where that ellipse is on the picture.
 */
export const geometrySlideX = (geometry: DriftGeometry, turns: number, pitch: number): number =>
  geometry === "fan" ? pitch * cosTurn(DRIFT_TRAVEL_CYCLES * turns) : 0;

/** The other half of that circle. A quarter turn behind is the sine of the same angle. */
export const geometrySlideY = (geometry: DriftGeometry, turns: number, pitch: number): number =>
  geometry === "fan" ? pitch * cosTurn(DRIFT_TRAVEL_CYCLES * turns - 0.25) : 0;

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

/**
 * The most of the picture that may be drawn from somewhere else in it. **A hard ceiling and not a
 * tuning**, bounded for the reason the frame feedback's is and at the number that one happens to be
 * (`DRIFT_FEEDBACK_CEILING`, src/lib/moire.ts, 0250): a share of one is every piece of the picture
 * taken from a piece it has nothing to do with, which is a picture of nothing rather than a picture
 * come apart. Written here rather than derived from that one, because a picture that wanted this
 * pass deeper should not have to lay the last frame back in harder to get it. Under a half, most of
 * the picture is still where it belongs and the rest reads as the field breaking along its slices.
 */
export const SHATTER_CEILING = 0.5;

/** How much of the picture a field shattering `amount` draws from elsewhere. Never past it. */
export const shatterShare = (amount: number): number => SHATTER_CEILING * clamp(amount, 0, 1);

/**
 * How many pieces a shattered field comes apart into. Eight, where the lens bends the same field in
 * sixty-four: a slice is one pixel of a strip and a bend across sixty-four of them is one smooth
 * wave, where a *displacement* that changed every pixel would be a tear so fine the picture reads as
 * smeared rather than as broken. Eight pieces are each a band deep enough to see a straight row
 * inside, and the row is what has to be seen breaking across the edge between two of them.
 */
export const SHATTER_BANDS = 8;

/**
 * How many of those pieces a field shattering `amount` draws from elsewhere: the share above, in
 * eighths. **Whole pieces and never a share of every piece.** Two draws of one band under
 * `destination-out` compose multiplicatively rather than as a crossfade — the residual is the
 * product of what each of them left, largest exactly at a half — so a picture blended with a
 * displaced copy of itself is a picture hazed evenly all over, which is the flattening that reading
 * is supposed to break. A piece is therefore drawn from where it belongs or from somewhere else,
 * cut once either way, and the share is how many of them are the second kind.
 */
export const shatterPieces = (amount: number): number =>
  Math.round(shatterShare(amount) * SHATTER_BANDS);

/** Which of those pieces one slice of the field belongs to. */
const shatterBand = (slice: number, slices: number): number =>
  Math.floor((slice * SHATTER_BANDS) / Math.max(1, slices));

/**
 * How many pieces along the walk steps to find where a displaced piece is drawn from. Coprime with
 * `SHATTER_BANDS`, so the walk is a permutation of the picture's own width — every piece is drawn
 * from a different distance along it and no two from the same — and far enough along that
 * neighbouring pieces are never displaced by neighbouring amounts, which would be the picture bent
 * rather than broken.
 */
const SHATTER_STRIDE = 3;

/**
 * How far along the picture one slice is drawn from, as a fraction of its width: nought where the
 * piece it belongs to is drawn from where it belongs, and one of the walk's own eighths where it is
 * one of the pieces the share has broken. The whole width in eighths and not a span of a twentieth,
 * which is what separates this from the lens beside it: a lens slides every slice a little on one
 * wave and reads as the field bending, where this draws a whole piece of the picture from somewhere
 * else in it and breaks every straight row across that piece's edge.
 *
 * Which pieces break is the walk's own order and never the first few, so a broken field comes apart
 * across the whole of itself rather than at one end of it; the piece the walk leaves where it is is
 * the one it never breaks. Stable at every frame, because the displacement is where the field is
 * read from and not a motion of its own: what moves under it is the field, and a source that
 * wandered per frame would be a picture of noise (0126).
 */
export const shatterSlide = (amount: number, slice: number, slices: number): number => {
  const step = (shatterBand(slice, slices) * SHATTER_STRIDE) % SHATTER_BANDS;
  return step >= 1 && step <= shatterPieces(amount) ? step / SHATTER_BANDS : 0;
};
