/**
 * @role Tests the plane folded for the automators standing: that a fold closes, that a fold onto
 *   folds is the next power of two images, and that the ladder a fold arrives on has one bake per
 *   step and stops at the cap.
 * @instead Where a curved row is actually folded before it is cut → src/lib/moireGeometry.test.ts.
 */
import { describe, expect, it } from "vitest";

import { DRIFT_STEPS, TAU } from "./moire.ts";
import { FOLD_CAP, foldPlane, foldsOf, kaleido, steppedFolds, type Folded } from "./moireFold.ts";

/**
 * The number of distinct places a ring of points lands on once folded, at a pixel's tolerance. The
 * ring is sampled half a step off the axes, so every mirror line a fold may lie on maps the ring
 * onto itself and an image is a point of the ring and never a point between two.
 */
const imagesOf = (folds: number, points = 64): number => {
  const seen = new Set<string>();
  const out: Folded = { u: 0, v: 0 };
  for (let at = 0; at < points; at++) {
    const angle = (TAU * (at + 0.5)) / points;
    foldPlane(out, 0.7 * Math.cos(angle), 0.7 * Math.sin(angle), folds);
    seen.add(`${out.u.toFixed(3)},${out.v.toFixed(3)}`);
  }
  return seen.size;
};

describe("the plane folded for the automators standing", () => {
  it("leaves the plane alone at no fold, and keeps every radius at any", () => {
    const out: Folded = { u: 0, v: 0 };
    foldPlane(out, -0.3, 0.8, 0);
    expect(out).toEqual({ u: -0.3, v: 0.8 });
    for (let folds = 1; folds <= FOLD_CAP; folds++) {
      foldPlane(out, -0.3, 0.8, folds);
      expect(Math.hypot(out.u, out.v)).toBeCloseTo(Math.hypot(-0.3, 0.8));
      expect(out.v).toBeGreaterThanOrEqual(0);
    }
  });

  it("folds a ring of points into half as many images per fold, onto the folds before it", () => {
    // Sixty-four points a fold apart: one fold mirrors them into thirty-two, the next into sixteen,
    // and each fold is a fold of the picture the last one left rather than a new wedge cut from
    // the unfolded plane.
    expect(imagesOf(0)).toBe(64);
    for (let folds = 1; folds <= FOLD_CAP; folds++) expect(imagesOf(folds)).toBe(64 / 2 ** folds);
    // And every image stands inside the wedge the fold count leaves: the whole upper half at one,
    // then a quarter, an eighth, a sixteenth.
    const out: Folded = { u: 0, v: 0 };
    for (let folds = 2; folds <= FOLD_CAP; folds++) {
      const wedge = TAU / 2 ** folds;
      for (let at = 0; at < 64; at++) {
        const angle = (TAU * (at + 0.5)) / 64;
        foldPlane(out, Math.cos(angle), Math.sin(angle), folds);
        expect(Math.atan2(out.v, out.u)).toBeLessThanOrEqual(wedge + 1e-9);
      }
    }
  });

  it("closes only on a whole number of sectors, and takes only a whole number of folds", () => {
    expect(() => kaleido(1, 0, 1)).toThrow("does not close");
    expect(() => kaleido(1, 0, 2.5)).toThrow("does not close");
    const out: Folded = { u: 0, v: 0 };
    expect(() => {
      foldPlane(out, 1, 0, 1.5);
    }).toThrow("not a fold");
    expect(() => {
      foldPlane(out, 1, 0, -1);
    }).toThrow("not a fold");
    expect(() => {
      foldPlane(out, 1, 0, FOLD_CAP + 1);
    }).toThrow("not a fold");
    // And the kernel's fold agrees with the bench's kaleidoscope where both are defined.
    for (let folds = 2; folds <= FOLD_CAP; folds++) {
      foldPlane(out, 0.2, -0.9, folds);
      const [x, y] = kaleido(0.2, -0.9, 2 ** (folds - 1));
      expect(out.u).toBeCloseTo(x);
      expect(out.v).toBeCloseTo(y);
    }
  });

  it("asks one fold per automator up to the cap, on a ladder of one bake a step", () => {
    expect(foldsOf(0)).toBe(0);
    expect(foldsOf(1)).toBe(1);
    expect(foldsOf(FOLD_CAP + 3)).toBe(FOLD_CAP);
    // And fractional on the way in, because a fold arriving is a crossfade and not a round (0279).
    expect(foldsOf(0.5)).toBe(0.5);
    expect(foldsOf(-1)).toBe(0);
    const stops = new Set<number>();
    for (let at = 0; at <= 1; at += 1 / 200) stops.add(steppedFolds(at));
    expect(stops.size).toBe(DRIFT_STEPS + 1);
    expect(steppedFolds(FOLD_CAP + 1)).toBe(FOLD_CAP);
    expect(steppedFolds(2)).toBe(2);
  });
});
