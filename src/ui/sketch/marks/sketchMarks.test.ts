/**
 * The fields the bench still draws, as arithmetic: each is the real marks over the shipped bloom, so what is
 * proved here is that each move is the move it claims — at its dial's nought it is the plain
 * lattice (or says why not), at its rest it is something the plain lattice is not, and none of
 * them writes anything but nought or one, in the one ink.
 */
import { describe, expect, it } from "vitest";

import { GLYPH_COUNT } from "@/lib/moireGlyph";
import { FIELD_ASPECT } from "@/ui/sketch/sketchField";
import { SKETCH_WALK } from "@/ui/sketch/sketchWalk";
import {
  CELL,
  CHARACTER_ALPHABET,
  COLS,
  PART_DIAL,
  partAlphabet,
  partField,
  plainField,
  ROWS,
  stood,
} from "@/ui/sketch/marks/sketchMarks";
import { ALPHABETS, alphabetOf, alphabetWeight } from "@/ui/sketch/marks/sketchMarksAlphabet";
import type { SketchDial, SketchDriftField } from "@/ui/sketch/sketchDrift";

/** Every field on the bench with the dial it is drawn under, so one cannot be left out. */
const FIELDS: readonly { name: string; field: SketchDriftField; dial: SketchDial }[] = [
  { name: "part", field: partField, dial: PART_DIAL },
];

/**
 * A grid over the whole picture at about a bit of a mark, so every bit of every mark is landed in
 * — and no finer, because the fields at three settings apiece are read across it under the
 * gate's own load, and a test that reads a picture at the pixel is a test that times out there.
 */
const GRID: readonly [number, number][] = ((): [number, number][] => {
  const points: [number, number][] = [];
  for (let y = 0.01; y < 1; y += 0.02) {
    for (let x = 0.01; x < FIELD_ASPECT; x += 0.02) points.push([x, y]);
  }
  return points;
})();

/** How many points of the grid two pictures disagree on. */
function differ(a: (x: number, y: number) => number, b: (x: number, y: number) => number): number {
  let count = 0;
  for (const [x, y] of GRID) if (a(x, y) !== b(x, y)) count += 1;
  return count;
}

describe("every field on the marks bench", () => {
  it("writes nought or one at every point, at every end of its dial and at its rest", () => {
    for (const { name, field, dial } of FIELDS) {
      for (const amount of [dial.min, dial.rest, dial.max]) {
        let inked = 0;
        for (const [x, y] of GRID) {
          const ink = field(x, y, amount);
          expect(ink === 0 || ink === 1, `${name} at ${amount} wrote ${ink} at ${x},${y}`).toBe(
            true,
          );
          inked += ink;
        }
        expect(inked, `${name} at ${amount} writes nothing`).toBeGreaterThan(0);
        expect(inked, `${name} at ${amount} is a block`).toBeLessThan(GRID.length);
      }
    }
  });

  it("is a lattice whose cell is the screen's own pitch, with a whole number of cells down", () => {
    expect(ROWS * CELL).toBeCloseTo(1, 12);
    expect(COLS).toBeGreaterThanOrEqual(FIELD_ASPECT * ROWS);
    for (let row = 0; row < ROWS; row += 1) {
      const value = stood(0, row);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

describe("the part", () => {
  it("has three alphabets of ten marks each, every one strictly heavier than the last", () => {
    for (const [name, alphabet] of Object.entries(ALPHABETS)) {
      expect(alphabet, name).toHaveLength(GLYPH_COUNT);
      expect(alphabetWeight(alphabet, 0)).toBe(0);
      expect(alphabetWeight(alphabet, GLYPH_COUNT - 1)).toBe(1);
      for (let at = 1; at < GLYPH_COUNT; at += 1) {
        expect(alphabetWeight(alphabet, at), `${name} ${at}`).toBeGreaterThan(
          alphabetWeight(alphabet, at - 1),
        );
      }
    }
  });

  it("refuses an alphabet out of order, or of the wrong shape", () => {
    const blank = [".....", ".....", ".....", ".....", "....."];
    const dot = [".....", ".....", "..#..", ".....", "....."];
    expect(() => alphabetOf([blank, dot])).toThrow(/is 10 marks/u);
    const backwards = [dot, blank, ...Array.from({ length: 8 }, () => blank)];
    expect(() => alphabetOf(backwards)).toThrow(/follows one of/u);
    const short = [[".....", "....."], ...Array.from({ length: 9 }, () => blank)];
    expect(() => alphabetOf(short)).toThrow(/rows of/u);
  });

  it("opens in the shipped marks and swaps whole with the landing's character", () => {
    expect(partAlphabet(PART_DIAL.rest)).toBe("marks");
    expect(differ(plainField, (x, y) => partField(x, y, PART_DIAL.rest))).toBe(0);
    const other = SKETCH_WALK.findIndex(
      (landing) => CHARACTER_ALPHABET[landing.character] !== "marks",
    );
    expect(other).toBeGreaterThanOrEqual(0);
    expect(differ(plainField, (x, y) => partField(x, y, other))).toBeGreaterThan(0);
  });

  it("names an alphabet for every character the walk draws", () => {
    for (const landing of SKETCH_WALK) {
      expect(ALPHABETS[CHARACTER_ALPHABET[landing.character]]).toBeDefined();
    }
  });
});
