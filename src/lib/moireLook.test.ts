/**
 * @role Tests what a look is: that every name the picture has maths for is declared once, that the
 *   lattice is reserved and stands for the rack alone, and that each look's terms say how they are
 *   read and where the look lands — the declarations the registry refuses an entry against (0279).
 * @instead What each look's terms answer for a standing rack, and how they travel →
 *   src/ui/moireLooks.test.ts. What the registry refuses of an entry that declares one →
 *   src/audio/effects/registry.test.ts. The maths each look is drawn by → src/lib/moireWarp.test.ts,
 *   src/lib/moireFold.test.ts and src/lib/moireSound.test.ts.
 */
import { describe, expect, it } from "vitest";

import {
  BLOOM_CEILING,
  BLOOM_SCALE,
  bloomAmount,
  bloomScale,
  isLookName,
  LOOK_NAMES,
  LOOK_TERMS,
  LOOKS,
  RESERVED_LOOKS,
} from "@/lib/moireLook";
import { normalize } from "@/lib/range";

// One flat list of what the contract is, a case per question it answers (0007).
// oxlint-disable-next-line max-lines-per-function
describe("what a look is", () => {
  it("names each look once, and holds maths for exactly the names it declares", () => {
    expect(new Set(LOOK_NAMES).size).toBe(LOOK_NAMES.length);
    expect(new Set(Object.keys(LOOKS))).toEqual(new Set(LOOK_NAMES));
    expect(Object.keys(LOOKS)).toHaveLength(LOOK_NAMES.length);
    for (const name of LOOK_NAMES) expect(isLookName(name)).toBe(true);
    // A name the picture has no maths for is not a look, which is the whole of what the registry
    // asks this file (0122).
    expect(isLookName("glow")).toBe(false);
    expect(isLookName(7)).toBe(false);
  });

  it("reserves the lattice for the rack, and nothing else", () => {
    expect(RESERVED_LOOKS).toEqual(["lattice"]);
    for (const name of RESERVED_LOOKS) {
      expect(LOOKS[name].at).toBe("field");
      expect(LOOKS[name].terms).toEqual({});
    }
  });

  it("says of every term how it is read, and of every look where it lands", () => {
    for (const name of LOOK_NAMES) {
      const look = LOOKS[name];
      expect(["field", "bake", "cut", "pass"]).toContain(look.at);
      for (const [term, read] of Object.entries(look.terms)) {
        expect(LOOK_TERMS).toContain(term);
        expect(["turn", "value"]).toContain(read);
      }
    }
    // The three that stand: the warp bends on a turn of its own range and wanders in the parameter's
    // own units, the shatter takes a share on a turn, and the fold reads nothing at all — how many
    // times the plane is folded is how many automators are standing (0278).
    expect(LOOKS.warp.terms).toEqual({ bend: "turn", wander: "value" });
    expect(LOOKS.shatter.terms).toEqual({ share: "turn" });
    expect(LOOKS.fold.terms).toEqual({});
    expect(LOOKS.fold.at).toBe("bake");
    // And where a look lands and whether it carries a draw of its own are one fact: every look that
    // says `pass` has one, and no look that lands elsewhere does.
    for (const name of LOOK_NAMES) {
      expect("pass" in LOOKS[name]).toBe(LOOKS[name].at === "pass");
    }
  });

  // P280: reverb's, and the first look to take a slot in the chain.
  it("blooms wider the longer the tail and never lays the whole of itself back", () => {
    expect(LOOKS.bloom.at).toBe("pass");
    expect(LOOKS.bloom.terms).toEqual({ amount: "turn", radius: "turn" });
    // The radius is the working size the copy is drawn at, and a bigger room is a smaller copy: the
    // band runs one way down its whole length, and no turn leaves it at either end.
    expect(bloomScale(0)).toBe(BLOOM_SCALE[0]);
    expect(bloomScale(1)).toBeCloseTo(BLOOM_SCALE[1], 12);
    let last = Number.POSITIVE_INFINITY;
    for (let turn = 0; turn <= 1.0001; turn += 1 / 32) {
      const scale = bloomScale(turn);
      expect(scale).toBeLessThan(last);
      expect(scale).toBeLessThanOrEqual(BLOOM_SCALE[0]);
      expect(scale).toBeGreaterThanOrEqual(BLOOM_SCALE[1]);
      last = scale;
    }
    // A knob cannot leave its range, but a travelled presence and a term are both read off values
    // the picture eases, so the band is closed at both ends here rather than trusted.
    expect(bloomScale(-1)).toBe(BLOOM_SCALE[0]);
    expect(bloomScale(2)).toBeCloseTo(BLOOM_SCALE[1], 12);
    // And the amount is the wet twice over — once as presence, once as the term — under a ceiling
    // short of the whole picture, so the structure is never entirely lost under its own halo.
    expect(bloomAmount(0, 1)).toBe(0);
    expect(bloomAmount(1, 0)).toBe(0);
    expect(bloomAmount(1, 1)).toBe(BLOOM_CEILING);
    expect(BLOOM_CEILING).toBeLessThan(1);
    expect(bloomAmount(0.5, 0.5)).toBeCloseTo(0.25 * BLOOM_CEILING, 10);
    expect(bloomAmount(2, 2)).toBe(BLOOM_CEILING);
    expect(bloomAmount(-1, 1)).toBe(0);
    // At the defaults a room is present and readable and nothing like the whole picture. The two
    // numbers are reverb's own declared defaults and ranges (src/audio/effects/reverb.ts), spelt
    // out because a lib test may not import the parameter registry (docs/map.md, the tiers table);
    // the reading that does hold them off `PARAMS` is in src/ui/moireLooks.test.ts.
    const wet = normalize(0.3, 0, 1, "linear");
    const decay = normalize(1.8, 0.1, 8, "log");
    expect(bloomAmount(wet, wet)).toBeGreaterThan(0);
    expect(bloomAmount(wet, wet)).toBeLessThan(0.2);
    expect(bloomScale(decay)).toBeLessThan(BLOOM_SCALE[0]);
    expect(bloomScale(decay)).toBeGreaterThan(BLOOM_SCALE[1]);
  });
});
