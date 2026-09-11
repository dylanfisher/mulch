/**
 * @role What the two fractal coordinates actually are: that the escape field is one continuous
 *   field rather than a set of steps, that the inside of the set has a coordinate at all, that the
 *   nested one recurses by exactly one level per scale, that where the picture stands is the
 *   population standing and what its rows *are* is the automators holding them, and that it travels
 *   between the two at one rate (0248).
 * @instead That a picture cut along one of them is *drawn* — that the tile is baked, keyed and
 *   placed → src/ui/moireCanvas.test.ts and src/ui/moireCanvasTiles.test.ts. That the row exists at
 *   all, travels through the one per-frame read and is cut by what the output sounds like →
 *   src/ui/moireRowsFractal.test.ts and src/ui/moireRowsField.test.ts.
 */
// Over the per-function cap, and what is over it is a coordinate's own list of cases: each one is
// the arithmetic it measures plus the sweep it measures it across, and a helper per case would be a
// fixture nothing else reads. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines-per-function
// And over the soft file cap, for the reason the file it tests is (0007): this is one coordinate's
// whole arithmetic, and the flight cannot be read apart from the breath it stands beside any more
// than a stop can be read apart from the band it is a fraction of.
// oxlint-disable max-lines
import { describe, expect, it } from "vitest";

import { fold } from "@/lib/copy";
import { DRIFT_PROFILES, profileBlock } from "@/lib/moireProfiles";
import {
  escapeTurns,
  FRACTAL_BITE,
  FRACTAL_EDGE,
  FRACTAL_FLIGHT,
  FRACTAL_FLIGHT_SECS,
  fractalFlight,
  FRACTAL_ZOOM_STEPS,
  FRACTAL_WANDER,
  FRACTAL_GEOMETRIES,
  FRACTAL_LEVEL_CYCLES,
  FRACTAL_OPENING,
  FRACTAL_RATIO_BAND,
  FRACTAL_ROAM,
  FRACTAL_ROAM_SECS,
  fractalCut,
  fractalKeyed,
  fractalKind,
  fractalRest,
  fractalRoamInto,
  fractalRule,
  fractalSeed,
  fractalSeedInto,
  fractalShape,
  fractalStopsInto,
  fractalStopsRest,
  FRACTAL_TRAVEL,
  fractalTravelInto,
  fractalTravelSecs,
  type FractalStops,
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

/** Where a run's population stands on the plane, as the four stops it folds to, written out. */
const stopsOf = (grown: FractalRun): string => {
  const out = fractalStopsRest();
  fractalStopsInto(out, fractalShape(grown));
  return `${out.cx}/${out.cy}/${out.ratio}/${out.turn}`;
};

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
        const here = escapeTurns(u, v, SEED.cx, SEED.cy, 1, 0);
        low = Math.min(low, here);
        high = Math.max(high, here);
        apart.push(Math.abs(escapeTurns(u + across, v, SEED.cx, SEED.cy, 1, 0) - here));
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
      inside.push(escapeTurns(-0.4 + (0.8 * step) / 64, 0.05, -0.2, 0, 4, 0));
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
      expect(Number.isFinite(escapeTurns(u ?? 0, v ?? 0, SEED.cx, SEED.cy, 1, 0))).toBe(true);
    }
  });

  /** A zoom opens the picture into the structure: the same field read across a smaller plane. */
  it("opens into itself as the zoom carries it", () => {
    const wide = escapeTurns(0.6, 0.4, SEED.cx, SEED.cy, 1, 0);
    const near = escapeTurns(0.6, 0.4, SEED.cx, SEED.cy, FRACTAL_OPENING.value, 0);
    expect(near).not.toBeCloseTo(wide, 3);
    // And the point the picture opens about does not move, which is what makes it a zoom.
    expect(escapeTurns(0, 0, SEED.cx, SEED.cy, FRACTAL_OPENING.value, 0)).toBeCloseTo(
      escapeTurns(0, 0, SEED.cx, SEED.cy, 1, 0),
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
        const here = nestedTurns(u, v, cx, cy, ratio, turn, 1, 0);
        low = Math.min(low, here);
        high = Math.max(high, here);
        worst = Math.max(
          worst,
          Math.abs(nestedTurns(u + 4 / 200, v, cx, cy, ratio, turn, 1, 0) - here),
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
    expect(nestedTurns(-0.8, 0.3, cx, cy, ratio, turn, 1, 0)).toBeCloseTo(
      nestedTurns(0.8, 0.3, cx, cy, ratio, turn, 1, 0),
      12,
    );
  });

  /**
   * 0268: a level is ruled coarsely enough that the cell is what the eye reads, where 0246 ruled it
   * at the lattice's own dozen and the cells were filigree inside a weave. What buys 0246's beat
   * back is the boundary itself, lit — the level's own fringes crowd onto it, so the contour is cut
   * as a grating at the lattice's pitch and no ink is laid over the picture to draw it.
   */
  it("rules a cell coarsely and lights the boundary of it", () => {
    // Coarser than the dozen 0246 spent, which is what makes the cell rather than the fringe the
    // visible unit of the structure.
    expect(FRACTAL_LEVEL_CYCLES).toBeLessThan(12);
    // One whole level is still exactly that many fringes, wherever it is read: the bend is inside
    // the level and never in total, which is what the flight's wrap rests on.
    for (const level of [0, 0.37, 2.5, -1.8]) {
      expect(fractalRule(level + 1) - fractalRule(level)).toBeCloseTo(FRACTAL_LEVEL_CYCLES, 12);
    }
    // It rises everywhere, so no level's edge is a hard ring: past `1 / TAU` the bend doubles back.
    expect(FRACTAL_EDGE).toBeLessThan(1 / (2 * Math.PI));
    const step = 1 / 4096;
    let tightest = Number.POSITIVE_INFINITY;
    let slackest = 0;
    let edge = 0;
    let middle = 0;
    for (let at = 0; at < 4096; at += 1) {
      const level = at / 4096;
      const slope = (fractalRule(level + step) - fractalRule(level)) / step;
      expect(slope).toBeGreaterThan(0);
      tightest = Math.min(tightest, slope);
      slackest = Math.max(slackest, slope);
      if (at === 0) edge = slope;
      if (at === 2048) middle = slope;
    }
    // And the crowding is on the boundary and not somewhere in the middle of the cell.
    expect(edge).toBeCloseTo(slackest, 6);
    expect(middle).toBeCloseTo(tightest, 6);
    expect(edge / middle).toBeGreaterThan(4);
  });

  /** A ratio at or under one would open the fold by nothing and never escape: it is held off. */
  it("holds its own ratio over one", () => {
    expect(Number.isFinite(nestedTurns(0.4, 0.2, 0.3, 0.3, 1, 0, 1, 0))).toBe(true);
    expect(Number.isFinite(nestedTurns(0.4, 0.2, 0.3, 0.3, 0, 0, 1, 0))).toBe(true);
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

  // P356 step 10: the rest takes a seed of its own, so a run that reads the plane for itself reads
  // its own place along the valley (0360).
  it("stands the rest at a seed's own valley, and at the notch itself with no seed", () => {
    expect(fractalRest(0)).toEqual(fractalRest());
    const seeds = Array.from({ length: 64 }, (_each, at) => fold(`a run standing ${at}`));
    const seen = new Set(seeds.map((seed) => `${fractalRest(seed).cx}/${fractalRest(seed).cy}`));
    // Many valleys, all of them inside the band the roam wanders in, and one seed is one valley.
    expect(seen.size).toBeGreaterThan(8);
    for (const seed of seeds) {
      const stood = fractalRest(seed);
      expect(Math.abs(stood.cx - fractalRest().cx)).toBeLessThanOrEqual(FRACTAL_WANDER);
      expect(Math.abs(stood.cy - fractalRest().cy)).toBeLessThanOrEqual(FRACTAL_WANDER);
      expect(stood.zoom).toBe(1);
      expect(fractalRest(seed)).toEqual(stood);
    }
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
    expect(fractalZoom(0.5)).toBeCloseTo(FRACTAL_OPENING.value, 12);
  });

  /** And it is stepped, so a frame that has barely moved asks for no bake at all. */
  it("stands still between two stops", () => {
    expect(fractalZoom(0.2)).toBe(fractalZoom(0.2 + 1e-6));
    // Across a whole turn it reaches many stops, so the picture does open rather than sit.
    const stops = new Set<number>();
    for (let at = 0; at < 200; at += 1) stops.add(fractalZoom(at / 200));
    expect(stops.size).toBeGreaterThan(8);
  });

  /**
   * 0268: the breath is the only scale left on the picture, so its band is the whole depth the
   * structure is ever seen at — and the rung the eye is asked to swallow does not move with it.
   * `4 ** (1 / 12)` and `8 ** (1 / 18)` are both `2 ** (1 / 6)`.
   */
  it("opens through a wider band on the rung it always had", () => {
    expect(FRACTAL_OPENING.value).toBeGreaterThan(4);
    expect(FRACTAL_OPENING.value ** (1 / FRACTAL_ZOOM_STEPS.value)).toBeCloseTo(2 ** (1 / 6), 12);
  });

  /**
   * And what a stop of it actually is, in both coordinates: the same structure read across a plane
   * of another size. That is why a step of the ladder costs the eye nothing — nothing in the
   * picture is a different structure between two stops, only a nearer or a wider one.
   */
  it("reads two of its stops as the same structure scaled", () => {
    const { cx, cy, ratio, turn } = SEED;
    const zoom = fractalZoom(0.3);
    expect(zoom).toBeGreaterThan(1);
    for (const [u, v] of [
      [0.4, -0.6],
      [1.2, 0.9],
    ]) {
      expect(nestedTurns(u ?? 0, v ?? 0, cx, cy, ratio, turn, zoom, 0)).toBeCloseTo(
        nestedTurns((u ?? 0) * zoom, (v ?? 0) * zoom, cx, cy, ratio, turn, 1, 0),
        9,
      );
      expect(escapeTurns(u ?? 0, v ?? 0, cx, cy, zoom, 0)).toBeCloseTo(
        escapeTurns((u ?? 0) / zoom, (v ?? 0) / zoom, cx, cy, 1, 0),
        9,
      );
    }
  });
});

describe("the flight", () => {
  /** How long the picture takes to cross one whole level of its own structure. */
  const LEVEL_SECS = FRACTAL_FLIGHT_SECS.value / FRACTAL_FLIGHT.value;

  /**
   * 0268: the flight is a travel through the row's own coordinate and no longer a second scale
   * multiplied into the breath, so it never comes back. One unit of it is one whole level of the
   * structure, and it climbs that level as the deck sounds.
   */
  it("travels a whole level of the structure and never returns", () => {
    // A yard that has sounded nothing has flown nowhere.
    expect(fractalFlight(0)).toBe(0);
    expect(fractalFlight(LEVEL_SECS / 2)).toBeCloseTo(0.5, 12);
    // Across one level it climbs the whole of it, and every reading is inside its own level.
    let last = -1;
    for (let at = 0; at < 60; at += 1) {
      const now = fractalFlight((LEVEL_SECS * at) / 60);
      expect(now).toBeGreaterThanOrEqual(last);
      expect(now).toBeGreaterThanOrEqual(0);
      expect(now).toBeLessThanOrEqual(1);
      last = now;
    }
    expect(last).toBe(1);
  });

  /**
   * And the wrap is exactly invisible, which is the whole of why a travel may dive where a scale
   * may not (0261): a grating repeats every cycle at every scale, and one level is
   * `FRACTAL_LEVEL_CYCLES` fringes — a whole number — so the coordinate at the top of a level and
   * at the bottom of the next are the same coordinate, in both fractal geometries.
   */
  it("wraps at a whole number of fringes, in both coordinates", () => {
    expect(FRACTAL_LEVEL_CYCLES).toBe(Math.round(FRACTAL_LEVEL_CYCLES));
    const { cx, cy, ratio, turn } = SEED;
    for (const [u, v] of [
      [0.3, -0.7],
      [1.4, 0.2],
      [-0.9, 1.1],
    ]) {
      const nested = (fly: number): number =>
        nestedTurns(u ?? 0, v ?? 0, cx, cy, ratio, turn, 1, fly);
      const escape = (fly: number): number => escapeTurns(u ?? 0, v ?? 0, cx, cy, 1, fly);
      expect(nested(1) - nested(0)).toBeCloseTo(FRACTAL_LEVEL_CYCLES, 9);
      expect(escape(1) - escape(0)).toBeCloseTo(FRACTAL_LEVEL_CYCLES, 9);
      // Which is the thing that matters: the tile is the same tile, whatever the profile.
      for (const profile of DRIFT_PROFILES) {
        expect(profileBlock(profile, nested(1))).toBeCloseTo(profileBlock(profile, nested(0)), 9);
        expect(profileBlock(profile, escape(1))).toBeCloseTo(profileBlock(profile, escape(0)), 9);
      }
    }
  });

  /**
   * Seconds and never a count of the picture's own windows, which is the whole of why it takes no
   * period: a window is recomputed from the longest row in the picture, so a run turnover moves it
   * — and an unbounded sounding divided by a number that moves is many whole turns of jump an hour
   * into a performance. One level later is the same place in a level, whatever the rows are doing.
   */
  it("is a length of the performance and not a count of the picture's windows", () => {
    for (const secs of [7, 60, 137, 1200, 3600]) {
      expect(fractalFlight(secs + LEVEL_SECS)).toBe(fractalFlight(secs));
      expect(fractalFlight(secs)).toBeGreaterThanOrEqual(0);
      expect(fractalFlight(secs)).toBeLessThanOrEqual(1);
    }
  });

  /** Nothing sounded, and a halt, are the same picture: the one the breath alone draws. */
  it("stands still with nothing sounded", () => {
    expect(fractalFlight(-4)).toBe(0);
    expect(fractalFlight(0)).toBe(0);
  });

  /**
   * And it is stepped onto the ladder the breath is on, because it rides into a fractal row's tile
   * key: unstepped it would ask for a picture-sized bake at every frame of a whole performance.
   */
  it("moves one stop of the picture's own ladder at a time", () => {
    const stop = 1 / FRACTAL_ZOOM_STEPS.value;
    let last = fractalFlight(0);
    let moved = 0;
    for (let at = 1; at <= 4000; at += 1) {
      const now = fractalFlight((2 * FRACTAL_FLIGHT_SECS.value * at) / 4000);
      // Either one rung up, or the wrap — which is the same tile as the rung it wrapped from.
      const step = now >= last ? now - last : now + 1 - last;
      expect(step).toBeLessThanOrEqual(stop + 1e-9);
      if (now !== last) moved += 1;
      last = now;
    }
    // And it does fly: two whole flights climb every rung of six whole levels, and wrap once at
    // the top of each — the wrap being the one move that is not a move, since it is the same tile.
    expect(moved).toBe(2 * FRACTAL_FLIGHT.value * (FRACTAL_ZOOM_STEPS.value + 1));
  });
});

/** Whether `n` has no measure but itself — what makes two roam clocks never come round together. */
const prime = (n: number): boolean => {
  for (let d = 2; d * d <= n; d += 1) if (n % d === 0) return false;
  return n > 1;
};

describe("the roam", () => {
  /**
   * 0273: the roam shares the band with the population's travel and re-centres both, so a picture
   * that has sounded nothing stands on the notch exactly as it did before there was a roam, and
   * stays there however the sounding is read while the deck is halted.
   */
  it("rests on the notch with nothing sounded, and halts there", () => {
    const out = fractalStopsRest();
    fractalRoamInto(out, fractalStopsRest(), 0);
    expect(out).toEqual(fractalStopsRest());
    fractalRoamInto(out, fractalStopsRest(), -3);
    expect(out).toEqual(fractalStopsRest());
    // And a population that has travelled keeps its own half of the band, from the notch.
    fractalRoamInto(out, { cx: 1, cy: 0, ratio: 0.3, turn: 0.7 }, 0);
    expect(out.cx).toBeCloseTo(0.5 + 0.5 * (1 - FRACTAL_ROAM.value), 12);
    expect(out.cy).toBeCloseTo(0.5 - 0.5 * (1 - FRACTAL_ROAM.value), 12);
  });

  /** The band is the bound 0272 measured, and the roam widens it by nothing at either extreme. */
  // Nine stops over every second of both clocks is ~105k roams with four assertions each: three
  // seconds here, past the five-second default on a hosted runner, so the sweep names its own time.
  it("stays inside the band with the travel at any stop, and reaches its edge", () => {
    const out = fractalStopsRest();
    let widest = 0;
    for (const cx of [0, 0.5, 1]) {
      for (const cy of [0, 0.5, 1]) {
        for (
          let sounding = 0;
          sounding < FRACTAL_ROAM_SECS[0] * FRACTAL_ROAM_SECS[1];
          sounding += 1
        ) {
          fractalRoamInto(out, { cx, cy, ratio: 0, turn: 0 }, sounding);
          expect(out.cx).toBeGreaterThanOrEqual(0);
          expect(out.cx).toBeLessThanOrEqual(1);
          expect(out.cy).toBeGreaterThanOrEqual(0);
          expect(out.cy).toBeLessThanOrEqual(1);
          widest = Math.max(widest, out.cx, out.cy);
        }
      }
    }
    expect(widest).toBeCloseTo(1, 3);
  }, 30_000);

  /** Two lengths with no common measure, so the figure the picture roams is never the same twice. */
  it("roams on two clocks that never come round together", () => {
    const [across, down] = FRACTAL_ROAM_SECS;
    expect(prime(across)).toBe(true);
    expect(prime(down)).toBe(true);
    expect(across).not.toBe(down);
    // One clock round is the other clock somewhere else entirely.
    const out = fractalStopsRest();
    fractalRoamInto(out, fractalStopsRest(), across);
    expect(out.cx).toBeCloseTo(0.5, 9);
    expect(out.cy).not.toBeCloseTo(0.5, 2);
  });

  it("leaves the ratio and the turn to the population", () => {
    const out = fractalStopsRest();
    fractalRoamInto(out, { cx: 0.5, cy: 0.5, ratio: 0.2, turn: 0.9 }, 37);
    expect(out.ratio).toBe(0.2);
    expect(out.turn).toBe(0.9);
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

describe("the travel", () => {
  /**
   * 0248: the stops are what travels and the seed is what they are denormalized into, so the rest
   * of one has to be the rest of the other or a picture nothing has moved would stand somewhere
   * else than the picture that has nothing standing in it.
   */
  it("rests exactly where the seed rests", () => {
    const out = fractalRest();
    fractalSeedInto(out, fractalStopsRest(), 1, 0);
    expect(out).toEqual(fractalRest());
    // And a zoom of nothing is still a zoom of one, wherever the stops are.
    fractalSeedInto(out, { cx: 1, cy: 0, ratio: 1, turn: 0 }, 0, 0);
    expect(out.zoom).toBe(1);
    expect(out.ratio).toBeCloseTo(FRACTAL_RATIO_BAND[1], 12);
  });

  /** Half the window, off the length the picture already has, and nought where there is none. */
  it("is a fraction of the window and never a clock of its own", () => {
    expect(fractalTravelSecs(20)).toBeCloseTo(20 * FRACTAL_TRAVEL.value, 12);
    expect(fractalTravelSecs(0)).toBe(0);
    expect(fractalTravelSecs(-4)).toBe(0);
  });

  /**
   * One rate for all four stops, and it arrives: an exponential would never land, and another
   * population arrives every twenty seconds or so.
   */
  it("moves every stop at one rate and arrives inside the window", () => {
    const at = fractalStopsRest();
    const to: FractalStops = { cx: 1, cy: 0, ratio: 1, turn: 0 };
    // A quarter of the way, in the one unit every stop and the ground's own centre share.
    fractalTravelInto(at, to, 1, 4);
    expect(at).toEqual({ cx: 0.75, cy: 0.25, ratio: 0.25, turn: 0.25 });
    // The distance travelled is the distance jumped: a stop half the plane away takes twice as
    // long as one a quarter away, at the same rate.
    fractalTravelInto(at, to, 1, 4);
    expect(at.cy).toBe(0);
    expect(at.turn).toBe(0);
    expect(at.cx).toBeCloseTo(1, 12);
    expect(at.ratio).toBeCloseTo(0.5, 12);
    fractalTravelInto(at, to, 4, 4);
    expect(at).toEqual(to);
  });

  /** And it arrives outright where there is no travel to time it against. */
  it("stands on the population where there is no window", () => {
    const at = fractalStopsRest();
    const to: FractalStops = { cx: 0.2, cy: 0.3, ratio: 0.4, turn: 0.6 };
    fractalTravelInto(at, to, 0.5, 0);
    expect(at).toEqual(to);
  });

  /**
   * The identity of the rows and the place they stand are two different reads of one run: a place
   * arriving moves the picture across the plane, and only an automator arriving swings the rows.
   */
  it("keeps the rows on the automators while the picture travels off the places", () => {
    const one = new Map([["an automator", [{ instance: "a delay", presence: 1 }]]]);
    const two = new Map([
      [
        "an automator",
        [
          { instance: "a delay", presence: 1 },
          { instance: "a reverb", presence: 1 },
        ],
      ],
    ]);
    const another = new Map([
      ...one,
      ["another automator", [{ instance: "a filter", presence: 1 }]],
    ]);
    expect(fractalKind(two)).toBe(fractalKind(one));
    expect(fractalShape(two)).not.toBe(fractalShape(one));
    expect(fractalKind(another)).not.toBe(fractalKind(one));
    // And the stops those identities fold to move with the population, not with the rack.
    expect(stopsOf(two)).not.toBe(stopsOf(one));
    // Every stop is a fraction of its own band and nothing is outside one.
    const out = fractalStopsRest();
    fractalStopsInto(out, fractalShape(two));
    for (const value of [out.cx, out.cy, out.ratio, out.turn]) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  /**
   * And what rides through to a tile's key is what the bake actually reads: an escape row is
   * `escapeTurns`, which takes four of the six numbers, so its key carries four.
   */
  it("keys a row by the stops its own coordinate reads and no others", () => {
    const seed = fractalSeed(fold("a run standing somewhere"), 2);
    expect(fractalKeyed("escape", seed)).toBe(`|${seed.cx}|${seed.cy}|${seed.zoom}|${seed.fly}`);
    expect(fractalKeyed("nested", seed)).toBe(
      `|${seed.cx}|${seed.cy}|${seed.ratio}|${seed.turn}|${seed.zoom}|${seed.fly}`,
    );
    expect(fractalKeyed("linear", seed)).toBe("");
    // And every coordinate that reads a seed keys on one: a third fractal geometry added to the
    // list and forgotten in `fractalKeyed` would give every structure it draws one shared tile.
    for (const geometry of FRACTAL_GEOMETRIES) expect(fractalKeyed(geometry, seed)).not.toBe("");
    // A ratio that only a nested row reads never reaches an escape row's key.
    const turned = { ...seed, ratio: seed.ratio + 1, turn: seed.turn + 0.1 };
    expect(fractalKeyed("escape", turned)).toBe(fractalKeyed("escape", seed));
    expect(fractalKeyed("nested", turned)).not.toBe(fractalKeyed("nested", seed));
  });
});
