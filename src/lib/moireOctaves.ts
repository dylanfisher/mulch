/**
 * @role How many scales a row of the picture is drawn at: what a copy cuts, what a row drawn at
 *   several is worth as gratings, how many a growing run earns, and how the whole set is held to
 *   one budget of fills. The one dimension that draws real self-similarity, and the arithmetic
 *   every reader of it shares (0244).
 * @instead What a row *is*, and every other dimension a value reaches into it → src/lib/moire.ts.
 *   The painter that spends these on fills → `cutOctaves` in src/ui/moireCanvas.ts. What a run is
 *   standing, which is what earns them → `foldStanding` in src/lib/moireFractal.ts.
 */
import { DRIFT_OCTAVES_REACH, LINEAR_GEOMETRY, type MoireRow } from "./moire.ts";
import { clamp } from "./range.ts";

/**
 * The total extra fills a whole set of rows may ask for — every copy past the first, added up
 * across the picture. `DRIFT_OCTAVES_REACH` bounds how deep one row goes and this bounds how many
 * rows may go there, which is the bound the reach alone never was: the number of rows is not
 * fixed, so a rack of automators each drawing its run at its own depth multiplies a per-row
 * ceiling by a count nobody declared.
 *
 * Sixteen: enough for a second scale on every row of a typical picture. A picture with an
 * automator in it is about fourteen rows and `spreadOctaves` claims a second scale on all of them,
 * so a budget of twelve would have held that claim back to the deepest twelve rows and left the
 * rest flat — and the measurement says a broad shallow spread beats a narrow deep one at the same
 * cost (0244). Past it the counts fall back toward one evenly (`shareOctaves`) — a very large rack
 * draws fewer scales rather than turning the painter into a slideshow. The picture may fall behind
 * and the hand may not (0144); this is what keeps the falling-behind bounded rather than merely
 * permitted.
 */
export const DRIFT_SCALES_BUDGET = 16;

/** How many scales a row is actually drawn at — a whole number of copies, and never none. */
export const octavesOf = (row: MoireRow): number => Math.max(1, Math.round(row.octaves));

/**
 * How deep one row's `octave`th copy cuts, of the depth that row asked for: half the one below it,
 * which is what makes the copies one wave at several scales rather than several waves. Here rather
 * than only in the painter that spends it, so the measurement that says the spread is worth drawing
 * reads the same arithmetic the picture is drawn with (`cutOctaves`, src/ui/moireCanvas.ts).
 */
export const octaveAlpha = (depth: number, octave: number): number => depth / 2 ** octave;

/**
 * What a row drawn at `octaves` scales is worth as gratings: `1 + 1/2 + … + 1/2**(octaves-1)`, the
 * copies' own depths added up. **A copy is a share of a grating and not a whole one** (0244):
 * `gratingDepth` solves the picture's weight from a count of gratings, so counting a copy cutting
 * an eighth of a row's depth as a whole grating takes depth away from every row in the picture to
 * pay for ink that was never laid.
 *
 * It cost nothing while `octaves` reached one row in a rack. Picture-wide it is the difference
 * between a spread and a wash: measured on a fourteen-row picture given a second scale on every
 * row, counting the copies whole lifted the field's mean from the floor of 0.3 to 0.41 and cut the
 * structure surviving a coarse average by a fifth — the spread paid its fills and returned a
 * paler, flatter picture. Counted as shares the mean holds at the floor and the coarse structure
 * rises by a third, which is what drawing a picture at several scales is supposed to buy.
 */
export const octaveShare = (octaves: number): number => 2 - 2 ** (1 - Math.max(1, octaves));

/**
 * How many scales a run standing this deep earns whatever it is spent on: a scale a place, held to
 * `DRIFT_OCTAVES_REACH`, and one — which is no claim at all — for a yard growing nothing. Declared
 * once because it is spent twice: on the rows an automator grew (`grownOctaves`,
 * src/lib/effectGrowth.ts) and on every straight row in the picture (`spreadOctaves`).
 */
export const octavesEarned = (standing: number): number =>
  clamp(Math.round(standing), 1, DRIFT_OCTAVES_REACH);

/**
 * Raise every straight row in the set to the scales the rack standing earns, in place — the whole
 * picture drawn at several scales at once rather than the automator's own rows alone (0244).
 *
 * **This is what makes an automator's run look fractal.** `octaves` is the one dimension in the
 * instrument that draws genuine self-similarity, and until this only a run's own grown rows and a
 * single parameter of one plugin could reach it — so a picture of fourteen rows drew thirteen of
 * them at exactly one scale however busy the rack was, which is a flat lattice with a deep corner
 * in it. Measured, a second scale on every row buys more large-scale structure than a third scale
 * on six of them, for half the fills.
 *
 * **Straight rows only**, the same answer `grownOctaves` gives and for the same reason: `octaves`
 * is a `STRAIGHT_DIMENSIONS` claim, and a curved copy would need a picture-sized tile of its own
 * (0142, 0143). **Never below what a row already claimed**, so this is a floor under the picture
 * and not a second opinion about any row — what the whole set can afford is `shareOctaves` after
 * it, which is the last word on cost and may take a copy back off any row here (0230).
 *
 * A yard growing nothing stands nothing, earns one scale and changes no row: the picture is exactly
 * the picture it was before there was an automator in it, which is the property the fold has and
 * for the same reason (0243).
 *
 * Called once where the set is built and never per frame, as `shareOctaves` is: what a run is
 * standing moves a place at a time, and a place moving rebuilds the set (`grownStanding`, 0070).
 */
export function spreadOctaves(rows: MoireRow[], standing: number): void {
  const earned = octavesEarned(standing);
  if (earned <= 1) return;
  for (const row of rows) {
    if (row.geometry !== LINEAR_GEOMETRY) continue;
    row.octaves = Math.max(octavesOf(row), earned);
  }
}

/**
 * Hold a whole set of rows to `DRIFT_SCALES_BUDGET` extra fills between them, in place. A set that
 * fits is left exactly as it asked; a set that does not falls back **evenly** — every row is held
 * to one ceiling, the highest ceiling the budget can afford them all, rather than the deepest rows
 * being cut to nothing while the shallow ones keep what they asked for. Whatever the ceiling
 * leaves over is then handed out a copy at a time, in row order, to the rows still asking for
 * more, so the budget is spent rather than rounded away. Row order is the picture's own — rack
 * order, and each instance's grown rows behind it — and it is the **tiebreak** and not a
 * preference: rows that asked alike never end more than a copy apart, and which of them gets the
 * odd one is where it stands. Nothing here reads what kind of row it is, because a set-wide bound
 * that preferred one kind would be a second answer to "how deep is this row" (0139).
 *
 * Called once where the set is built and never per frame: what a row asks for is its identity and
 * what its effect is set to, and neither of those moves between frames (0070).
 */
export function shareOctaves(rows: MoireRow[], budget = DRIFT_SCALES_BUDGET): void {
  let asked = 0;
  for (const row of rows) asked += octavesOf(row) - 1;
  if (asked <= budget) return;
  // The one ceiling every row falls back to. Raised while it still fits, and it always fits at
  // one — a row is drawn at least once whatever the budget says, because a row nobody draws is a
  // row missing from the picture rather than a shallower one.
  let ceiling = 1;
  // Never past `budget + 1`: one row at that ceiling already spends the whole budget, so no higher
  // one can fit. A bound in the header rather than an argument that the body always breaks.
  for (let next = 2; next <= budget + 1; next++) {
    let spend = 0;
    for (const row of rows) spend += Math.min(octavesOf(row), next) - 1;
    if (spend > budget) break;
    ceiling = next;
  }
  let left = budget;
  for (const row of rows) left -= Math.min(octavesOf(row), ceiling) - 1;
  for (const row of rows) {
    const wanted = octavesOf(row);
    const held = Math.min(wanted, ceiling);
    // The remainder, a copy at a time and only to a row that is still asking: a row already at
    // what it wanted is not made deeper by a budget it did not spend.
    const over = left > 0 && wanted > held ? 1 : 0;
    left -= over;
    row.octaves = held + over;
  }
}
