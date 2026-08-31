/**
 * @role Tests that the finished field is laid back into itself once per run of effects growing
 *   inside it: that a picture with nothing grown draws exactly what it drew before there was a fold
 *   in it, and that a fold with depth costs exactly its own passes — each one smaller, turned, and
 *   laid at its own share.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  foldInto,
  foldNothing,
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

/** One run of `presence` values held by one instance — the shape `DeckPeek.grown` is. */
const run = (id: string, ...held: readonly number[]): FoldRun =>
  new Map([[id, held.map((presence) => ({ presence }))]]);

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
  // P177: an automator's run reached the picture as rows and only as rows, so a rack holding two of
  // them read as more lines and never as more depth. What a run of effects growing inside a run of
  // effects looks like is one picture inside another.
  it("draws exactly the picture it drew before, where nothing has grown", () => {
    vi.stubGlobal("devicePixelRatio", 1);
    const bare = paintedOn(400, 128, [row({ period: 3 })]);
    const nothing = paintedOn(400, 128, [row({ period: 3 })], 2, WINDOW, {
      fold: folded(new Map()),
    });
    expect(nothing.surfaces[0]?.drew).toEqual([]);
    expect(nothing.cuts).toEqual(bare.cuts);
    // The screen's own pattern is a fresh object per painting, so what is compared of what went
    // onto the canvas is the order the ink and the product were laid in.
    expect(nothing.laid.map(({ over }) => over)).toEqual(bare.laid.map(({ over }) => over));
    // And a run whose only place is still arriving is a run standing nothing: no level, no pass.
    const arriving = paintedOn(400, 128, [row({ period: 3 })], 2, WINDOW, {
      fold: folded(run("one", 0)),
    });
    expect(arriving.surfaces[0]?.drew).toEqual([]);
    // And a run barely arrived is a level too faint for the canvas's own alpha byte: no blit.
    const faint = paintedOn(400, 128, [row({ period: 3 })], 2, WINDOW, {
      fold: folded(run("one", 0.001)),
    });
    expect(faint.surfaces[0]?.drew).toEqual([]);
  });

  // The cost is the picture's own depth and never the count of runs: forty automators each barely
  // arriving is a shallow fold, not forty picture-sized blits.
  it("costs the picture's own depth however many runs are standing", () => {
    vi.stubGlobal("devicePixelRatio", 1);
    const many = new Map(
      Array.from({ length: 40 }, (_, at) => [`run ${at}`, [{ presence: 0.05 }]] as const),
    );
    const painted = paintedOn(400, 128, [row({ period: 3 })], 2, WINDOW, { fold: folded(many) });
    expect(painted.surfaces[0]?.drew).toHaveLength(2);
  });

  it("adds exactly its own passes, each smaller than the last and each at its own share", () => {
    vi.stubGlobal("devicePixelRatio", 1);
    // One place arrived and one half in: a fold a level and a half deep, which is two blits.
    const fold = folded(run("one", 1, 0.5));
    const depth = fold.depths[0] ?? 0;
    const ratio = fold.ratios[0] ?? 1;
    const turns = fold.turns[0] ?? 0;
    expect(depth).toBeCloseTo(1.5, 9);
    const drew = paintedOn(400, 128, [row({ period: 3 })], 2, WINDOW, { fold }).surfaces[0]?.drew;
    expect(drew).toHaveLength(foldPasses(depth));
    expect(foldPasses(depth)).toBe(2);
    for (const [pass, laid] of (drew ?? []).entries()) {
      // Onto the field and never out of it: the field is what the gratings let through, so a level
      // laid back into it fills its own fringes in and the picture keeps a smaller copy of them.
      expect(laid.over).toBe("source-over");
      expect(laid.alpha).toBeCloseTo(foldShare(depth, pass), 9);
      expect(pitchOf(laid.move)).toBeCloseTo(foldScale(ratio, pass), 9);
      expect(turnsIn(laid.move)).toBeCloseTo(foldTurned(turns, pass), 9);
    }
    // The levels double at every pass, which is why a linear number of blits buys a geometric
    // depth: the second is aimed at the square of the first, not at twice it.
    expect(foldScale(ratio, 1)).toBeCloseTo(foldScale(ratio, 0) ** 2, 9);
  });

  // The fold runs before the frame before this one is fed back, so what is carried over already
  // holds the stack rather than the stack being laid on a ghost of a shallower picture (0143).
  it("folds the field before the frame before it is laid back in", () => {
    vi.stubGlobal("devicePixelRatio", 1);
    // A row asking for the whole of the frame feedback, painted twice: one fold pass in each
    // painting, and the ghost of the first painting after the second one's fold.
    const painted = paintedOn(400, 128, [row({ period: 3, feedback: 1 })], 2, WINDOW, {
      frames: 2,
      fold: folded(run("one", 1)),
    });
    const drew = painted.surfaces[0]?.drew ?? [];
    expect(drew).toHaveLength(3);
    for (const laid of drew) expect(laid.over).toBe("source-over");
    expect(drew.map(({ alpha }) => alpha)).toEqual([
      foldShare(1, 0),
      foldShare(1, 0),
      DRIFT_FEEDBACK_CEILING,
    ]);
  });
});
