/**
 * @role How broken the standing rack draws the whole picture: how much of the yard is scatter, read
 *   off the standing instances' own Odds and Gate. A reading of the population and never a
 *   parameter — no registry entry declares it and nothing about it is durable (0145, 0128) — so it
 *   rests on the field the way the wash does (0213) and belongs to no row, exactly as the rack's own
 *   tail does (0267).
 * @instead The reading's own arithmetic, over the band it is stated on → src/lib/moireSound.ts. The
 *   slices the share is actually drawn through, and the ceiling it is bounded at →
 *   src/lib/moireGeometry.ts and `cutField` in src/ui/moireCanvasField.ts. The other whole-field reading
 *   of the same population, taken in its own pass → src/ui/moireWind.ts.
 */
import { scatterEffect } from "@/audio/effects/scatter";
import { effectHeard, PARAMS, paramIn } from "@/audio/params";
import { rackScatter, type RackShatter } from "@/lib/moireSound";
import { normalize } from "@/lib/range";
import type { DeckState } from "@/state/store";

/**
 * How crowded one scatter's windows are, as a turn on its own range — the value that is its whole
 * claim on the picture already (`scatter.odds → pitch`, src/audio/effects/scatter.ts). Named here
 * because two things ask for it: the reading below, and every case that has to say what a knob
 * moving does to it.
 */
const SCATTER_ODDS = "scatter.odds";

/**
 * How much of the standing rack is scatter, on the band that reading is stated across. One pass over
 * the standing entries, read off what each of them is *set to* — which is what a rebuild is for: a
 * set is rebuilt whenever anything durable moves, so a knob crossing a stop moves this and nothing
 * else has to. Never on a frame, where a plugin lookup over a record of an instance's own values is
 * the allocation 0070 exists to refuse.
 *
 * **A bypassed entry is in none of it**, which is the same test the rows and the wind are both built
 * through: what nobody can hear is not in the picture. And the Gate arrives as the entry's own
 * declared presence rather than as a second reading of the same knob (`effectHeard`), because how
 * much of an entry is heard is a fact the registry already states once (principle 1).
 */
export function rackShatter(effects: DeckState["effects"]): number {
  const scattering: RackShatter[] = [];
  const spec = PARAMS[SCATTER_ODDS];
  for (const instance of effects) {
    if (instance.bypassed || instance.effect !== scatterEffect.id) continue;
    const presence = effectHeard(instance.effect, instance.params);
    // Scatter declares its Gate as its presence and so can never answer null here; skipped rather
    // than defaulted all the same, because a weight nobody can state is not a weight of nought
    // (`rackWind`, principle 5).
    if (presence === null) continue;
    scattering.push({
      chance: normalize(paramIn(instance.params, SCATTER_ODDS), spec.min, spec.max, spec.curve),
      presence,
    });
  }
  return rackScatter(scattering);
}
