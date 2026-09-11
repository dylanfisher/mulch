/**
 * @role The three alphabets the marks bench's part swaps between — the shipped marks and two more
 *   in their shape, rings and strokes — and how one of them is read: its weight, its bit under a
 *   point of a cell. Beside the fields rather than in them because an alphabet is a table and the
 *   fields are arithmetic, and the file that held both stood past the soft cap (docs/map.md).
 * @instead The shipped marks themselves, and their coverage read soft → src/lib/moireGlyph.ts,
 *   whose table this reads and never restates. The field that swaps alphabets →
 *   src/ui/sketch/marks/sketchMarks.ts.
 */
import { GLYPH_COUNT, MARKS } from "@/lib/moireGlyph";

/** One alphabet: ten bit-grids, five a side, ordered by ink, the shape the shipped marks take. */
export type Alphabet = readonly Uint8Array[];
const SIDE = MARKS[0]?.length ?? 0;

/**
 * Two more alphabets in the shipped marks' own shape: the rings, a dot growing to a disc, and the
 * strokes, a dash growing to a block through slashes and bars. Ordered by ink like the marks, and
 * checked so below, because the ramp reads density and an alphabet out of order is a step the
 * ramp goes down.
 */
const RINGS: readonly (readonly string[])[] = [
  [".....", ".....", ".....", ".....", "....."],
  [".....", ".....", "..#..", ".....", "....."],
  [".....", "..#..", ".#.#.", "..#..", "....."],
  [".....", ".###.", ".#.#.", ".###.", "....."],
  ["..#..", ".#.#.", "#.#.#", ".#.#.", "..#.."],
  [".###.", "#...#", "#...#", "#...#", ".###."],
  [".###.", "#...#", "#.#.#", "#...#", ".###."],
  ["#####", "#...#", "#...#", "#...#", "#####"],
  [".###.", "#####", "#####", "#####", ".###."],
  ["#####", "#####", "#####", "#####", "#####"],
];
const STROKES: readonly (readonly string[])[] = [
  [".....", ".....", ".....", ".....", "....."],
  [".....", ".....", ".##..", ".....", "....."],
  [".....", "...#.", "..#..", ".#...", "....."],
  ["....#", "...#.", "..#..", ".#...", "#...."],
  ["#...#", ".#.#.", "..#..", ".#.#.", "#...#"],
  ["#####", ".....", "#####", ".....", "....."],
  ["#####", "..#..", "#####", "..#..", "#####"],
  ["##.##", "#####", "##.##", "#####", "##.##"],
  ["#####", "#####", "##.##", "#####", "#####"],
  ["#####", "#####", "#####", "#####", "#####"],
];

/** The grids as bits, checked for shape and for strictly rising ink, or a throw naming the fault. */
export function alphabetOf(grids: readonly (readonly string[])[]): Alphabet {
  if (grids.length !== GLYPH_COUNT) {
    throw new Error(`An alphabet is ${GLYPH_COUNT} marks, and one is ${grids.length}.`);
  }
  let last = -1;
  return grids.map((rows) => {
    if (rows.length !== SIDE || rows.some((row) => row.length !== SIDE)) {
      throw new Error(`A mark is ${SIDE} rows of ${SIDE}, and one is not.`);
    }
    const bits = Uint8Array.from(rows.join(""), (cell) => (cell === "#" ? 1 : 0));
    const ink = bits.reduce((sum, bit) => sum + bit, 0);
    if (ink <= last) throw new Error(`A mark of ${ink} bits follows one of ${last}.`);
    last = ink;
    return bits;
  });
}

/** The three alphabets a part may be written in, the shipped marks among them. */
export const ALPHABETS = {
  marks: alphabetOf(MARKS),
  rings: alphabetOf(RINGS),
  strokes: alphabetOf(STROKES),
} as const;
export type AlphabetName = keyof typeof ALPHABETS;

/** How much of its square one mark of an alphabet inks, nought to one. */
export function alphabetWeight(alphabet: Alphabet, index: number): number {
  const mark = alphabet[index];
  if (mark === undefined) throw new Error(`There is no mark ${index}.`);
  return mark.reduce((sum, bit) => sum + bit, 0) / (SIDE * SIDE);
}

/** The bit of an alphabet's mark under `(u, v)` of a cell, read hard. */
export function alphabetCoverage(alphabet: Alphabet, index: number, u: number, v: number): number {
  const mark = alphabet[index];
  if (mark === undefined) throw new Error(`There is no mark ${index}.`);
  if (u < 0 || u >= 1 || v < 0 || v >= 1) return 0;
  return mark[Math.floor(v * SIDE) * SIDE + Math.floor(u * SIDE)] ?? 0;
}
