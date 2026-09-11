/**
 * @role Tests the three alphabets the picture may be written in: that each is ten marks carrying
 *   strictly more ink than the one before, that a table breaking that is refused at load, that a
 *   mark's coverage is its own bit read hard and its four corners read soft, that nothing is
 *   covered outside a cell, that every character of the cast names one alphabet, and that the
 *   alphabet a part picks reaches the tile's own bytes — a yard with no part standing writing the
 *   shipped marks (0356).
 */
import { describe, expect, it } from "vitest";

import {
  ALPHABETS,
  alphabetOf,
  CHARACTER_ALPHABET,
  GLYPH_COUNT,
  markCoverage,
  markWeight,
  partAlphabet,
} from "./moireAlphabets.ts";
import { PLAYER_CHARACTERS } from "./playerCast.ts";
import { screenField, type ScreenBake } from "./moireScreenField.ts";
import { YARD_SCENE_REST } from "./yardScene.ts";

/** A tile small enough to bake in a test and wide enough to stand a few cells of marks. */
const WIDE = 120;
const DEEP = 120;

/** One order, in `alphabet` — the one term every case about the bake below moves. */
const orderIn = (
  alphabet: keyof typeof ALPHABETS,
  armed: keyof typeof ALPHABETS | null = null,
  beat = 0,
): ScreenBake => ({
  key: `tile|${alphabet}|${armed}|${beat}`,
  width: WIDE,
  height: DEEP,
  seen: DEEP,
  pitch: 10,
  rowPitch: 14,
  cell: 10,
  beat,
  own: [200, 120, 40, 255],
  lift: [
    [10, 10, 10, 255],
    [60, 40, 20, 255],
    [120, 90, 40, 255],
    [190, 150, 85, 255],
    [235, 225, 200, 255],
  ],
  tint: { fringe: 0, disperse: 0, hue: 0, saturate: 0 },
  yard: { ...YARD_SCENE_REST },
  cells: [],
  alphabet,
  armed,
});

/** How much ink one bake laid altogether, over every pixel's alpha. */
const inked = (alpha: readonly number[]): number => alpha.reduce((sum, at) => sum + at, 0);

/** The alpha of every pixel of one bake, which is what a mark covers of its cell (0345). */
function alphaOf(
  alphabet: keyof typeof ALPHABETS,
  armed: keyof typeof ALPHABETS | null = null,
  beat = 0,
): number[] {
  const pixels = new Uint8ClampedArray(WIDE * DEEP * 4);
  screenField(orderIn(alphabet, armed, beat), pixels);
  const alpha: number[] = [];
  for (let at = 3; at < pixels.length; at += 4) alpha.push(pixels[at] ?? 0);
  return alpha;
}

describe("the alphabets", () => {
  it("are ten marks each, every one carrying strictly more ink than the last", () => {
    for (const [name, alphabet] of Object.entries(ALPHABETS)) {
      expect(alphabet, name).toHaveLength(GLYPH_COUNT);
      expect(markWeight(alphabet, 0), `${name} opens on ink`).toBe(0);
      expect(markWeight(alphabet, GLYPH_COUNT - 1), `${name} ends short of a block`).toBe(1);
      for (let at = 1; at < GLYPH_COUNT; at += 1) {
        expect(markWeight(alphabet, at), `${name} ${at}`).toBeGreaterThan(
          markWeight(alphabet, at - 1),
        );
      }
    }
  });

  it("refuse a table that is out of order, the wrong shape, or the wrong length", () => {
    const blank = [".....", ".....", ".....", ".....", "....."];
    const dot = [".....", ".....", "..#..", ".....", "....."];
    expect(() => alphabetOf([blank, dot])).toThrow(/is 10 marks/u);
    expect(() => alphabetOf([dot, ...Array.from({ length: 9 }, () => blank)])).toThrow(
      /follows one of/u,
    );
    expect(() =>
      alphabetOf([[".....", "....."], ...Array.from({ length: 9 }, () => blank)]),
    ).toThrow(/rows of/u);
  });

  it("cover a pixel wholly or not at all read hard, and by quarters read soft", () => {
    const dot = 1;
    expect(markCoverage(ALPHABETS.marks, dot, 0.5, 0.5, 0)).toBe(1);
    expect(markCoverage(ALPHABETS.marks, dot, 0.1, 0.1, 0)).toBe(0);
    // Read a twentieth of a cell either way just outside the dot's own edge, half the corners
    // land in it.
    const soft = markCoverage(ALPHABETS.marks, dot, 0.38, 0.5, 0.05);
    expect(soft).toBeGreaterThan(0);
    expect(soft).toBeLessThan(1);
  });

  it("cover nothing outside the cell, and everything of a block inside it", () => {
    const block = GLYPH_COUNT - 1;
    expect(markCoverage(ALPHABETS.marks, block, -0.01, 0.5, 0)).toBe(0);
    expect(markCoverage(ALPHABETS.marks, block, 0.5, 1, 0)).toBe(0);
    for (let u = 0; u < 1; u += 0.05) {
      for (let v = 0; v < 1; v += 0.05) {
        expect(markCoverage(ALPHABETS.marks, block, u, v, 0)).toBe(1);
        const cover = markCoverage(ALPHABETS.marks, 4, u, v, 0.03);
        expect(cover).toBeGreaterThanOrEqual(0);
        expect(cover).toBeLessThanOrEqual(1);
      }
    }
  });

  it("refuse a mark there is not", () => {
    expect(() => markCoverage(ALPHABETS.marks, GLYPH_COUNT, 0.5, 0.5, 0)).toThrow(/no mark/u);
    expect(() => markWeight(ALPHABETS.marks, -1)).toThrow(/no mark/u);
  });
});

describe("the part that is standing", () => {
  it("names one alphabet for every character the cast declares", () => {
    for (const character of PLAYER_CHARACTERS) {
      expect(ALPHABETS[CHARACTER_ALPHABET[character]], character).toBeDefined();
    }
    // Three hands over six names, so a section changing is two chances in three of changing the
    // picture's whole hand rather than an alphabet nobody would see twice.
    expect(new Set(Object.values(CHARACTER_ALPHABET)).size).toBe(Object.keys(ALPHABETS).length);
  });

  it("writes the shipped marks where no part stands, and strokes under a stutter", () => {
    expect(partAlphabet(null)).toBe("marks");
    // The ids a drawn arrangement mints, in the order it mints them (`drawPart`,
    // src/lib/playerWalk.ts): the fold hands consecutive sections different letters, and `d1` is
    // the first of them the cast reads as a stutter.
    expect(CHARACTER_ALPHABET["stutter"]).toBe("strokes");
    expect(partAlphabet("d1")).toBe("strokes");
    expect(partAlphabet("d5")).toBe("marks");
    // And the same part answers the same alphabet however often it is asked: a fold and no draw.
    expect(partAlphabet("d1")).toBe(partAlphabet("d1"));
  });
});

describe("the tile the part picks the alphabet for", () => {
  it("bakes its marks in the alphabet the order names, and the same cells either way", () => {
    const marks = alphaOf("marks");
    const strokes = alphaOf("strokes");
    // A different hand and not a different picture: the bytes move, because every cell is written
    // in a different mark of the same weight order.
    expect(strokes).not.toEqual(marks);
    // And nothing moved but the hand — the tile is the same size and carries about as much ink,
    // because the two alphabets run the same ramp from nothing to a block (0356).
    expect(strokes).toHaveLength(marks.length);
    expect(inked(strokes)).toBeGreaterThan(inked(marks) * 0.5);
    expect(inked(strokes)).toBeLessThan(inked(marks) * 2);
  });

  it("bakes its last cell column in the hand of the part a grid has armed, and no other", () => {
    // The thirteenth step of the block: what is next is on the page before the boundary — the
    // picture's rightmost cell column is written in the coming part's alphabet from the moment it
    // is armed, and one column, a queued part being what is next and not what is standing.
    const plain = alphaOf("marks");
    const queued = alphaOf("marks", "strokes");
    expect(queued).not.toEqual(plain);
    // The cells of that one column, which is the last of them across the tile: every pixel outside
    // it reads exactly as it did with nothing queued.
    const cell = orderIn("marks").cell;
    const last = Math.floor((WIDE - 1) / cell) * cell;
    let moved = 0;
    for (let at = 0; at < plain.length; at += 1) {
      if (at % WIDE >= last) {
        if (plain[at] !== queued[at]) moved += 1;
        continue;
      }
      expect(queued[at], `the pixel at ${at % WIDE}, ${Math.floor(at / WIDE)}`).toBe(plain[at]);
    }
    expect(moved, "the armed column is written in another hand").toBeGreaterThan(0);
    // And a part queued into the hand already standing bakes the tile it was already holding: the
    // read that arrives is the hand or nothing, and a column that changed nothing is a rebake
    // nobody would see (`armedAlphabet`, src/ui/moireRows.ts).
    expect(alphaOf("marks", "marks")).toEqual(plain);
    expect(alphaOf("marks", null)).toEqual(plain);
  });

  it("leaves the rack's own lattice in the standing hand inside that column", () => {
    // One cell column of *this* lattice and never a slice of another's. The rack's second lattice
    // stands on the row pitch and the scatter's block on `SCATTER_SPAN` of these cells (0351, 0352),
    // so a mark of either straddles the armed column — read in the armed hand it would come out
    // sliced down the middle rather than written in another hand.
    const whole = alphaOf("strokes", null, 1);
    const queued = alphaOf("marks", "strokes", 1);
    const cell = orderIn("marks").cell;
    const last = Math.floor((WIDE - 1) / cell) * cell;
    let moved = 0;
    for (let at = 0; at < whole.length; at += 1) {
      if (at % WIDE >= last && whole[at] !== queued[at]) moved += 1;
    }
    // The column is not the whole tile's hand: where the second lattice inks it, it inks in the
    // hand standing. Read against the tile baked wholly in the queued hand, because that is exactly
    // what the column comes out as when every lattice in it is swapped at once.
    expect(moved, "the second lattice keeps the standing hand").toBeGreaterThan(0);
  });
});
