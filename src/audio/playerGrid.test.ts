import { describe, expect, it } from "vitest";

import { PLAYER_MIN_SLOT_SECS } from "@/lib/player";
import { PLAYER_SLOTS } from "@/lib/playerSlots";

import {
  bedStart,
  gridOf,
  gridSpan,
  loopIn,
  loopJumps,
  playerJumps,
  slotStart,
} from "./playerGrid";

/** A real seconds length that divides into slots long enough to carry a seam, and one that does not. */
const LONG_SECS = PLAYER_MIN_SLOT_SECS * PLAYER_SLOTS * 2;
const SHORT_SECS = PLAYER_MIN_SLOT_SECS * PLAYER_SLOTS * 0.5;

const RATE = 1;

describe("playerJumps", () => {
  it("says a loop jumps exactly when one sixteenth of it can carry a seam", () => {
    expect(playerJumps(LONG_SECS)).toBe(true);
    expect(playerJumps(SHORT_SECS)).toBe(false);
  });

  it("takes the floor itself, so the picture and the sound cannot disagree at the boundary", () => {
    expect(playerJumps(PLAYER_MIN_SLOT_SECS * PLAYER_SLOTS)).toBe(true);
    expect(playerJumps(PLAYER_MIN_SLOT_SECS * PLAYER_SLOTS - Number.EPSILON)).toBe(false);
  });

  it("asks the whole question of a loop, so a yard that has none jumps nowhere at any rate", () => {
    // 0292: the picture reads an unlooped yard on the whole file, so its period no longer says
    // there is nothing to jump around — the loop itself has to be part of the question, and this
    // is the one export both the sound and the two pictures ask it through (0159, principle 1).
    expect(loopJumps({ in: 0, out: LONG_SECS }, RATE)).toBe(true);
    expect(loopJumps({ in: 0, out: SHORT_SECS }, RATE)).toBe(false);
    expect(loopJumps(null, RATE)).toBe(false);
    // And a rate of nothing is no period at all rather than an infinite one (`loopPeriodSecs`).
    expect(loopJumps({ in: 0, out: LONG_SECS }, 0)).toBe(false);
  });
});

describe("gridOf", () => {
  it("draws no grid for a loop whose slots are too short to carry a seam", () => {
    expect(gridOf({ in: 0, out: SHORT_SECS }, RATE, SHORT_SECS, null)).toBeNull();
  });

  it("draws no grid at all when there is no loop", () => {
    expect(gridOf(null, RATE, LONG_SECS, null)).toBeNull();
  });

  it("divides the loop into sixteenths of buffer seconds, whatever the rate the seam is judged at", () => {
    const grid = gridOf({ in: 0, out: LONG_SECS }, RATE, LONG_SECS, null);
    expect(grid).not.toBeNull();
    expect(grid?.in).toBe(0);
    expect(grid?.slot).toBe(LONG_SECS / PLAYER_SLOTS);
  });

  it("judges the seam in real seconds, so a loop played fast enough stops jumping", () => {
    const loop = { in: 0, out: LONG_SECS };
    expect(gridOf(loop, RATE, LONG_SECS, null)).not.toBeNull();
    expect(gridOf(loop, 4, LONG_SECS, null)).toBeNull();
  });

  it("answers one ground and never leaves it when the file holds no sixteenth either side", () => {
    const grid = gridOf({ in: 0, out: LONG_SECS }, RATE, LONG_SECS, null);
    expect(grid?.from).toBe(0);
    expect(grid?.to).toBe(0);
  });

  it("counts the ground either side in the loop's own sixteenths of source", () => {
    const slot = LONG_SECS / PLAYER_SLOTS;
    const duration = slot * 3 + LONG_SECS * 2 + slot / 2;
    const grid = gridOf({ in: slot * 3, out: slot * 3 + LONG_SECS }, RATE, duration, null);
    expect(grid?.from).toBe(-3);
    expect(grid?.to).toBe(PLAYER_SLOTS);
  });

  /**
   * And a sounding pass reads the grid a zone narrowed: the bounds are folded once for the whole
   * pass, so every slot the transport arms lands inside the stretch the hand marked (0318).
   */
  it("reads the narrowed grid where a zone is marked, and folds every step inside it", () => {
    const slot = LONG_SECS / PLAYER_SLOTS;
    const duration = slot * 3 + LONG_SECS * 2 + slot / 2;
    const loop = { in: slot * 3, out: slot * 3 + LONG_SECS };
    const grid = gridOf(loop, RATE, duration, { from: 2, to: 5 });
    expect(grid?.from).toBe(2);
    expect(grid?.to).toBe(5);
    // The bed a walk's raw offset stands on, and the slot armed from it: both inside the zone,
    // and both a whole number of sixteenths past the loop's own start.
    for (const bed of [-3, 0, 4, PLAYER_SLOTS * 9]) {
      const at = bedStart(grid!, bed);
      expect(at).toBeGreaterThanOrEqual(loop.in + 2 * slot);
      expect(at).toBeLessThanOrEqual(loop.in + 5 * slot);
      expect(slotStart(grid!, 1, bed)).toBeCloseTo(at + slot, 12);
    }
    // And with nothing marked the same walk reaches the ground the file holds either side of it.
    const whole = gridOf(loop, RATE, duration, null);
    expect(bedStart(whole!, -3)).toBeCloseTo(loop.in - 3 * slot, 12);
  });
});

describe("slotStart and bedStart", () => {
  const slot = LONG_SECS / PLAYER_SLOTS;
  const grid = { in: 10, slot, from: -2, to: 2 };

  it("puts a slot that many sixteenths past the bed the pattern is standing on", () => {
    expect(bedStart(grid, 0)).toBe(10);
    expect(slotStart(grid, 0, 0)).toBe(10);
    expect(slotStart(grid, 3, 0)).toBe(10 + slot * 3);
  });

  it("moves the whole bed by the walk's offset rather than only the slot inside it", () => {
    expect(bedStart(grid, 2)).toBe(10 + slot * 2);
    expect(slotStart(grid, 3, 2)).toBe(bedStart(grid, 2) + slot * 3);
  });

  it("wraps a ground past the end of the file back to the other end rather than pinning it", () => {
    expect(bedStart(grid, 3)).toBe(bedStart(grid, -2));
    expect(bedStart(grid, -3)).toBe(bedStart(grid, 2));
  });
});

describe("gridSpan and loopIn", () => {
  it("counts a whole cycle as the loop the grid divides", () => {
    expect(gridSpan({ in: 0, slot: 0.5, from: 0, to: 0 })).toBe(0.5 * PLAYER_SLOTS);
  });

  it("reads a missing loop as the head of the buffer rather than throwing at the plan", () => {
    expect(loopIn({ in: 4, out: 8 })).toBe(4);
    expect(loopIn(null)).toBe(0);
  });
});
