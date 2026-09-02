/**
 * @role The looks a standing rack gives the whole picture: which of them stand, in the rack's own
 *   order, how present each is and what its entry's values say its terms are — read once when a set
 *   is built, because it is a fact about what the entries are *set to* (0070) — and where each has
 *   actually got to, travelled here one step a frame on the repo's one rate (`easedToward`, 0266)
 *   and carried across a rebuilt set by instance id (`carryLooks`, src/ui/moireCarry.ts). Beside
 *   them the reductions the painting spends: how far the field is bent, how fast that bend wanders,
 *   how many times the plane is folded and how much of the picture is drawn from elsewhere in it.
 * @instead What a look *is* — its name, its terms, how each is read and where it lands →
 *   src/lib/moireLook.ts, which the entries declare themselves into. The lattice, which is the one
 *   whole-field reading that is no effect's → src/ui/moireShape.ts. Where each look is drawn →
 *   `cutField` in src/ui/moireCanvasField.ts and `curvedField` in src/lib/moireGeometry.ts, or, for
 *   a look that takes a slot in the chain, the draw it carries in src/lib/moireLook.ts (0280).
 */
import { effectById } from "@/audio/effects/registry";
import { effectHeard, PARAMS, paramIn } from "@/audio/params";
import { easedToward } from "@/lib/moire";
import { foldsOf } from "@/lib/moireFold";
import { LOOKS, type LookName, type LookTerm, type LookTerms } from "@/lib/moireLook";
import { rackScatter } from "@/lib/moireSound";
import { clamp, normalize } from "@/lib/range";
import type { DeckState } from "@/state/store";

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
};

/**
 * Every look a standing rack draws, in the order the rack holds them — which is the order the sound
 * goes through it, and so the order the picture is chained in. One pass over the instances, read off
 * what each is *set to*: a set is rebuilt whenever anything durable moves, so nothing here is asked
 * on a frame (0070).
 *
 * **A bypassed entry is in none of it**, the test every reading of the population is built through:
 * what nobody can hear is not in the picture. An entry with no look declared yet is in none of it
 * either — its pass has not landed — and an entry whose presence cannot be stated is skipped rather
 * than weighed at nothing (`rackWind`, principle 5).
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
    if (look === undefined) continue;
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
    looks.push({ key: instance.id, look, presence, at: 0, terms });
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
 * And how many times the plane is folded before every curved row is cut along it: one fold per
 * automator standing, never past the cap, and fractional on the way there — a fold arriving is two
 * folded pictures crossfaded, which is what a whole number could not be (`foldPlane`,
 * src/lib/moireFold.ts, 0278).
 */
export function looksFolds(looks: readonly MoireLook[]): number {
  let folds = 0;
  for (const look of looks) {
    if (look.look === "fold") folds += look.at;
  }
  return foldsOf(folds);
}

/**
 * The pairs the shatter's own reduction reads, kept rather than built: the four reductions here are
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
