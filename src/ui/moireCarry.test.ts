/**
 * @role Tests that a look's travel survives the set that carries it: matched by the instance's own
 *   id and never by its index, so an instance removed ahead of another leaves the second where it
 *   had got to; and that a look the new set no longer holds is kept at a presence of nothing until
 *   it has finished leaving, and dropped on the frame it does (0279).
 * @instead The travel itself, and the readings it feeds → src/ui/moireLooks.test.ts. The other
 *   carries, each tested beside the reading it carries → src/ui/moireShape.test.ts,
 *   src/ui/moireWind.test.ts and src/ui/moireArrival.test.ts.
 */
import { describe, expect, it } from "vitest";

import { effectParamDefaults } from "@/audio/params";
import { PLAIN_CUT } from "@/lib/moireSound";
import { carryLooks } from "@/ui/moireCarry";
import { NO_GROWN } from "@/ui/moireGrown";
import { looksTravelInto } from "@/ui/moireLooks";
import { moireRows } from "@/ui/moireRows";
import { SHAPE_SECS } from "@/ui/moireShape";
import type { MoireRowSet } from "@/ui/moireRowsField";
import type { SessionEffect } from "@/state/session";

/** A rack instance the way the session builds one (`moireLooks.test.ts`). */
const instance = (id: string, effect: SessionEffect["effect"] = "scatter"): SessionEffect => ({
  id,
  effect,
  bypassed: false,
  params: { ...effectParamDefaults(effect, id), "scatter.odds": 1, "scatter.gate": 1 },
  automation: {},
  bounds: {},
});

/** A set built on `effects`, with its looks travelled `secs` of the way in. */
const set = (effects: SessionEffect[], secs = 0): MoireRowSet => {
  const built = moireRows([], effects, 4, PLAIN_CUT, null, NO_GROWN, null);
  looksTravelInto(built.looks, SHAPE_SECS.value, secs, true);
  return built;
};

/** Where one look of a set has got to, by the instance it belongs to. */
const at = (built: MoireRowSet, key: string): number | undefined =>
  built.looks.find((look) => look.key === key)?.at;

describe("carrying a picture's looks onto the set that replaces it", () => {
  it("matches by the instance's own id and never by its place in the rack", () => {
    const was = set([instance("a"), instance("b")], SHAPE_SECS.value / 2);
    expect(at(was, "a")).toBeCloseTo(0.5);
    // The first instance is removed, so the second stands where the first used to. An index would
    // hand it the departing look's travel; the key leaves it exactly where it had got to.
    const now = set([instance("b")]);
    expect(at(now, "b")).toBe(0);
    carryLooks(was, now);
    expect(at(now, "b")).toBeCloseTo(0.5);
    // A look the picture has never held stands at nought, which is what makes an arrival an
    // arrival: the first set a picture ever holds still travels in from nothing.
    const fresh = set([instance("b"), instance("c")]);
    carryLooks(was, fresh);
    expect(at(fresh, "c")).toBe(0);
  });

  it("keeps a leaving look until its presence reaches nought, and drops it on the frame it does", () => {
    const was = set([instance("a")], SHAPE_SECS.value);
    expect(at(was, "a")).toBe(1);
    const now = set([]);
    carryLooks(was, now);
    // Kept behind whatever is standing, at a presence of nothing, so its pass drains out of the
    // picture over the wind's seconds rather than between two frames.
    expect(now.looks).toHaveLength(1);
    expect(now.looks[0]?.presence).toBe(0);
    looksTravelInto(now.looks, SHAPE_SECS.value, SHAPE_SECS.value / 2, true);
    expect(at(now, "a")).toBeCloseTo(0.5);
    looksTravelInto(now.looks, SHAPE_SECS.value, SHAPE_SECS.value, true);
    expect(now.looks).toEqual([]);
    // And one that had already finished leaving is not carried at all: it weighs nothing and draws
    // nothing, so keeping it would be a pass in the picture nobody asked for.
    const gone = set([]);
    carryLooks(now, gone);
    expect(gone.looks).toEqual([]);
  });

  it("carries where each look had got to and never where it is going", () => {
    const was = set([instance("a")], SHAPE_SECS.value / 4);
    const now = set([instance("a")]);
    carryLooks(was, now);
    expect(at(now, "a")).toBeCloseTo(0.25);
    // Where it is going is the new set's own reading: that is what the standing rack says now.
    expect(now.looks[0]?.presence).toBe(1);
    // And the new set holds its own look: the old picture travelling on moves nothing in it.
    looksTravelInto(was.looks, SHAPE_SECS.value, SHAPE_SECS.value, true);
    expect(at(now, "a")).toBeCloseTo(0.25);
  });
});
