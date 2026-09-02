/**
 * @role What an automator's run looks like to the picture: where each knob of a grown effect
 *   stands, what every instance is holding right now, and whether that has moved since the last
 *   picture was built — and the rows those places are drawn as. A run is drawn from a seed and
 *   never stored (0204), so this is the whole of what the drift can know about one.
 * @instead Every other row of the picture, and the read that fills them all →
 *   src/ui/moireRows.ts. What a run *is*, and how a place is drawn → src/audio/effects/automator.ts
 *   and src/lib/effectGrowth.ts. What a run cuts the picture through → src/lib/moireFractal.ts.
 */
import { drawnParamIds } from "@/audio/effects/automator";
import { effectById, isEffectId, isGrowable, type EffectId } from "@/audio/effects/registry";
import { PARAMS } from "@/audio/params";
import { fold } from "@/lib/copy";
import { grownOctaves } from "@/lib/effectGrowth";
import { driftReached, restingCentre, type DriftReach, type MoireRow } from "@/lib/moire";
import { normalize } from "@/lib/range";
import { READS_NOTHING, ROW_KEYS, type RowRead } from "@/ui/moireRowsField";
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
 * The automator's own id before each of its places, and the ids and not the count: six places going
 * and six arriving in one tick is a different picture of the same length, and an automator that has
 * grown nothing yet is a key with an empty row (`growth`, src/audio/effects/rack.ts) — invisible in
 * its places and not invisible in the picture, because what the two fractal rows *are* is folded off
 * these keys (`fractalKind`, 0248). Left out, a rack gaining an automator moved nothing until that
 * automator's first place arrived, and the structure then swung round on a place rather than on a
 * rack, which is the hard cut 0248 exists to remove. And the draws beside them, because a place's knobs are rewritten in place
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
  for (const [id, held] of grown) {
    if (was.ids[at] !== id) {
      was.ids[at] = id;
      same = false;
    }
    at++;
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

/**
 * How a row belonging to one registry entry is cut: the shape of its wave and the coordinate that
 * wave runs down, both declared beside the entry's icon (0137, 0142). Three rows ask it — a lane on
 * one of that effect's knobs, the instance's own row, and a row the automator grew — and one
 * lookup answers, so a fourth kind of row cannot be cut to a fifth kind of thing (principle 3).
 */
export const driftCut = (effect: EffectId): Pick<MoireRow, "profile" | "geometry"> => {
  const plugin = effectById(effect);
  return { profile: plugin.drift, geometry: plugin.geometry };
};

/**
 * Every effect one automator is holding, a row apiece, onto the picture its own instance's row was
 * just pushed onto. **The rows the session cannot see**: a grown effect is drawn from a seed and
 * never stored (0204), so without this a run of six turning over completely leaves the picture
 * exactly as it was — the automator's own knobs reached one row and the six they grew reached none.
 *
 * Each is cut the way a rack instance's is and by the same three things: its identity folded off
 * the id the run minted for it, which is the same word its row in the card carries (0076), and the
 * profile and geometry its own registry entry declares — so what the picture shows is which plugins
 * are standing, not that something is. What it is *set* to comes off the run rather than off the
 * session (`grownReach`), because there is no session entry to read.
 *
 * A place laid but not yet arrived is not among them: the read already withholds one, for the same
 * reason a bypassed instance carries no row — what nobody can hear is not in the picture (0139).
 * Nothing is read per frame for one: a grown row's phase runs on the deck's own clock, and its
 * fading in and out is the automator's row to tell.
 */
export function grownInto(
  rows: MoireRow[],
  reads: RowRead[],
  grown: readonly GrownEffect[] | undefined,
): void {
  if (grown === undefined) return;
  for (const held of grown) {
    if (!isEffectId(held.effect)) continue;
    const seed = fold(held.instance);
    const cut = driftCut(held.effect);
    const reach = grownReach(held.effect, held.values);
    const reached = driftReached(seed, reach, cut.geometry);
    rows.push({
      ...reached,
      // The run's own size, spent on the rows it grew (`grownOctaves`, 0143). Never below what the
      // plugin's own value already claimed, so what the run asks for is added to that row and never
      // swapped for it. What the whole set can afford is `shareOctaves` below, and that one may
      // take a copy back off any row here — a set-wide budget is nobody's preference (0230).
      octaves: Math.max(reached.octaves, grownOctaves(grown.length, cut.geometry)),
      phase: 0,
      pulse: 0,
      arrival: 1,
      reference: false,
      shape: seed,
      ...cut,
    });
    reads.push({
      ...READS_NOTHING,
      key: `${ROW_KEYS.grown}${held.instance}`,
      anchor: restingCentre(seed, cut.geometry, reach),
    });
  }
}
