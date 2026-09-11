/**
 * @role The delay's cell pass: a cell's mark repeated along its own row, once per repeat the sound
 *   makes, each copy one mark lighter than the one before it — so a delay standing in a rack is a
 *   ladder of lighter marks behind every dense one, where the field pass behind it is the same
 *   ladder said of the cut (0349). **The cell pass is what the marks show and the field pass is
 *   what the cut shows**, and both are one declaration on one entry (`echoesLook`).
 * @instead The contract every pass is written to, and the runner → src/lib/moireCells.ts. The
 *   delay's own look, its field pass and the numbers both of them read → src/lib/moireEchoes.ts.
 *   The declaration itself → `look` and `lookFrom` on src/audio/effects/delay.ts.
 */
import { cellAt, cellRaise, type CellPass } from "@/lib/moireCells";
import { echoCount, echoSpacing } from "@/lib/moireEchoes";
import { clamp } from "@/lib/range";

/**
 * How many whole cells apart the rungs stand, off the spacing term its entry declared: the look's
 * own share of the field (`echoSpacing`), read across the `cols` cells the grid is wide. **The
 * share is the one declaration and this is a reading of it** (principle 1), so the Time knob moves
 * the ladder in the marks and the ladder in the cut by one number.
 *
 * Whole cells, because a rung that fell between two of them would be a rung in neither; never
 * under one, because a rung on the cell it came from is not a rung; and never past the last cell
 * of the row, because the grid wraps and a step wider than the row lands the ladder back inside
 * itself. The tile is one beat cell wide and so `pitch + 1` cells across — six on a 1× display
 * (0346) — which is why this is read against the grid rather than stated as a band of its own.
 */
export const echoCells = (spacing: number, cols: number): number =>
  Math.max(1, Math.min(Math.max(1, cols - 1), Math.round(echoSpacing(spacing) * cols)));

/**
 * How many rungs the ladder has: the repeats the delay makes (`echoCount`), taken by how much of
 * the look the picture has travelled to. **Whole, and stepped with the travel** — where the field
 * pass carries its travel in the ladder's alpha and never in its count (0294), a mark has no alpha
 * to carry it, so a delay arriving is its ladder growing a rung at a time and each rung is one
 * rebake of a tile that is held under the step it grew at.
 *
 * **And never more rungs than the row has room for.** The grid wraps, so a ladder longer than the
 * row writes its last rungs back onto the cells it started from — at three rungs of four cells on
 * a row of six, the third rung lands on the source and the ladder reads as one ghost. Bounded
 * here, where the bound is one line, rather than in the pass, where it would be a second place
 * that knows what a rung is (the review's finding).
 */
export const echoRungs = (at: number, count: number, cols: number, step: number): number =>
  Math.min(Math.round(clamp(at, 0, 1) * echoCount(count)), Math.floor((cols - 1) / step));

/**
 * The echoes, as marks: every cell written into the cells a whole number of spacings to its right,
 * one mark lighter a rung, and the cell left in the heaviest of what stands on it. Along the row
 * and never down it, because a delay is a displacement in time and the row is where time runs.
 *
 * A rung that has faded to nothing is not written and ends the ladder: a mark of nothing is the
 * page, and raising a cell to it would be a pass that changes nothing said in more writes.
 */
export const cellEchoes: CellPass = (marks, into, cols, rows, at, terms) => {
  const step = echoCells(terms.spacing ?? 0, cols);
  const rungs = echoRungs(at, terms.count ?? 0, cols, step);
  if (rungs <= 0) return;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const from = marks[y * cols + x] ?? 0;
      for (let rung = 1; rung <= rungs; rung++) {
        const mark = from - rung;
        if (mark <= 0) break;
        cellRaise(into, cellAt(cols, rows, x + rung * step, y), mark);
      }
    }
  }
};
