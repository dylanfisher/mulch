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

import { isLookName, LOOK_NAMES, LOOK_TERMS, LOOKS, RESERVED_LOOKS } from "@/lib/moireLook";

describe("what a look is", () => {
  it("names each look once, and holds maths for exactly the names it declares", () => {
    expect(new Set(LOOK_NAMES).size).toBe(LOOK_NAMES.length);
    expect(new Set(Object.keys(LOOKS))).toEqual(new Set(LOOK_NAMES));
    expect(Object.keys(LOOKS)).toHaveLength(LOOK_NAMES.length);
    for (const name of LOOK_NAMES) expect(isLookName(name)).toBe(true);
    // A name the picture has no maths for is not a look, which is the whole of what the registry
    // asks this file (0122).
    expect(isLookName("bloom")).toBe(false);
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
    // And no look takes a slot in the chain yet, which is what makes this step's picture the one
    // before it: a pass arrives with the effect whose look it is.
    for (const name of LOOK_NAMES) expect(LOOKS[name].at).not.toBe("pass");
  });
});
