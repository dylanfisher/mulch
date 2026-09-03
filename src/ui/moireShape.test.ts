/**
 * @role Tests how the standing rack shapes the picture: that the lattice is read off the rack it can
 *   hear and nothing else, that it travels at its stated rate and arrives outright on a halted yard,
 *   that the warp's wander is walked at the speed the looks name, and that a rebuilt set keeps where
 *   the shape had got to and never where it is going.
 * @instead The cell itself → src/lib/moireLattice.test.ts. The bend and the shards, which are their
 *   entries' own declared looks rather than readings of the rack → src/ui/moireLooks.test.ts,
 *   src/lib/moireWarp.test.ts and src/lib/moireShards.test.ts. The wind beside this reading →
 *   src/ui/moireWind.test.ts.
 */
import { describe, expect, it } from "vitest";

import { effectParamDefaults, PARAMS } from "@/audio/params";
import { emptyMasterPeek } from "@/audio/context";
import { LATTICE_CELLS, LATTICE_LEAN, LATTICE_REACH } from "@/lib/moireLattice";
import { PLAIN_CUT } from "@/lib/moireSound";
import { carryShape } from "@/ui/moireCarry";
import { NO_GROWN } from "@/ui/moireGrown";
import { moireRows } from "@/ui/moireRows";
import {
  rackShape,
  SHAPE_HEARD_SECS,
  SHAPE_SECS,
  shapeRest,
  shapeTravelInto,
  shapingRest,
} from "@/ui/moireShape";
import type { SessionEffect } from "@/state/session";

/** A rack instance the way the session builds one (`moireWind.test.ts`). */
const instance = (
  id: string,
  over: Partial<Pick<SessionEffect, "effect" | "bypassed" | "params">> = {},
): SessionEffect => {
  const effect = over.effect ?? "reverb";
  return {
    id,
    effect,
    bypassed: over.bypassed ?? false,
    params: { ...effectParamDefaults(effect, id), ...over.params },
    automation: {},
    bounds: {},
  };
};

/** A sway all the way in and bending as far as it can. */
const SWAYING = { "sway.mix": 1, "sway.depth": PARAMS["sway.depth"].max };

const quiet = emptyMasterPeek();

describe("how the standing rack shapes the picture", () => {
  it("reads the lattice off the rack it can hear, and off nothing an automator is holding", () => {
    expect(rackShape([])).toEqual(shapingRest());
    // Presence-weighted: a reverb all the way in is one entry standing, and one at a wet of nothing
    // stands for nothing at all, exactly as the wind reads it (0202).
    expect(rackShape([instance("a", { params: { "reverb.wet": 1 } })]).standing).toBe(1);
    expect(rackShape([instance("a", { params: { "reverb.wet": 0 } })]).standing).toBe(0);
    expect(rackShape([instance("a", { bypassed: true })]).standing).toBe(0);
    // An automator is a tear and never a cell: its places reach the lattice through the run.
    expect(rackShape([instance("x", { effect: "automator" })])).toEqual(shapingRest());
    // And a sway is one more entry standing here and nothing else — how far it bends is its own
    // declared look now, and no longer a reading this pass takes (0279).
    expect(rackShape([instance("s", { effect: "sway", params: SWAYING })]).standing).toBe(1);
  });

  it("travels the lattice at its own rate, and arrives outright on a yard that is not running", () => {
    const shape = shapeRest();
    const toward = { standing: LATTICE_REACH };
    // Halfway through the wind's own turn the lattice is halfway there.
    shapeTravelInto(shape, toward, 0, quiet, SHAPE_SECS / 2, true, 0.5);
    expect(shape.cells).toBeCloseTo((LATTICE_CELLS[0] + LATTICE_CELLS[1]) / 2);
    // And the wander has walked at the speed the looks named, wrapped into one turn.
    expect(shape.sway).toBeCloseTo((0.5 * SHAPE_SECS) / 2 - Math.floor((0.5 * SHAPE_SECS) / 2));
    shapeTravelInto(shape, toward, 0, quiet, SHAPE_SECS, true, 0);
    expect(shape.cells).toBe(LATTICE_CELLS[1]);
    // A run standing tightens the lattice exactly as hand-added entries do.
    const loose = shapeRest();
    shapeTravelInto(loose, shapingRest(), LATTICE_REACH, quiet, SHAPE_SECS, true, 0);
    expect(loose.cells).toBe(LATTICE_CELLS[1]);
    // The output leans and thickens the lattice over its own short window.
    const heard = shapeRest();
    shapeTravelInto(
      heard,
      shapingRest(),
      0,
      { ...quiet, tilt: 1, level: 1 },
      SHAPE_HEARD_SECS,
      true,
      0,
    );
    expect(heard.lean).toBeCloseTo(LATTICE_LEAN / 2);
    expect(heard.loud).toBe(1);
    // And a halted yard arrives outright, with the wander standing still (0144).
    const halted = shapeRest();
    shapeTravelInto(halted, toward, 0, quiet, 0.001, false, 0.5);
    expect(halted.cells).toBe(LATTICE_CELLS[1]);
    expect(halted.sway).toBe(0);
  });

  it("carries where the shape had got to onto a rebuilt set, and never where it is going", () => {
    const standing = [instance("a", { params: { "reverb.wet": 1 } })];
    const was = moireRows([], standing, 4, PLAIN_CUT, null, NO_GROWN, null);
    shapeTravelInto(was.shape, was.shaping, 0, quiet, SHAPE_SECS / 4, true, 0.5);
    const tight = was.shape.cells;
    const wandered = was.shape.sway;
    expect(wandered).toBeGreaterThan(0);
    const now = moireRows([], [], 4, PLAIN_CUT, null, NO_GROWN, null);
    expect(now.shape).toEqual(shapeRest());
    carryShape(was, now);
    expect(now.shape.cells).toBe(tight);
    expect(now.shape.sway).toBe(wandered);
    expect(now.shaping.standing).toBe(0);
    // The set holds its own copy: the old picture travelling on moves nothing in the new one.
    shapeTravelInto(was.shape, was.shaping, 0, quiet, SHAPE_SECS, true, 0.5);
    expect(now.shape.sway).toBe(wandered);
  });
});
