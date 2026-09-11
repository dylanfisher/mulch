/**
 * @role The wind the standing rack blows the whole picture with: how long that rack takes to fall
 *   silent, which way that blows the field, and the one-way travel across the screen it buys. A
 *   reading of the population and never a parameter — no registry entry declares it and nothing
 *   about it is durable (0145, 0128) — so it rests on the field the way the wash does (0213) and
 *   belongs to no row.
 * @instead The tail's own arithmetic, and every other reading of a sound → src/lib/moireSound.ts.
 *   Where the reading rests, and the rows the whole field owns → src/ui/moireRowsField.ts. The
 *   transform the drift is a term on → `inkThrough` in src/ui/moireScreen.ts. Keeping the travel
 *   across a rebuilt set → src/ui/moireCarry.ts.
 */
import { effectHeard, effectSettleSecs } from "@/audio/params";
import { fold } from "@/lib/copy";
import { easedToward, foldStop, wrap, type MoireWind } from "@/lib/moire";
import { rackTail, type RackHeard } from "@/lib/moireSound";
import type { DeckState } from "@/state/store";
import { tunable } from "@/lib/moireTuning";

/** Where the wind stands before a rack has blown anything: still, and nowhere. */
export const windRest = (): MoireWind => ({ drift: 0, veer: 0 });

/**
 * Which way the standing population blows the field, folded off it the way the picture's own
 * structure is folded off the automators standing (`fractalKind`, src/lib/moireFractal.ts, 0248).
 * One bit of the fold and two answers, because a drift along one axis has two directions and
 * nothing else: how *far* and how *fast* is the tail's, and a direction that also carried a
 * magnitude would be the tail said twice (principle 1).
 *
 * A word of the ids and not a count, for `fractalShape`'s reason: two racks of three are two winds,
 * and one rack losing an entry and gaining another is a wind that turns rather than one that
 * happens to keep blowing. Folded when the set is built and never on a frame (0204).
 */
export const windVeer = (seed: number): number => (foldStop(seed, 1, 2) === 0 ? -1 : 1);

/**
 * The whole field reading of a rack: how long it takes to fall silent, and which way that blows.
 * One pass over the standing entries for both, because they are two readings of one population and
 * a second pass could disagree with the first (principle 1).
 *
 * **A bypassed entry is in neither.** What nobody can hear is not in the picture, which is the same
 * test the rows are built through (`moireRows`, src/ui/moireRows.ts) — so an entry switched out
 * turns the wind exactly as one removed does.
 *
 * Read off what the entries are *set to*, which is what a rebuild is for: a set is rebuilt whenever
 * anything durable moves, so a knob crossing a stop moves this and nothing else has to. Never on a
 * frame — a settle is a plugin call over a record of its own values, and a per-frame reading of one
 * is the allocation 0070 exists to refuse.
 */
export function rackWind(effects: DeckState["effects"]): { tail: number; veering: number } {
  let word = "the rack blowing over";
  const heard: RackHeard[] = [];
  for (const instance of effects) {
    if (instance.bypassed) continue;
    word += ` ${instance.id}`;
    const presence = effectHeard(instance.effect, instance.params);
    // And an entry with no honest presence is in the population and out of the tail: the reading is
    // presence-weighted, and one that says nothing about how much of it is heard cannot be weighed.
    // The entry that says so is the automator, whose own `settle` is everything — a run's decisions
    // are its tick indices and no window reconstructs them (0239) — which is a warm-up and not a
    // tail, and read as one it would blow the whole field on a yard where nothing rings at all.
    if (presence === null) continue;
    heard.push({ settle: effectSettleSecs(instance.effect, instance.params), presence });
  }
  return { tail: rackTail(heard), veering: windVeer(fold(word)) };
}

/**
 * How long the wind takes to turn all the way round, in seconds, on a yard whose clock is running.
 * The direction is folded off the population, so an automator retiring an instance would otherwise
 * reverse the whole field between two frames — and every travel in the picture is rated rather than
 * written (`easedToward`, 0235, 0248, 0266). Six seconds is well inside the twenty a place stands
 * for and far outside a frame: the field slows, stands still for a moment and blows back the other
 * way, which is a wind turning rather than a picture snapping.
 */
export const DRIFT_WIND_SECS = tunable("wind.secs", 6, { min: 0.5, max: 30, step: 0.5 });

/**
 * And how fast a fully blown field travels, in turns of one cell of the screen a second — the same
 * cell the crawl sweeps and comes back across, which is the tile's own period (`screenTilePx`,
 * src/lib/moireScreenFilm.ts) and is therefore as wide as the screen is at whatever density it is drawn
 * at, exactly as the crawl is. A fifth of one a second is a drift the eye reads as the field
 * sliding under everything standing on it rather than as a scroll — slow, because the whole of what
 * the reading says is a long tail, and a long tail is a slow wide drift.
 */
export const DRIFT_WIND_TURNS = tunable("wind.turns", 0.2, { min: 0, max: 1, step: 0.01 });

/**
 * The whole travel a direction has: -1 to 1, a full reversal. Named because `easedToward` is stated
 * as a whole reach in `over` seconds and the reach is what makes that sentence mean anything (0266).
 */
const WIND_VEER_REACH = tunable("wind.veer", 2, { min: 0.5, max: 4, step: 0.1 });

/**
 * One step of the wind: the direction one step nearer what the population says, and the field blown
 * one step further in it. Written in place, because it is read once a picture on the frame path and
 * allocates nothing (0070).
 *
 * **The drift is the integral and the reading is the speed**, which is the whole of why nothing here
 * needs a second rate: a tail that moves moves how fast the field is blowing and never where it has
 * got to, so the picture is continuous through every rack change by construction. A direction is the
 * one thing that is not — it is a sign, and a sign that flipped between two frames would reverse the
 * whole field at once — so that is what travels (`easedToward`, 0266).
 *
 * `over` is how long a whole turn takes — `DRIFT_WIND_SECS`, or nothing where there is no clock to
 * travel against, which arrives outright and blows nowhere. A halted picture is painted on a commit
 * and never on a frame (0144), so a wind timed against a clock that is not running would blow the
 * field the whole gap between two commits in one step.
 */
export function windTravelInto(
  wind: MoireWind,
  veering: number,
  tail: number,
  elapsed: number,
  over: number,
): void {
  // A whole reversal is one `DRIFT_WIND_SECS` and half of one is half of that, exactly as a whole
  // reach of an ink is one `DRIFT_INK_SECS`.
  wind.veer = easedToward(wind.veer, veering, elapsed, over, WIND_VEER_REACH.value);
  if (!(over > 0)) return;
  wind.drift = wrap(
    wind.drift + wind.veer * tail * DRIFT_WIND_TURNS.value * Math.max(elapsed, 0),
    1,
  );
}
