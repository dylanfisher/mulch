/**
 * @role How the standing rack shapes the whole picture: how tight a lattice it folds the field
 *   into — a reading of the population and never a parameter (0145, 0128), so it rests on the field
 *   the way the wash and the wind do (0213, 0267) and belongs to no row, and the one whole-field
 *   move no effect may claim (0278). The reading is taken when a set is built; where the picture has
 *   actually got to is travelled here, one step a frame, on the repo's one rate (`easedToward`,
 *   0266), and carried across a rebuilt set (`carryShape`).
 * @instead The cell itself → src/lib/moireLattice.ts, the size it stands at →
 *   `latticeCellPx` in src/lib/moireGrating.ts, and where both are spent → `cutLattice` in
 *   src/ui/moireCanvas.ts. The bend and the shards, which are sway's and the automator's own
 *   declared looks rather than readings of the rack → src/lib/moireLook.ts and src/ui/moireLooks.ts
 *   (0279, 0296).
 *   The other whole-field reading of the same population → src/ui/moireWind.ts.
 */
import { effectById } from "@/audio/effects/registry";
import { effectHeard } from "@/audio/params";
import { easedToward, wrap } from "@/lib/moire";
import { LATTICE_CELLS, LATTICE_LEAN, latticeCells, latticeLean } from "@/lib/moireLattice";
import { heardLevel } from "@/lib/moireSound";
import { DRIFT_WIND_SECS } from "@/ui/moireWind";
import type { MasterPeek } from "@/app/facade";
import type { DeckState } from "@/state/store";
import { tunable } from "@/lib/moireTuning";

/**
 * What the standing rack asks the picture's shape to become: how much of it is standing at all,
 * presence-weighted. Filled once when a set is built, because it is a fact about what the entries
 * are *set to* — and the whole of it since the bend and the automator's own move became their
 * entries' own declared looks, which travel per instance rather than as one number the rack sums
 * (0279).
 */
export type MoireShaping = { standing: number };

/**
 * And where the picture's shape has actually got to: how much tighter than its rest the lattice's
 * cell stands (`latticeCells`, a ratio and never a count per height), travelled
 * toward what the shaping says, and — accumulated rather than travelled — how far the warp's wander
 * has gone round, beside the lean and the loudness the output is giving the lattice this moment.
 *
 * The wander is here rather than with the looks it is a wander *of* because it is one phase for one
 * field: two sways are one picture bending at one speed, and the looks say the speed while this
 * says where it has got to (`looksWander`, src/ui/moireLooks.ts).
 */
export type MoireShape = {
  /** How far the cell is tightened off `latticeCellPx`, one at rest. */
  cells: number;
  sway: number;
  lean: number;
  loud: number;
};

/** What a rack nobody has added to asks for: nothing standing, and so the loosest lattice. */
export const shapingRest = (): MoireShaping => ({ standing: 0 });

/** Where the shape stands before a rack has shaped anything. */
export const shapeRest = (): MoireShape => ({
  cells: LATTICE_CELLS[0],
  sway: 0,
  lean: 0,
  loud: 0,
});

/**
 * The whole field reading of a rack's shape, in one pass over the standing entries — read off what
 * each is *set to*, which is what a rebuild is for, and never on a frame (0070).
 *
 * **A bypassed entry is in none of it**, which is the test the rows, the wind and the looks are all
 * built through: what nobody can hear is not in the picture. An entry holding a run is in none of it
 * either, and neither are the places its run is standing: an automator is a tear and never a cell,
 * and a run that tightened the lattice as it filled buried its own tear in a weave too fine to break
 * (0300). An entry with no honest presence besides that one is skipped rather than weighed at
 * nothing (`rackWind`, principle 5).
 */
export function rackShape(effects: DeckState["effects"]): MoireShaping {
  let standing = 0;
  for (const instance of effects) {
    if (instance.bypassed) continue;
    if (effectById(instance.effect).grows === true) continue;
    const presence = effectHeard(instance.effect, instance.params);
    if (presence === null) continue;
    standing += presence;
  }
  return { standing };
}

/**
 * How long the lattice takes to go from its loosest to its tightest, and how long a look takes to
 * come all the way into the picture or drain out of it: the wind's own turn, because both are the
 * population changing and a field that tightened faster than it turned would be two speeds for one
 * event (0267). One rate for every look and not one a look declares, which is what 0279 took from
 * the ink-ladder second the automator's look once had: a rack whose passes arrived at their own
 * speeds would be a chain the eye could not read the order of.
 */
export const SHAPE_SECS = DRIFT_WIND_SECS;

/**
 * And how long the lattice takes to lean and to thicken with the output — the one short travel
 * here, because a level is a reading of this moment and a lean that took the wind's six seconds
 * would answer a sound long gone. Half a second is the picture's own cadence a dozen times over,
 * so a hit thickens the gutter visibly and never in one frame.
 */
export const SHAPE_HEARD_SECS = tunable("shape.heardSecs", 0.5, { min: 0.05, max: 3, step: 0.05 });

/**
 * One step of the shape: the lattice one step nearer what the shaping says, the warp's wander walked
 * on at the rate the standing looks name, and the output's lean and loudness read onto the lattice.
 * Written in place, because it is read once a picture on the frame path and allocates nothing
 * (0070).
 *
 * The lattice reads the hand-added rack alone and never the run the automators are holding
 * (`rackShape`, 0300): a full run tightened the cell fourfold and a tear through a fine weave is
 * the same weave, so the tear held its reach and lost its look. The wander is the integral and
 * `wander` is the speed, handed in from the looks rather than read here
 * for the wind's reason: a sway's knob moving moves how fast the bend goes round and never where it
 * has got to (`looksWander`, `windTravelInto`).
 *
 * **And no travel at all on a yard that is not running**: everything arrives outright and the
 * wander stands still, which is the answer the ink and the wind give — a halted picture is painted
 * on a commit and never on a frame, and a travel timed against a clock that is not running would
 * cross the whole gap between two commits in one step (0144).
 */
export function shapeTravelInto(
  shape: MoireShape,
  toward: Readonly<MoireShaping>,
  master: Readonly<MasterPeek>,
  elapsed: number,
  running: boolean,
  wander: number,
): void {
  const over = running ? SHAPE_SECS.value : 0;
  const cells = latticeCells(toward.standing);
  shape.cells = easedToward(shape.cells, cells, elapsed, over, LATTICE_CELLS[1] - LATTICE_CELLS[0]);
  const heard = running ? SHAPE_HEARD_SECS.value : 0;
  shape.lean = easedToward(
    shape.lean,
    latticeLean(master.tilt),
    elapsed,
    heard,
    LATTICE_LEAN.value,
  );
  shape.loud = easedToward(shape.loud, heardLevel(master.level), elapsed, heard, 1);
  if (!running) return;
  shape.sway = wrap(shape.sway + wander * Math.max(elapsed, 0), 1);
}
