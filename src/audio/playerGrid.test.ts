import { describe, expect, it } from "vitest";

import { PLAYER_MIN_SLOT_SECS } from "@/lib/player";
import { PLAYER_SLOTS } from "@/lib/playerSlots";

import { bedStart, gridOf, gridSpan, loopIn, playerJumps, slotStart } from "./playerGrid";

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
});

describe("gridOf", () => {
  it("draws no grid for a loop whose slots are too short to carry a seam", () => {
    expect(gridOf({ in: 0, out: SHORT_SECS }, RATE, SHORT_SECS)).toBeNull();
  });

  it("draws no grid at all when there is no loop", () => {
    expect(gridOf(null, RATE, LONG_SECS)).toBeNull();
  });

  it("divides the loop into sixteenths of buffer seconds, whatever the rate the seam is judged at", () => {
    const grid = gridOf({ in: 0, out: LONG_SECS }, RATE, LONG_SECS);
    expect(grid).not.toBeNull();
    expect(grid?.in).toBe(0);
    expect(grid?.slot).toBe(LONG_SECS / PLAYER_SLOTS);
  });

  it("judges the seam in real seconds, so a loop played fast enough stops jumping", () => {
    const loop = { in: 0, out: LONG_SECS };
    expect(gridOf(loop, RATE, LONG_SECS)).not.toBeNull();
    expect(gridOf(loop, 4, LONG_SECS)).toBeNull();
  });

  it("answers one ground and never leaves it when the file holds no sixteenth either side", () => {
    const grid = gridOf({ in: 0, out: LONG_SECS }, RATE, LONG_SECS);
    expect(grid?.from).toBe(0);
    expect(grid?.to).toBe(0);
  });

  it("counts the ground either side in the loop's own sixteenths of source", () => {
    const slot = LONG_SECS / PLAYER_SLOTS;
    const duration = slot * 3 + LONG_SECS * 2 + slot / 2;
    const grid = gridOf({ in: slot * 3, out: slot * 3 + LONG_SECS }, RATE, duration);
    expect(grid?.from).toBe(-3);
    expect(grid?.to).toBe(PLAYER_SLOTS);
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
