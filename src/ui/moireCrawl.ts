/**
 * @role How far the walk's ground has crawled the screen's lattice, in whole cells of the marks:
 *   the one travel the lattice makes across the picture, and the field's own reading rather than
 *   any row's (0213). Read off where the ground has actually *travelled* to, so the lattice steps on
 *   the ground's own travel and never on a clock of its own (`easedCentre`, `playerGroundSecs`,
 *   src/lib/playerDrift.ts). That travel is a **rate** — the whole source in `playerGroundSecs` — so
 *   a move across the file sweeps the lattice and a bed's move inside a long file steps it almost at
 *   once, which is the rule the ground is already travelled by (0235) and not a second one.
 * @instead The ground itself, how far a move of it has travelled and how long that takes →
 *   src/lib/playerDrift.ts, which this reads and never writes. Where the crawl is spent, and the
 *   lean the rack's own tail puts on it → `inkThrough` in src/ui/moireScreen.ts. The other
 *   whole-field readings of a picture → src/ui/moireWind.ts and src/ui/moireShape.ts.
 */
import type { MoireRow } from "@/lib/moire";
import { playerGroundBeds } from "@/lib/playerDrift";
import type { Loop } from "@/lib/timeline";
import { onGround } from "@/ui/moireCarry";
import type { RowRead } from "@/ui/moireRowsField";

/**
 * How many whole cells the ground has walked the lattice: the beds the picture's ground stands
 * through the source, rounded, so a move of a bed steps the lattice exactly one cell and a move of
 * four steps four. Rounded here and not at the spend, for the reason the output's two sides are rounded where
 * they are read (`leanCells`, src/ui/moireShape.ts): the number this is rounded from is a travel
 * and the step belongs where the travel is understood.
 *
 * **A quarter-bed nudge is under the cell and steps nothing on its own** — four of them are a bed
 * and step one. The lattice is a standing grid and a cell is what the eye can see move (0346); a
 * step for every sixteenth would be a grid sliding rather than one being played.
 *
 * Unbounded, and deliberately: it is how many beds through the source the ground stands and not a
 * distance walked, so a long file with a short loop reads in the hundreds. A translation of a
 * repeating pattern is exact at any whole number of cells, and what the eye reads is the difference
 * between two frames.
 *
 * The first ground row's travelled centre and no other, which is `carryGround`'s argument exactly:
 * one ground is one field, the read writes every row that rests on it from one number, and they can
 * only differ by having been built apart. A loop over the reads rather than a `find`, because this
 * is read once a painting and a painting allocates nothing (0070).
 */
export function crawlCells(
  rows: readonly MoireRow[],
  reads: readonly RowRead[],
  loop: Loop | null,
  duration: number,
): number {
  for (let index = 0; index < reads.length; index += 1) {
    const read = reads[index];
    if (read === undefined || !onGround(read)) continue;
    const row = rows[index];
    if (row === undefined) continue;
    return Math.round(playerGroundBeds(row.centre, loop, duration));
  }
  return 0;
}
