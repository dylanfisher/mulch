/**
 * @role Tests the marks the drift is written in: that each carries strictly more ink than the one
 *   before, that a mark's coverage is its own bit read hard and its four corners read soft, that
 *   nothing is covered outside a cell, that the ramp onto them starts at the phase mark and
 *   comes round beneath it at its top (0344), and that the push toward that ramp's ends is the
 *   read itself at nought and a push toward both ends at the rest (0348).
 */
import { describe, expect, it } from "vitest";

import { clamp } from "./range.ts";
import {
  GLYPH_COUNT,
  GLYPH_PHASE,
  GLYPH_PUSH,
  markAt,
  markCoverage,
  markWeight,
  pushRead,
} from "./moireGlyph.ts";

describe("the marks", () => {
  it("carry strictly more ink each than the one before, from nothing to a block", () => {
    const weights = Array.from({ length: GLYPH_COUNT }, (_, at) => markWeight(at));
    expect(weights[0]).toBe(0);
    expect(weights[GLYPH_COUNT - 1]).toBe(1);
    for (let at = 1; at < GLYPH_COUNT; at += 1) {
      expect(weights[at], `mark ${at} is no heavier than mark ${at - 1}`).toBeGreaterThan(
        weights[at - 1] ?? 1,
      );
    }
  });

  it("cover a pixel wholly or not at all read hard, and by quarters read soft", () => {
    const dot = 1;
    expect(markCoverage(dot, 0.5, 0.5, 0)).toBe(1);
    expect(markCoverage(dot, 0.1, 0.1, 0)).toBe(0);
    // Read a twentieth of a cell either way just outside the dot's own edge, half the corners
    // land in it.
    const soft = markCoverage(dot, 0.38, 0.5, 0.05);
    expect(soft).toBeGreaterThan(0);
    expect(soft).toBeLessThan(1);
  });

  it("cover nothing outside the cell, and everything of a block inside it", () => {
    const block = GLYPH_COUNT - 1;
    expect(markCoverage(block, -0.01, 0.5, 0)).toBe(0);
    expect(markCoverage(block, 0.5, 1, 0)).toBe(0);
    for (let u = 0; u < 1; u += 0.05) {
      for (let v = 0; v < 1; v += 0.05) {
        expect(markCoverage(block, u, v, 0)).toBe(1);
        const cover = markCoverage(4, u, v, 0.03);
        expect(cover).toBeGreaterThanOrEqual(0);
        expect(cover).toBeLessThanOrEqual(1);
      }
    }
  });

  it("refuses a mark there is not", () => {
    expect(() => markCoverage(GLYPH_COUNT, 0.5, 0.5, 0)).toThrow(/no mark/u);
    expect(() => markWeight(-1)).toThrow(/no mark/u);
  });
});

describe("the ramp onto them", () => {
  it("starts at the phase mark and comes round beneath it at its top", () => {
    const phase = Math.floor(GLYPH_PHASE.rest * GLYPH_COUNT);
    expect(markAt(0, GLYPH_COUNT, GLYPH_PHASE.rest)).toBe(phase);
    expect(markAt(1, GLYPH_COUNT, GLYPH_PHASE.rest)).toBe(phase - 1);
    // And the band between wraps through the dense marks rather than skipping them.
    const seen = new Set<number>();
    for (let value = 0; value <= 1; value += 0.01) {
      seen.add(markAt(value, GLYPH_COUNT, GLYPH_PHASE.rest));
    }
    expect(seen.size).toBe(GLYPH_COUNT);
  });

  it("does not wrap at all at no phase, and clamps a value past the ramp", () => {
    expect(markAt(0, GLYPH_COUNT, 0)).toBe(0);
    expect(markAt(1, GLYPH_COUNT, 0)).toBe(GLYPH_COUNT - 1);
    expect(markAt(1.5, GLYPH_COUNT, 0)).toBe(GLYPH_COUNT - 1);
    expect(markAt(-1, GLYPH_COUNT, 0)).toBe(0);
  });
});

describe("the push toward the ramp's ends", () => {
  it("is the read itself at nought, so the lattice is the one 0346 shipped", () => {
    // The whole of what the dial promises at its floor: the push enters the tile's build only
    // here (`markAt(pushRead(...))`, src/ui/moireScreenTile.ts), so a push of nought leaving every
    // read where it stood is the tile before this dial existed, mark for mark.
    // The ramp's own top named outright, a float step never landing on it exactly; and a read past
    // either end, which `markAt` clamps for itself.
    for (const value of [...Array.from({ length: 100 }, (_, at) => at / 100), 1, 1.5, -1]) {
      expect(pushRead(value, 0), `${value} moved at no push`).toBe(clamp(value, 0, 1));
      expect(markAt(pushRead(value, 0), GLYPH_COUNT, GLYPH_PHASE.rest)).toBe(
        markAt(value, GLYPH_COUNT, GLYPH_PHASE.rest),
      );
    }
  });

  it("pushes both ends of the ramp outward about its middle, and never off it", () => {
    const push = GLYPH_PUSH.rest;
    expect(pushRead(0.5, push), "the middle is the one read that cannot move").toBe(0.5);
    let last = -1;
    for (const value of [...Array.from({ length: 100 }, (_, at) => at / 100), 1]) {
      const pushed = pushRead(value, push);
      // Held to the ramp, and never turned back down it: a push is a cut of the ramp and not a
      // second wrap (0348).
      expect(pushed).toBeGreaterThanOrEqual(0);
      expect(pushed).toBeLessThanOrEqual(1);
      expect(pushed, `${value} came back down the ramp`).toBeGreaterThanOrEqual(last);
      if (value < 0.5) expect(pushed, `${value} was not pushed down`).toBeLessThanOrEqual(value);
      if (value > 0.5) expect(pushed, `${value} was not pushed up`).toBeGreaterThanOrEqual(value);
      last = pushed;
    }
    // And it is a push and not a rounding: a read a quarter up the ramp is on the ground at the
    // rest, which is what makes most of a field the ground mark.
    expect(pushRead(0.25, push)).toBe(0);
    expect(pushRead(0.75, push)).toBe(1);
  });
});
