/**
 * @role What the two fractal coordinates actually are: that the escape field is one continuous
 *   field rather than a set of steps, that the inside of the set has a coordinate at all, that the
 *   nested one recurses by exactly one level per scale, and that a seed is the population standing
 *   and nothing else.
 * @instead That a picture cut along one of them is *drawn* — that the tile is baked, keyed and
 *   placed → src/ui/moireCanvas.test.ts and src/ui/moireCanvasTiles.test.ts. That the row exists at
 *   all and is cut by what the output sounds like → src/ui/moireRowsField.test.ts.
 */
import { describe, expect, it } from "vitest";

import { fold } from "@/lib/copy";
import {
  escapeTurns,
  FRACTAL_BITE,
  FRACTAL_WANDER,
  FRACTAL_GEOMETRIES,
  FRACTAL_LEVEL_CYCLES,
  FRACTAL_OPENING,
  FRACTAL_RATIO_BAND,
  fractalCut,
  fractalRest,
  fractalSeed,
  fractalShape,
  fractalZoom,
  isFractalGeometry,
  nestedTurns,
  runStanding,
  type FractalRun,
} from "./moireFractal.ts";

/** A run standing `presence` at each of the places named. */
const run = (...places: readonly (readonly [string, number])[]): FractalRun =>
  new Map([["an automator", places.map(([instance, presence]) => ({ instance, presence }))]]);

const SEED = fractalSeed(fold("a run of three standing"), 1);

describe("the escape coordinate", () => {
  /**
   * The whole of why the bailout is 256 and not 2, and why the count is banded on its logarithm:
   * both are what make this a *grating* rather than a staircase. A smooth escape count taken at a
   * small bailout steps by a visible fraction of a cycle wherever the iteration count ticks over,
   * and banded linearly the contours crowd past a pixel at the boundary while the open plane gets
   * two of them.
   *
   * **And the density is the claim, not smoothness.** The field is cut as fine as the lattice it
   * beats against on purpose (`FRACTAL_BAND_CYCLES`) — tens of cycles across the picture, against
   * the lattice's own ninety — because two gratings only fringe into something slow when their
   * spacings are close (`PITCH_COMPRESS`, src/lib/moireGrating.ts). A field an order coarser does
   * not beat against the picture at all, it sits over it, which is what a mask did (0246). So what
   * is asserted is the band: enough cycles to be the picture's structure, and a median step small
   * enough that half of it is bands rather than noise.
   */
  it("is cut as fine as the lattice it beats against", () => {
    const apart: number[] = [];
    const across = 4 / 200;
    let low = Number.POSITIVE_INFINITY;
    let high = Number.NEGATIVE_INFINITY;
    for (let down = 0; down < 200; down += 1) {
      const v = -1 + (2 * down) / 200;
      for (let step = 0; step < 199; step += 1) {
        const u = -2 + across * step;
        const here = escapeTurns(u, v, SEED.cx, SEED.cy, 1);
        low = Math.min(low, here);
        high = Math.max(high, here);
        apart.push(Math.abs(escapeTurns(u + across, v, SEED.cx, SEED.cy, 1) - here));
      }
    }
    apart.sort((one, two) => one - two);
    const at = (share: number): number => apart[Math.floor(share * (apart.length - 1))] ?? 0;
    // Tens of cycles across the picture: the same order the lattice is drawn at, which is the one
    // thing that makes the two fringe rather than stack.
    expect(high - low).toBeGreaterThan(20);
    // And half of it moves by a fifth of a fringe: bands, and not a field of noise.
    expect(at(0.5)).toBeLessThan(0.2);
    // The tail is the boundary, and it is meant to be there: a set's edge is detailed past any
    // resolution, so at a pixel's spacing the field jumps whole fringes there whatever the bailout
    // is. That is the filigree, and it is the one place the lattice cannot resolve.
    expect(at(0.99)).toBeGreaterThan(1);
  });

  /**
   * And why the orbit trap is added at all. The escape count alone is flat everywhere the orbit
   * never leaves, so the inside of the set would be one unbroken window — a shape pasted on the
   * picture rather than structure in it.
   */
  it("gives the inside of the set a coordinate of its own", () => {
    // Stood over the middle of the cardioid, so most of the picture is certainly in the set.
    const inside: number[] = [];
    for (let step = 0; step < 64; step += 1) {
      inside.push(escapeTurns(-0.4 + (0.8 * step) / 64, 0.05, -0.2, 0, 4));
    }
    const spread = Math.max(...inside) - Math.min(...inside);
    // A soft gradient across the middle of the picture rather than one unbroken window. It is
    // gentler than the banding outside the set and it is meant to be: what the orbit settles onto
    // moves smoothly with the point, where what it *escapes* at does not. What matters is that it
    // is not nought — a flat interior is the set reading as a shape laid on the picture, which is
    // exactly the thing this replaced (0246).
    expect(spread).toBeGreaterThan(0.1);
  });

  /** And it answers a number everywhere, including at the one point whose orbit never moves. */
  it("has a value at the origin and at the corners", () => {
    for (const [u, v] of [
      [0, 0],
      [8, 8],
      [-8, 8],
    ]) {
      expect(Number.isFinite(escapeTurns(u ?? 0, v ?? 0, SEED.cx, SEED.cy, 1))).toBe(true);
    }
  });

  /** A zoom opens the picture into the structure: the same field read across a smaller plane. */
  it("opens into itself as the zoom carries it", () => {
    const wide = escapeTurns(0.6, 0.4, SEED.cx, SEED.cy, 1);
    const near = escapeTurns(0.6, 0.4, SEED.cx, SEED.cy, FRACTAL_OPENING);
    expect(near).not.toBeCloseTo(wide, 3);
    // And the point the picture opens about does not move, which is what makes it a zoom.
    expect(escapeTurns(0, 0, SEED.cx, SEED.cy, FRACTAL_OPENING)).toBeCloseTo(
      escapeTurns(0, 0, SEED.cx, SEED.cy, 1),
      12,
    );
  });
});

describe("the nested coordinate", () => {
  /**
   * The whole of what "box within box" is: one level of the structure is exactly
   * `FRACTAL_LEVEL_CYCLES` fringes, wherever it stands and at whatever scale — so the boxes open
   * out from the middle of the picture and the same structure is drawn at every scale it holds.
   * That is a *grating whose axis recurses*, and not a shape repeated.
   */
  it("draws a dozen nesting levels across the picture", () => {
    const { cx, cy, ratio, turn } = SEED;
    let low = Number.POSITIVE_INFINITY;
    let high = Number.NEGATIVE_INFINITY;
    let worst = 0;
    for (let down = 0; down < 200; down += 1) {
      const v = -2 + (4 * down) / 200;
      for (let across = 0; across < 200; across += 1) {
        const u = -2 + (4 * across) / 200;
        const here = nestedTurns(u, v, cx, cy, ratio, turn, 1);
        low = Math.min(low, here);
        high = Math.max(high, here);
        worst = Math.max(
          worst,
          Math.abs(nestedTurns(u + 4 / 200, v, cx, cy, ratio, turn, 1) - here),
        );
      }
    }
    // Many levels, each `FRACTAL_LEVEL_CYCLES` fringes: the boxes are drawn rather than collapsed
    // onto one. A contracting fold read on the size of what it leaves comes to *one* fringe across
    // the whole picture, which is the flat field this escapes outward instead of drawing (0246).
    expect(high - low).toBeGreaterThan(4 * FRACTAL_LEVEL_CYCLES);
    // And the overshoot is what keeps it continuous: no level's edge is a hard ring.
    expect(worst).toBeLessThan(FRACTAL_LEVEL_CYCLES);
  });

  /** And it is a fold and not a winding: the reflection is what copies the levels. */
  it("reads a point and its own reflection alike", () => {
    const { cx, cy, ratio, turn } = SEED;
    expect(nestedTurns(-0.8, 0.3, cx, cy, ratio, turn, 1)).toBeCloseTo(
      nestedTurns(0.8, 0.3, cx, cy, ratio, turn, 1),
      12,
    );
  });

  /** A ratio at or under one would open the fold by nothing and never escape: it is held off. */
  it("holds its own ratio over one", () => {
    expect(Number.isFinite(nestedTurns(0.4, 0.2, 0.3, 0.3, 1, 0, 1))).toBe(true);
    expect(Number.isFinite(nestedTurns(0.4, 0.2, 0.3, 0.3, 0, 0, 1))).toBe(true);
    expect(FRACTAL_RATIO_BAND[0]).toBeGreaterThan(1);
  });
});

describe("the seed", () => {
  /** The identity is the population standing, and every place of it — not one, and not the run. */
  it("is the whole population and moves when any of it does", () => {
    const one = fractalShape(run(["a delay", 1]));
    const two = fractalShape(run(["a delay", 1], ["a reverb", 1]));
    expect(two).not.toBe(one);
    // A place laid but not arrived is not standing, so it is not in the identity either.
    expect(fractalShape(run(["a delay", 1], ["a reverb", 0]))).toBe(one);
    // And the same population is the same identity, read again.
    expect(fractalShape(run(["a delay", 1], ["a reverb", 1]))).toBe(two);
  });

  /** Both coordinates are reachable off a population, which is what makes two of them worth having. */
  it("reaches both coordinates", () => {
    const reached = new Set<string>();
    for (let at = 0; at < 64; at += 1) {
      const shape = fractalShape(run([`a place ${at}`, 1]));
      reached.add(FRACTAL_GEOMETRIES[shape % FRACTAL_GEOMETRIES.length] ?? "");
    }
    expect(reached.size).toBe(FRACTAL_GEOMETRIES.length);
    for (const geometry of FRACTAL_GEOMETRIES) expect(isFractalGeometry(geometry)).toBe(true);
    expect(isFractalGeometry("linear")).toBe(false);
  });

  /** Every slice lands in its own band, and the four of them are independent of one another. */
  it("folds four independent numbers out of one", () => {
    const seen = new Set<string>();
    for (let at = 0; at < 64; at += 1) {
      const seed = fractalSeed(fold(`a run standing ${at}`), 1);
      // The centre never leaves the notch it wanders inside, which is boundary at every scale.
      expect(Math.abs(seed.cx - fractalRest().cx)).toBeLessThanOrEqual(FRACTAL_WANDER);
      expect(Math.abs(seed.cy - fractalRest().cy)).toBeLessThanOrEqual(FRACTAL_WANDER);
      expect(seed.ratio).toBeGreaterThanOrEqual(FRACTAL_RATIO_BAND[0] - 1e-9);
      expect(seed.ratio).toBeLessThanOrEqual(FRACTAL_RATIO_BAND[1] + 1e-9);
      seen.add(`${seed.cx}/${seed.cy}/${seed.ratio}/${seed.turn}`);
    }
    // Better than one seed drawn many times, which would be one structure at every population.
    expect(seen.size).toBeGreaterThan(8);
  });

  /** A zoom of nothing is a zoom of one, so a caller with no phase yet still reads a picture. */
  it("never opens onto nothing", () => {
    expect(fractalSeed(fold("a run"), 0).zoom).toBe(1);
    expect(fractalSeed(fold("a run"), -3).zoom).toBe(1);
    expect(fractalRest().zoom).toBe(1);
  });
});

describe("the opening", () => {
  /**
   * A breath and not a ramp: the row is carried by its phase, and a phase comes round. An opening
   * that ramped would fall back to nothing every turn, which the whole picture would blink on.
   */
  it("comes back where it left, at every turn", () => {
    expect(fractalZoom(0)).toBeCloseTo(fractalZoom(1), 12);
    expect(fractalZoom(0.25)).toBeCloseTo(fractalZoom(0.75), 12);
    expect(fractalZoom(0)).toBeCloseTo(1, 12);
    expect(fractalZoom(0.5)).toBeCloseTo(FRACTAL_OPENING, 12);
  });

  /** And it is stepped, so a frame that has barely moved asks for no bake at all. */
  it("stands still between two stops", () => {
    expect(fractalZoom(0.2)).toBe(fractalZoom(0.2 + 1e-6));
    // Across a whole turn it reaches many stops, so the picture does open rather than sit.
    const stops = new Set<number>();
    for (let at = 0; at < 200; at += 1) stops.add(fractalZoom(at / 200));
    expect(stops.size).toBeGreaterThan(8);
  });
});

describe("how hard it cuts", () => {
  /** Nothing where nothing stands, the whole bite at the reach, and never past it. */
  it("ramps over the reach and stops there", () => {
    expect(fractalCut(0)).toBe(0);
    expect(fractalCut(1)).toBeCloseTo(FRACTAL_BITE / 2, 9);
    expect(fractalCut(2)).toBeCloseTo(FRACTAL_BITE, 9);
    expect(fractalCut(9)).toBeCloseTo(FRACTAL_BITE, 9);
  });

  /** And the standing it reads is every place everywhere, clamped, and never a count of them. */
  it("adds up every place standing", () => {
    expect(runStanding(run(["a", 0.5], ["b", 0.25]))).toBeCloseTo(0.75, 9);
    expect(runStanding(run(["a", 4]))).toBe(1);
    expect(runStanding(new Map())).toBe(0);
  });
});
