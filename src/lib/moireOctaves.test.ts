/**
 * @role Tests how many scales a row is drawn at: that a whole set of rows is held to one budget of
 *   fills and falls back across them evenly, and that a growing run carries the picture's own
 *   structure down to coarser scales at the weight it always had.
 */
import { describe, expect, it } from "vitest";

import { DRIFT_OCTAVES_REACH, halfCosine, TAU, type MoireRow } from "./moire";
import { gratingDepth, PICTURE_FLOOR } from "./moireGrating";
import {
  DRIFT_SCALES_BUDGET,
  octaveAlpha,
  octaveShare,
  octavesOf,
  shareOctaves,
  spreadOctaves,
} from "./moireOctaves";
import { moireRow as row } from "./moireRow";

/** Every copy past the first, added up across a set: what `DRIFT_SCALES_BUDGET` is a budget on. */
const extra = (rows: readonly MoireRow[]): number =>
  rows.reduce((sum, { octaves }) => sum + octaves - 1, 0);

/** A set of rows that differ in nothing but how many scales each of them is asking to be drawn at. */
const scaleSet = (wants: readonly number[]): MoireRow[] => wants.map((octaves) => row({ octaves }));

/**
 * How much structure a field carries at a scale of `block` pixels, and how bright it is: the field
 * averaged into blocks that size, and the spread of those blocks about their own mean. **A picture
 * drawn at one scale scores high fine and near nought coarse** — a grating averages to flat over a
 * block much wider than its pitch — and a picture drawn at several scales at once carries structure
 * at both, which is what "self-similar" has to mean if it is to mean anything (0244).
 */
const structure = (field: Float64Array, span: number, block: number): number => {
  const across = span / block;
  const blocks = new Float64Array(across * across);
  for (let y = 0; y < span; y++) {
    for (let x = 0; x < span; x++) {
      const cell = Math.floor(y / block) * across + Math.floor(x / block);
      blocks[cell] = (blocks[cell] ?? 0) + (field[y * span + x] ?? 0) / (block * block);
    }
  }
  let mean = 0;
  for (const at of blocks) mean += at / blocks.length;
  let spread = 0;
  for (const at of blocks) spread += (at - mean) ** 2 / blocks.length;
  return Math.sqrt(spread) / mean;
};

/** The field's own mean: what `gratingDepth` holds at `PICTURE_FLOOR` however a picture is drawn. */
const brightness = (field: Float64Array): number => {
  let mean = 0;
  for (const at of field) mean += at / field.length;
  return mean;
};

/**
 * A picture painted the way the canvas paints one (`cutGratings` and `cutOctaves`,
 * src/ui/moireCanvas.ts): the whole set weighed as gratings, one depth solved from that count, and
 * every row multiplied into the field once per scale it is drawn at — each an octave coarser and
 * half as deep as the one below it. Small and square, because what is measured is the field's own
 * structure and not any screen's.
 */
const painted = (rows: readonly MoireRow[], span: number): Float64Array => {
  const field = new Float64Array(span * span).fill(1);
  const depth = gratingDepth(rows.reduce((count, each) => count + octaveShare(octavesOf(each)), 0));
  for (const [at, each] of rows.entries()) {
    const turn = (at * 0.37) % 1;
    const cos = Math.cos(TAU * turn);
    const sin = Math.sin(TAU * turn);
    const octaves = octavesOf(each);
    for (let octave = 0; octave < octaves; octave++) {
      const pitch = each.period * 2 ** octave;
      const alpha = octaveAlpha(depth, octave);
      for (let y = 0; y < span; y++) {
        for (let x = 0; x < span; x++) {
          const along = x * cos + y * sin;
          const cell = y * span + x;
          field[cell] = (field[cell] ?? 0) * (1 - alpha * halfCosine(along / pitch));
        }
      }
    }
  }
  return field;
};

/**
 * The rows a picture with an automator in it actually has: about fourteen, spread across the
 * pitches the picture is drawn at by the golden ratio, so no two of them are an octave apart.
 */
const picture = (): MoireRow[] =>
  Array.from({ length: 14 }, (_, at) => row({ period: 9 + 31 * ((at * 1.618033988749) % 1) }));

// One flat list of the cases about how many scales a row is drawn at (0007).
// oxlint-disable-next-line max-lines-per-function
describe("moireOctaves", () => {
  it("shares the fills a whole set of rows asks for out to one budget, evenly", () => {
    // A set inside the budget is left exactly as it asked. Six rows at every scale the reach
    // allows is the deepest rack the picture already carried, and it is not touched.
    const deep = scaleSet(Array.from({ length: 6 }, () => DRIFT_OCTAVES_REACH));
    shareOctaves(deep);
    expect(deep.map(({ octaves }) => octaves)).toEqual([3, 3, 3, 3, 3, 3]);
    expect(extra(deep)).toBeLessThanOrEqual(DRIFT_SCALES_BUDGET);
    // And so is a whole picture given a second scale on every row, which is what the budget is
    // sized for since the spread (0244): fourteen rows at two is fourteen fills and fits.
    const spread = scaleSet(Array.from({ length: 14 }, () => 2));
    shareOctaves(spread);
    expect(spread.every(({ octaves }) => octaves === 2)).toBe(true);
    // Past it the counts fall back toward one *evenly*: every row is held to one ceiling rather
    // than the deepest being cut to nothing, and what the ceiling leaves over is handed out a copy
    // at a time so the budget is spent rather than rounded away.
    const ten = scaleSet(Array.from({ length: 10 }, () => DRIFT_OCTAVES_REACH));
    shareOctaves(ten);
    expect(ten.map(({ octaves }) => octaves)).toEqual([3, 3, 3, 3, 3, 3, 2, 2, 2, 2]);
    expect(extra(ten)).toBe(DRIFT_SCALES_BUDGET);
    // Four automators holding six apiece: twenty-four rows asking for three is four times what one
    // of them asks, and the picture draws fewer scales rather than turning into a slideshow.
    const four = scaleSet(Array.from({ length: 24 }, () => DRIFT_OCTAVES_REACH));
    shareOctaves(four);
    expect(extra(four)).toBe(DRIFT_SCALES_BUDGET);
    expect(Math.max(...four.map(({ octaves }) => octaves))).toBe(2);
    expect(Math.min(...four.map(({ octaves }) => octaves))).toBe(1);
    // And across every set an oversized rack can actually be, whatever depths it mixes: never past
    // the budget, never deeper than a row asked, never fewer than the one copy that is the row
    // itself, and never two rows that asked alike left more than a copy apart.
    for (let count = 1; count <= 40; count++) {
      for (const shape of [0, 1, 2]) {
        const wants = Array.from({ length: count }, (_, at) =>
          shape === 0 ? DRIFT_OCTAVES_REACH : shape === 1 ? 1 + (at % DRIFT_OCTAVES_REACH) : 1,
        );
        const rows = scaleSet(wants);
        shareOctaves(rows);
        const held = rows.map(({ octaves }) => octaves);
        expect(extra(rows)).toBeLessThanOrEqual(DRIFT_SCALES_BUDGET);
        expect(held.every((octaves, at) => octaves >= 1 && octaves <= (wants[at] ?? 1))).toBe(true);
        for (const want of wants) {
          const alike = held.filter((_, at) => wants[at] === want);
          expect(Math.max(...alike) - Math.min(...alike)).toBeLessThanOrEqual(1);
        }
        // A budget the set fits inside spends nothing: what a row asked for is what it draws.
        if (extra(scaleSet(wants)) <= DRIFT_SCALES_BUDGET) {
          expect(held).toEqual(wants);
        }
      }
    }
  });

  // P182: the drift was meant to grow more fractal as an automator grew more effects, and it did
  // not — `octaves` is the one dimension that draws real self-similarity and almost nothing could
  // reach it, so a picture of fourteen rows drew thirteen of them at exactly one scale (0244).
  it("carries a growing run's picture down to coarser scales, at the weight it always had", () => {
    const span = 256;
    // A yard growing nothing: every row at one scale, which is the picture as it always was.
    const flat = picture();
    spreadOctaves(flat, 0);
    shareOctaves(flat);
    expect(flat.every(({ octaves }) => octaves === 1)).toBe(true);
    const one = painted(flat, span);
    // And the same yard with an automator standing six places in it.
    const deep = picture();
    spreadOctaves(deep, 6);
    shareOctaves(deep);
    expect(Math.min(...deep.map(({ octaves }) => octaves))).toBeGreaterThan(1);
    const many = painted(deep, span);
    // The structure that survives a coarse average — the large shapes the eye reads a picture as
    // having — rises by a quarter, which is what drawing the whole picture at several scales buys.
    expect(structure(many, span, 32)).toBeGreaterThan(structure(one, span, 32) * 1.2);
    // It is a spread and not an addition: the fine scale gives some of its structure up, which is
    // the ink moving rather than more of it being laid.
    expect(structure(many, span, 2)).toBeLessThan(structure(one, span, 2));
    // And the picture weighs what it always weighed. Counting each copy as a whole grating instead
    // of the share it cuts would lift the field well off the floor and wash it out (`octaveShare`).
    expect(brightness(one)).toBeCloseTo(PICTURE_FLOOR, 2);
    expect(brightness(many)).toBeCloseTo(PICTURE_FLOOR, 2);
    // A curved row keeps its one scale whatever the run is standing — a curved copy needs a
    // picture-sized tile of its own, which is the answer `grownOctaves` already gives (0142).
    const curved = [row({ geometry: "radial" }), row({ geometry: "spiral" }), row({})];
    spreadOctaves(curved, 6);
    expect(curved.map(({ octaves }) => octaves)).toEqual([1, 1, DRIFT_OCTAVES_REACH]);
  });
});
