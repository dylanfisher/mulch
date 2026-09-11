/**
 * @role The wind the standing rack blows the whole picture with: how long that rack takes to fall
 *   silent, which way that blows the field, and the lean on the screen's lattice it buys. A
 *   reading of the population and never a parameter — no registry entry declares it and nothing
 *   about it is durable (0145, 0128) — so it rests on the field the way the wash does (0213) and
 *   belongs to no row.
 * @instead The tail's own arithmetic, and every other reading of a sound → src/lib/moireSound.ts.
 *   Where the reading rests, and the rows the whole field owns → src/ui/moireRowsField.ts. The
 *   whole cells a lean is rounded into → `leanCells` in src/lib/moireLattice.ts. The
 *   transform the lean is a term on → `inkThrough` in src/ui/moireScreen.ts. The one travel the
 *   lattice does make across the picture, which is the walk's ground and not this →
 *   src/ui/moireCrawl.ts. Keeping the lean across a rebuilt set → src/ui/moireCarry.ts.
 */
import { effectHeard, effectSettleSecs } from "@/audio/params";
import { fold } from "@/lib/copy";
import { easedToward, foldStop, type MoireWind } from "@/lib/moire";
import { leanCells } from "@/lib/moireLattice";
import { rackTail, type RackHeard } from "@/lib/moireSound";
import type { DeckState } from "@/state/store";
import { tunable } from "@/lib/moireTuning";

/** Where the wind stands before a rack has blown anything: still, and nowhere. */
export const windRest = (): MoireWind => ({ blown: 0, lean: 0, veer: 0 });

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
 * The whole reading a blown field has: a tail of nought to one, so a rack that rings for the longest
 * tail there is arrives at a whole one over `DRIFT_WIND_SECS` (`rackTail`, src/lib/moireSound.ts).
 * Named for `WIND_VEER_REACH`'s reason — `easedToward` is stated as a whole reach in `over` seconds.
 */
const WIND_BLOWN_REACH = 1;

/**
 * The whole travel a direction has: -1 to 1, a full reversal. Named because `easedToward` is stated
 * as a whole reach in `over` seconds and the reach is what makes that sentence mean anything (0266).
 */
const WIND_VEER_REACH = tunable("wind.veer", 2, { min: 0.5, max: 4, step: 0.1 });

/**
 * One step of the wind: the direction one step nearer what the population says, and how far that
 * leans the lattice at the tail it is blowing with. Written in place, because it is read once a
 * picture on the frame path and allocates nothing (0070).
 *
 * **Both halves of it travel, and the lean is where they stand**: how far the field leans is how
 * hard it is blowing times which way, and a rack change moves both — a sign that flipped between two
 * frames would reverse the whole field at once, and a tail that arrived outright would hop the
 * lattice three marks the moment an effect was added. So each is walked at the one rate
 * (`easedToward`, 0266) and the lean is read off where they have got to, which is what makes the
 * picture continuous through every rack change.
 *
 * `over` is how long a whole turn takes — `DRIFT_WIND_SECS`, or nothing where there is no clock to
 * travel against, which arrives outright. A halted picture is painted on a commit and never on a
 * frame (0144), so a wind timed against a clock that is not running would turn the whole field
 * between two commits in one step.
 *
 * Rounded through `leanCells` (src/lib/moireLattice.ts), which is the one place a lean is turned
 * into whole cells of the marks and is the rounding the output's own two sides already step through:
 * the lattice has one axis, these are two readings pulling it along that one, and a second arithmetic
 * for the second reading is the same lean said twice (principle 1, 0361). Its hold is what keeps a
 * reading parked on a cell's edge from hopping the picture back and forth (0346).
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
  // And how hard it is blowing, on the same rate: the tail is a fact about what the rack is set to
  // and moves in steps as entries are added, bypassed and taken away, so walked here for the
  // direction's own reason — a lean that arrived outright would hop the whole lattice the moment a
  // hand added an effect.
  wind.blown = easedToward(wind.blown, tail, elapsed, over, WIND_BLOWN_REACH);
  // And a dry rack leans the lattice nowhere: the tail is already on nought to one (`rackTail`,
  // src/lib/moireSound.ts), so a yard with nothing ringing behind it draws the still lattice 0346
  // shipped however hard its direction has turned.
  wind.lean = leanCells(wind.veer * wind.blown, wind.lean);
}
