/**
 * @role What an automator's run looks like to the picture: where each knob of a grown effect
 *   stands, what every instance is holding right now, and whether that has moved since the last
 *   picture was built. A run is drawn from a seed and never stored (0204), so this is the whole of
 *   what the drift can know about one.
 * @instead The rows those places are drawn as, and every other row of the picture →
 *   src/ui/moireRows.ts. What a run *is*, and how a place is drawn → src/audio/effects/automator.ts
 *   and src/lib/effectGrowth.ts. How deep a run folds the picture → src/lib/moireFractal.ts.
 */
import { drawnParamIds } from "@/audio/effects/automator";
import { effectById, isGrowable, type EffectId } from "@/audio/effects/registry";
import { PARAMS } from "@/audio/params";
import { normalize } from "@/lib/range";
import type { DriftReach } from "@/lib/moire";
import type { EffectInstanceId, GrownEffect } from "@/audio/effects/contract";

/**
 * The same, for an effect an automator grew rather than one a hand added: where each value its
 * registry entry declared a way into the picture for stands, read off what the run drew it at.
 *
 * A grown effect holds no session entry to read a knob out of, so the turns come from the run
 * itself — `GrownEffect.values` is already each drawn knob as a fraction of its own range, in the
 * order `drawnParamIds` declares (src/audio/effects/automator.ts, 0208). A dimension whose
 * parameter the pool does not draw — one a rebuild or a hold keeps back — stands at the entry's own
 * default, which is exactly where that knob is on a place nobody has moved.
 */
export function grownReach(effect: EffectId, values: readonly number[]): DriftReach[] {
  const plugin = effectById(effect);
  const drawn = isGrowable(plugin) ? drawnParamIds(plugin) : [];
  return plugin.driftFrom.map(({ param, into }) => {
    const spec = PARAMS[param];
    const at = drawn.indexOf(param);
    const value = values[at];
    return {
      into,
      turn: value ?? normalize(spec.default, spec.min, spec.max, spec.curve),
    };
  });
}

/**
 * What each instance holding a run of its own is holding right now — `DeckPeek.grown`, and nothing
 * this file may narrow: the picture reads the run, it does not keep one.
 */
export type GrownRun = ReadonlyMap<EffectInstanceId, readonly GrownEffect[]>;

/** The run nothing is holding, shared, so a caller with no automator allocates no map. */
export const NO_GROWN: GrownRun = new Map();

/**
 * What a run looked like the last time a picture was built from it: every place standing, and every
 * knob each of them was drawn at. Two flat arrays rather than a copy of the read, because it is
 * compared on the frame path and a copy per frame is the allocation 0070 exists to refuse.
 */
export type GrownStanding = { ids: EffectInstanceId[]; draws: number[] };

/** A caller that has never looked at a run. */
export const grownNothing = (): GrownStanding => ({ ids: [], draws: [] });

/**
 * Whether `was` already describes the run the read is holding — and, either way, it describes it
 * once this returns. **The one question a frame asks about the run**: which rows a picture has, and
 * what each is cut to, is a function of a population nothing stores and nothing renders (0204), so
 * the only way to notice one moving is to have looked at the last one.
 *
 * The ids and not the count: six places going and six arriving in one tick is a different picture
 * of the same length. And the draws beside them, because a place's knobs are rewritten in place
 * where a run wanders (`wander`, src/audio/effects/automator.ts) — a row reaches through the values
 * its plugin declared a way into the picture for, exactly as a rack instance's does, and a rack
 * instance's row is rebuilt the moment one of those values moves.
 *
 * Written into the caller's own arrays and answered without allocating, because every frame between
 * two of those moves must cost nothing (0070); a move is a tick of the run at most, which is a
 * second at its fastest (`TICK_MIN_SECS`). The read's own map is already free of a bypassed
 * instance's places (`growth`, src/audio/effects/rack.ts), so what it holds is what `moireRows`
 * draws.
 */
export function grownStanding(was: GrownStanding, grown: GrownRun): boolean {
  let at = 0;
  let drawn = 0;
  let same = true;
  for (const held of grown.values()) {
    for (const each of held) {
      if (was.ids[at] !== each.instance) {
        was.ids[at] = each.instance;
        same = false;
      }
      at++;
      for (const value of each.values) {
        if (was.draws[drawn] !== value) {
          was.draws[drawn] = value;
          same = false;
        }
        drawn++;
      }
    }
  }
  if (was.ids.length !== at) {
    was.ids.length = at;
    same = false;
  }
  if (was.draws.length !== drawn) {
    was.draws.length = drawn;
    same = false;
  }
  return same;
}
