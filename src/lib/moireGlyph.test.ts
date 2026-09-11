/**
 * @role Tests the ramp onto the marks: that it starts at the phase mark and comes round beneath it
 *   at its top (0344), and that the push toward its ends is the read itself at nought and a push
 *   toward both ends at the rest (0348). The alphabets the ramp lands on, and how a mark of one is
 *   read → src/lib/moireAlphabets.test.ts.
 */
import { describe, expect, it } from "vitest";

import { clamp } from "./range.ts";
import { GLYPH_COUNT } from "./moireAlphabets.ts";
import { GLYPH_PHASE, GLYPH_PUSH, markAt, pushRead } from "./moireGlyph.ts";

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
