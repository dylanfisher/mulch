/**
 * @role Tests that the alphabet the standing part picks reaches the picture through the tile's own
 *   key: the same picture in one hand is baked once however many paintings ask for it, another
 *   hand is another key and so another bake, and what comes back is another picture in the same
 *   cells (0356). Its own file beside the beat's and the scatter's, because src/ui/moireScreen.test.ts
 *   stands at the line cap (0045).
 * @instead The alphabets themselves, what a mark of one covers, and which one a part picks →
 *   src/lib/moireAlphabets.test.ts. Where the key is written → `screenOf`, src/ui/moireScreen.ts.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { moireRow as row } from "@/lib/moireRow";
import { baked, installHereScreenPort, painterOn, tileOf } from "@/ui/moireCanvasPainted";
import { beatPx, gridPitchPx } from "@/lib/moireScreenFilm";

/** The recorder, bound to this file's own way of stubbing a global (src/ui/moireCanvasPainted.ts). */
const paintedOn = painterOn((name, value) => {
  vi.stubGlobal(name, value);
});

afterEach(() => {
  vi.unstubAllGlobals();
  installHereScreenPort();
});

/** The rows every painting here is made of: one claiming row, and the deck's own reference. */
const ROWS = [row({ period: 3 }), row({ period: 4, phase: 1, reference: true })];

/**
 * One painting in `alphabet`, on a two-pixel display. `deep` is the canvas's own height, which the
 * tile is keyed through: a case wanting a tile of its own rather than the one another case left in
 * the cache asks for another one (`screenOf`).
 */
function painting(alphabet: "marks" | "rings" | "strokes", deep: number) {
  vi.stubGlobal("devicePixelRatio", 2);
  return paintedOn(200, deep, ROWS, 2, 20, { alphabet });
}

describe("the tile the standing part picks the alphabet for", () => {
  it("bakes once for one hand however often it is asked, and again for another", () => {
    const wide = beatPx(gridPitchPx(2));
    // A height no other case in this file paints at, so what is read here is this case's own tile.
    const deep = 96;
    const first = painting("marks", deep);
    expect(baked(first, wide), "the first painting baked nothing").toBe(1);
    // The same picture asked for again is the tile already baked: the key has not moved, so the
    // shop answers out of the cache and nothing loops over a pixel (0354).
    expect(baked(painting("marks", deep), wide), "one hand baked twice").toBe(0);
    // And a section the cast reads as a stutter is written in the strokes, which is another key —
    // so the tile is baked again, and it is another picture in the same cells.
    const other = painting("strokes", deep);
    expect(baked(other, wide), "another hand baked nothing").toBe(1);
    const strokes = tileOf(other, wide);
    const marks = tileOf(first, wide);
    expect(strokes.length).toBe(marks.length);
    expect([...strokes]).not.toEqual([...marks]);
  });
});
