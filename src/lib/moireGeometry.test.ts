/**
 * @role Tests the coordinates a row may be cut along: that a ring family is rings and a fan is
 *   spokes, that each of them carries its own phase by something a transform can do — a zoom, a
 *   wander — rather than by a rebuild, that a sweep closes on itself, and that an anchor stays
 *   inside the picture it anchors a row to.
 *
 *   And the equality harness `curvedField`'s own optimisations are gated on (0211): the shipped
 *   kernel against a transcription of the arithmetic it was written from, every geometry × every
 *   profile, asserting the alpha byte is the same one.
 */
// Past the soft cap by the equality harness, which is two transcriptions of one kernel and the
// sweep that holds them together: splitting it would put the reference in one file and the claim it
// is the reference for in another, which is the one thing this harness may not be (0211, 0246).
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { describe, expect, it } from "vitest";

import { fold } from "@/lib/copy";
import type { DRIFT_GEOMETRIES } from "@/lib/moire";
import { DRIFT_CHIRP_REACH, DRIFT_TRAVEL_CYCLES, TAU } from "@/lib/moire";
import { DRIFT_PICKED_GEOMETRIES } from "@/lib/playerDrift";
import { FRACTAL_GEOMETRIES, fractalSeed, type FractalSeed } from "@/lib/moireFractal";
import { PITCH_SPREAD } from "@/lib/moireGrating";
import { DRIFT_PROFILES, profileBlock, type DriftProfile } from "@/lib/moireProfiles";
import {
  centreAcross,
  CENTRE_INSET,
  chirpTurns,
  curvedField,
  type DriftPlace,
  geometryCover,
  geometryRef,
  geometrySlideX,
  geometrySlideY,
  geometryTurns,
  geometryZoom,
  gratingRings,
  gratingSpokes,
  GEOMETRY_COVER,
  LENS_SLICES,
  LENS_SPAN,
  lensSlide,
  SHATTER_BANDS,
  SHATTER_CEILING,
  shatterPieces,
  shatterSlide,
  steppedRings,
} from "@/lib/moireGeometry";

/** A picture the size of the overlay, and the two numbers every row on it is cut with. */
const WIDTH = 1200;
const HEIGHT = 600;
const REF = geometryRef(WIDTH, HEIGHT);
const PITCH = 7;
const RINGS = gratingRings(PITCH, REF);
const SPOKES = gratingSpokes(PITCH, REF);

/**
 * The seed the four coordinates that are not fractal carry and none of them reads (0246). Its
 * flight is deliberately off nought — a stop of the ladder `fractalFlight` answers on — so the
 * harness holds where the travel is *added* as well as that it is added at all (0268): both
 * placements the record argues for are byte-identical to their alternatives at a flight of nothing.
 */
const SEED = fractalSeed(fold("a picture standing on one place"), 1, 5 / 18);

/** Where a point stands along one row's axis, in cycles, in reference radii from its anchor. */
const at = (geometry: Parameters<typeof geometryTurns>[0], u: number, v: number): number =>
  geometryTurns(geometry, u, v, RINGS, SPOKES, SEED);

/** How far a swept row's phase moves across a twentieth of the picture, at `t` of the way over. */
const stepAcross = (t: number, chirp: number): number =>
  chirpTurns(t + 0.05, 12, chirp) - chirpTurns(t, 12, chirp);

/** How far one slice of a lens at full travel slides, as a fraction of the picture's width. */
const slidBy = (slice: number): number => lensSlide(1, 0, slice, LENS_SLICES);

// One flat list of the geometries' cases, each a few lines — splitting it would separate the rules
// that hold over one set of coordinates (0007).
// oxlint-disable-next-line max-lines-per-function
describe("moireGeometry", () => {
  it("leaves a straight row the comb it has always been", () => {
    // One coordinate and one only: how far along its own axis a point stands, and nothing about
    // how far across it. Every row in the instrument was this before it could be anything else.
    expect(at("linear", 0.4, 0)).toBeCloseTo(0.4 * RINGS, 9);
    expect(at("linear", 0.4, 3)).toBe(at("linear", 0.4, 0));
    expect(at("linear", 0.8, 0) - at("linear", 0.4, 0)).toBeCloseTo(0.4 * RINGS, 9);
  });

  it("cuts a ring family on the radius and a fan on the angle", () => {
    // A ring family is the same everywhere on a circle about its anchor and moves as the radius
    // does — which is what makes it cross a straight row into arcs rather than into more of it.
    expect(at("radial", 0.5, 0)).toBeCloseTo(at("radial", 0, 0.5), 9);
    expect(at("radial", 0.5, 0)).not.toBeCloseTo(at("radial", 0.25, 0), 3);
    // A fan is the other way round: the same all the way out a spoke, and moving round the turn.
    expect(at("fan", 0.5, 0)).toBeCloseTo(at("fan", 2, 0), 9);
    expect(at("fan", 0.5, 0)).not.toBeCloseTo(at("fan", 0, 0.5), 3);
    // Whole spokes, or the fan has a seam down one side of it where it fails to close.
    expect(at("fan", -1, 0) - at("fan", 1, 0)).toBeCloseTo(SPOKES / 2, 9);
    // A spiral is both at once, so it is neither of them anywhere.
    expect(at("spiral", 0.5, 0)).not.toBeCloseTo(at("spiral", 0, 0.5), 3);
    expect(at("spiral", 0.5, 0)).not.toBeCloseTo(at("spiral", 2, 0), 3);
  });

  it("stands the rings a pitch apart at the radius their pitch is stated at", () => {
    // The whole point of stating one radius: at that radius a curved row is drawn as fine as a
    // straight row of the same pitch, so the two beat rather than reading as two different scales.
    const inner = at("radial", 1, 0);
    const outer = at("radial", 1 + PITCH / REF, 0);
    // A whole cycle, to the curvature of the logarithm across one ring — half a percent of one at
    // this pitch, which is the family opening outward and is the whole reason it is a family.
    expect(outer - inner).toBeGreaterThan(0.98);
    expect(outer - inner).toBeLessThan(1);
    expect(gratingSpokes(PITCH, REF)).toBe(Math.round(TAU * RINGS));
  });

  it("carries a ring family's phase by a zoom, which is a transform and not a rebuild", () => {
    // The one claim the picture-sized tile rests on: a row's whole motion is the tile drawn at a
    // slightly larger scale, so the pixels are written once and every frame after that is a
    // matrix. A logarithm is what makes it true — scaling one is adding to it (0142).
    for (const turns of [0, 0.25, 0.5, 0.9]) {
      const zoom = geometryZoom("radial", turns, RINGS);
      expect(zoom).toBeGreaterThanOrEqual(1);
      // What the picture shows at a point once the tile is drawn `zoom` larger about the anchor.
      const moved = at("radial", 0.7 / zoom, 0.3 / zoom);
      expect(moved - at("radial", 0.7, 0.3)).toBeCloseTo(-DRIFT_TRAVEL_CYCLES * turns, 9);
    }
    // And it is never far from one, or the tile would be a blur rather than the picture's own size:
    // the whole travel of a turn, and the rings are many.
    expect(geometryZoom("radial", 0, RINGS)).toBe(1);
    expect(geometryZoom("radial", 1 - 1e-9, RINGS)).toBeLessThan(
      Math.exp(DRIFT_TRAVEL_CYCLES / RINGS) + 1e-9,
    );
    expect(geometryZoom("radial", 1 - 1e-9, RINGS)).toBeLessThan(1.2);
    // A straight row does not need it and a fan is the same fan at every scale, so neither takes it.
    expect(geometryZoom("linear", 0.5, RINGS)).toBe(1);
    expect(geometryZoom("fan", 0.5, RINGS)).toBe(1);
  });

  it("travels a whole number of rings a turn, so the wrap is the same tile", () => {
    // 0273: the end of a turn is the start's own picture, which is what lets a row travel several
    // rings a turn at no bake — the family repeats every ring, so the content the zoom has carried
    // past a point at the top of the turn is a whole number of rings from what stood there.
    for (const geometry of ["radial", "spiral"] as const) {
      expect(geometryZoom(geometry, 1, RINGS)).toBe(geometryZoom(geometry, 0, RINGS));
      const zoom = geometryZoom(geometry, 1 - 1e-12, RINGS);
      const carried = at(geometry, 0.7 / zoom, 0.3 / zoom) - at(geometry, 0.7, 0.3);
      expect(carried).toBeCloseTo(Math.round(carried), 6);
      expect(Math.abs(carried)).toBeCloseTo(DRIFT_TRAVEL_CYCLES, 6);
      // And outward through the turn: the rings open from the anchor, the way the flight dives.
      expect(geometryZoom(geometry, 0.5, RINGS)).toBeGreaterThan(
        geometryZoom(geometry, 0.1, RINGS),
      );
    }
  });

  it("walks a fan's apex round the circle a whole number of times a turn", () => {
    // The same wrap for the one geometry that slides: the apex is back where it began at the end
    // of every turn, and passes there once a circle on the way.
    expect(geometrySlideX("fan", 1, PITCH)).toBeCloseTo(geometrySlideX("fan", 0, PITCH), 9);
    expect(geometrySlideY("fan", 1, PITCH)).toBeCloseTo(geometrySlideY("fan", 0, PITCH), 9);
    for (let circle = 0; circle < DRIFT_TRAVEL_CYCLES; circle += 1) {
      const turns = circle / DRIFT_TRAVEL_CYCLES;
      expect(geometrySlideX("fan", turns, PITCH)).toBeCloseTo(PITCH, 9);
      expect(geometrySlideX("fan", turns + 0.5 / DRIFT_TRAVEL_CYCLES, PITCH)).toBeCloseTo(
        -PITCH,
        9,
      );
    }
  });

  it("walks a fan's apex round a circle a pitch across instead", () => {
    // The one geometry a zoom does nothing to gets the one motion that does something to it: its
    // apex travels a small circle, which sweeps every spoke past every point of the picture.
    for (const turns of [0, 0.3, 0.7]) {
      const x = geometrySlideX("fan", turns, PITCH);
      const y = geometrySlideY("fan", turns, PITCH);
      expect(Math.hypot(x, y)).toBeCloseTo(PITCH, 9);
    }
    // Half a circle on is the far side of it — and half a *turn* is a whole number of circles.
    const half = 0.5 / DRIFT_TRAVEL_CYCLES;
    expect(geometrySlideX("fan", 0, PITCH)).not.toBeCloseTo(geometrySlideX("fan", half, PITCH), 3);
    for (const geometry of ["linear", "radial", "spiral"] as const) {
      expect(geometrySlideX(geometry, 0.3, PITCH)).toBe(0);
      expect(geometrySlideY(geometry, 0.3, PITCH)).toBe(0);
    }
    // And its tile reaches far enough past the picture for that wander never to uncover an edge.
    // Measured where an anchor carried as far in as it may leaves least room: the near edge.
    const near = CENTRE_INSET * Math.min(WIDTH, HEIGHT);
    expect(near * (geometryCover("fan", PITCH, WIDTH, HEIGHT) - 1)).toBeGreaterThan(PITCH);
    expect(geometryCover("radial", PITCH, WIDTH, HEIGHT)).toBe(GEOMETRY_COVER);
  });

  it("closes a sweep on itself in its slope as well as its count", () => {
    // A swept row is baked into a tile as wide as the picture and repeated, so a sweep that did
    // not come out at the whole cycle it went in on would draw a seam down the picture — and one
    // whose *slope* did not come back where it left would draw a kink in the spacing there, which
    // is a line down the picture too.
    for (const chirp of [0, 0.4, DRIFT_CHIRP_REACH]) {
      expect(chirpTurns(0, 12, chirp)).toBeCloseTo(0, 9);
      expect(chirpTurns(1, 12, chirp)).toBeCloseTo(12, 9);
      expect(stepAcross(0.95, chirp)).toBeCloseTo(stepAcross(0, chirp), 6);
    }
    // Swept, the fringes open through the middle and crowd at both edges; unswept it is one comb.
    expect(stepAcross(0, DRIFT_CHIRP_REACH)).toBeGreaterThan(
      stepAcross(0.5, DRIFT_CHIRP_REACH) * 2,
    );
    expect(stepAcross(0.5, 0)).toBeCloseTo(stepAcross(0, 0), 9);
    // And never past the ratio the band a lattice happens in can carry either way.
    const spread = (1 + DRIFT_CHIRP_REACH) / (1 - DRIFT_CHIRP_REACH);
    expect(spread).toBeLessThanOrEqual(PITCH_SPREAD ** 2);
  });

  it("keeps a row's anchor inside the picture it anchors it to", () => {
    // A ring family centred outside the picture is a set of arcs indistinguishable from a coarse
    // straight grating, which is the one thing a curved row must not read as.
    expect(centreAcross(0, WIDTH)).toBeCloseTo(CENTRE_INSET * WIDTH, 9);
    expect(centreAcross(1, WIDTH)).toBeCloseTo((1 - CENTRE_INSET) * WIDTH, 9);
    expect(centreAcross(0.5, HEIGHT)).toBeCloseTo(HEIGHT / 2, 9);
  });

  it("slides one slice of the lens against the next, and none of them at rest", () => {
    // A lens is a bend of the finished field, so its whole travel is a fraction of the width and
    // its shape is one wave down the picture rather than a jump between two slices.
    expect(Math.abs(slidBy(0))).toBeCloseTo(LENS_SPAN, 9);
    expect(slidBy(LENS_SLICES / 2)).toBeCloseTo(-LENS_SPAN, 9);
    expect(Math.abs(slidBy(1) - slidBy(0))).toBeLessThan(LENS_SPAN / 4);
    // A row that asks for nothing bends nothing, at every slice and every phase.
    for (const slice of [0, 7, 63])
      expect(lensSlide(0, 0.4, slice, LENS_SLICES)).toBeCloseTo(0, 12);
  });

  it("breaks whole pieces of the field off the share, and never more than the ceiling", () => {
    // The share is how much of the picture is drawn from somewhere else in it, in eighths: a
    // reading too small to break a whole piece leaves the picture exactly as it was.
    expect(shatterPieces(0)).toBe(0);
    expect(shatterPieces(0.1)).toBe(0);
    expect(shatterPieces(1)).toBe(SHATTER_BANDS * SHATTER_CEILING);
    // Never past the ceiling and never under nothing, either side of the reading's own band — the
    // bound is where the share is spent, and a picture drawn entirely from somewhere else is a
    // picture of nothing (0250). A reading that is not a number never arrives: `rackScatter` weighs
    // one out of the sum and normalises what is left (src/lib/moireSound.ts).
    for (const amount of [-1, 2, Number.POSITIVE_INFINITY]) {
      expect(shatterPieces(amount)).toBeLessThanOrEqual(SHATTER_BANDS * SHATTER_CEILING);
      expect(shatterPieces(amount)).toBeGreaterThanOrEqual(0);
    }
    // Every broken piece is drawn from a different eighth of the width and no two from the same,
    // which is what the walk being coprime with the pieces buys; the rest stand where they are.
    const walked = Array.from({ length: SHATTER_BANDS }, (_each, piece) =>
      shatterSlide(1, (piece * LENS_SLICES) / SHATTER_BANDS, LENS_SLICES),
    );
    const broken = walked.filter((slid) => slid !== 0);
    expect(broken).toHaveLength(SHATTER_BANDS * SHATTER_CEILING);
    expect(new Set(broken).size).toBe(broken.length);
    expect(Math.max(...broken)).toBeLessThan(1);
    // The slices inside one piece break together — a tear at every slice reads as a smear — and a
    // count of one piece is a picture whose every slice is the same one.
    expect(shatterSlide(1, 0, LENS_SLICES)).toBe(shatterSlide(1, 1, LENS_SLICES));
    expect(shatterSlide(1, 0, 1)).toBe(0);
  });
});

/**
 * The arithmetic `curvedField` was written from, transcribed once and never touched again: the
 * radius through `Math.hypot`, the cover divided by the reference radius at every pixel. This is
 * the reference the shipped kernel is held against, and it is deliberately the slow, obvious
 * spelling — it is not maintained alongside the kernel, it is what the kernel has to keep agreeing
 * with (0211).
 */
const REFERENCE_MIN_RADIUS = 1 / 64;

/**
 * And the two fractal coordinates transcribed the same way, with every constant written out rather
 * than imported: a reference that read the shipped file's own numbers would agree with it by
 * construction and prove nothing (0211, 0246).
 */
const REFERENCE_NEAR = 2 ** -12;
const referenceEscape = (
  u: number,
  v: number,
  cx: number,
  cy: number,
  zoom: number,
  fly: number,
): number => {
  const span = 0.04 / Math.max(REFERENCE_NEAR, zoom);
  const px = cx + u * span;
  const py = cy + v * span;
  let zx = 0;
  let zy = 0;
  let trap = Number.POSITIVE_INFINITY;
  let count = 120;
  for (let step = 0; step < 120; step += 1) {
    const xx = zx * zx;
    const yy = zy * zy;
    const squared = xx + yy;
    if (step > 0 && squared < trap) trap = squared;
    if (squared > 256 * 256) {
      count = step + 1 - Math.log2(Math.log(squared) / (2 * Math.log(256)));
      break;
    }
    zy = 2 * zx * zy + py;
    zx = xx - yy + px;
  }
  return (
    30 * (Math.log1p(count) + 0.3 * (0.5 * Math.log(Math.max(trap, REFERENCE_NEAR)))) + 4 * fly
  );
};

const referenceNested = (
  u: number,
  v: number,
  cx: number,
  cy: number,
  ratio: number,
  turn: number,
  zoom: number,
  fly: number,
): number => {
  const cos = Math.cos(TAU * turn);
  const sin = Math.cos(TAU * (turn - 0.25));
  const step = Math.max(1 + REFERENCE_NEAR, ratio);
  let x = u * Math.max(REFERENCE_NEAR, zoom);
  let y = v * Math.max(REFERENCE_NEAR, zoom);
  let level = 6;
  for (let deep = 0; deep < 6; deep += 1) {
    const folded = Math.abs(x);
    const under = Math.abs(y);
    x = (folded * cos - under * sin) * step - cx;
    y = (folded * sin + under * cos) * step - cy;
    const box = Math.max(Math.abs(x), Math.abs(y));
    if (box > 4) {
      level = deep + 1 - Math.log(box / 4) / Math.log(step);
      break;
    }
  }
  const flown = level + fly;
  return 4 * (flown + 0.12 * Math.cos(TAU * (flown - 0.25)));
};

const referenceTurns = (
  geometry: (typeof DRIFT_GEOMETRIES)[number],
  u: number,
  v: number,
  rings: number,
  spokes: number,
  seed: FractalSeed,
): number => {
  if (geometry === "linear") return u * rings;
  if (geometry === "escape") return referenceEscape(u, v, seed.cx, seed.cy, seed.zoom, seed.fly);
  if (geometry === "nested") {
    return referenceNested(u, v, seed.cx, seed.cy, seed.ratio, seed.turn, seed.zoom, seed.fly);
  }
  const spoke = geometry === "radial" ? 0 : (spokes * Math.atan2(v, u)) / TAU;
  if (geometry === "fan") return spoke;
  return spoke + rings * Math.log(Math.max(Math.hypot(u, v), REFERENCE_MIN_RADIUS));
};

/** The reference field, written the same way into the same shape of buffer. */
const referenceField = (
  alpha: Uint8ClampedArray,
  width: number,
  height: number,
  geometry: (typeof DRIFT_GEOMETRIES)[number],
  profile: DriftProfile,
  place: DriftPlace,
  ref: number,
): void => {
  for (let y = 0; y < height; y++) {
    const v = ((y - place.y) * place.cover) / ref;
    for (let x = 0; x < width; x++) {
      const u = ((x - place.x) * place.cover) / ref;
      const turns = referenceTurns(geometry, u, v, place.rings, place.spokes, place);
      alpha[(y * width + x) * 4 + 3] = Math.round(255 * profileBlock(profile, turns));
    }
  }
};

/**
 * A picture-shaped tile small enough that a hundred and twenty of them and their references cost a
 * fraction of the Vitest slack (plan §3), and still wide enough to carry every ring of a family and
 * every spoke of a fan across it.
 */
const TILE_W = 192;
const TILE_H = 120;

/**
 * Three places a curved row is really cut at: a ring count off `steppedRings`, which is the only
 * spacing the screen ever keys a tile on, and an anchor. Two of the three anchors are deliberately
 * *not* on a pixel — `centreAcross(0.5, 192)` is exactly 96 and the aligned case is the easy one,
 * which is the same reason 0211 refuses to mirror a quadrant.
 */
const PLACES = [
  { rings: steppedRings(16), centre: 0.37 },
  { rings: steppedRings(64), centre: 0.5 },
  { rings: steppedRings(256), centre: 0.71 },
];

/**
 * How far apart the two spellings are allowed to be, **before** the round, in alpha steps out of
 * 255. This and not the byte is the bar with teeth: a byte only moves where a value sits within the
 * disagreement of a rounding boundary, so a bar stated on bytes alone passes anything whose error
 * is small enough to miss one — and 0211 exists to reject rewrites whose error is exactly that
 * size. The rewrites that shipped part by at most 3.5e-10 of a step over the cases below; a relative
 * error of 1e-13 in the turns — a tenth of what a polynomial `log` or a fine radius table costs —
 * parts by 1.3e-7, which is a hundred times this and fails.
 */
const ALPHA_SLACK = 1e-9;

/** One curved row's place on the tile, derived the way `placeCurved` derives the screen's. */
const placeAt = (
  geometry: (typeof DRIFT_GEOMETRIES)[number],
  rings: number,
  centre: number,
  ref: number,
): DriftPlace => {
  const pitch = ref / rings;
  return {
    x: centreAcross(centre, TILE_W),
    y: centreAcross(centre, TILE_H),
    pitch,
    rings,
    spokes: gratingSpokes(pitch, ref),
    cover: geometryCover(geometry, pitch, TILE_W, TILE_H),
    ...SEED,
  };
};

/** One alpha byte out of a field, as a number: a pixel outside it is `NaN` and fails every test. */
const alphaAt = (field: Uint8ClampedArray, index: number): number => field[index] ?? Number.NaN;

// One case list rather than a test per geometry: the rule is one rule over all four of them (0007).
//
// **Four and not six.** The two fractal coordinates are held to their own claim below, because the
// rewrite this harness licenses cannot be licensed over them: `curvedField` hoists one divide out
// of the pixel loop, which moves `u` in the last bit of a double, and an escape field is chaotic —
// a change of 1e-16 in the point a boundary orbit starts at is a change of whole fringes in where
// it escapes. That is the coordinate being a fractal and not the kernel being wrong, and no slack
// stated in alpha steps can hold it (0211, 0246).
// oxlint-disable-next-line max-lines-per-function
// The sweep below runs five deep because five things are being swept and each is a real dimension
// of the claim: every geometry, against every profile, at every place, over every pixel of the
// tile. Lifting the pixel pair into a helper would hand it eight parameters and the three tallies
// it writes, which reads worse than the nest (0007).
// oxlint-disable max-depth
describe("curvedField", () => {
  it("writes the byte the arithmetic it was written from writes, at every pixel", () => {
    const ref = geometryRef(TILE_W, TILE_H);
    const shipped = new Uint8ClampedArray(TILE_W * TILE_H * 4);
    const reference = new Uint8ClampedArray(TILE_W * TILE_H * 4);
    const moved: string[] = [];
    let apart = 0;
    let exempted = 0;
    for (const geometry of DRIFT_PICKED_GEOMETRIES) {
      for (const profile of DRIFT_PROFILES) {
        for (const { rings, centre } of PLACES) {
          const place = placeAt(geometry, rings, centre, ref);
          const scale = place.cover / ref;
          curvedField(shipped, TILE_W, TILE_H, geometry, profile, place, ref);
          referenceField(reference, TILE_W, TILE_H, geometry, profile, place, ref);
          for (let y = 0; y < TILE_H; y++) {
            const wasV = ((y - place.y) * place.cover) / ref;
            const nowV = (y - place.y) * scale;
            for (let x = 0; x < TILE_W; x++) {
              const wasU = ((x - place.x) * place.cover) / ref;
              const nowU = (x - place.x) * scale;
              const was =
                255 *
                profileBlock(
                  profile,
                  referenceTurns(geometry, wasU, wasV, rings, place.spokes, place),
                );
              const now =
                255 *
                profileBlock(
                  profile,
                  geometryTurns(geometry, nowU, nowV, rings, place.spokes, place),
                );
              apart = Math.max(apart, Math.abs(now - was));
              const i = (y * TILE_W + x) * 4 + 3;
              if (alphaAt(shipped, i) === alphaAt(reference, i)) continue;
              // The one difference a value that close may still make, and it is checked rather than
              // assumed: `Math.round` splits a pixel whose reference value is within the same slack
              // of a half, and there the reference's own byte is the last bit of a double rather
              // than the picture. It has to be that pixel, and it has to move by one step.
              const tied = Math.abs(was - Math.floor(was) - 0.5) < ALPHA_SLACK;
              if (tied && Math.abs(alphaAt(shipped, i) - alphaAt(reference, i)) === 1)
                exempted += 1;
              else moved.push(`${geometry}/${profile} at ${x},${y}: ${was} vs ${now}`);
            }
          }
        }
      }
    }
    expect(moved).toEqual([]);
    expect(apart).toBeLessThan(ALPHA_SLACK);
    // The exemption is load-bearing rather than decorative: if this ever reads zero, the harness
    // has stopped covering the case it was widened for and the slack above can go.
    expect(exempted).toBeGreaterThan(0);
  });

  /**
   * And the claim the two fractal coordinates can carry. **The kernel, and not the field.**
   *
   * `curvedField` hoists one divide out of the pixel loop, which moves `u` in a double's last bit,
   * and these two amplify that without bound: an escape count is chaotic at the boundary, so a
   * change of 1e-16 in where an orbit starts is a change of whole fringes in where it ends. Held to
   * the *field*, the two spellings disagree at almost every pixel — measured, 96 in a hundred — and
   * no slack stated in alpha steps can hold that. Which is the coordinate being a fractal and not
   * the kernel being wrong: the two pictures are the same picture, pixel for pixel neither is more
   * right than the other, and the eye cannot tell them apart.
   *
   * So the two are held where the claim still means something: **given the same point, the shipped
   * kernel answers exactly what the arithmetic it was written from answers** — which is the whole of
   * what the harness is for, and catches an edit to either branch just as the sweep above does
   * (0211 amended, 0246).
   */
  it("answers the arithmetic it was written from at every point of a fractal coordinate", () => {
    const ref = geometryRef(TILE_W, TILE_H);
    for (const geometry of FRACTAL_GEOMETRIES) {
      for (const { rings, centre } of PLACES) {
        const place = placeAt(geometry, rings, centre, ref);
        const scale = place.cover / ref;
        for (let y = 0; y < TILE_H; y++) {
          const v = (y - place.y) * scale;
          for (let x = 0; x < TILE_W; x++) {
            const u = (x - place.x) * scale;
            expect(geometryTurns(geometry, u, v, rings, place.spokes, place)).toBe(
              referenceTurns(geometry, u, v, rings, place.spokes, place),
            );
          }
        }
      }
    }
  });
});
