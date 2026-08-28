/**
 * @role What a bed is over a real buffer: which of them a file actually holds, and where an
 *   unbounded index lands once it is folded onto those. The whole of what src/lib/playerBed.ts
 *   decides, and the reason the walk may carry a raw index (0183).
 */
import { describe, expect, it } from "vitest";

import { bedBounds, bedWrap, PLAYER_BED_MAX, PLAYER_BED_MIN } from "./playerBed.ts";

describe("which beds a buffer holds", () => {
  it("counts the loop's own length either side of it, and the loop is bed zero", () => {
    // A ten-second file, a two-second loop starting at four: two whole beds behind it and two ahead.
    expect(bedBounds(4, 2, 10)).toEqual({ from: -2, to: 2 });
  });

  it("holds only the loop itself where nothing fits either side", () => {
    expect(bedBounds(0, 6, 10)).toEqual({ from: 0, to: 0 });
  });

  it("never answers a bed the loop is not one of, however the edges round", () => {
    // A loop on the very end of the file, and one on its very start: each still holds bed zero,
    // because the loop is inside the buffer by construction (src/audio/deck.ts).
    expect(bedBounds(8, 2, 10)).toEqual({ from: -4, to: 0 });
    expect(bedBounds(0, 2, 10)).toEqual({ from: 0, to: 4 });
  });

  it("answers one bed for a span nothing can be measured in", () => {
    expect(bedBounds(0, 0, 10)).toEqual({ from: 0, to: 0 });
  });
});

describe("folding an index onto them", () => {
  it("leaves an index that already fits", () => {
    expect(bedWrap(1, -2, 2)).toBe(1);
    expect(bedWrap(-2, -2, 2)).toBe(-2);
  });

  it("wraps rather than clamping, so a leaning walk keeps walking", () => {
    // Five beds, −2…2: one past the top is the bottom again, and not the top a second time.
    expect(bedWrap(3, -2, 2)).toBe(-2);
    expect(bedWrap(-3, -2, 2)).toBe(2);
  });

  it("wraps however far out the index is, which is what lets the walk carry a raw one", () => {
    expect(bedWrap(PLAYER_BED_MAX * 4, -2, 2)).toBe(bedWrap(PLAYER_BED_MAX * 4 - 5, -2, 2));
    expect(bedWrap(PLAYER_BED_MIN * 4, -2, 2)).toBeGreaterThanOrEqual(-2);
    expect(bedWrap(PLAYER_BED_MIN * 4, -2, 2)).toBeLessThanOrEqual(2);
  });

  it("answers the one bed there is where a loop has no room either side", () => {
    for (const bed of [-9, 0, 9]) expect(bedWrap(bed, 0, 0)).toBe(0);
  });
});
