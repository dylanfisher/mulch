/**
 * @role Tests the one travel the screen makes across the picture: it runs backwards while the
 *   landing sounding reads its slot backwards, by the same distance, on the crawl's own cell of the
 *   matrix and nowhere else (0362), and it steps a whole cell of the marks for every cell the walk's
 *   ground has carried it (`crawlCells`, src/ui/moireCrawl.ts) — neither of them baking a tile to do
 *   it. Its own file beside the alphabet's and the beat's, because src/ui/moireScreen.test.ts stands
 *   at the line cap (0045).
 * @instead Where the screen is placed, and every other motion that places it →
 *   src/ui/moireScreen.test.ts. Which of a step's knobs reach the picture at all →
 *   src/ui/moireRowsSong.test.ts. What a landing read backwards sounds like →
 *   src/lib/playerWalk.test.ts.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { moireRow as row } from "@/lib/moireRow";
import { beatPx, gridPitchPx } from "@/lib/moireScreenFilm";
import { installHereScreenPort, painterOn } from "@/ui/moireCanvasPainted";
import { baked, claiming } from "@/ui/moireCanvasReadings";
import { DRIFT_WIND_SECS, windRest, windTravelInto } from "@/ui/moireWind";

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
const ROWS = [claiming("crawl"), row({ period: 4, phase: 1, reference: true })];

/** Where one painting placed the screen, and whether it had to bake a tile to do it. */
function crawling(reversed: boolean, crawl = 0, wind = windRest()) {
  vi.stubGlobal("devicePixelRatio", 2);
  const painted = paintedOn(200, 64, ROWS, 2, 20, { reversed, crawl, wind });
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

  it("steps a whole cell for every cell the ground has carried it, and turns those too", () => {
    // The fourteenth step of the block: the walk's ground move and the screen's crawl are one
    // motion, so the cells the ground has walked the lattice are the crawl's own travel — taken off
    // the rounding, the cells being whole already, and turned by a reversed landing exactly as the
    // term inside it is (0346, 0362).
    const pitch = gridPitchPx(2);
    const standing = crawling(false);
    const walked = crawling(false, 3);
    expect(walked.placed.e - standing.placed.e).toBe(3 * pitch);
    // And a landing read backwards walks the ground's own step back the way it came with the rest
    // of the crawl: the lattice makes one travel and one sign says which way it runs.
    const back = crawling(true, 3);
    expect(back.placed.e).toBe(-standing.placed.e - 3 * pitch);
    // On the crawl's own cell of the matrix and no other.
    for (const cell of ["a", "b", "c", "d", "f"] as const)
      expect(walked.placed[cell]).toBeCloseTo(standing.placed[cell], 10);
    // And a ground walking the file all day bakes nothing: the crawl is a term on the transform and
    // touches no field of the tile's key (0129). The first painting builds the one tile.
    expect(standing.bakes).toBe(1);
    expect(walked.bakes).toBe(0);
    expect(back.bakes).toBe(0);
  });

  it("places the screen where the last frame did however long the wind goes on blowing", () => {
    // The other half of the fourteenth step: the wind leans the lattice and does not walk it, so a
    // field blowing on and on arrives at its lean and stands there — the ground's move is the one
    // thing that steps the picture across (`windTravelInto`, src/ui/moireWind.ts, 0267, 0364).
    const blowing = windRest();
    for (let step = 0; step < 40; step++) windTravelInto(blowing, 1, 1, 1, DRIFT_WIND_SECS.value);
    const arrived = crawling(false, 0, { ...blowing });
    for (let step = 0; step < 200; step++) windTravelInto(blowing, 1, 1, 1, DRIFT_WIND_SECS.value);
    const later = crawling(false, 0, { ...blowing });
    expect(later.placed.e).toBe(arrived.placed.e);
    // And it did lean it: a blown field stands somewhere a still one does not.
    expect(arrived.placed.e).not.toBe(crawling(false).placed.e);
  });
});
