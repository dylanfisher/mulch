/**
 * @role How the standing rack shapes the whole picture: how tight a lattice it folds the field
 *   into, how far a sway bends it, and how many times an automator folds the plane — each a
 *   reading of the population and never a parameter (0145, 0128), so it rests on the field the way
 *   the wash and the wind do (0213, 0267) and belongs to no row. The reading is taken when a set is
 *   built; where the picture has actually got to is travelled here, one step a frame, on the
 *   repo's one rate (`easedToward`, 0266), and carried across a rebuilt set (`carryShape`).
 * @instead The cell, the bend and the fold themselves → src/lib/moireLattice.ts,
 *   src/lib/moireWarp.ts and src/lib/moireFold.ts. Where each is spent → `cutLattice` in
 *   src/ui/moireCanvas.ts, `cutField` in src/ui/moireCanvasField.ts and `curvedField` in
 *   src/lib/moireGeometry.ts. The other two whole-field readings of the same population →
 *   src/ui/moireWind.ts and src/ui/moireShatter.ts.
 */
import { effectById } from "@/audio/effects/registry";
import { swayEffect } from "@/audio/effects/sway";
import { effectHeard, PARAMS, paramIn } from "@/audio/params";
import { easedToward, wrap } from "@/lib/moire";
import { FOLD_CAP, foldsOf } from "@/lib/moireFold";
import { LATTICE_CELLS, LATTICE_LEAN, latticeCells, latticeLean } from "@/lib/moireLattice";
import { heardLevel } from "@/lib/moireSound";
import { clamp, normalize } from "@/lib/range";
import { DRIFT_INK_SECS } from "@/ui/moireScreen";
import { DRIFT_WIND_SECS } from "@/ui/moireWind";
import type { MasterPeek } from "@/app/facade";
import type { DeckState } from "@/state/store";

/** How much a sway bends, as a turn on its own range — the value that is its claim on the picture. */
const SWAY_DEPTH = "sway.depth";
const SWAY_RATE = "sway.rate";

/**
 * What the standing rack asks the picture's shape to become: how much of it is standing at all,
 * presence-weighted; how much of that is sway, weighted by how deep each sway bends; how many
 * automators are holding a run; and how fast the sways' own wander goes round, in cycles a second.
 * Filled once when a set is built, because it is a fact about what the entries are *set to*.
 */
export type MoireShaping = { standing: number; warp: number; folds: number; rate: number };

/**
 * And where the picture's shape has actually got to: how many cells stand in its height, how far
 * it is bent, how many times it is folded — each travelled toward what the shaping says — and,
 * accumulated rather than travelled, how far the sway's wander has gone round, and the lean and
 * the loudness the output is giving the lattice this moment.
 */
export type MoireShape = {
  cells: number;
  warp: number;
  folds: number;
  sway: number;
  lean: number;
  loud: number;
};

/** What a rack nobody has added to asks for: the loosest lattice, no bend, no fold, no wander. */
export const shapingRest = (): MoireShaping => ({ standing: 0, warp: 0, folds: 0, rate: 0 });

/** Where the shape stands before a rack has shaped anything. */
export const shapeRest = (): MoireShape => ({
  cells: LATTICE_CELLS[0],
  warp: 0,
  folds: 0,
  sway: 0,
  lean: 0,
  loud: 0,
});

/**
 * The whole field reading of a rack's shape, in one pass over the standing entries — read off what
 * each is *set to*, which is what a rebuild is for, and never on a frame (0070).
 *
 * **A bypassed entry is in none of it**, which is the test the rows, the wind and the shatter are
 * all built through: what nobody can hear is not in the picture. An entry holding a run counts to
 * the folds and to nothing else — the places it is standing reach the lattice through the run's
 * own standing, per frame (`shapeTravelInto`) — and an entry with no honest presence besides that
 * one is skipped rather than weighed at nothing (`rackWind`, principle 5).
 */
export function rackShape(effects: DeckState["effects"]): MoireShaping {
  let standing = 0;
  let warp = 0;
  let rate = 0;
  let swaying = 0;
  let automators = 0;
  const depth = PARAMS[SWAY_DEPTH];
  for (const instance of effects) {
    if (instance.bypassed) continue;
    if (effectById(instance.effect).grows === true) {
      automators += 1;
      continue;
    }
    const presence = effectHeard(instance.effect, instance.params);
    if (presence === null) continue;
    standing += presence;
    if (instance.effect !== swayEffect.id) continue;
    const bend = normalize(paramIn(instance.params, SWAY_DEPTH), depth.min, depth.max, depth.curve);
    warp += presence * bend;
    rate += presence * paramIn(instance.params, SWAY_RATE);
    swaying += presence;
  }
  return {
    standing,
    warp: clamp(warp, 0, 1),
    folds: foldsOf(automators),
    rate: swaying > 0 ? rate / swaying : 0,
  };
}

/**
 * How long the lattice takes to go from its loosest to its tightest, and the bend from nothing to
 * the whole of it: the wind's own turn, because both are the population changing and a field that
 * tightened faster than it turned would be two speeds for one event (0267).
 */
export const SHAPE_SECS = DRIFT_WIND_SECS;

/**
 * And how long one fold takes to arrive: the ink's own ladder, because a fold is baked and walks
 * `DRIFT_STEPS` stops of every curved row's tile on its way (`steppedFolds`), which is exactly what
 * an ink reaching its stop costs (0266). Per fold, so a rack gaining two automators at once folds
 * twice over twice the time rather than snapping through the first.
 */
export const FOLD_SECS = DRIFT_INK_SECS;

/**
 * And how long the lattice takes to lean and to thicken with the output — the one short travel
 * here, because a level is a reading of this moment and a lean that took the wind's six seconds
 * would answer a sound long gone. Half a second is the picture's own cadence a dozen times over,
 * so a hit thickens the gutter visibly and never in one frame.
 */
export const SHAPE_HEARD_SECS = 0.5;

/**
 * One step of the shape: every travelled number one step nearer what the shaping says, the sway's
 * wander walked on at its own rate, and the output's lean and loudness read onto the lattice.
 * Written in place, because it is read once a picture on the frame path and allocates nothing
 * (0070).
 *
 * `standing` is how much run the automators are holding this frame (`runStanding`), which tightens
 * the lattice exactly as a hand-added entry does — a place fading in is a presence arriving. The
 * wander is the integral and the rate is the speed, for the wind's reason: a sway's knob moving
 * moves how fast the bend goes round and never where it has got to (`windTravelInto`).
 *
 * **And no travel at all on a yard that is not running**: everything arrives outright and the
 * wander stands still, which is the answer the ink and the wind give — a halted picture is painted
 * on a commit and never on a frame, and a travel timed against a clock that is not running would
 * cross the whole gap between two commits in one step (0144).
 */
export function shapeTravelInto(
  shape: MoireShape,
  toward: Readonly<MoireShaping>,
  standing: number,
  master: Readonly<MasterPeek>,
  elapsed: number,
  running: boolean,
): void {
  const over = running ? SHAPE_SECS : 0;
  const cells = latticeCells(toward.standing + standing);
  shape.cells = easedToward(shape.cells, cells, elapsed, over, LATTICE_CELLS[1] - LATTICE_CELLS[0]);
  shape.warp = easedToward(shape.warp, toward.warp, elapsed, over, 1);
  shape.folds = easedToward(
    shape.folds,
    toward.folds,
    elapsed,
    running ? FOLD_SECS * FOLD_CAP : 0,
    FOLD_CAP,
  );
  const heard = running ? SHAPE_HEARD_SECS : 0;
  shape.lean = easedToward(shape.lean, latticeLean(master.tilt), elapsed, heard, LATTICE_LEAN);
  shape.loud = easedToward(shape.loud, heardLevel(master.level), elapsed, heard, 1);
  if (!running) return;
  shape.sway = wrap(shape.sway + toward.rate * Math.max(elapsed, 0), 1);
}
