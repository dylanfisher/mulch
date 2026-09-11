/**
 * @role Tests which way the lattice crawls: the one travel the screen makes across the picture runs
 *   backwards while the landing sounding reads its slot backwards, by the same distance, on the
 *   crawl's own cell of the matrix and nowhere else, and without baking a tile to do it (0362). Its
 *   own file beside the alphabet's and the beat's, because src/ui/moireScreen.test.ts stands at the
 *   line cap (0045).
 * @instead Where the screen is placed, and every other motion that places it →
 *   src/ui/moireScreen.test.ts. Which of a step's knobs reach the picture at all →
 *   src/ui/moireRowsSong.test.ts. What a landing read backwards sounds like →
 *   src/lib/playerWalk.test.ts.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { moireRow as row } from "@/lib/moireRow";
import { beatPx, gridPitchPx } from "@/lib/moireScreenFilm";
import { baked, installHereScreenPort, painterOn } from "@/ui/moireCanvasPainted";
import { SCREEN_TERMS } from "@/ui/moireScreen";

/** The recorder, bound to this file's own way of stubbing a global (src/ui/moireCanvasPainted.ts). */
const paintedOn = painterOn((name, value) => {
  vi.stubGlobal(name, value);
});

afterEach(() => {
  vi.unstubAllGlobals();
  installHereScreenPort();
});

/**
 * One row whose fold lands in the crawl's own slice of the turn, part-way through its cycle so
 * there is a distance to reverse at all, and the deck's own reference row beside it.
 */
const ROWS = [
  row({
    period: 4,
    phase: 1,
    shape: ((SCREEN_TERMS.indexOf("crawl") + 0.5) / SCREEN_TERMS.length) * 2 ** 32,
  }),
  row({ period: 4, phase: 1, reference: true }),
];

/** Where one painting placed the screen, and whether it had to bake a tile to do it. */
function crawling(reversed: boolean) {
  vi.stubGlobal("devicePixelRatio", 2);
  const painted = paintedOn(200, 64, ROWS, 2, 20, { reversed });
  const placed = painted.screened[0];
  if (placed === undefined) throw new Error("the painting placed no screen");
  return { placed, bakes: baked(painted, beatPx(gridPitchPx(2))) };
}

describe("the crawl of a landing read backwards", () => {
  it("walks the lattice back the way it came, by the same distance and on the crawl's own axis", () => {
    // The twelfth step of the block: a step says which way its landing reads, and the crawl is the
    // one travel the lattice makes across the picture — so a reversed landing runs it the other way
    // (0362). Off nought, or one of the two would be the same picture said twice.
    const forwards = crawling(false);
    expect(forwards.placed.e).not.toBe(0);
    const backwards = crawling(true);
    expect(backwards.placed.e).toBe(-forwards.placed.e);
    // By whole cells of the marks, like every other motion of the lattice since 0346.
    expect(forwards.placed.e % gridPitchPx(2)).toBeCloseTo(0, 10);
    // And on that one cell of the matrix and no other: a reversal anywhere else in the transform
    // would be a second motion rather than the crawl's own.
    for (const cell of ["a", "b", "c", "d", "f"] as const)
      expect(backwards.placed[cell]).toBeCloseTo(forwards.placed[cell], 10);
    // And it bakes nothing to do it: which way the crawl runs is a term on the transform and
    // touches no field of the tile's key, so a pattern played backwards all day bakes nothing
    // (0129). The first painting builds the one tile both of them are drawn through.
    expect(forwards.bakes).toBe(1);
    expect(backwards.bakes).toBe(0);
  });
});
