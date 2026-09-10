/**
 * @role Tests the two noises a picture with no pitch in it is drawn from: that the hash is the same
 *   value twice and is not a diagonal, and that the field over it is smooth everywhere and longer
 *   along its own cell than across it.
 */
import { describe, expect, it } from "vitest";

import { hash2, streakAt } from "./moireNoise.ts";

describe("the hash", () => {
  it("is the same value twice, and is not a diagonal", () => {
    // Same arguments, same value — the one thing that would break it is a generator (0247).
    expect(hash2(3, 7)).toBe(hash2(3, 7));
    // And the two arguments are not interchangeable, or a field of it is a diagonal.
    expect(hash2(3, 7)).not.toBe(hash2(7, 3));
    // Inside nought and one wherever it is read, which is what lets it stand in for a share.
    for (let at = 0; at < 200; at += 1) {
      const value = hash2(at * 3, 7 - at);
      expect(value, `at ${at}`).toBeGreaterThanOrEqual(0);
      expect(value, `at ${at}`).toBeLessThan(1);
    }
  });
});

describe("the streaked noise", () => {
  /**
   * The one thing it has to be is **smooth**, because the whole reason it is here is that gratings
   * are not: a lookup that stepped between its hashed corners would draw the blocks a nearest
   * neighbour draws, which is a lattice again by another road.
   */
  it("moves less between two near samples than its corners are apart", () => {
    let worst = 0;
    for (let at = 0; at < 400; at += 1) {
      const px = at * 0.37;
      const py = at * 0.11;
      worst = Math.max(worst, Math.abs(streakAt(px, py, 4, 9) - streakAt(px + 0.02, py, 4, 9)));
    }
    // A twentieth of a cell moves the read by well under a twentieth of its own range.
    expect(worst).toBeLessThan(0.02);
  });

  it("is longer along its cell than across it, and is the same field twice", () => {
    expect(streakAt(6, 7, 3, 40)).toBe(streakAt(6, 7, 3, 40));
    // The same three pixels stepped two ways: across a cell three wide it is a whole corner, and
    // down a cell forty tall it is a fortieth of one. That difference is what makes a fibre.
    let across = 0;
    let along = 0;
    for (let at = 0; at < 200; at += 1) {
      const px = at * 0.7;
      const py = at * 1.3;
      across += Math.abs(streakAt(px, py, 3, 40) - streakAt(px + 3, py, 3, 40));
      along += Math.abs(streakAt(px, py, 3, 40) - streakAt(px, py + 3, 3, 40));
    }
    expect(along * 4).toBeLessThan(across);
  });
});
