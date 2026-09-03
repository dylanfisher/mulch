/**
 * @role The plane folded into mirrored sectors about a point — the bench's Kaleidoscope, and what
 *   the automator's look was until the shards replaced it (0296): a whole number of mirrors, each
 *   further one folded onto the folds already there, so n folds are 2^n images of every point. Pure
 *   maths on a coordinate, kept for `src/ui/sketch/structure/` alone and deleted with it (0295).
 * @instead What an automator does to the picture today → src/lib/moireShards.ts. The bench that
 *   still folds the finished field → src/ui/sketch/structure/sketchStructure.ts.
 */
import { TAU, wrap } from "./moire.ts";

/**
 * How many folds the bench takes at most. Four folds are sixteen images of every point, and the
 * fifth is a rosette no picture is wide enough to show a sector of.
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
 * second fold folds the picture the first one left rather than starting over.
 *
 * Whole folds only: a point halfway to its mirror image lies on the seam, and the whole picture
 * would be a stripe down the middle at the half.
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
