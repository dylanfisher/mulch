/**
 * @role The push a landing puts on the marks: where on the picture the walk has just landed, how
 *   hard, and how far that has fallen since. A reading of what the yard is doing and never a
 *   parameter, exactly as the jolt beside it is (0145, 0128) — it rests on the field and belongs to
 *   no row, and what it is spent on is the threshold the frame-side marks are stamped through
 *   (`readMarks`, src/ui/moireCanvasMarks.ts), so a row flares when its landing sounds and settles
 *   after while the lattice under it stands still (0346).
 * @instead How hard the landing struck at all, and the whole field's own answer to a hit →
 *   src/ui/moireJolt.ts, whose `joltWalked` is the level this is pushed at. Where the marks are
 *   actually lifted, and by how much of the ramp → `readMarks`, src/ui/moireCanvasMarks.ts. How
 *   long the loop the fall is timed against is → `loopPeriodSecs`, src/lib/recurrence.ts. Where an
 *   anchor turn actually lands on the picture, which is what puts the band where the rows are →
 *   `centreAcross`, src/lib/moireGeometry.ts.
 */
import { DRIFT_CENTRE_SWING, easedToward } from "@/lib/moire";
import { centreAcross } from "@/lib/moireGeometry";
import { clamp } from "@/lib/range";
import { tunable } from "@/lib/moireTuning";

/**
 * How much of a loop a landing's push takes to fall away, as a share of the loop the yard is
 * reading. **A share of the loop and never a span in seconds**: what the eye reads as one row
 * flaring and settling is a fall measured against the pattern going by, so the same dial holds at
 * any tempo — and the fall is the one motion this block puts on the marks, so it has to be over
 * before the walk comes round again.
 *
 * Rests at a half, where a landing is still pushing at the loop's midpoint and gone by its top, so
 * a walk at an ordinary rate has two or three rows lit at once and each of them on its own way
 * down. At one a push lasts exactly the loop and never longer: a push that outlives the loop is a
 * lattice permanently lifted, which is the still lattice moved rather than a row flaring.
 */
export const CELL_DECAY = tunable("cells.decay", 0.5, { min: 0.05, max: 1, step: 0.05 });

/**
 * How many landings may be falling at once. Four, because the fall is at most a whole loop and a
 * walk lands eight or sixteen times in one: fewer and a flare is cut off by the next landing rather
 * than settling, more and the whole lattice is lifted at once, which is the still picture moved.
 * A landing arriving on a full ring takes the weakest slot, so what the picture shows is the
 * boldest four landings still falling.
 */
export const CELL_PUSHES = 4;

/** How hard one landing is still pushing the marks, and where on the picture it stands. */
export type MoireCellPush = {
  /** How hard, nothing to wholly: the level it landed at, fallen since. */
  at: number;
  /** And where down the picture, on the same nought-to-one the rows' own anchors stand on. */
  centre: number;
};

/** Where the pushes stand before anything has landed: nothing pushing, anywhere. */
export const cellPushRest = (): MoireCellPush[] =>
  Array.from({ length: CELL_PUSHES }, () => ({ at: 0, centre: 0 }));

/**
 * One step of the pushes: every one of them fallen by what the clock has moved, and the landing
 * that struck this frame — if one did, and if it struck harder than the weakest slot — taken up
 * outright at the place it stands. **Up outright and down rated**, which is the jolt's own shape
 * and for the jolt's reason: a flare that eased in is not a landing.
 *
 * Falls outright where there is no clock to fall against — a halted yard, or one with no loop to
 * measure a share of — which is the answer the jolt, the ink and the wind all give (0144, 0271).
 */
export function cellPushInto(
  pushes: readonly MoireCellPush[],
  struck: number,
  centre: number,
  elapsed: number,
  over: number,
): void {
  let weakest: MoireCellPush | null = null;
  for (const push of pushes) {
    push.at = easedToward(push.at, 0, elapsed, over, 1);
    if (weakest === null || push.at < weakest.at) weakest = push;
  }
  const level = clamp(struck, 0, 1);
  if (weakest === null || level <= 0 || level <= weakest.at) return;
  weakest.at = level;
  weakest.centre = clamp(centre, 0, 1);
}

/**
 * How deep the band of a push is, as a share of the picture: **one step of the ladder a row's own
 * anchor is quantised onto** (`DRIFT_CENTRE_SWING`, src/lib/moire.ts). So the rows a landing lifts
 * are the rows its own anchor could be standing in and no further — a second declaration of how far
 * apart two anchors stand would be the same fact written twice (principle 1) — and two landings a
 * step apart light two bands that do not touch.
 */
export const PUSH_BAND = DRIFT_CENTRE_SWING;

/**
 * The cell rows a push stands in, on a grid `deep` cells down: the band around its own centre, cut
 * to the grid and never off the ends of it. Half-open — the first row it lifts and the first it
 * does not — and at least one row wherever the push is on the picture at all, because a band
 * narrower than a cell still stands in the cell it is inside.
 *
 * **Both ends taken down and never one down and one up.** Two landings a step apart share the one
 * edge between them, and a band that ceiled its far end would take the cell the next band floors
 * onto: the two fills are laid on one read under `lighter`, so a shared row is a cell lifted twice
 * — two marks where the band is one.
 *
 * **Through `centreAcross` and never straight down the picture.** A centre is an anchor *turn*, not
 * a fraction of the height: where a turn actually lands is inset a quarter from either end
 * (`CENTRE_INSET`, src/lib/moireGeometry.ts), which is the one mapping every row in the picture is
 * drawn through. Read straight, a landing at nought would flare the top of the picture while the
 * rows it landed on stood a quarter of the way down it — and only the resting centre, a half, would
 * have come out right. The band's own ends go through the same map, so it is one step of the ladder
 * on the picture as well as in the turn, and it stops where an anchor's own travel stops.
 */
export function pushedRows(
  push: Readonly<MoireCellPush>,
  deep: number,
): { top: number; of: number } {
  const from = Math.floor(centreAcross(push.centre - PUSH_BAND / 2, deep));
  const to = Math.floor(centreAcross(push.centre + PUSH_BAND / 2, deep));
  const top = clamp(from, 0, Math.max(0, deep - 1));
  return { top, of: clamp(to, top + 1, deep) - top };
}
