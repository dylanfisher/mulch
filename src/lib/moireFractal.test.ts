/**
 * @role Tests that the picture folds into itself: that a yard growing nothing folds nothing at all,
 *   that a run deepens it by the summed presence of every standing place and moves it rather than
 *   stepping it, that every standing place composes its own spiral into one stack rather than
 *   replacing the last, that the
 *   cap holds against runs past the reach and falls back across them evenly, and that the travel
 *   carries every level round without ever jumping.
 */
import { describe, expect, it } from "vitest";

import { fold } from "@/lib/copy";
import {
  DRIFT_FOLD_REACH,
  FOLD_FAINTEST,
  FOLD_BITE,
  FOLD_TRAVEL_TURNS,
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
  foldTravelled,
  foldTurned,
  foldTurns,
  type FoldRun,
  type FractalFold,
} from "@/lib/moireFractal";

/**
 * One run of `presence` values, held by the instance `id` — the shape `DeckPeek.grown` is. Each
 * place gets an id of its own beneath its holder's, which is what the fold seeds its spiral off.
 */
const run = (...held: readonly (readonly [string, readonly number[]])[]): FoldRun =>
  new Map(
    held.map(([id, values]) => [
      id,
      values.map((presence, at) => ({ presence, instance: `${id}/${at}` })),
    ]),
  );

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
  // P182: what an automator does to the picture has to be visible as the automator's doing, and a
  // fold every picture carried was a fold nobody could read as anything's (0243).
  it("folds nothing at all where nothing is growing", () => {
    const out = foldNothing();
    foldInto(out, new Map());
    expect(out.folds).toBe(0);
    expect(depthOf(out)).toBe(0);
    // No depth is no pass, which is no fill: a yard growing nothing pays the fold nothing and draws
    // exactly the picture it drew before there was a fold at all.
    expect(foldPasses(out.depth)).toBe(0);
    // And for a run whose places are all still arriving: a place at no presence is heard by nobody,
    // so it deepens the picture by nothing and is no entry of it either.
    foldInto(out, run(["one", [0, 0]]));
    expect(out.folds).toBe(0);
    expect(depthOf(out)).toBe(0);
  });

  it("deepens by the presence standing, and moves with it rather than stepping", () => {
    const out = foldNothing();
    let last = 0;
    // A place fading in across its own ramp: the depth follows it, one continuous number, and the
    // fold is a whole level deep by the time it has fully arrived.
    for (let at = 0; at <= 20; at += 1) {
      foldInto(out, run(["one", [at / 20]]));
      const deep = depthOf(out);
      expect(deep).toBeGreaterThanOrEqual(last);
      expect(deep - last).toBeLessThanOrEqual(1 / 20 + 1e-9);
      last = deep;
    }
    expect(last).toBeCloseTo(1, 9);
    // The one entry is a real spiral and not the identity: a level laid exactly on the one outside
    // it is a doubled copy and not a picture inside a picture.
    expect(out.ratios[0]).toBeGreaterThanOrEqual(FOLD_RATIO_BAND[0]);
    expect(out.ratios[0]).toBeLessThanOrEqual(FOLD_RATIO_BAND[1]);
    expect(Math.abs(out.turns[0] ?? 0)).toBeGreaterThan(0);
    // What a run asks for is the summed presence of every standing place, so six half-arrived
    // places ask for three levels exactly as three arrived ones do.
    foldInto(out, run(["one", [0.5, 0.5, 0.5, 0.5, 0.5, 0.5]]));
    expect(depthOf(out)).toBeCloseTo(3, 9);
  });

  it("composes every standing place into one stack rather than drawing one of them twice", () => {
    const out = foldNothing();
    // Both runs together stay inside the reach, so what is under test here is composition and not
    // the cap.
    foldInto(out, run(["one", [0.4]]));
    expect(out.folds).toBe(1);
    const alone = depthOf(out);
    // The second run deepens what the first is already drawing…
    foldInto(out, run(["one", [0.4]], ["three", [0.3]]));
    expect(out.folds).toBe(2);
    expect(depthOf(out)).toBeCloseTo(alone + 0.3, 9);
    expect(out.depths[0]).toBeCloseTo(0.4, 9);
    // Each run's levels are its own cells of the one ladder, aimed with its own spiral — which is
    // what "composed into one stack" has to mean if it is to mean anything.
    expect(foldOwner(out, 0)).toBe(0);
    expect(foldOwner(out, 0.5)).toBe(1);
    // …and turns it somewhere else: each spiral is folded off its own *place's* id, so six effects
    // one automator grew are six spirals and never one drawn six times (0243).
    foldInto(out, run(["one", [1, 1, 1, 1, 1, 1]]));
    expect(out.folds).toBe(6);
    const spirals = new Set<string>();
    for (let at = 0; at < out.folds; at += 1) spirals.add(`${out.ratios[at]}/${out.turns[at]}`);
    expect(spirals.size).toBeGreaterThan(1);
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

  it("holds the whole picture to the cap, and falls back evenly across the runs", () => {
    const out = foldNothing();
    // Four automators holding six arrived places apiece is twenty-four entries, one a place, and
    // twenty-four levels asked for.
    foldInto(
      out,
      run(
        ["one", [1, 1, 1, 1, 1, 1]],
        ["two", [1, 1, 1, 1, 1, 1]],
        ["three", [1, 1, 1, 1, 1, 1]],
        ["four", [1, 1, 1, 1, 1, 1]],
      ),
    );
    expect(out.folds).toBe(24);
    expect(depthOf(out)).toBeCloseTo(DRIFT_FOLD_REACH, 9);
    // Evenly: every entry got the same share of the reach, so a busy automator reads as shallower
    // rather than as stopped.
    for (let at = 0; at < out.folds; at += 1) {
      expect(out.depths[at]).toBeCloseTo(DRIFT_FOLD_REACH / 24, 9);
    }
    // And a run inside the reach is left exactly as it asked.
    foldInto(out, run(["one", [0.5]], ["two", [0.25]]));
    expect(depthOf(out)).toBeCloseTo(0.75, 9);
    expect(out.folds).toBe(2);
    // The arrays past `folds` are the last read's leavings and are never a length reset (0070).
    expect(out.depths.length).toBe(24);
    // And the cost is bounded by the picture's own depth however many runs are up: forty automators
    // each barely arriving is a shallow fold and not forty picture-sized fills.
    const many = new Map(
      Array.from(
        { length: 40 },
        (_, at) => [`run ${at}`, [{ presence: 0.05, instance: `run ${at}/0` }]] as const,
      ),
    );
    foldInto(out, many);
    expect(out.folds).toBe(40);
    expect(out.depth).toBeCloseTo(2, 9);
    expect(foldPasses(out.depth)).toBeLessThanOrEqual(DRIFT_FOLD_REACH);
    // A pass past the ladder's end is too faint for the canvas's own alpha byte to carry — which
    // the painter does not pay for.
    expect(foldShare(out.depth, DRIFT_FOLD_REACH)).toBeLessThan(FOLD_FAINTEST);
    // A run shallower than a whole pass still deepens the picture; what it does not get is a level
    // cut to its own spiral.
    expect(foldOwner(out, 0)).toBe(0);
    expect(foldOwner(out, 1)).toBeGreaterThan(0);
  });

  // P182: the fold was aimed off an instance's id and nothing else, so a rack that stood still drew
  // a nest that stood still — a shape, and never a picture going anywhere.
  it("carries every level round on the clock, and never jumps where the clock wraps", () => {
    const seed = fold("one");
    const turns = foldTurns(seed);
    // A clock at rest is the spiral its seed drew, so a halted yard is painted where it stopped.
    expect(foldTravelled(turns, 0)).toBe(turns);
    // It moves, and it moves one way.
    expect(foldTravelled(turns, 0.25)).toBeGreaterThan(turns);
    expect(foldTravelled(turns, 0.75)).toBeGreaterThan(foldTravelled(turns, 0.25));
    // A whole turn of the clock is a whole number of turns at every level of the ladder, so the
    // nest comes round rather than snapping back where the row's phase wraps.
    for (let pass = 0; pass < foldPasses(DRIFT_FOLD_REACH); pass += 1) {
      const round =
        foldTurned(foldTravelled(turns, 1), pass) - foldTurned(foldTravelled(turns, 0), pass);
      expect(round).toBeCloseTo(Math.round(round), 9);
      // And the inner levels spin faster than the outer ones, which is what makes it a nest going
      // somewhere rather than one picture turning whole.
      expect(Math.abs(round)).toBeCloseTo(FOLD_TRAVEL_TURNS * foldLevels(pass), 9);
    }
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
    // A whole pass is cut at `FOLD_BITE` once per pass, and the last pass of a fold that does not
    // come to a whole number at the fraction left over — which is the innermost level's own alpha,
    // and what makes a place arriving a fade rather than a step.
    expect(foldShare(2, 0)).toBeCloseTo(FOLD_BITE, 9);
    expect(foldShare(2, 1)).toBeCloseTo(FOLD_BITE ** 2, 9);
    expect(foldShare(2.5, 2)).toBeCloseTo(FOLD_BITE ** 3 * 0.5, 9);
    // Per pass and not per level (0243): once per level the share is squared at every pass, so the
    // deepest pass the ladder holds bites an order of magnitude fainter than it does per pass — a
    // picture folded to its reach cut two passes anybody could see and counted the rest for
    // nothing. Every pass the ladder holds is now a pass the canvas's own alpha byte can carry.
    const deepest = DRIFT_FOLD_REACH - 1;
    expect(FOLD_BITE ** foldLevels(deepest)).toBeLessThan(foldShare(DRIFT_FOLD_REACH, deepest) / 5);
    for (let pass = 0; pass < DRIFT_FOLD_REACH; pass += 1) {
      expect(foldShare(DRIFT_FOLD_REACH, pass)).toBeGreaterThan(FOLD_FAINTEST);
    }
    // P178: and laid at the fold's own alpha where it has one — a picture hardened by a sharp
    // output keeps more of each level, and one that has heard nothing keeps `FOLD_BITE`.
    expect(foldNothing().bite).toBe(FOLD_BITE);
    expect(foldShare(2, 1, 0.8)).toBeCloseTo(0.8 ** 2, 9);
    expect(foldShare(2, 1, FOLD_BITE)).toBe(foldShare(2, 1));
    // Under one at every level, so the stack falls away instead of unioning the field to opaque.
    expect(FOLD_BITE).toBeLessThan(1);
    expect(foldShare(1, 1)).toBe(0);
    // And a level too faint for a canvas's alpha byte is a blit that lays nothing.
    expect(FOLD_FAINTEST).toBe(1 / 255);
    expect(foldShare(0.001, 0)).toBeLessThan(FOLD_FAINTEST);
  });
});
