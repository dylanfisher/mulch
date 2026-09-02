/**
 * @role The plane folded into mirrored sectors about a point: what an automator does to the
 *   picture's coordinate, one mirror per automator standing and each further one folded onto the
 *   folds already there — so n automators are 2^n images of every row cut on the folded plane. Pure
 *   maths on the row's own coordinate, and the one place a fold is a number.
 * @instead Where a row is folded — inside the one loop over a curved row's pixels →
 *   src/lib/moireGeometry.ts. How many automators are standing — the automator's own declared look,
 *   read off the rack and travelled → src/ui/moireLooks.ts (0279). The bench picture this came off →
 *   src/ui/sketch/sketchDrift.ts.
 */
import { DRIFT_STEPS, TAU, wrap } from "./moire.ts";
import { snapToStep } from "./range.ts";

/**
 * How many folds the picture takes at most, whatever the rack holds. Four folds are sixteen images
 * of every row, and the fifth is a rosette no strip is wide enough to show a sector of; and each
 * fold is a ladder of bakes on every curved row (`steppedFolds`), so the cap is also a bound on
 * what a rack of automators may ask the tile shop for.
 */
export const FOLD_CAP = 4;

/**
 * The plane folded into `sectors` mirrored wedges about nought — a kaleidoscope, which in shader
 * hands is one modulo and one absolute value. A whole number of sectors, two or more, or the fold
 * would not close. Allocates a pair, so the bench may call it a pixel at a time and the kernel may
 * not: the kernel goes through `foldPlane` below.
 */
export function kaleido(x: number, y: number, sectors: number): [number, number] {
  if (!Number.isInteger(sectors) || sectors < 2) {
    throw new Error(`A fold into ${sectors} sectors does not close.`);
  }
  const radius = Math.hypot(x, y);
  const sector = TAU / sectors;
  const angle = Math.abs(wrap(Math.atan2(y, x) + sector / 2, sector) - sector / 2);
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
}

/** A point on the folded plane, written in place by `foldPlane` (0070). */
export type Folded = { u: number; v: number };

/**
 * `(u, v)` folded `folds` whole times about nought, into `out`. Nought is the plane as it stands;
 * one is a mirror about the u axis, so every point stands in the upper half; and each further fold
 * halves the wedge again, which is `kaleido` into 2^(folds − 1) sectors — a fold onto folds, so a
 * second automator folds the picture the first one left rather than starting over.
 *
 * Whole folds only: a fold in progress is two folded pictures crossfaded, never one point slid
 * toward its mirror image, because a point halfway to its image lies on the seam and the whole
 * picture would be a stripe down the middle at the half (`curvedField`, src/lib/moireGeometry.ts).
 */
export function foldPlane(out: Folded, u: number, v: number, folds: number): void {
  if (!Number.isInteger(folds) || folds < 0 || folds > FOLD_CAP) {
    throw new Error(`A plane folded ${folds} times is not a fold the picture takes.`);
  }
  if (folds === 0) {
    out.u = u;
    out.v = v;
    return;
  }
  if (folds === 1) {
    out.u = u;
    out.v = Math.abs(v);
    return;
  }
  const radius = Math.hypot(u, v);
  const sector = TAU / 2 ** (folds - 1);
  const angle = Math.abs(wrap(Math.atan2(v, u) + sector / 2, sector) - sector / 2);
  out.u = radius * Math.cos(angle);
  out.v = radius * Math.sin(angle);
}

/**
 * How many folds a rack of `automators` standing asks for: one each, and never past the cap.
 * Fractional where one of them is still arriving — a fold on its way in is two folded pictures
 * crossfaded, and never a whole number rounded to (`curvedField`, src/lib/moireGeometry.ts, 0278).
 */
export const foldsOf = (automators: number): number => Math.min(Math.max(0, automators), FOLD_CAP);

/**
 * A fold count on the ladder a tile is keyed through: `DRIFT_STEPS` stops per fold, so a fold
 * arriving is eight bakes on every curved row over the seconds the travel takes, the way an ink
 * walks its own ladder (0266). Its own ladder and not `stepped`'s, because that one snaps onto a
 * fraction of the whole reach — and the whole reach here is four folds, which would be two stops a
 * fold.
 */
export const steppedFolds = (folds: number): number =>
  snapToStep(folds, 0, FOLD_CAP, 1 / DRIFT_STEPS);
