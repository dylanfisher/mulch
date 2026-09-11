/**
 * The eight fields, as arithmetic: each is the real marks over the shipped bloom, so what is
 * proved here is that each move is the move it claims — at its dial's nought it is the plain
 * lattice (or says why not), at its rest it is something the plain lattice is not, and none of
 * them writes anything but nought or one, in the one ink.
 */
import { describe, expect, it } from "vitest";

import { GLYPH_COUNT } from "@/lib/moireGlyph";
import { FIELD_ASPECT } from "@/ui/sketch/sketchField";
import { SKETCH_STANDING, SKETCH_WALK } from "@/ui/sketch/sketchWalk";
import {
  BEAT_DIAL,
  beatField,
  BLOOM_DIAL,
  bloomedMark,
  bloomField,
  CELL,
  CHARACTER_ALPHABET,
  COLS,
  DECAY_DIAL,
  decayedMark,
  decayField,
  echoCells,
  ECHOES_DIAL,
  echoedMark,
  echoesField,
  GROUND_DIAL,
  groundField,
  landingRow,
  PART_DIAL,
  partAlphabet,
  partField,
  plainField,
  plainMark,
  ROWS,
  ROWS_DIAL,
  rowsField,
  SCATTER_DIAL,
  scatterField,
  stood,
} from "@/ui/sketch/marks/sketchMarks";
import { ALPHABETS, alphabetOf, alphabetWeight } from "@/ui/sketch/marks/sketchMarksAlphabet";
import type { SketchDial, SketchDriftField } from "@/ui/sketch/sketchDrift";

/** Every field on the bench with the dial it is drawn under, so an eighth cannot be left out. */
const FIELDS: readonly { name: string; field: SketchDriftField; dial: SketchDial }[] = [
  { name: "ground", field: groundField, dial: GROUND_DIAL },
  { name: "beat", field: beatField, dial: BEAT_DIAL },
  { name: "echoes", field: echoesField, dial: ECHOES_DIAL },
  { name: "bloom", field: bloomField, dial: BLOOM_DIAL },
  { name: "decay", field: decayField, dial: DECAY_DIAL },
  { name: "part", field: partField, dial: PART_DIAL },
  { name: "scatter", field: scatterField, dial: SCATTER_DIAL },
  { name: "rows", field: rowsField, dial: ROWS_DIAL },
];

/**
 * A grid over the whole picture at about a bit of a mark, so every bit of every mark is landed in
 * — and no finer, because eight fields at three settings apiece are read across it under the
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

/** The mark of every cell of the lattice, under one reading of a cell. */
const everyCell = (markOf: (col: number, row: number) => number): number[] => {
  const marks: number[] = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) marks.push(markOf(col, row));
  }
  return marks;
};

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

describe("the ground", () => {
  it("is the plain lattice at no push", () => {
    expect(differ(plainField, (x, y) => groundField(x, y, 0))).toBe(0);
  });

  /** The plan's own test for its fifth step: at the rest, most of a field is a sparse mark. */
  it("leaves fewer than a third of the cells heavier than the plus at its rest", () => {
    const plus = 4;
    const marks = everyCell((col, row) => {
      let heavy = 0;
      for (let v = 0.1; v < 1; v += 0.2) {
        for (let u = 0.1; u < 1; u += 0.2)
          heavy += groundField((col + u) * CELL, (row + v) * CELL, GROUND_DIAL.rest);
      }
      return heavy;
    });
    const plain = everyCell(plainMark);
    const heavyPlain = plain.filter((mark) => mark > plus).length / plain.length;
    // The plain lattice is the dense one the step names, and the pushed one is not.
    expect(heavyPlain).toBeGreaterThan(1 / 3);
    const heavy = marks.filter((bits) => bits > 9).length / marks.length;
    expect(heavy).toBeLessThan(1 / 3);
  });
});

describe("the beat", () => {
  it("is the one lattice drawn twice at a ratio of one, and two lattices at its rest", () => {
    expect(differ(plainField, (x, y) => beatField(x, y, 1))).toBe(0);
    expect(differ(plainField, (x, y) => beatField(x, y, BEAT_DIAL.rest))).toBeGreaterThan(0);
  });

  it("never takes ink away from the first lattice", () => {
    for (const [x, y] of GRID) {
      expect(beatField(x, y, BEAT_DIAL.rest)).toBeGreaterThanOrEqual(plainField(x, y));
    }
  });
});

describe("the echoes", () => {
  it("stand at least one cell apart, and further as the spacing opens", () => {
    expect(echoCells(0)).toBe(1);
    expect(echoCells(1)).toBeGreaterThan(echoCells(0));
  });

  it("never write a cell lighter than the field did, and write some heavier at the rest", () => {
    const plain = everyCell(plainMark);
    const echoed = everyCell((col, row) => echoedMark(col, row, ECHOES_DIAL.rest));
    let heavier = 0;
    for (const [at, mark] of echoed.entries()) {
      expect(mark).toBeGreaterThanOrEqual(plain[at] ?? Infinity);
      if (mark > (plain[at] ?? 0)) heavier += 1;
    }
    expect(heavier).toBeGreaterThan(0);
    expect(differ(plainField, (x, y) => echoesField(x, y, ECHOES_DIAL.rest))).toBeGreaterThan(0);
  });

  it("write a repeat one mark lighter than what it repeats", () => {
    const apart = echoCells(ECHOES_DIAL.rest);
    for (let row = 0; row < ROWS; row += 1) {
      for (let col = apart; col < COLS; col += 1) {
        expect(echoedMark(col, row, ECHOES_DIAL.rest)).toBeGreaterThanOrEqual(
          plainMark(col - apart, row) - 1,
        );
      }
    }
  });
});

describe("the bloom", () => {
  it("is the plain lattice at no reach", () => {
    expect(differ(plainField, (x, y) => bloomField(x, y, 0))).toBe(0);
  });

  it("spreads a mark into its neighbours one lighter per cell, and never lightens one", () => {
    const plain = everyCell(plainMark);
    const bloomed = everyCell((col, row) => bloomedMark(col, row, BLOOM_DIAL.rest));
    let grown = 0;
    for (const [at, mark] of bloomed.entries()) {
      expect(mark).toBeGreaterThanOrEqual(plain[at] ?? Infinity);
      if (mark > (plain[at] ?? 0)) grown += 1;
    }
    expect(grown).toBeGreaterThan(0);
    for (let row = 1; row < ROWS; row += 1) {
      for (let col = 1; col < COLS; col += 1) {
        expect(bloomedMark(col, row, 1)).toBeGreaterThanOrEqual(plainMark(col - 1, row) - 1);
        expect(bloomedMark(col, row, 1)).toBeGreaterThanOrEqual(plainMark(col, row - 1) - 1);
      }
    }
  });
});

describe("the decay", () => {
  it("is the plain lattice at the top of the loop, before anything has landed", () => {
    expect(SKETCH_WALK[0]?.at).toBeGreaterThan(0);
    expect(differ(plainField, (x, y) => decayField(x, y, 0))).toBe(0);
  });

  it("opens just after the standing landing, with that landing's row pushed denser", () => {
    const standing = SKETCH_WALK[SKETCH_STANDING];
    if (standing === undefined) throw new Error("The walk has no standing landing.");
    expect(DECAY_DIAL.rest).toBeGreaterThan(standing.at);
    const row = landingRow(SKETCH_STANDING);
    let pushed = 0;
    for (let col = 0; col < COLS; col += 1) {
      const mark = decayedMark(col, row, DECAY_DIAL.rest);
      expect(mark).toBeGreaterThanOrEqual(plainMark(col, row));
      expect(mark).toBeLessThan(GLYPH_COUNT);
      if (mark > plainMark(col, row)) pushed += 1;
    }
    expect(pushed).toBeGreaterThan(0);
  });

  it("settles: a row pushed at a landing is pushed less a quarter of a loop later", () => {
    const row = landingRow(SKETCH_STANDING);
    const standing = SKETCH_WALK[SKETCH_STANDING];
    if (standing === undefined) throw new Error("The walk has no standing landing.");
    const soon = decayedMark(0, row, standing.at + 0.01) - plainMark(0, row);
    const later = decayedMark(0, row, standing.at + 0.25) - plainMark(0, row);
    expect(later).toBeLessThan(soon);
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

describe("the scatter", () => {
  it("is the plain lattice when nothing stands above the threshold", () => {
    expect(differ(plainField, (x, y) => scatterField(x, y, 1))).toBe(0);
  });

  it("lays big marks over the fine ones at its rest, and takes none away", () => {
    expect(differ(plainField, (x, y) => scatterField(x, y, SCATTER_DIAL.rest))).toBeGreaterThan(0);
    for (const [x, y] of GRID) {
      expect(scatterField(x, y, SCATTER_DIAL.rest)).toBeGreaterThanOrEqual(plainField(x, y));
    }
  });
});

describe("the rows", () => {
  it("write nothing at no depth, and a second lattice at the rest that takes none away", () => {
    expect(differ(plainField, (x, y) => rowsField(x, y, 0))).toBe(0);
    expect(differ(plainField, (x, y) => rowsField(x, y, ROWS_DIAL.rest))).toBeGreaterThan(0);
    for (const [x, y] of GRID) {
      expect(rowsField(x, y, ROWS_DIAL.rest)).toBeGreaterThanOrEqual(plainField(x, y));
    }
  });
});
