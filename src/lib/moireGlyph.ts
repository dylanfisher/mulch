/**
 * @role The ramp onto the marks: how hard a cell's read is pushed toward the ends of its scene's
 *   ramp before it is cut, which of an alphabet's ten marks the pushed read lands on, and how soft
 *   a mark is read at the size the cell actually is. **The ramp wraps**: it starts partway along
 *   the marks and comes round, so the field's empty ground and its peaks both read as sparse marks
 *   and only the band between them reads dense, which is what makes a lattice of marks read as a
 *   picture and not as a halftone (0345). Arithmetic and no table — the marks themselves are one
 *   alphabet of three and live beside the others.
 * @instead The alphabets themselves, how a mark of one is read, and which of them the standing part
 *   of a song picks → src/lib/moireAlphabets.ts. Where a mark is written into a tile, a cell at a
 *   time → src/lib/moireScreenField.ts, and the cell's own size, which is the screen's column pitch
 *   (`gridPitchPx`) there too. Where on its ramp a cell stands → the scene's own ground,
 *   src/lib/scene/. The ramp a value is read through for its colour → src/lib/moireColour.ts. The
 *   repeat a cell snaps to across a tile → `sceneRepeat`, src/lib/moireScene.ts.
 */
import { wrap } from "./moire.ts";
import { tunable } from "./moireTuning.ts";
import { clamp } from "./range.ts";

/**
 * Where along the marks the ramp starts, as a share of their count: the mark the field's empty
 * ground is written in. A fifth is two marks in — the colon — so nought reads as a sparse colon,
 * the ramp's top comes round to the dot beneath it, and the band between wraps through the dense
 * marks. At nought the ramp does not wrap at all and the ground is left blank, which is a halftone.
 */
export const GLYPH_PHASE = tunable("glyph.phase", 0.2, { min: 0, max: 0.9, step: 0.1 });

/**
 * How hard a cell's read is pushed toward the ends of its ramp before it is cut into marks: a gain
 * about the ramp's middle, so most of a field falls onto the sparse mark its ground is written in
 * and only the band that was already bright wraps through the dense ones. At nought the read is
 * the scene's own and the lattice is the one 0346 shipped, where about three-quarters of a bloom
 * tile's cells are heavier than the plus; at the rest that share falls to about a fifth, which is
 * the reference's sparse ground with ribbons through it (0348).
 */
export const GLYPH_PUSH = tunable("glyph.push", 1, { min: 0, max: 4, step: 0.25 });

/**
 * A read pushed `push` harder about the ramp's middle and held to the ramp. At nought it is the
 * read itself, which is the one thing the dial promises: the push is a cut of the ramp and never
 * a second wrap, and it reaches the mark alone — the cell's colour is read at the scene's own
 * stand, so the ground the scene draws is untouched (0348).
 */
export const pushRead = (value: number, push: number): number =>
  clamp(value + (value - 0.5) * push, 0, 1);

/**
 * How soft a mark is read, in the cell units `markCoverage` takes it in (src/lib/moireAlphabets.ts):
 * a quarter of a device pixel either way, which is what keeps a bit from crawling when the lattice
 * moves. Here rather than at each lattice, because a quarter of a
 * device pixel is one fact and the picture now carries three lattices that have to agree on it —
 * the tile's own, the rack's second one and the specks' scatter (0345, 0351, 0352).
 */
export const markBlur = (cell: number): number => (cell > 0 ? 0.25 / cell : 0);

/**
 * Which of `count` marks a cell standing at `value` on its ramp is written in: the ramp cut into
 * `count` steps, started `phase` of the way along the marks and wrapped, so the top step comes
 * round to the mark beneath the bottom one. The top of the ramp is the last step and not one past
 * it, so a field at its brightest is still one mark and not the mark its ground is written in.
 */
export function markAt(value: number, count: number, phase: number): number {
  const step = Math.min(count - 1, Math.floor(clamp(value, 0, 1) * count));
  return wrap(step + Math.floor(phase * count), count);
}
