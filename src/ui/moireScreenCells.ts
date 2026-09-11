/**
 * @role The cell grid one tile is written on: where each cell of the field stands on the scene's
 *   ramp — the box read, one mean per cell — which of the ten marks that read is cut into, and the
 *   standing rack's own passes over the marks that follow (0345, 0348, 0349). Split off
 *   src/ui/moireScreenTile.ts when the passes landed and that file stood at the 800-line cap, for
 *   the reason it split off src/ui/moireScreen.ts (0045): what moved is a whole reading and never
 *   half of one — everything between the scene's body and the mark a cell is written in.
 * @instead The tile itself, the ink the marks are drawn in and the one loop over the pixels →
 *   src/ui/moireScreenTile.ts, this file's only caller. What a pass is and what runs one →
 *   src/lib/moireCells.ts; the passes → src/lib/moireCellEchoes.ts, src/lib/moireCellBloom.ts;
 *   which of them a rack stands → src/ui/moireCells.ts. The marks and the wrapped ramp onto them →
 *   src/lib/moireGlyph.ts. The body a cell is read out of → `bodyOf`, src/ui/moireScreenTile.ts.
 */
import { DRIFT_REST } from "@/lib/moire";
import { type MoireCells, runCellPasses } from "@/lib/moireCells";
import { GLYPH_COUNT, GLYPH_PHASE, GLYPH_PUSH, markAt, pushRead } from "@/lib/moireGlyph";
import { sceneAxis } from "@/lib/moireScene";
import { clamp } from "@/lib/range";

/**
 * How many numbers a pixel of a body, and of a fringe cell, carries: the ground, the pull and the
 * point; or one multiplier per channel.
 */
export const PER_PIXEL = 3;

/**
 * How far the yard's own hue travel carries the read off where the ground put it, in units of the
 * ramp. **A half**, which is one stop of five: the travel swings a half either side of
 * `DRIFT_REST.hue`, so a claim at either end moves the read by a quarter of the ramp and no further
 * ([0301](../../docs/decisions/0301-the-ink-orbits-a-ramp-of-five.md),
 * [0141](../../docs/decisions/0141-colour-is-something-an-effect-turns.md)). It was a whole ramp
 * when a scene was read once a tile and the read was the picture's only colour; a field that is
 * already two hues at full strength has one stop of travel to spend and not four (0332).
 */
const SCENE_HUE_REACH = 0.5;

/**
 * Where on the ramp a pixel whose ground stands at `ground` is read, at where the picture's hue has
 * travelled to. An offset on the ground and never a position of its own, so an effect claiming a
 * hue slides the whole field along its ramp rather than replacing what the field said.
 */
export const sceneHue = (ground: number, hue: number): number =>
  clamp(ground + SCENE_HUE_REACH * (hue - DRIFT_REST.hue), 0, 1);

/** Where every cell of a tile stands on its ramp, and which mark each of them is written in. */
export type CellGrid = { stood: Float32Array; marks: Uint8Array };

/**
 * The grid a tile `width` by `height` is written on, out of the scene's own `body`: one read and
 * one mark per cell, and then the rack's own passes over the marks.
 *
 * **A cell says everything it says once, and says the mean of it**: where on the ramp it stands is
 * the read — the ground under its shade, its air and its bright points — averaged over every pixel
 * in it, the box a lattice of marks reads its picture through. Not its centre pixel, which reads a
 * grating a cell's own pitch apart at one phase in every cell; and not its brightest, which lights
 * a cell a speck only grazes and turns a flock into a blanket.
 *
 * The read is kept beside the mark because the ink is read at the cell's own stand, *before* the
 * cut: the push, and every pass that follows it, move which mark a cell is written in and never one
 * stop of the colour underneath it (0348).
 */
// One box read per cell and the cut that follows it: splitting the two would hand a helper the
// whole of the read's state on the one path a bake may not allocate on (0129).
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function cellGrid(
  body: Float32Array,
  width: number,
  height: number,
  across: number,
  down: number,
  cols: number,
  rows: number,
  hue: number,
  falling: number,
  cells: readonly MoireCells[],
): CellGrid {
  const stood = new Float32Array(cols * rows);
  const marks = new Uint8Array(cols * rows);
  const phase = GLYPH_PHASE.value;
  const push = GLYPH_PUSH.value;
  // The fall, once a row: strongest at the tile's top edge and nought at its foot — which on a
  // tile laid as a repeating pattern is its middle, because a fall down a picture that never
  // repeats is a bright line at every join (0334, `sceneAxis(y / height)`).
  const throughAt = Float32Array.from(
    { length: height },
    (_, y) => falling * sceneAxis(y / height),
  );
  for (let row = 0; row < rows; row++) {
    const y0 = Math.floor(row * down);
    const y1 = Math.min(height, Math.ceil((row + 1) * down));
    for (let col = 0; col < cols; col++) {
      const x0 = Math.floor(col * across);
      const x1 = Math.min(width, Math.ceil((col + 1) * across));
      let sum = 0;
      for (let y = y0; y < y1; y++) {
        const through = throughAt[y] ?? 0;
        for (let x = x0; x < x1; x++) {
          const into = (y * width + x) * PER_PIXEL;
          // Where on the ramp this pixel stands: its own place, carried along it by however far
          // the picture's own hue has travelled — and then pulled toward the scene's own first
          // stop by the shade and the film the body already holds (`bodyOf`). **After the travel
          // and not before it**, because a shadow a claimed colour could light is not a shadow:
          // the two ends of the travel would read a shaded band at the dark stop and at the hot
          // one, and the field's own shade would swing further than the field.
          const shaded = sceneHue(body[into] ?? 0, hue) * (body[into + 1] ?? 0);
          // And how far up that ramp the air and the detail carry it: the light falling through
          // the field, and then whatever bright point the name ends on, lifted to the top stop
          // and read after the shade, because a speck in a shadow is a speck nobody put there.
          const air = shaded + (1 - shaded) * through;
          sum += air + (1 - air) * (body[into + 2] ?? 0);
        }
      }
      const at = row * cols + col;
      const mean = sum / Math.max(1, (y1 - y0) * (x1 - x0));
      stood[at] = mean;
      // The mark: where the cell stands on its ramp, pushed toward the ramp's ends and then cut
      // into as many steps as there are marks and wrapped, so the ground and the peaks are sparse,
      // the band between is dense, and most of a field is that ground (0348).
      marks[at] = markAt(pushRead(mean, push), GLYPH_COUNT, phase);
    }
  }
  // And what the standing rack makes of those marks: a ladder behind each of them, a halo around
  // each of them, or — with nothing standing — the lattice itself, untouched (0349).
  runCellPasses(marks, cols, rows, cells);
  return { stood, marks };
}
