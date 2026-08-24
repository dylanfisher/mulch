/**
 * @role Tests the coordinates a row may be cut along: that a ring family is rings and a fan is
 *   spokes, that each of them carries its own phase by something a transform can do — a zoom, a
 *   wander — rather than by a rebuild, that a sweep closes on itself, and that an anchor stays
 *   inside the picture it anchors a row to.
 */
import { describe, expect, it } from "vitest";

import { DRIFT_CHIRP_REACH, PITCH_SPREAD, TAU } from "@/lib/moire";
import {
  centreAcross,
  CENTRE_INSET,
  chirpTurns,
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
} from "@/lib/moireGeometry";

/** A picture the size of the overlay, and the two numbers every row on it is cut with. */
const WIDTH = 1200;
const HEIGHT = 600;
const REF = geometryRef(WIDTH, HEIGHT);
const PITCH = 7;
const RINGS = gratingRings(PITCH, REF);
const SPOKES = gratingSpokes(PITCH, REF);

/** Where a point stands along one row's axis, in cycles, in reference radii from its anchor. */
const at = (geometry: Parameters<typeof geometryTurns>[0], u: number, v: number): number =>
  geometryTurns(geometry, u, v, RINGS, SPOKES);

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
      expect(moved - at("radial", 0.7, 0.3)).toBeCloseTo(turns - 1, 9);
    }
    // And it is never far from one, or the tile would be a blur rather than the picture's own size.
    expect(geometryZoom("radial", 0, RINGS)).toBeLessThan(GEOMETRY_COVER);
    // A straight row does not need it and a fan is the same fan at every scale, so neither takes it.
    expect(geometryZoom("linear", 0.5, RINGS)).toBe(1);
    expect(geometryZoom("fan", 0.5, RINGS)).toBe(1);
  });

  it("walks a fan's apex round a circle a pitch across instead", () => {
    // The one geometry a zoom does nothing to gets the one motion that does something to it: its
    // apex travels a small circle, which sweeps every spoke past every point of the picture.
    for (const turns of [0, 0.3, 0.7]) {
      const x = geometrySlideX("fan", turns, PITCH);
      const y = geometrySlideY("fan", turns, PITCH);
      expect(Math.hypot(x, y)).toBeCloseTo(PITCH, 9);
    }
    expect(geometrySlideX("fan", 0, PITCH)).not.toBeCloseTo(geometrySlideX("fan", 0.5, PITCH), 3);
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
});
