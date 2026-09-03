/**
 * @role The looks a standing rack gives the whole picture: which of them stand, in the rack's own
 *   order, how present each is and what its entry's values say its terms are — read once when a set
 *   is built, because it is a fact about what the entries are *set to* (0070) — and where each has
 *   actually got to, travelled here one step a frame on the repo's one rate (`easedToward`, 0266)
 *   and carried across a rebuilt set by instance id (`carryLooks`, src/ui/moireCarry.ts). Beside
 *   them the reductions the painting spends: how far the field is bent, how fast that bend wanders,
 *   how many automators are tearing it and how far each is in (0296), how much of the picture is
 *   drawn from elsewhere in it and in how big a piece, how many looks of one kind stand at once
 *   (0294) — and
 *   how often a picture carrying this chain is painted at all (0284).
 * @instead What a look *is* — its name, its terms, how each is read and where it lands →
 *   src/lib/moireLook.ts, which the entries declare themselves into. The lattice, which is the one
 *   whole-field reading that is no effect's → src/ui/moireShape.ts. Where each look is drawn →
 *   `cutField` in src/ui/moireCanvasField.ts and `curvedField` in src/lib/moireGeometry.ts, or, for
 *   a look that takes a slot in the chain, the draw it carries in src/lib/moireLook.ts (0280).
 */
import { effectById } from "@/audio/effects/registry";
import { effectHeard, PARAMS, paramIn } from "@/audio/params";
import { DRIFT_PAINT_HZ, DRIFT_PAINT_MS, easedToward } from "@/lib/moire";
import { LOOKS, type LookName, type LookTerm, type LookTerms } from "@/lib/moireLook";
import { SHARD_CAP } from "@/lib/moireShards";
import { rackScatter } from "@/lib/moireSound";
import { clamp, normalize } from "@/lib/range";
import type { DeckState } from "@/state/store";
import type { GrownRun } from "@/ui/moireGrown";

/**
 * One look standing in one rack: which instance it belongs to, which look it is, how present that
 * instance is and what its own values make of the look's terms — and, beside them, where the
 * picture has actually got to on its way there.
 *
 * **Keyed by the instance's own id and never by its place in the rack**, for the reason a row is
 * (`carryArrivals`): removing one instance shifts every look after it, and a look would inherit a
 * stranger's travel. Two instances of one entry are two looks with two keys, which is what makes
 * two of a kind read as twice as much of that one thing.
 */
export type MoireLook = {
  key: string;
  look: LookName;
  /** How present the instance is — what it is *set to*, filled when the set is built. */
  presence: number;
  /** And how much of that the picture has actually taken, travelled by `looksTravelInto`. */
  at: number;
  terms: LookTerms;
  /**
   * How much of a run the instance is holding, for the one look that *is* a run: the presences the
   * automator's places stand at, summed, written every frame off the read (`looksHeldInto`) and
   * nought for every other look, whose instance holds no run. A per-frame fact and never a term,
   * because a term is read off what an instance is set to and a run is set to nothing (0204, 0298).
   */
  held: number;
};

/**
 * Every look a standing rack draws, in the order the rack holds them — which is the order the sound
 * goes through it, and so the order the picture is chained in. One pass over the instances, read off
 * what each is *set to*: a set is rebuilt whenever anything durable moves, so nothing here is asked
 * on a frame (0070).
 *
 * **A bypassed entry is in none of it**, the test every reading of the population is built through:
 * what nobody can hear is not in the picture. Every registered entry declares a look and the
 * registry refuses one that does not (0290), so nothing is skipped for want of one; an entry whose
 * presence cannot be stated is skipped rather than weighed at nothing (`rackWind`, principle 5).
 *
 * **An entry that declares no honest presence stands at one.** The automator is the only one, and
 * it is right: what it is doing to the picture is holding a run at all, so it is either in the rack
 * or it is not, and there is no knob to turn it down by (`presence: { none }`, 0202).
 */
export function rackLooks(effects: DeckState["effects"]): MoireLook[] {
  const looks: MoireLook[] = [];
  for (const instance of effects) {
    if (instance.bypassed) continue;
    const entry = effectById(instance.effect);
    const look = entry.look;
    const presence = "none" in entry.presence ? 1 : effectHeard(instance.effect, instance.params);
    if (presence === null) continue;
    const terms: Partial<Record<LookTerm, number>> = {};
    for (const { param, into } of entry.lookFrom ?? []) {
      const spec = PARAMS[param];
      const value = paramIn(instance.params, param);
      terms[into] =
        LOOKS[look].terms[into] === "turn"
          ? normalize(value, spec.min, spec.max, spec.curve)
          : value;
    }
    looks.push({ key: instance.id, look, presence, at: 0, terms, held: 0 });
  }
  return looks;
}

/**
 * One step of every look toward the presence its entry is set to, on the rate the rest of the
 * picture's shape travels at — so adding a sway bends the field over seconds and turning its Mix
 * down drains the bend out of it over seconds, rather than either happening between two frames.
 *
 * **And a look the rack no longer holds is dropped on the frame it reaches nought.** It arrives
 * here at a presence of nothing, kept behind the standing ones by `carryLooks` until it has
 * finished leaving; past that it weighs nothing and draws nothing, so keeping it would be a pass in
 * the picture for as long as the yard stood unrebuilt (`carryArrivals`). Compacted in place rather
 * than filtered: this runs once a picture on the frame path and allocates nothing (0070).
 *
 * **And no travel at all on a yard that is not running**: everything arrives outright, which is the
 * answer the ink, the wind and the shape all give — a halted picture is painted on a commit and
 * never on a frame, so a travel timed against a stopped clock would cross the whole gap between two
 * commits in one step (0144).
 */
export function looksTravelInto(
  looks: MoireLook[],
  over: number,
  elapsed: number,
  running: boolean,
): void {
  let kept = 0;
  for (const look of looks) {
    look.at = easedToward(look.at, look.presence, elapsed, running ? over : 0, 1);
    if (look.presence <= 0 && look.at <= 0) continue;
    looks[kept] = look;
    kept += 1;
  }
  looks.length = kept;
}

/** One term of one look as the picture has travelled to it, and nought where nothing stated it. */
const termAt = (look: MoireLook, term: LookTerm): number => look.terms[term] ?? 0;

/**
 * How far the whole field is bent: every warp standing, each weighted by how much of it the picture
 * has taken, bounded at the whole of it. Two sways bend further than one and a sway on its way out
 * bends less than it did, which is the whole of what the travel buys (0278).
 */
export function looksWarp(looks: readonly MoireLook[]): number {
  let bent = 0;
  for (const look of looks) {
    if (look.look === "warp") bent += look.at * termAt(look, "bend");
  }
  return clamp(bent, 0, 1);
}

/**
 * How much of one kind of look stands in a rack — the count the chain lacks (0294). A pass that lays
 * a share of the picture over the picture is drawn under a ceiling, and a second instance of the same
 * look takes that share again out of the same field: what a rack of delays must not read as is a
 * whiter picture, so a pass is handed how much of its own kind is about to draw and shares the
 * ceiling between them (`echoCeiling`, src/lib/moireEchoes.ts).
 *
 * **Weighted by how much of each the picture has taken, which is the bend's shape and not a tally**
 * (`looksWarp`, 0278). A whole count steps: a second delay added is counted the frame it arrives,
 * when it is drawing nothing yet, so the delay already standing would be dimmed to two delays' share
 * for the six seconds the newcomer took to travel in — a picture whiter than one delay, which is the
 * one thing this bound exists to prevent (the review's finding). Weighted, the share standing and
 * the share arriving move together, and a delay leaving fades out of the crowd exactly as its own
 * ladder fades off the field. A bypassed entry is in no set at all, so it weighs nothing here for
 * the reason it weighs nothing anywhere (`rackLooks`), and a rack under one whole look's worth asks
 * nothing of the ceiling at all (`echoCeiling`).
 */
export function looksCrowd(looks: readonly MoireLook[], look: LookName): number {
  let crowd = 0;
  for (const standing of looks) {
    if (standing.look === look) crowd += standing.at;
  }
  return crowd;
}

/**
 * And how fast that bend goes round, in cycles a second: the standing warps' own rates, weighted by
 * how present each is. A mean and not a sum, for the wind's reason — a knob moves the *speed* of the
 * wander and never where it has got to, and two sways are one field bending at one speed (0278).
 */
export function looksWander(looks: readonly MoireLook[]): number {
  let rate = 0;
  let weight = 0;
  for (const look of looks) {
    if (look.look !== "warp") continue;
    rate += look.at * termAt(look, "wander");
    weight += look.at;
  }
  return weight > 0 ? rate / weight : 0;
}

/**
 * And how saturated the ink the whole picture is filmed through is drawn: every sharpen standing,
 * each weighted by how much of it the picture has taken, bounded at the whole of it. Two pops
 * saturate further than one and a pop on its way out saturates less than it did, which is the warp's
 * bend said of colour rather than of shape.
 *
 * **Spent through the ink's own travel and never on the field** (`inkTravelInto`,
 * src/ui/moireScreen.ts, 0266): colour is the tile's, so what this answers is where the ink is
 * *going*, and the picture walks there on the ladder every other colour term walks (0283).
 */
export function looksSaturate(looks: readonly MoireLook[]): number {
  let lit = 0;
  for (const look of looks) {
    if (look.look === "sharpen") lit += look.at * termAt(look, "saturation");
  }
  return clamp(lit, 0, 1);
}

/**
 * How much each automator's run is holding, written onto its look off the frame's own read of the
 * run — the presences of its places summed, so a place arriving counts for what it has arrived by
 * (0204, 0298). Every other look holds no run and reads nought. In place and every frame, because a
 * run moves on its own clock and nothing but the read knows when (0070).
 */
export function looksHeldInto(looks: readonly MoireLook[], grown: GrownRun): void {
  for (const look of looks) {
    if (look.look !== "shards") continue;
    let held = 0;
    for (const place of grown.get(look.key) ?? []) held += clamp(place.presence, 0, 1);
    look.held = held;
  }
}

/**
 * And how many automators are tearing the picture, each at the presence it has travelled to and
 * how much its run holds, into `presences` and `helds` in rack order — one slot per automator
 * standing and never past the cap, which is what the cut hands the throw table's own maths
 * (`shardsInto`, src/lib/moireShards.ts, 0296). Answers the count filled; a bypassed automator is
 * in no set at all and so in none of them, and one on its way in stands at a fraction, which is a
 * fainter tear and never a whole one rounded to. Filled in place rather than answered as a list,
 * because this runs once a painting on the frame path (0070).
 */
export function looksShards(
  looks: readonly MoireLook[],
  presences: Float64Array,
  helds: Float64Array,
): number {
  let standing = 0;
  for (const look of looks) {
    if (look.look !== "shards") continue;
    if (standing >= SHARD_CAP) break;
    presences[standing] = look.at;
    helds[standing] = look.held;
    standing += 1;
  }
  return standing;
}

/**
 * How long a chain still paints at the drift's whole rate. Every pass in it is a draw of the whole
 * field into a whole surface, so a chain's cost is its length — and past this many the painting no
 * longer fits inside the budget it is asked at, which stops being a budget the moment it is
 * overspent every time (`DRIFT_PAINT_MS`, src/lib/moire.ts).
 *
 * **Measured on a loaded rack and not chosen** (0284): at two passes the zoomed picture still left
 * the frame loop idle frames between paintings — 3.1 ms median against a 46.5 ms one — and at three
 * every frame was the painting, 46.4 ms of it, with nothing between. That is the crossing, and this
 * is the last count below it.
 */
export const LOOK_FULL_RATE = 2;

/**
 * And the slowest the picture may ever be painted, whatever a chain costs: a drift at half of
 * twenty-four is still a drift, and a drift slower than this is a slideshow of one. The floor is
 * stated rather than implied, so halving a cadence that was raised stays a halving and not a stall
 * (`DRIFT_PAINT_HZ`, src/lib/moire.ts).
 */
export const LOOK_SLOW_HZ = 12;

/**
 * The cadence a picture carrying these looks is painted at, in milliseconds between paintings: the
 * drift's own, or half of it where the chain is longer than the rate holds — never below the floor.
 * Read off the looks the set already holds and never off a clock: a painting that timed itself would
 * slow the picture for whatever else the machine was doing that second, and would answer differently
 * on two windows of the same yard.
 *
 * **Only the passes count.** The lattice is a fill, and the warp, the shatter and the shards are cut
 * through slices the field is read back in either way (0278, 0269, 0296), so a rack of sways is not
 * a chain at all and is painted at the whole rate.
 */
export function looksPaintMs(looks: readonly MoireLook[]): number {
  let passes = 0;
  for (const look of looks) {
    if (LOOKS[look.look].at === "pass") passes += 1;
  }
  return passes > LOOK_FULL_RATE
    ? 1000 / Math.max(DRIFT_PAINT_HZ / 2, LOOK_SLOW_HZ)
    : DRIFT_PAINT_MS;
}

/**
 * The pairs the shatter's own reduction reads, kept rather than built: the reductions here are
 * spent once a painting on the frame path, and this is the only one whose maths takes a list (0070).
 * Filled and trimmed in place, and never held past the call below.
 */
const broken: { chance: number; presence: number }[] = [];

/**
 * And how much of the finished picture is drawn from somewhere else along it, on the band that
 * reading is stated across (`rackScatter`, src/lib/moireSound.ts). Two scatters break more of it
 * than one, in their own slots and summed by nothing else (0269).
 */
export function looksShatter(looks: readonly MoireLook[]): number {
  let at = 0;
  for (const look of looks) {
    if (look.look !== "shatter") continue;
    const pair = broken[at] ?? { chance: 0, presence: 0 };
    pair.chance = termAt(look, "share");
    pair.presence = look.at;
    broken[at] = pair;
    at += 1;
  }
  broken.length = at;
  return rackScatter(broken);
}

/**
 * And how big a piece of the picture each of those is: the standing scatters' own spans, weighted by
 * how present each is. A mean and not a sum, for the wander's reason — a knob moves how long a
 * window is and never how many of them there are, and two scatters break one field into pieces of
 * one size, which the share above is what makes twice as many of (0290).
 */
export function looksShatterSize(looks: readonly MoireLook[]): number {
  let size = 0;
  let weight = 0;
  for (const look of looks) {
    if (look.look !== "shatter") continue;
    size += look.at * termAt(look, "size");
    weight += look.at;
  }
  return weight > 0 ? size / weight : 0;
}
