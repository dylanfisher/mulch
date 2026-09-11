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
import { DRIFT_PAINT_HZ } from "@/lib/moire";
import { emptyMasterPeek } from "@/audio/context";
import { LATTICE_CELLS, LATTICE_LEAN, LATTICE_REACH } from "@/lib/moireLattice";
import { PLAIN_CUT } from "@/lib/moireSound";
import { carryShape } from "@/ui/moireCarry";
import { NO_GROWN } from "@/ui/moireGrown";
import { moireRows, NO_MASTER } from "@/ui/moireRows";
import {
  leanCells,
  rackShape,
  SIDES_CELLS,
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
    drawn: {},
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
    // An automator is a tear and never a cell, and its places tighten nothing either (0300).
    expect(rackShape([instance("x", { effect: "automator" })])).toEqual(shapingRest());
    // And a sway is one more entry standing here and nothing else — how far it bends is its own
    // declared look now, and no longer a reading this pass takes (0279).
    expect(rackShape([instance("s", { effect: "sway", params: SWAYING })]).standing).toBe(1);
  });

  it("travels the lattice at its own rate, and arrives outright on a yard that is not running", () => {
    const shape = shapeRest();
    const toward = { standing: LATTICE_REACH.value };
    // Halfway through the wind's own turn the lattice is halfway there.
    shapeTravelInto(shape, toward, quiet, SHAPE_SECS.value / 2, true, 0.5);
    expect(shape.cells).toBeCloseTo((LATTICE_CELLS[0] + LATTICE_CELLS[1]) / 2);
    // And the wander has walked at the speed the looks named, wrapped into one turn.
    expect(shape.sway).toBeCloseTo(
      (0.5 * SHAPE_SECS.value) / 2 - Math.floor((0.5 * SHAPE_SECS.value) / 2),
    );
    shapeTravelInto(shape, toward, quiet, SHAPE_SECS.value, true, 0);
    expect(shape.cells).toBe(LATTICE_CELLS[1]);
    // A run standing tightens nothing: the lattice is the hand-added rack's alone, so a full run
    // leaves the cell where a rack holding nothing but the automator has it (0300).
    const loose = shapeRest();
    shapeTravelInto(loose, shapingRest(), quiet, SHAPE_SECS.value, true, 0);
    expect(loose.cells).toBe(LATTICE_CELLS[0]);
    // The output leans and thickens the lattice over its own short window.
    const heard = shapeRest();
    shapeTravelInto(
      heard,
      shapingRest(),
      { ...quiet, tilt: 1, level: 1 },
      SHAPE_HEARD_SECS.value,
      true,
      0,
    );
    expect(heard.lean).toBeCloseTo(LATTICE_LEAN.value / 2);
    expect(heard.loud).toBe(1);
    // And where its weight stands between the two sides travels on that same window, across the
    // whole pair: a quarter of the window is a quarter of the pair's span, so the middle to a hard
    // left takes half of it — a pan crossing from one side to the other takes the whole window.
    const panned = shapeRest();
    shapeTravelInto(
      panned,
      shapingRest(),
      { ...quiet, left: 1, right: 0 },
      SHAPE_HEARD_SECS.value / 4,
      true,
      0,
    );
    expect(panned.sides).toBeCloseTo(0.5);
    shapeTravelInto(
      panned,
      shapingRest(),
      { ...quiet, left: 1, right: 0 },
      SHAPE_HEARD_SECS.value / 4,
      true,
      0,
    );
    expect(panned.sides).toBeCloseTo(1);
    shapeTravelInto(panned, shapingRest(), { ...quiet, left: 0, right: 1 }, 0, false, 0);
    expect(panned.sides, "a halted yard arrives outright").toBe(-1);
    expect(shapeRest().sides, "and a picture with no output stands between them").toBe(0);
    // And a halted yard arrives outright, with the wander standing still (0144).
    const halted = shapeRest();
    shapeTravelInto(halted, toward, quiet, 0.001, false, 0.5);
    expect(halted.cells).toBe(LATTICE_CELLS[1]);
    expect(halted.sway).toBe(0);
  });

  it("steps the lattice's lean a cell at a time, and never back and forth on a wobble", () => {
    // The two sides are unsmoothed peaks, so the weight they read wobbles frame to frame even on a
    // steady mix. The crawl leans by whole cells, and a whole cell read off a wobbling number at a
    // cell's own edge is the lattice hopping a cell and back on alternate frames — which is the
    // still lattice moving (0346). So the cell is held until the weight has carried past it.
    const edge = 0.5 / SIDES_CELLS;
    expect(leanCells(edge, 0), "a weight half a cell over does not step").toBe(0);
    expect(leanCells(1 / SIDES_CELLS + edge, 1), "nor half a cell over the one held").toBe(1);
    // A wobble about a cell's edge steps nothing, however many frames it goes on for.
    let held = 1;
    for (const wobble of [0.34, 0.32, 0.35, 0.31, 0.33, 0.36, 0.3]) {
      held = leanCells(wobble, held);
      expect(held, `a weight of ${wobble}`).toBe(1);
    }
    // And a pan that really moves steps, cell by cell, and comes back the same way.
    expect(leanCells(1, 1)).toBe(SIDES_CELLS);
    expect(leanCells(-1, SIDES_CELLS)).toBe(-SIDES_CELLS);
    expect(leanCells(0, SIDES_CELLS)).toBe(0);
    // The whole travel of the reading in one painting cannot cross the hold, which is what makes
    // the hold a hold: at the picture's own cadence the weight moves under half a cell a frame.
    const frame = 1 / DRIFT_PAINT_HZ;
    const moved = shapeRest();
    shapeTravelInto(moved, shapingRest(), { ...quiet, left: 1, right: 0 }, frame, true, 0);
    expect(moved.sides * SIDES_CELLS).toBeLessThan(1);
    expect(moved.sidesCells, "one painting of a hard pan has not stepped yet").toBe(0);
  });

  it("carries where the shape had got to onto a rebuilt set, and never where it is going", () => {
    const standing = [instance("a", { params: { "reverb.wet": 1 } })];
    const was = moireRows([], standing, 4, PLAIN_CUT, null, NO_GROWN, null, NO_MASTER);
    shapeTravelInto(was.shape, was.shaping, quiet, SHAPE_SECS.value / 4, true, 0.5);
    const tight = was.shape.cells;
    const wandered = was.shape.sway;
    expect(wandered).toBeGreaterThan(0);
    const now = moireRows([], [], 4, PLAIN_CUT, null, NO_GROWN, null, NO_MASTER);
    expect(now.shape).toEqual(shapeRest());
    carryShape(was, now);
    expect(now.shape.cells).toBe(tight);
    expect(now.shape.sway).toBe(wandered);
    expect(now.shaping.standing).toBe(0);
    // The set holds its own copy: the old picture travelling on moves nothing in the new one.
    shapeTravelInto(was.shape, was.shaping, quiet, SHAPE_SECS.value, true, 0.5);
    expect(now.shape.sway).toBe(wandered);
  });
});
