/**
 * @role Tests that the finished field is cut back into itself: that every pass takes ink out rather
 *   than filling it in, that a picture growing nothing cuts nothing at all, and that a fold with
 *   depth costs exactly its own passes — each one smaller, turned, and biting at its own share.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DRIFT_FOLD_REACH,
  foldInto,
  foldNothing,
  foldOwner,
  foldPasses,
  foldScale,
  foldShare,
  foldTurned,
  type FoldRun,
} from "@/lib/moireFractal";
import { DRIFT_FEEDBACK_CEILING } from "@/lib/moire";
import { moireRow as row } from "@/lib/moireRow";
import { painterOn, WINDOW } from "@/ui/moireCanvasPainted";
import type { Aim } from "@/lib/moire";

/** How far apart one aimed copy's own edges stand, back out of the matrix it was laid with. */
const pitchOf = (move: Aim | undefined): number =>
  Math.hypot(move?.a ?? 0, move?.b ?? 0) || Number.NaN;

/** And how far it leans, in turns of a circle. */
const turnsIn = (move: Aim | undefined): number =>
  Math.atan2(move?.b ?? 0, move?.a ?? 0) / (2 * Math.PI);

/**
 * One run of `presence` values held by one instance — the shape `DeckPeek.grown` is. Each place
 * carries an id of its own beneath its holder's, which is the spiral's own seed.
 */
const run = (id: string, ...held: readonly number[]): FoldRun =>
  new Map([[id, held.map((presence, at) => ({ presence, instance: `${id}/${at}` }))]]);

/**
 * Patterns enough for the gratings and for every pass of the deepest fold there is: each pass cuts
 * with a pattern of the field, so a budget of two would leave the stack a level deep (`allowed`,
 * src/ui/moireCanvasPainted.ts).
 */
const PATTERNS = 2 + DRIFT_FOLD_REACH * 2;

/** The fold a run comes to, through the one reading a picture is folded by. */
const folded = (grown: FoldRun) => {
  const out = foldNothing();
  foldInto(out, grown);
  return out;
};

const paintedOn = painterOn((name, value) => {
  vi.stubGlobal(name, value);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// One flat list of the fold's cases, all painted through the one stand-in canvas (0007).
// oxlint-disable-next-line max-lines-per-function
describe("moireFold", () => {
  // P182: the fold was laid *onto* the field, which on a mask of what the gratings let through only
  // ever raised alpha — so a level filled its own fringes in and read as a flat lighter rectangle
  // with a straight edge. Cut, the same level beats against the fringes it crosses (0243, 0131).
  it("takes ink out of the field rather than filling it in", () => {
    vi.stubGlobal("devicePixelRatio", 1);
    const painted = paintedOn(400, 128, [row({ period: 3 })], PATTERNS, WINDOW, {
      fold: folded(run("one", 1)),
    });
    const drew = painted.surfaces[0]?.drew ?? [];
    expect(drew.length).toBeGreaterThan(0);
    for (const laid of drew) expect(laid.over).toBe("destination-out");
    // The same cut every grating before it made, which is why the fold never has to hand the ink
    // back at all — it was already cutting when it arrived and is still cutting when it leaves.
    expect(painted.cuts.length).toBeGreaterThan(0);
  });

  // The fold is the automator's own mark on the picture and nothing else's, so a yard growing
  // nothing draws no pass and pays no fill (0243).
  it("cuts nothing at all into a picture that has grown nothing", () => {
    vi.stubGlobal("devicePixelRatio", 1);
    const nothing = paintedOn(400, 128, [row({ period: 3 })], PATTERNS, WINDOW, {
      fold: folded(new Map()),
    });
    expect(nothing.surfaces[0]?.drew).toHaveLength(0);
    // And a run whose only place is still arriving deepens it by nothing: no pass either.
    const arriving = paintedOn(400, 128, [row({ period: 3 })], PATTERNS, WINDOW, {
      fold: folded(run("one", 0)),
    });
    expect(arriving.surfaces[0]?.drew).toHaveLength(0);
    // The gratings are cut exactly as they were: a fold of nothing leaves the picture untouched.
    expect(nothing.cuts.length).toBeGreaterThan(0);
  });

  // The cost is the picture's own depth and never the count of runs: forty automators each barely
  // arriving is a bounded fold, not forty picture-sized fills.
  it("costs the picture's own depth however many runs are standing", () => {
    vi.stubGlobal("devicePixelRatio", 1);
    const many = new Map(
      Array.from(
        { length: 40 },
        (_, at) => [`run ${at}`, [{ presence: 0.05, instance: `run ${at}/0` }]] as const,
      ),
    );
    const painted = paintedOn(400, 128, [row({ period: 3 })], PATTERNS, WINDOW, {
      fold: folded(many),
    });
    // A pass past the ladder's end bites too faintly for the canvas's own alpha byte to carry, and
    // the painter does not pay for it.
    expect(painted.surfaces[0]?.drew.length).toBeGreaterThan(0);
    expect(painted.surfaces[0]?.drew.length).toBeLessThanOrEqual(DRIFT_FOLD_REACH);
  });

  it("cuts exactly its own passes, each smaller than the last and each at its own share", () => {
    vi.stubGlobal("devicePixelRatio", 1);
    // One automator holding two arrived places, which is a stack of two levels — one place's own
    // spiral apiece, the only thing that ever buys a fold at all (0243).
    const fold = folded(run("one", 1, 1));
    const depth = fold.depth;
    expect(depth).toBeCloseTo(2, 9);
    expect(fold.folds).toBe(2);
    const cut =
      paintedOn(400, 128, [row({ period: 3 })], PATTERNS, WINDOW, { fold }).surfaces[0]?.drew ?? [];
    expect(cut).toHaveLength(foldPasses(depth));
    for (const [pass, laid] of cut.entries()) {
      // Each pass is aimed with the spiral of the place standing at that point of the ladder, so
      // two places are two spirals composed and never one drawn twice.
      const own = foldOwner(fold, pass);
      const ratio = fold.ratios[own] ?? 1;
      expect(laid.alpha).toBeCloseTo(foldShare(depth, pass, fold.bite), 9);
      expect(pitchOf(laid.move)).toBeCloseTo(foldScale(ratio, pass), 9);
      expect(turnsIn(laid.move)).toBeCloseTo(foldTurned(fold.turns[own] ?? 0, pass), 9);
    }
    expect(foldOwner(fold, 0)).not.toBe(foldOwner(fold, 1));
    // The levels double at every pass, which is why a linear number of fills buys a geometric
    // depth: the second is aimed at the square of the first, not at twice it.
    const first = fold.ratios[0] ?? 1;
    expect(foldScale(first, 1)).toBeCloseTo(foldScale(first, 0) ** 2, 9);
  });

  // The fold runs before the frame before this one is fed back, so what is carried over already
  // holds the stack rather than the stack being laid on a ghost of a shallower picture (0143).
  it("folds the field before the frame before it is laid back in", () => {
    vi.stubGlobal("devicePixelRatio", 1);
    // A row asking for the whole of the frame feedback, painted twice: the fold's own passes in
    // each painting, and the ghost of the first painting after the second one's fold.
    const fold = folded(run("one", 1, 1));
    const passes = foldPasses(fold.depth);
    const painted = paintedOn(400, 128, [row({ period: 3, feedback: 1 })], PATTERNS, WINDOW, {
      frames: 2,
      fold,
    });
    // Every fold pass cuts and the fed-back frame is the one thing here that fills — which is the
    // whole of what puts the ghost after the stack rather than under it (0143, 0243).
    const shares = Array.from({ length: passes }, (_, pass) => foldShare(fold.depth, pass));
    const drew = painted.surfaces[0]?.drew ?? [];
    expect(drew).toHaveLength(passes * 2 + 1);
    expect(drew.map(({ over }) => over)).toEqual([
      ...shares.map(() => "destination-out"),
      ...shares.map(() => "destination-out"),
      "source-over",
    ]);
    expect(drew.map(({ alpha }) => alpha)).toEqual([...shares, ...shares, DRIFT_FEEDBACK_CEILING]);
  });
});
