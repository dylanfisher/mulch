/**
 * @role Tests that the picture folds into itself once per run of effects growing inside it: that a
 *   run of nothing folds nothing, that the depth is the summed presence of every standing place and
 *   moves with it rather than stepping, that two runs compose into one stack rather than replacing
 *   each other, and that the cap holds against a run at its ceiling.
 */
import { describe, expect, it } from "vitest";

import { fold } from "@/lib/copy";
import {
  DRIFT_FOLD_REACH,
  FOLD_FAINTEST,
  FOLD_KEEP,
  FOLD_RATIO_BAND,
  FOLD_TURN_BAND,
  foldInto,
  foldLevels,
  foldNothing,
  foldOwner,
  foldPasses,
  foldRatio,
  foldScale,
  foldShare,
  foldTurned,
  foldTurns,
  type FoldRun,
  type FractalFold,
} from "@/lib/moireFractal";

/** One run of `presence` values, held by the instance `id` — the shape `DeckPeek.grown` is. */
const run = (...held: readonly (readonly [string, readonly number[]])[]): FoldRun =>
  new Map(held.map(([id, values]) => [id, values.map((presence) => ({ presence }))]));

/** Every entry's own depth added up — which the fold also answers whole, as `depth`. */
const depthOf = (into: FractalFold): number => {
  let deep = 0;
  for (let at = 0; at < into.folds; at += 1) deep += into.depths[at] ?? 0;
  expect(into.depth).toBeCloseTo(deep, 9);
  return deep;
};

// One flat list of the fold's own cases (0007).
// oxlint-disable-next-line max-lines-per-function
describe("moireFractal", () => {
  it("folds nothing at all for a run holding nothing", () => {
    const out = foldNothing();
    foldInto(out, new Map());
    expect(out.folds).toBe(0);
    // And for a run whose places are all still arriving: a place at no presence is heard by nobody,
    // so it is no level of the picture either.
    foldInto(out, run(["one", [0, 0]]));
    expect(out.folds).toBe(0);
    expect(out.depth).toBe(0);
    expect(foldPasses(0)).toBe(0);
  });

  it("folds as deep as the presence standing, and moves with it rather than stepping", () => {
    const out = foldNothing();
    let last = 0;
    // A place fading in across its own ramp: the depth follows it, one continuous number, and the
    // fold is a whole level deeper by the time it has fully arrived.
    for (let at = 0; at <= 20; at += 1) {
      foldInto(out, run(["one", [at / 20]]));
      const deep = depthOf(out);
      expect(deep).toBeGreaterThanOrEqual(last);
      expect(deep - last).toBeLessThanOrEqual(1 / 20 + 1e-9);
      last = deep;
    }
    expect(last).toBeCloseTo(1, 9);
    // The whole of it is the summed presence of every standing place, so six half-arrived places
    // are three levels exactly as three arrived ones are.
    foldInto(out, run(["one", [0.5, 0.5, 0.5, 0.5, 0.5, 0.5]]));
    expect(depthOf(out)).toBeCloseTo(3, 9);
  });

  it("composes two runs into one stack rather than drawing one of them twice", () => {
    const out = foldNothing();
    foldInto(out, run(["one", [0.6]]));
    const alone = depthOf(out);
    // The second run deepens what the first is already drawing…
    foldInto(out, run(["one", [0.6]], ["three", [0.5]]));
    expect(out.folds).toBe(2);
    expect(depthOf(out)).toBeCloseTo(alone + 0.5, 9);
    expect(out.depths[0]).toBeCloseTo(0.6, 9);
    // Two runs a level apiece are two cells of the one ladder, each aimed with its own spiral —
    // which is what "composed into one stack" has to mean if it is to mean anything.
    foldInto(out, run(["one", [1]], ["three", [1]]));
    expect(foldPasses(out.depth)).toBe(2);
    expect(foldOwner(out, 0)).toBe(0);
    expect(foldOwner(out, 1)).toBe(1);
    // …and turns it somewhere else: each spiral is folded off its own holding instance's id, so two
    // automators are two spirals and never one drawn twice.
    expect(foldRatio(fold("one"))).not.toBe(foldRatio(fold("three")));
    expect(foldTurns(fold("one"))).not.toBe(foldTurns(fold("three")));
    // Inside their bands whatever the id, and never a turn of nothing — a level laid exactly on the
    // one outside it is a doubled copy and not a picture inside a picture.
    for (let id = 0; id < 500; id += 1) {
      const seed = fold(`instance ${id}`);
      expect(foldRatio(seed)).toBeGreaterThanOrEqual(FOLD_RATIO_BAND[0]);
      expect(foldRatio(seed)).toBeLessThanOrEqual(FOLD_RATIO_BAND[1]);
      expect(Math.abs(foldTurns(seed))).toBeGreaterThan(0);
      expect(Math.abs(foldTurns(seed))).toBeLessThanOrEqual(FOLD_TURN_BAND[1]);
    }
  });

  it("holds the whole picture to the cap, and falls back evenly to get there", () => {
    const out = foldNothing();
    // Four automators holding six arrived places apiece is twenty-four levels asked for.
    foldInto(
      out,
      run(
        ["one", [1, 1, 1, 1, 1, 1]],
        ["two", [1, 1, 1, 1, 1, 1]],
        ["three", [1, 1, 1, 1, 1, 1]],
        ["four", [1, 1, 1, 1, 1, 1]],
      ),
    );
    expect(out.folds).toBe(4);
    expect(depthOf(out)).toBeCloseTo(DRIFT_FOLD_REACH, 9);
    // Evenly: every run got the same share of what it asked for, so a busy automator reads as
    // shallower rather than as stopped.
    for (let at = 0; at < out.folds; at += 1) {
      expect(out.depths[at]).toBeCloseTo(DRIFT_FOLD_REACH / 4, 9);
    }
    // And a run under the cap is left exactly as it asked.
    foldInto(out, run(["one", [1]], ["two", [0.25]]));
    expect(depthOf(out)).toBeCloseTo(1.25, 9);
    expect(out.folds).toBe(2);
    // The arrays past `folds` are the last read's leavings and are never a length reset (0070).
    expect(out.depths.length).toBe(4);
    // And the cost is bounded by the picture's own depth however many runs are up: forty automators
    // each barely arriving is a shallow fold and not forty picture-sized blits.
    const many = new Map(
      Array.from({ length: 40 }, (_, at) => [`run ${at}`, [{ presence: 0.05 }]] as const),
    );
    foldInto(out, many);
    expect(out.folds).toBe(40);
    expect(out.depth).toBeCloseTo(2, 9);
    expect(foldPasses(out.depth)).toBeLessThanOrEqual(DRIFT_FOLD_REACH);
    // Two cells of ink and, where the sum lands a rounding error above two, a third too faint for
    // the canvas's own alpha byte to carry — which the painter does not pay for.
    expect(foldShare(out.depth, 2)).toBeLessThan(FOLD_FAINTEST);
    // A run shallower than a whole pass still deepens the picture; what it does not get is a level
    // cut to its own spiral.
    expect(foldOwner(out, 0)).toBe(0);
    expect(foldOwner(out, 1)).toBeGreaterThan(0);
  });

  it("doubles the levels at every pass, and lays each at its own share", () => {
    // A linear number of blits for a geometric depth: the cost of what is drawn is its log2.
    expect(foldLevels(0)).toBe(1);
    expect(foldLevels(3)).toBe(8);
    expect(foldPasses(2)).toBe(2);
    expect(foldPasses(2.25)).toBe(3);
    // Each pass is aimed at exactly the level it starts on.
    expect(foldScale(0.5, 2)).toBeCloseTo(0.5 ** 4, 9);
    expect(foldTurned(0.1, 2)).toBeCloseTo(0.4, 9);
    // A whole pass is laid at `FOLD_KEEP` once per level it carries, and the last pass of a fold
    // that does not come to a whole number at the fraction left over — which is the outermost
    // level's own alpha, and what makes a place arriving a fade rather than a step.
    expect(foldShare(2, 0)).toBeCloseTo(FOLD_KEEP, 9);
    expect(foldShare(2, 1)).toBeCloseTo(FOLD_KEEP ** 2, 9);
    expect(foldShare(2.5, 2)).toBeCloseTo(FOLD_KEEP ** 4 * 0.5, 9);
    // Under one at every level, so the stack falls away instead of unioning the field to opaque.
    expect(FOLD_KEEP).toBeLessThan(1);
    expect(foldShare(1, 1)).toBe(0);
    // And a level too faint for a canvas's alpha byte is a blit that lays nothing.
    expect(FOLD_FAINTEST).toBe(1 / 255);
    expect(foldShare(0.001, 0)).toBeLessThan(FOLD_FAINTEST);
  });
});
