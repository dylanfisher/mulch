/**
 * @role Tests the noise a picture with no pitch in it is drawn from: that the hash is the same
 *   value twice and is not a diagonal, and that the field over it is smooth everywhere, longer
 *   along its own cell than across it, and **comes round at the tile** — which is the one thing a
 *   hash does not do on its own and the whole reason this field is not `hash2` read directly.
 */
import { describe, expect, it } from "vitest";

import { hash2, noiseCell, streakTiled } from "./moireNoise.ts";
import { sceneCells, sceneRepeat } from "./moireScene.ts";

/** One tile of the film, in device pixels: the terms every case below reads the field against. */
const ACROSS = 110;
const DOWN = 210;

/** The field at a point of that tile, at the lean a case is not about. */
const read = (x: number, y: number, wide = 4, tall = 9, lean = 0): number =>
  streakTiled(x, y, ACROSS, DOWN, wide, tall, lean);

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
   * **The one thing a hash cannot do and a tile must.** The screen is laid down as a repeating
   * pattern, so a noise read on plain coordinates meets a different value at each side of every
   * join and runs a seam down the picture at full contrast, once a tile — which is what every term
   * in a scene is snapped to avoid (`sceneRepeat`). The cells are wrapped instead.
   */
  it("reads the same value at both edges of the tile, on both axes and at every lean", () => {
    for (const lean of [0, 0.2, 0.5, 1]) {
      for (const [x = 0, y = 0] of [
        [0, 0],
        [3, 5],
        [37, 101],
        [ACROSS - 2, DOWN - 7],
      ]) {
        const here = read(x, y, 4, 9, lean);
        expect(read(x + ACROSS, y, 4, 9, lean), `across ${x},${y} at ${lean}`).toBeCloseTo(
          here,
          10,
        );
        expect(read(x, y + DOWN, 4, 9, lean), `down ${x},${y} at ${lean}`).toBeCloseTo(here, 10);
      }
    }
  });

  it("answers inside nought and one wherever it is read, and the same value twice", () => {
    for (let y = 0; y < DOWN; y += 3) {
      for (let x = 0; x < ACROSS; x += 3) {
        const value = read(x, y);
        expect(value, `at ${x},${y}`).toBeGreaterThanOrEqual(0);
        expect(value, `at ${x},${y}`).toBeLessThanOrEqual(1);
      }
    }
    expect(read(37, 101)).toBe(read(37, 101));
  });
});

describe("the cells the tile is divided into", () => {
  /** A whole number of them spans it, which is what makes the wrap above meet at all. */
  it("divides the tile into whole cells, and hashes a point on the one it stands in", () => {
    expect(sceneCells(ACROSS, 4)).toBe(28);
    expect(sceneCells(ACROSS, 4) * sceneRepeat(ACROSS, 4)).toBeCloseTo(ACROSS, 12);
    // A span or a cell of nought is one cell, not a division by nought.
    expect(sceneCells(0, 4)).toBe(1);
    expect(sceneCells(ACROSS, 0)).toBe(1);
    // And the cell a tile's width along is the cell at the left edge, which is what a sparse read
    // — a seed, a speck of sky — is hashed on.
    const cells = sceneCells(ACROSS, 7);
    expect(noiseCell(ACROSS + 13, ACROSS, cells)).toBe(noiseCell(13, ACROSS, cells));
    expect(noiseCell(-13, ACROSS, cells)).toBeGreaterThanOrEqual(0);
    expect(noiseCell(13, 0, cells)).toBe(0);
  });
});

describe("what the streaked noise is made of", () => {
  /**
   * The one thing it has to be is **smooth**, because the whole reason it is here is that gratings
   * are not: a lookup that stepped between its hashed corners would draw the blocks a nearest
   * neighbour draws, which is a lattice again by another road.
   */
  it("moves less between two near samples than its corners are apart", () => {
    let worst = 0;
    for (let step = 0; step < 400; step += 1) {
      const px = step * 0.37;
      const py = step * 0.11;
      worst = Math.max(worst, Math.abs(read(px, py) - read(px + 0.02, py)));
    }
    // A twentieth of a cell moves the read by well under a twentieth of its own range.
    expect(worst).toBeLessThan(0.02);
  });

  it("is longer along its cell than across it", () => {
    // The same three pixels stepped two ways: across a cell three wide it is a whole corner, and
    // down a cell forty tall it is a fortieth of one. That difference is what makes a fibre.
    let across = 0;
    let along = 0;
    for (let step = 0; step < 200; step += 1) {
      const px = step * 0.7;
      const py = step * 1.3;
      across += Math.abs(read(px, py, 3, 40) - read(px + 3, py, 3, 40));
      along += Math.abs(read(px, py, 3, 40) - read(px, py + 3, 3, 40));
    }
    expect(along * 4).toBeLessThan(across);
  });
});
