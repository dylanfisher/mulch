/**
 * @role The rows a rack's instances put in a picture: one per unbypassed instance, cut to what its
 *   registry entry declares and reached by what it is set to — and the same for the rack that is no
 *   yard's, whose instances are in *every* yard's picture because they are heard on every yard
 *   (0139, 0320).
 * @instead The rows a lane and a grown run make → src/ui/moireRows.ts and src/ui/moireGrown.ts.
 *   The rows no instance owns — the loop's, the wash, the session's → src/ui/moireRowsField.ts.
 */
import { effectById } from "@/audio/effects/registry";
import { effectAutomationParamIds, paramIn, paramKey, PARAMS } from "@/audio/params";
import { fold } from "@/lib/copy";
import { laneSpan } from "@/lib/automation";
import { driftReached, restingCentre, type DriftReach, type MoireRow } from "@/lib/moire";
import { normalize } from "@/lib/range";
import type { SessionEffect } from "@/state/session";
import { driftCut } from "@/ui/moireGrown";
import {
  isColour,
  READS_NOTHING,
  ROW_KEYS,
  type ColourRead,
  type RowRead,
} from "@/ui/moireRowsField";

/**
 * Where each value an instance's registry entry declared a way into the picture for stands in its
 * own range, as a turn on 0..1 — what `driftReached` folds into the row. Read off the value the
 * session holds rather than off a lane: a knob at rest still says what its effect is doing, and a
 * lane on that knob goes on bending the row it already bends (0139). Where a lane rides a knob that
 * claims one of the three colour dimensions, `colourReads` below carries that one live (0150).
 */
export function effectReach(instance: SessionEffect): DriftReach[] {
  return effectById(instance.effect).driftFrom.map(({ param, into }) => {
    const spec = PARAMS[param];
    return {
      into,
      turn: normalize(paramIn(instance.params, param), spec.min, spec.max, spec.curve),
    };
  });
}

/**
 * The colour dimensions of an instance's row that follow a lane rather than resting where the knob
 * is parked. Only the three: a lane's own row already says the gesture is there, and what a knob
 * under it is doing to the *shape* of the picture is what it is set to (0139). Colour is the one
 * thing a lane may carry, because the dial travels and the picture must travel with it (0150).
 *
 * A lane that never moved is not one: an unmoving line drives nothing, which is the same test
 * `deckLanes` opens with.
 */
export function colourReads(instance: SessionEffect): ColourRead[] {
  const reads: ColourRead[] = [];
  const reach = effectById(instance.effect).driftFrom;
  for (const param of effectAutomationParamIds(instance.effect)) {
    const lane = instance.automation[param];
    if (lane === undefined || laneSpan(lane) <= 0) continue;
    const into = reach.find((each) => each.param === param)?.into;
    if (into === undefined || !isColour(into)) continue;
    reads.push({
      into,
      key: paramKey(instance.id, param),
      lane,
      base: paramIn(instance.params, param),
      spec: PARAMS[param],
    });
  }
  return reads;
}

/**
 * One unbypassed instance's own row, and the read that fills it. The fold is the row's identity —
 * its angle and where in its cycle it starts — and what the effect is set to is the rest of it,
 * through the dimensions its registry entry declared (0139).
 *
 * `key` is the prefix the caller's rack is filed under, and it is the only thing that differs
 * between a yard's instance and the master's: two pictures of one session would otherwise file a
 * master row and a yard row under one name and hand a rebuilt set the wrong row's share
 * (`ROW_KEYS`, principle 1).
 */
export function instanceInto(
  rows: MoireRow[],
  reads: RowRead[],
  instance: SessionEffect,
  key: string,
): void {
  const seed = fold(instance.id);
  const drawn = driftCut(instance.effect);
  const reach = effectReach(instance);
  rows.push({
    ...driftReached(seed, reach, drawn.geometry),
    phase: 0,
    pulse: 0,
    arrival: 1,
    reference: false,
    shape: seed,
    ...drawn,
  });
  // Its own row is the one thing an instance's meter may move, so this is where the id is kept.
  // A lane riding the same instance keeps none: what a lane draws is the gesture (0128). And the
  // rest its anchor is carried around, on every row whose anchor is its own fold's rather than a
  // knob's (`restingCentre`, 0229).
  reads.push({
    ...READS_NOTHING,
    key: `${key}${instance.id}`,
    instance: instance.id,
    colour: colourReads(instance),
    anchor: restingCentre(seed, drawn.geometry, reach),
  });
}

/** A picture drawn under a session whose master rack holds nothing — one array, not one a call. */
export const NO_MASTER: readonly SessionEffect[] = [];

/**
 * The rack that is no yard's, in this yard's picture. A master instance is running over everything
 * the session puts out, so it is in every picture there is — which is what makes it a row of the
 * field rather than a row of the rack the yard holds (0320, 0321). A bypassed one carries none,
 * for the reason a yard's does: what nobody can hear is not in the picture (0139).
 *
 * Nothing is pushed onto a picture that holds nothing of its own, the way the session's row is
 * withheld: a yard with no lane, no instance, no module and nothing loaded draws no drift at all,
 * and one row of the master's rack is not that yard's picture arriving.
 */
export function masterInto(
  rows: MoireRow[],
  reads: RowRead[],
  effects: readonly SessionEffect[],
): void {
  if (rows.length === 0) return;
  for (const instance of effects) {
    if (instance.bypassed) continue;
    instanceInto(rows, reads, instance, ROW_KEYS.master);
  }
}
