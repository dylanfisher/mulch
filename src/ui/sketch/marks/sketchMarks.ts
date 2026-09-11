/**
 * @role The plain field the marks bench measured every entry against, and the lattice it is read
 *   through — all that is left of the bench now that every entry has landed: the ground's push with
 *   0348, the delay's echoes and the reverb's bloom with 0349, the sound's own rows with 0350, the
 *   rack's own second lattice with 0351, the scatter of big marks with 0352, the landing's push
 *   with 0355 and the part's own alphabet with 0356. The file goes with the bench itself, which is
 *   the step after that one. It answers whether a point of the picture is inked, nought or one, in
 *   one ink on the page (0346): the real marks over the shipped bloom under the shipped film, no
 *   canvas, no clock, no context, so it is provable here and painted there.
 * @instead The marks and the wrap onto them, which these read and never restate →
 *   src/lib/moireGlyph.ts, and the alphabets they are written in → src/lib/moireAlphabets.ts. The
 *   scene, the film and the bench's own display → src/ui/sketch/sketchDrift.ts.
 *   The walk that is the clock and the song here → src/ui/sketch/sketchWalk.ts. The page these
 *   are mounted on → src/ui/sketch/MarksPage.tsx. The tile these argue about →
 *   src/lib/moireScreenField.ts, which this never reads.
 */
import { ALPHABETS, GLYPH_COUNT, markCoverage } from "@/lib/moireAlphabets";
import { GLYPH_PHASE, GLYPH_PUSH, markAt, pushRead } from "@/lib/moireGlyph";
import { sceneCells } from "@/lib/moireScene";
import { FILM_SHARE, filmStand, gridPitchPx } from "@/lib/moireScreenFilm";
import {
  BENCH_DPR,
  filmKeep,
  SCENE_BENCH_PX,
  SCENE_DIAL,
  sceneField,
} from "@/ui/sketch/sketchDrift";
import { FIELD_ASPECT } from "@/ui/sketch/sketchField";

/**
 * How many cells stand in the picture's height: the screen's own column pitch at the bench's
 * display over one scene's ground, which is the cell the tile writes its marks in (0346), and how
 * many stand across at that size. The cell is stated as a share of the height so every field here
 * reads picture units the way the drift bench's do.
 */
export const ROWS = sceneCells(SCENE_BENCH_PX, gridPitchPx(BENCH_DPR));
export const CELL = 1 / ROWS;
export const COLS = Math.ceil(FIELD_ASPECT * ROWS);

/** One cell of one lattice, as a key: a row of cells is never this wide. */
const KEY_STRIDE = 1024;
const keyOf = (col: number, row: number): number => row * KEY_STRIDE + col;

/**
 * A value held per cell per setting, because the stage asks a pixel at a time and a cell is many
 * of them: a mark chosen once per cell is a lattice, and a mark chosen per pixel is the scene run
 * a hundred times over per paint (entry 11's reason, src/ui/sketch/sketchDrift.ts).
 */
function held(
  cache: Map<number, Map<number, number>>,
  setting: number,
  col: number,
  row: number,
  make: () => number,
): number {
  let cells = cache.get(setting);
  if (cells === undefined) {
    cells = new Map();
    cache.set(setting, cells);
  }
  const key = keyOf(col, row);
  const kept = cells.get(key);
  if (kept !== undefined) return kept;
  const made = make();
  cells.set(key, made);
  return made;
}

/** How many points a side one cell is read at, for its mean. */
const SAMPLES = 4;

const bloom = sceneField("bloom");

/**
 * Where one cell of the lattice stands on the bloom's ramp: the film's shade over the scene's own
 * read, averaged over the cell, which is how the tile reads a cell (0345).
 */
const stoodCells = new Map<number, Map<number, number>>();
export function stood(col: number, row: number): number {
  return held(stoodCells, CELL, col, row, () => {
    let sum = 0;
    for (let j = 0; j < SAMPLES; j += 1) {
      for (let i = 0; i < SAMPLES; i += 1) {
        const x = (col + (i + 0.5) / SAMPLES) * CELL;
        const y = (row + (j + 0.5) / SAMPLES) * CELL;
        sum +=
          filmStand(filmKeep(x * SCENE_BENCH_PX, y * SCENE_BENCH_PX), FILM_SHARE.rest) *
          bloom(x, y, SCENE_DIAL.rest);
      }
    }
    return sum / (SAMPLES * SAMPLES);
  });
}

/**
 * Which mark a cell of the lattice is written in: the shipped read, pushed toward its ramp's ends
 * and wrapped the way the tile does it (0348), so every entry below argues against what ships and
 * not against what shipped.
 */
export const plainMark = (col: number, row: number): number =>
  markAt(pushRead(stood(col, row), GLYPH_PUSH.rest), GLYPH_COUNT, GLYPH_PHASE.rest);

/**
 * Whether the point `x, y` is under the ink of a lattice of `cell`-sized cells, each written in
 * the mark `markOf` chooses for it. Read hard rather than soft, for entry 11's reason: the bench
 * is read at its own pixels and a soft edge is the painter's business.
 */
export function latticeInk(
  x: number,
  y: number,
  cell: number,
  markOf: (col: number, row: number) => number,
): number {
  const col = Math.floor(x / cell);
  const row = Math.floor(y / cell);
  return markCoverage(ALPHABETS.marks, markOf(col, row), x / cell - col, y / cell - row, 0);
}

/** The picture with no entry's move on it: entry 11 of the drift bench, on the bloom, in one ink,
 * cut the way the tile cuts it (0348). */
export const plainField = (x: number, y: number): number => latticeInk(x, y, CELL, plainMark);
