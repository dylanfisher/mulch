/**
 * @role What the ground is over a real buffer: how far through a file the loop may be moved, in
 *   the loop's own sixteenths, and where an unbounded offset lands once it is folded onto that.
 *   The whole of what src/lib/playerBed.ts decides, and the reason the walk may carry a raw one
 *   (0183).
 */
import { describe, expect, it } from "vitest";

import { bedBounds, bedGround, bedWrap, PLAYER_BED_MAX, PLAYER_BED_MIN } from "./playerBed.ts";
import { PLAYER_SLOTS } from "./playerSlots.ts";

describe("how far a buffer may be moved through", () => {
  it("counts the loop's own sixteenths either side of it, and the loop is offset zero", () => {
    // A ten-second file, a two-second loop starting at four: two whole beds behind it and two
    // ahead, which is thirty-two sixteenths of the loop each way since the crawl.
    expect(bedBounds(4, 2, 10)).toEqual({ from: -2 * PLAYER_SLOTS, to: 2 * PLAYER_SLOTS });
  });

  it("holds the sixteenths that fit even where no whole bed does", () => {
    // Six seconds of a ten-second file: not one whole bed ahead, and yet the ground may still
    // crawl ten sixteenths into it. This is the whole difference the crawl makes to the bounds —
    // before it, this loop answered a single bed and could not move at all.
    expect(bedBounds(0, 6, 10)).toEqual({ from: 0, to: 10 });
  });

  it("never answers a ground the loop is not one of, however the edges round", () => {
    // A loop on the very end of the file, and one on its very start: each still holds offset zero,
    // because the loop is inside the buffer by construction (src/audio/deck.ts).
    expect(bedBounds(8, 2, 10)).toEqual({ from: -4 * PLAYER_SLOTS, to: 0 });
    expect(bedBounds(0, 2, 10)).toEqual({ from: 0, to: 4 * PLAYER_SLOTS });
  });

  it("answers one bed for a span nothing can be measured in", () => {
    expect(bedBounds(0, 0, 10)).toEqual({ from: 0, to: 0 });
  });
});

describe("folding an offset onto them", () => {
  it("leaves an offset that already fits", () => {
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

  it("answers the one ground there is where a loop has no room either side", () => {
    for (const bed of [-9, 0, 9]) expect(bedWrap(bed, 0, 0)).toBe(0);
  });
});

/**
 * The two above composed, which is what every surface outside the transport asks for: the fold and
 * the buffer second it lands at (src/ui/Waveform.tsx draws it, src/ui/PlayerCard.tsx plants it).
 */
describe("where the ground a walk is standing on begins", () => {
  it("crawls a sixteenth of the loop at a time rather than hopping a whole one", () => {
    // A two-second file under a one-second loop at its start. Eight is half a bed in — a place no
    // index of loop lengths can name, and the whole of what the crawl is for.
    expect(bedGround(0, 1, 2, 8)).toEqual({ on: 8, in: 0.5 });
    expect(bedGround(0, 1, 2, 1)).toEqual({ on: 1, in: 1 / PLAYER_SLOTS });
    expect(bedGround(0, 1, 2, PLAYER_SLOTS)).toEqual({ on: PLAYER_SLOTS, in: 1 });
  });

  it("reads the loop itself as nothing to draw and nothing to plant", () => {
    expect(bedGround(0, 1, 2, 0)).toEqual({ on: 0, in: 0 });
    // And a raw offset one past the last sixteenth that fits folds back onto it.
    expect(bedGround(0, 1, 2, PLAYER_SLOTS + 1)).toEqual({ on: 0, in: 0 });
  });
});
