/**
 * @role The picture laid back into itself, once per run of effects growing inside it: how deep the
 *   stack goes, what each level of it is scaled and turned by, and the share it is laid at. Pure
 *   arithmetic — the composite itself is the painter's (src/ui/moireFold.ts).
 * @instead The frame before this one laid back into this one → `feedbackAlpha` in src/lib/moire.ts,
 *   which is the same composite one frame later where this is the same composite one scale smaller.
 *   How many scales one *row* is drawn at → `shareOctaves` in src/lib/moire.ts. What a run is
 *   holding → src/lib/effectGrowth.ts.
 */
import { fold } from "@/lib/copy";
import { FOLD_SPENT, foldStop } from "@/lib/moire";
import { clamp, denormalize } from "@/lib/range";

/**
 * As much of a run as the fold reads: what each holding instance is standing, and how far in each
 * of those stands. Structural rather than the audio tier's own `GrownRun`, because lib may import
 * nothing (docs/map.md) — and it is the whole of what the fold needs, which is why it is worth
 * naming here rather than widening what a caller hands over.
 */
export type FoldRun = ReadonlyMap<string, readonly { readonly presence: number }[]>;

/**
 * How deep the whole picture may fold into itself, in doublings. **Three**, which is eight levels
 * of the picture inside the picture: each pass composites the field onto itself, so what a pass
 * costs is one picture-sized blit and what it buys is twice the levels the last one held. A fourth
 * would be sixteen levels at a scale the smallest of them is a pixel wide, for a blit the painter
 * pays at every painting.
 *
 * **On the whole fold and not on one run**, for the reason `DRIFT_SCALES_BUDGET` is on the row set
 * and not on the row (0230): how many automators a rack holds is not a number anybody declared, so
 * a ceiling per run multiplies by a count with no bound. Past it every run falls back by the same
 * factor — the second automator still deepens what the first is drawing, it just deepens it less.
 */
export const DRIFT_FOLD_REACH = 3;

/**
 * How much of a level's ink the level inside it keeps. **Under one and a hard ceiling**, the same
 * argument `DRIFT_FEEDBACK_CEILING` rests on (0143): the field is composited onto itself, so a
 * share of one would union the whole stack to opaque and a picture filled to opaque is a picture
 * with nothing left in it. Under one the levels fall away geometrically and the outermost is a
 * ghost of the innermost rather than a second copy of it.
 */
export const FOLD_KEEP = 0.6;

/** How far each level of a fold is scaled against the one outside it — a picture inside a picture. */
export const FOLD_RATIO_BAND: readonly [number, number] = [0.42, 0.68];

/**
 * How many stops that band is divided into. Coarse for the reason `EFFECT_ROW_PERIODS` is: two
 * spirals a fraction of a percent apart are one spiral drawn twice.
 */
const FOLD_RATIOS = 7;

/**
 * And how far each level is turned against it, in turns. Bounded well under a quarter: a level
 * turned further than that reads as a copy stood on its side rather than as the same picture seen
 * from further in.
 */
export const FOLD_TURN_BAND: readonly [number, number] = [-0.11, 0.11];

/**
 * How many stops the turn is divided into. **Even, and read across the whole band**, so no stop is
 * nought: a fold that turned nothing would lay every level exactly on top of the last, which is a
 * doubled copy and not a spiral — the same thing `aimFeedback` turns the fed-back frame to avoid.
 */
const FOLD_TURN_STOPS = 8;

/** How far up the fold each of the two reads is taken from, above the bits src/lib/moire.ts spends. */
const FOLD_RATIO_SHIFT = FOLD_SPENT;
const FOLD_TURN_SHIFT = FOLD_SPENT * FOLD_RATIOS;

/**
 * The two things a run's own spiral is, folded off the id of the instance holding it — one fold,
 * two independent halves, exactly as a rack card's period and its anchor are taken off the one
 * number its name already is (0076). So two automators are two spirals composed into one stack
 * rather than one spiral drawn twice: the second deepens what the first is drawing and turns it
 * somewhere else.
 */
export function foldRatio(seed: number): number {
  const turn = foldStop(seed, FOLD_RATIO_SHIFT, FOLD_RATIOS) / (FOLD_RATIOS - 1);
  return denormalize(turn, ...FOLD_RATIO_BAND);
}

export function foldTurns(seed: number): number {
  const turn = foldStop(seed, FOLD_TURN_SHIFT, FOLD_TURN_STOPS) / (FOLD_TURN_STOPS - 1);
  return denormalize(turn, ...FOLD_TURN_BAND);
}

/**
 * How far the picture is folded into itself, and how each fold in it is aimed: **one depth for the
 * whole picture** and one entry per run that has anything standing, held in three parallel arrays
 * and refilled in place. `folds` is how many of those entries are in force, and the arrays past it
 * are the last read's leavings — a length reset is a write a per-frame read may not make (0070).
 */
export type FractalFold = {
  /** How deep the whole picture folds, in doublings, held to `DRIFT_FOLD_REACH`. */
  depth: number;
  folds: number;
  /** How much of that depth each run standing is, in the order the read holds them. */
  depths: number[];
  /** What each level of that run's spiral is scaled by against the one outside it. */
  ratios: number[];
  /** And how far it is turned, in turns. */
  turns: number[];
};

/** A picture that has not folded yet — and the one every set is minted with. */
export const foldNothing = (): FractalFold => ({
  depth: 0,
  folds: 0,
  depths: [],
  ratios: [],
  turns: [],
});

/**
 * Fill `out` from the run every instance is holding. **How deep a run folds the picture is the
 * summed `presence` of every place standing in it** — the one number an automator already
 * publishes for exactly this (0202): a place arriving fades a level in, one leaving fades it out,
 * and the fractional part is the outermost level's own alpha. **The tween is the run's own ramp and
 * never a clock of the picture's**, because a second timer here would be a fade that could disagree
 * with the fade the ear hears.
 *
 * A run with nothing standing folds nothing and is not an entry, so a yard growing nothing leaves
 * the picture exactly as it was drawn before there was a fold in it. Past `DRIFT_FOLD_REACH` every
 * entry falls back by the one factor, which is the even fall-back 0230 argues for: cutting the
 * deepest run to nothing while a shallow one kept what it asked for would make the picture say a
 * busy automator had stopped.
 *
 * Written in place and answering nothing, because it is read once a painting off a population
 * nothing stores (0070, 0204). The keys and not the entries, because a `Map`'s entry iterator
 * allocates a pair per run per read where its keys do not; the value is there by construction,
 * which is why it is asserted rather than defaulted (principle 5).
 */
export function foldInto(out: FractalFold, grown: FoldRun): void {
  let at = 0;
  let asked = 0;
  for (const instance of grown.keys()) {
    let depth = 0;
    // oxlint-disable-next-line no-non-null-assertion
    for (const held of grown.get(instance)!) depth += clamp(held.presence, 0, 1);
    if (depth <= 0) continue;
    const seed = fold(instance);
    out.depths[at] = depth;
    out.ratios[at] = foldRatio(seed);
    out.turns[at] = foldTurns(seed);
    asked += depth;
    at += 1;
  }
  const share = asked > DRIFT_FOLD_REACH ? DRIFT_FOLD_REACH / asked : 1;
  if (share !== 1) {
    for (let each = 0; each < at; each += 1) out.depths[each] = (out.depths[each] ?? 0) * share;
  }
  out.depth = asked * share;
  out.folds = at;
}

/**
 * How many picture-sized blits a fold this deep costs — and none at all for a fold of nothing.
 * **It is the whole picture's depth and never one run's**, which is what bounds the cost: a rack of
 * forty automators each standing a place at a twentieth would otherwise be forty blits a painting
 * for a stack nobody can see. Every pass is one cell of the one ladder `DRIFT_FOLD_REACH` bounds,
 * so a picture never costs more than `ceil(DRIFT_FOLD_REACH)` of them however many runs are up.
 */
export const foldPasses = (depth: number): number => Math.max(0, Math.ceil(depth));

/**
 * Which run's spiral pass `pass` is aimed with: the one standing at that point of the ladder, laid
 * out in the order the read holds them. **A run shallower than a whole pass still deepens the
 * picture and does not turn it** — its depth is in the total either way, and what it does not get
 * is a level cut to its own ratio, which is the only thing a picture with more runs than levels can
 * give away. Answers the last run for a pass past the end, which is float wobble at the ceiling.
 */
export function foldOwner(into: FractalFold, pass: number): number {
  let at = 0;
  for (let each = 0; each < into.folds; each += 1) {
    at += into.depths[each] ?? 0;
    if (pass < at) return each;
  }
  return Math.max(0, into.folds - 1);
}

/**
 * How many levels the field already holds when pass `pass` is laid into it. It doubles at every
 * pass, which is the whole of why this is worth doing: a linear number of blits buys a geometric
 * depth, and the cost of what is drawn is its `log2`.
 */
export const foldLevels = (pass: number): number => 2 ** pass;

/**
 * What the field is scaled and turned by on that pass. The copy laid there carries every level from
 * `foldLevels(pass)` to twice it, so it is aimed at exactly the level it starts on.
 */
export const foldScale = (ratio: number, pass: number): number => ratio ** foldLevels(pass);
export const foldTurned = (turns: number, pass: number): number => turns * foldLevels(pass);

/**
 * The faintest share worth a blit: one part in 255, which is what a canvas's own alpha byte
 * quantises to nothing. **A physical floor and not a tuning** — a pass under it lays no pixel, so
 * skipping it is the same picture for one fewer picture-sized blit, and it is what keeps a rack of
 * runs all barely arriving from paying for a stack nobody could see. It is also where the last
 * pass of a fold whose depth lands a rounding error above a whole number goes.
 */
export const FOLD_FAINTEST = 1 / 255;

/**
 * And the share it is laid at: `FOLD_KEEP` once per level, so a level `n` deep stands at
 * `FOLD_KEEP ** n` and the whole stack is that geometric series. The last pass of a fold that does
 * not come to a whole number is laid at the fraction left over, which is the outermost level's own
 * alpha — so a place arriving fades its level in rather than stepping the whole picture.
 */
export const foldShare = (depth: number, pass: number): number =>
  FOLD_KEEP ** foldLevels(pass) * clamp(depth - pass, 0, 1);
