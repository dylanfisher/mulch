/**
 * @role Tests how the standing rack shapes the picture: that the lattice, the bend and the folds are
 *   read off the rack it can hear and nothing else, that each travels at its own stated rate and
 *   arrives outright on a halted yard, and that a rebuilt set keeps where the shape had got to and
 *   never where it is going.
 * @instead The cell, the bend and the fold themselves → src/lib/moireLattice.test.ts,
 *   src/lib/moireWarp.test.ts and src/lib/moireFold.test.ts. The wind beside this reading →
 *   src/ui/moireWind.test.ts.
 */
import { describe, expect, it } from "vitest";

import { effectParamDefaults, PARAMS } from "@/audio/params";
import { emptyMasterPeek } from "@/audio/context";
import { FOLD_CAP } from "@/lib/moireFold";
import { LATTICE_CELLS, LATTICE_LEAN, LATTICE_REACH } from "@/lib/moireLattice";
import { PLAIN_CUT } from "@/lib/moireSound";
import { carryShape } from "@/ui/moireCarry";
import { NO_GROWN } from "@/ui/moireGrown";
import { moireRows } from "@/ui/moireRows";
import {
  FOLD_SECS,
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
  it("reads the lattice off the rack it can hear, the bend off its sways and the folds off its automators", () => {
    expect(rackShape([])).toEqual(shapingRest());
    // Presence-weighted: a reverb all the way in is one entry standing, and one at a wet of nothing
    // stands for nothing at all, exactly as the wind reads it (0202).
    expect(rackShape([instance("a", { params: { "reverb.wet": 1 } })]).standing).toBe(1);
    expect(rackShape([instance("a", { params: { "reverb.wet": 0 } })]).standing).toBe(0);
    expect(rackShape([instance("a", { bypassed: true })]).standing).toBe(0);
    // A sway bends by how deep it goes and how far in it is; two sum, and never past the whole.
    const bent = rackShape([instance("s", { effect: "sway", params: SWAYING })]);
    expect(bent.warp).toBe(1);
    expect(bent.rate).toBe(PARAMS["sway.rate"].default);
    expect(
      rackShape([instance("s", { effect: "sway", params: { ...SWAYING, "sway.mix": 0 } })]).warp,
    ).toBe(0);
    expect(
      rackShape([instance("s", { effect: "sway", params: SWAYING, bypassed: true })]).warp,
    ).toBe(0);
    const half = rackShape([
      instance("s", { effect: "sway", params: { ...SWAYING, "sway.mix": 0.25 } }),
    ]).warp;
    expect(half).toBeGreaterThan(0);
    expect(half).toBeLessThan(1);
    expect(
      rackShape([
        instance("s", { effect: "sway", params: SWAYING }),
        instance("t", { effect: "sway", params: SWAYING }),
      ]).warp,
    ).toBe(1);
    // And the rate is the sways' own, weighted by how far in each is.
    expect(
      rackShape([
        instance("s", { effect: "sway", params: { ...SWAYING, "sway.rate": 2 } }),
        instance("t", { effect: "sway", params: { ...SWAYING, "sway.rate": 4 } }),
      ]).rate,
    ).toBe(3);
    // An automator is a fold and never a cell: its places reach the lattice through the run.
    const automating = [instance("x", { effect: "automator" })];
    expect(rackShape(automating)).toEqual({ ...shapingRest(), folds: 1 });
    expect(
      rackShape(
        Array.from({ length: FOLD_CAP + 2 }, (_, at) =>
          instance(`x${at}`, { effect: "automator" }),
        ),
      ).folds,
    ).toBe(FOLD_CAP);
    expect(rackShape([instance("x", { effect: "automator", bypassed: true })]).folds).toBe(0);
  });

  it("travels each reading at its own rate, and arrives outright on a yard that is not running", () => {
    const shape = shapeRest();
    const toward = { standing: LATTICE_REACH, warp: 1, folds: FOLD_CAP, rate: 0.5 };
    // Halfway through the wind's own turn the lattice and the bend are halfway there.
    shapeTravelInto(shape, toward, 0, quiet, SHAPE_SECS / 2, true);
    expect(shape.cells).toBeCloseTo((LATTICE_CELLS[0] + LATTICE_CELLS[1]) / 2);
    expect(shape.warp).toBeCloseTo(0.5);
    // One fold has arrived in one fold's time, and no more.
    expect(shape.folds).toBeCloseTo(SHAPE_SECS / 2 / FOLD_SECS);
    // And the wander has walked the sways' rate, wrapped into one turn.
    expect(shape.sway).toBeCloseTo((0.5 * SHAPE_SECS) / 2 - Math.floor((0.5 * SHAPE_SECS) / 2));
    shapeTravelInto(shape, toward, 0, quiet, SHAPE_SECS, true);
    expect(shape.cells).toBe(LATTICE_CELLS[1]);
    expect(shape.warp).toBe(1);
    expect(shape.folds).toBeCloseTo(Math.min(FOLD_CAP, (1.5 * SHAPE_SECS) / FOLD_SECS));
    // A run standing tightens the lattice exactly as hand-added entries do.
    const loose = shapeRest();
    shapeTravelInto(loose, shapingRest(), LATTICE_REACH, quiet, SHAPE_SECS, true);
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
    );
    expect(heard.lean).toBeCloseTo(LATTICE_LEAN / 2);
    expect(heard.loud).toBe(1);
    // And a halted yard arrives outright, with the wander standing still (0144).
    const halted = shapeRest();
    shapeTravelInto(halted, toward, 0, quiet, 0.001, false);
    expect(halted.cells).toBe(LATTICE_CELLS[1]);
    expect(halted.warp).toBe(1);
    expect(halted.folds).toBe(FOLD_CAP);
    expect(halted.sway).toBe(0);
  });

  it("carries where the shape had got to onto a rebuilt set, and never where it is going", () => {
    const swaying = [instance("s", { effect: "sway", params: SWAYING })];
    const was = moireRows([], swaying, 4, PLAIN_CUT, null, NO_GROWN, null);
    shapeTravelInto(was.shape, was.shaping, 0, quiet, SHAPE_SECS / 4, true);
    const bent = was.shape.warp;
    expect(bent).toBeGreaterThan(0);
    const now = moireRows([], [], 4, PLAIN_CUT, null, NO_GROWN, null);
    expect(now.shape).toEqual(shapeRest());
    carryShape(was, now);
    expect(now.shape.warp).toBe(bent);
    expect(now.shaping.warp).toBe(0);
    // The set holds its own copy: the old picture travelling on moves nothing in the new one.
    shapeTravelInto(was.shape, was.shaping, 0, quiet, SHAPE_SECS, true);
    expect(now.shape.warp).toBe(bent);
  });
});
