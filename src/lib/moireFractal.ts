/**
 * @role The picture cut back into itself: how deep the stack goes, what each level of it is scaled
 *   and turned by, how far that turn has travelled and the share it bites at. Pure arithmetic —
 *   the composite itself is the painter's (src/ui/moireFold.ts).
 * @instead The frame before this one laid back into this one → `feedbackAlpha` in src/lib/moire.ts,
 *   which is the same composite one frame later where this is the same composite one scale smaller.
 *   How many scales one *row* is drawn at → `shareOctaves` in src/lib/moire.ts. What a run is
 *   holding → src/lib/effectGrowth.ts.
 */
import { fold } from "./copy.ts";
import { FOLD_SPENT, foldStop } from "./moire.ts";
import { clamp, denormalize } from "./range.ts";

/**
 * As much of a run as the fold reads: every place standing, its own id and how far in it is.
 * Structural rather than the audio tier's own `GrownRun`, because lib may import nothing
 * (docs/map.md) — and it is the whole of what the fold needs, which is why it is worth naming here
 * rather than widening what a caller hands over.
 *
 * **The place's id and not only its holder's**, because that is what the spiral is seeded off
 * (`foldInto`): the map's keys stay the grouping the read already has, and the fold flattens them.
 */
export type FoldRun = ReadonlyMap<
  string,
  readonly { readonly presence: number; readonly instance: string }[]
>;

/**
 * How deep the whole picture may fold into itself, in doublings. **Four**, which is sixteen levels
 * of the picture inside the picture: each pass cuts the field by itself, so what a pass costs is a
 * picture-sized fill and what it buys is twice the levels the last one held.
 *
 * **A fourth is affordable because only an automator can ask for it** (0243). While the picture
 * folded whatever a rack was doing, the depth was a bill every painting paid and three was as far
 * as it could go; now a yard growing nothing draws no pass at all, and the deepest picture there is
 * is one somebody built a run to get.
 *
 * **On the whole fold and not on one run**, for the reason `DRIFT_SCALES_BUDGET` is on the row set
 * and not on the row (0230): how many automators a rack holds is not a number anybody declared, so
 * a ceiling per run multiplies by a count with no bound. Past it every run falls back by the same
 * factor — the second automator still deepens what the first is drawing, it just deepens it less.
 */
export const DRIFT_FOLD_REACH = 4;

/**
 * How hard a level bites into the one outside it. **Under one and a hard ceiling**, the same
 * argument `DRIFT_FEEDBACK_CEILING` rests on (0143): the field is cut by itself, so a bite of one
 * would take the whole of every fringe the level lands on and a picture cut to nothing is a picture
 * with nothing left in it. Under one the levels fall away geometrically and the innermost is a
 * shadow of the outermost rather than a second copy of it.
 *
 * **A bite and not a share kept**, because the fold cuts where it used to fill (0243): the picture
 * is the product of its gratings (0131), and a level laid *onto* the field filled its own fringes
 * in and read as a flat lighter rectangle. Cut, the same level beats against the fringes it crosses
 * and the picture is a moiré of a moiré.
 */
export const FOLD_BITE = 0.6;

/**
 * How far each level of a fold is scaled against the one outside it — a picture inside a picture.
 *
 * **Near one, and it is not a taste.** `foldScale` is `ratio ** foldLevels(pass)`, so the band is
 * squared at every pass: at a half the stack runs 0.5, 0.25, 0.06, 0.004 and is a dot in the middle
 * of the picture by the third one. And a copy at half the spacing sits an octave from what it is
 * cut into, which is a harmonic and not a beat — two gratings only beat at a wavelength the eye can
 * see when their spacings are close, so a half-scale level shows as an even darkening and nothing
 * else. Near one both go away: the stack falls 0.9, 0.81, 0.66, 0.43 and every level of it beats
 * against the ones outside it at a wavelength many fringes wide, which is the moiré of a moiré the
 * fold is for (0131, 0243).
 */
export const FOLD_RATIO_BAND: readonly [number, number] = [0.8, 0.94];

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
 * Since 0243 the travel carries that rule anyway, a turn that never rests never resting at nought;
 * the stops keep it because a halted yard is painted where it stopped and may stop anywhere.
 */
const FOLD_TURN_STOPS = 8;

/**
 * How far a level's own turn travels over one turn of the clock. **A whole turn**, so the travel
 * wraps exactly where the clock does and the nest never jumps: `foldTurned` multiplies it by
 * `foldLevels(pass)`, which is a power of two and so a whole number of turns at every level, which
 * is why the inner levels may spin faster than the outer ones and still come round together.
 */
export const FOLD_TRAVEL_TURNS = 1;

/**
 * A level's turn, carried by the clock. **The row's own phase and never a clock of the picture's**
 * (0126, 0243): every other motion in the drift is read off `turnsOf`, so a halted yard paints
 * exactly where it stopped and a picture drawn on a commit rather than a frame draws the same thing
 * twice. The seed says where the spiral starts and the clock says where it has got to.
 */
export const foldTravelled = (turns: number, clock: number): number =>
  turns + FOLD_TRAVEL_TURNS * clock;

/** How far up the fold each of the two reads is taken from, above the bits src/lib/moire.ts spends. */
const FOLD_RATIO_SHIFT = FOLD_SPENT;
const FOLD_TURN_SHIFT = FOLD_SPENT * FOLD_RATIOS;

/**
 * The two things a standing place's own spiral is, folded off the id of that place — one fold, two
 * independent halves, exactly as a rack card's period and its anchor are taken off the one number
 * its name already is (0076). So six effects are six spirals composed into one stack rather than
 * one spiral drawn six times: each deepens what the last is drawing and turns it somewhere else.
 *
 * **The place's id and not its holder's**: seeded off the automator, every effect it grew shared
 * one spiral, so a run buying six places bought depth and never variety — which is not what the
 * fold says it does (0243).
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
 * whole picture**, and one entry per place standing anywhere in the rack, held in three parallel
 * arrays and refilled in place. `folds` is how many of those entries are in force,
 * and the arrays past it are the last read's leavings — a length reset is a write a per-frame read
 * may not make (0070).
 */
export type FractalFold = {
  /** How deep the whole picture folds, in doublings, held to `DRIFT_FOLD_REACH`. */
  depth: number;
  /**
   * How hard a level bites into the one outside it, this frame — `FOLD_BITE` where nothing has been
   * heard, and sharpened past it by how sharp the output is (`heardBite`, src/lib/moireSound.ts).
   * On the whole fold and not on one run, for the reason `depth` is: it is the picture's own alpha.
   */
  bite: number;
  folds: number;
  /** How much of that depth each standing place is, in the order the read holds them. */
  depths: number[];
  /** What each level of that place's spiral is scaled by against the one outside it. */
  ratios: number[];
  /** And how far it is turned, in turns. */
  turns: number[];
};

/** A picture that has not been read yet — and the one every set is minted with. */
export const foldNothing = (): FractalFold => ({
  depth: 0,
  bite: FOLD_BITE,
  folds: 0,
  depths: [],
  ratios: [],
  turns: [],
});

/**
 * How much a rack is standing, whole: every place's presence, everywhere, added up. **The one
 * number "how busy is the rack" has**, because two of them would be two answers — the fold reads it
 * as how deep the picture goes into itself (`foldInto`) and the row set reads it as how many scales
 * every straight row is drawn at (`spreadOctaves`, src/lib/moire.ts, 0244), and an automator whose
 * run deepened the fold without spreading the rows would be one hand on two dials.
 *
 * Allocating nothing and answering a number, because the fold walks it once a painting (0070).
 */
export function foldStanding(grown: FoldRun): number {
  let standing = 0;
  for (const held of grown.values()) {
    for (const place of held) standing += clamp(place.presence, 0, 1);
  }
  return standing;
}

/**
 * Fill `out` from the run every instance is holding. **The fold is the automator's own mark on the
 * picture and nothing else's** (0243): a yard growing nothing folds nothing, draws no pass and pays
 * no blit, and is exactly the picture it was before there was a fold at all. So the depth is a
 * reading of the rack and never a floor the picture stands on by itself — what an automator does to
 * the drift is legible because it is the only thing that does it.
 *
 * **How deep a run folds it is the summed `presence` of every place standing in it** — the one
 * number an automator already publishes for exactly this (0202): a place arriving fades a level in,
 * one leaving fades it out, and the fractional part is the innermost level's own alpha. The tween is
 * the run's own ramp, because a second timer for a *depth* would be a fade that could disagree with
 * the fade the ear hears; what the picture's own clock carries is the turn and only the turn
 * (`foldTravelled`).
 *
 * A place that has not arrived deepens nothing and is not an entry. Past `DRIFT_FOLD_REACH` every
 * entry falls back by the one factor, which is the even fall-back 0230 argues for: cutting the
 * deepest run to nothing while a shallow one kept what it asked for would make the picture say a
 * busy automator had stopped. **The reach is the reach and is not aged into**, because a fold an
 * automator has to wait out a side of a record to be given is a fold nobody sees it buy (0243).
 *
 * **One entry per standing place, and not per automator holding one.** The map is grouped by its
 * holder because that is the grouping the read already has, and the fold flattens it: an automator
 * standing six places composes six spirals rather than repeating its own once a level, which is
 * what "the picture folds into itself, once per grown effect" was always meant to say (0243).
 *
 * Written in place and answering nothing, because it is read once a painting off a population
 * nothing stores (0070, 0204). The values and not the entries, because a `Map`'s entry iterator
 * allocates a pair per run per read where its values do not.
 */
export function foldInto(out: FractalFold, grown: FoldRun): void {
  const asked = foldStanding(grown);
  let at = 0;
  for (const held of grown.values()) {
    for (const place of held) {
      const depth = clamp(place.presence, 0, 1);
      if (depth <= 0) continue;
      const seed = fold(place.instance);
      out.depths[at] = depth;
      out.ratios[at] = foldRatio(seed);
      out.turns[at] = foldTurns(seed);
      at += 1;
    }
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
 * Whose spiral pass `pass` is aimed with: the entry standing at that point of the ladder, laid out
 * in the order the read holds them. **An entry shallower than a whole pass still deepens the
 * picture and does not turn it** — its depth is in
 * the total either way, and what it does not get is a level cut to its own ratio, which is the only
 * thing a picture with more runs than levels can give away. Answers the last entry for a pass past
 * the end, which is float wobble at the ceiling.
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
 * quantises to nothing. **A physical floor and not a tuning** — a pass under it cuts no pixel, so
 * skipping it is the same picture for one fewer picture-sized blit, and it is what keeps a rack of
 * runs all barely arriving from paying for a stack nobody could see. It is also where the last
 * pass of a fold whose depth lands a rounding error above a whole number goes.
 */
export const FOLD_FAINTEST = 1 / 255;

/**
 * And the share it bites at: `FOLD_BITE` once per **pass**, so pass `n` bites at
 * `FOLD_BITE ** (n + 1)` and the whole stack is that geometric series. The last pass of a fold that
 * does not come to a whole number bites at the fraction left over, which is the innermost level's
 * own alpha — so a place arriving fades its level in rather than stepping the whole picture.
 *
 * **Per pass and not per level** (0243). Once per level is `FOLD_BITE ** foldLevels(pass)`, which
 * is the bite squared at every pass: at a bite of a half that is 0.5, 0.25, 0.06, 0.004, and the
 * last of those is `FOLD_FAINTEST` — so however deep the picture folded, the painter only ever cut
 * two passes anybody could see and the depth past them was a number with no picture in it. Per pass
 * the series falls by the bite each time and every pass the ladder holds is a pass the eye is
 * given.
 *
 * `bite` is the fold's own alpha where the caller has one — a picture that has heard something bites
 * harder than one that has not (`FractalFold.bite`) — and `FOLD_BITE` where it has not, which is
 * the share every fold bit at before there was a reading to sharpen it.
 */
export const foldShare = (depth: number, pass: number, bite = FOLD_BITE): number =>
  bite ** (pass + 1) * clamp(depth - pass, 0, 1);
