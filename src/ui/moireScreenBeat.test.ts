/**
 * @role Tests the second lattice the rack brings: that the tile it is drawn on is a whole number
 *   of both cells, that every cell of the coarse lattice is written from its own read of the same
 *   body, and that what it lays is brought in by how full the rack is and is nothing at all when
 *   the rack is empty.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { DRIFT_REST } from "@/lib/moire";
import {
  GLYPH_COUNT,
  GLYPH_PHASE,
  GLYPH_PUSH,
  markAt,
  markCoverage,
  pushRead,
} from "@/lib/moireGlyph";
import { LATTICE_CELLS, latticeCells, latticeFold, LATTICE_REACH } from "@/lib/moireLattice";
import { shapeRest } from "@/ui/moireShape";
import { beatInk, beatLattice, beatTilePx } from "@/lib/moireScreenBeat";
import { PER_PIXEL } from "@/lib/moireScreenCells";
import { moireRow as row } from "@/lib/moireRow";
import {
  baked,
  forgetScreenTiles,
  installHereScreenPort,
  painterOn,
  type Painted,
  tileOf,
} from "@/ui/moireCanvasPainted";
import { beatPx, gridPitchPx, rowPitchPx, tilePx } from "@/lib/moireScreenFilm";

/** The recorder, bound to this file's own way of stubbing a global (src/ui/moireCanvasPainted.ts). */
const paintedOn = painterOn((name, value) => {
  vi.stubGlobal(name, value);
});

// The stand-in document and display live for exactly the one test that asks for them, and the shop
// goes back to the port every other case paints through (src/ui/moireCanvasPainted.ts).
afterEach(() => {
  vi.unstubAllGlobals();
  installHereScreenPort();
});

/** A rack whose tail is blowing nowhere, which is where every case but the crawl's paints. */
const STILL = { drift: 0, veer: 0 };

/** The rows every painting here is made of: one claiming row, and the deck's own reference. */
const ROWS = [row({ period: 3 }), row({ period: 4, phase: 1, reference: true })];

/**
 * One painting of a rack whose lattice has folded the picture to `cells`, on a two-pixel display.
 * `deep` is the canvas's own height, which the tile is keyed through: a case wanting a tile of its
 * own rather than the one another case left in the cache asks for another one (`screenOf`).
 */
function painting(cells: number, deep = 128, wind = STILL): Painted {
  vi.stubGlobal("devicePixelRatio", 2);
  return paintedOn(200, deep, ROWS, 2, 20, { shape: { ...shapeRest(), cells }, wind });
}

/** What share of a tile's pixels carry any ink at all. */
function inked(pixels: Uint8ClampedArray): number {
  let lit = 0;
  for (let at = 3; at < pixels.length; at += 4) if ((pixels[at] ?? 0) > 0) lit += 1;
  return (4 * lit) / pixels.length;
}

/**
 * A body whose ground rises a step per coarse cell across the tile and is flat down it: every cell
 * of the coarse lattice stands somewhere else on the ramp, so a lattice that skipped one would be
 * reading a neighbour's mark. The pull is whole and there are no bright points, which is the body
 * a cell's read is the plain mean of (`cellGrid`).
 */
function ramped(width: number, height: number, cell: number): Float32Array {
  const body = new Float32Array(width * height * PER_PIXEL);
  const cols = width / cell;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const at = (y * width + x) * PER_PIXEL;
      body[at] = (Math.floor(x / cell) + 0.5) / cols;
      body[at + 1] = 1;
      body[at + 2] = 0;
    }
  }
  return body;
}

// One flat list of the second lattice's cases (0007).
// oxlint-disable-next-line max-lines-per-function
describe("moireScreenBeat", () => {
  it("stands its cell on whole device pixels, and grows the tile to hold both lattices", () => {
    // The two pitches the picture is already built on: five CSS pixels across and seven down, so
    // the second lattice is seven device pixels where the first is five and the ratio is those two
    // whole numbers rather than a dial (0346 — a bit laid at a fraction of a pixel is a smear).
    for (const dpr of [1, 2, 3]) {
      const pitch = gridPitchPx(dpr);
      const cell = rowPitchPx(dpr);
      const wide = beatTilePx(beatPx(pitch), cell);
      // A whole number of both cells, and still a whole number of the gratings' own beat: the tile
      // is laid as a repeating pattern, so anything either lattice does not come round on is a
      // seam down the picture.
      expect(wide % pitch).toBe(0);
      expect(wide % cell).toBe(0);
      expect(wide % beatPx(pitch)).toBe(0);
      // And it is the smallest such width, which is what keeps the bake from growing further than
      // the second lattice asks for.
      expect(wide).toBe(
        Math.min(
          ...Array.from({ length: 32 }, (_, n) => (n + 1) * beatPx(pitch)).filter(
            (at) => at % cell === 0,
          ),
        ),
      );
    }
  });

  it("writes every cell of the coarse lattice from its own read of the same body", () => {
    const pitch = gridPitchPx(2);
    const cell = rowPitchPx(2);
    const width = beatTilePx(beatPx(pitch), cell);
    const height = cell * 5;
    const body = ramped(width, height, cell);
    const beat = beatLattice(body, width, height, cell, DRIFT_REST.hue, 0, [], 1);
    // The grid spans the tile exactly — no cell of it is a part cell and none is left off the end.
    expect(beat.cols * cell).toBe(width);
    expect(beat.marks.length).toBe((width / cell) * (height / cell));
    // And every one of them is the mark its own box read is cut into: the same read, the same push
    // and the same ten marks the first lattice is written in, on a cell of another size. Never a
    // second alphabet.
    for (let down = 0; down < height / cell; down++) {
      for (let col = 0; col < beat.cols; col++) {
        // Through `Math.fround`, because the body is a float32 array and the read is its mean.
        const stood = Math.fround((col + 0.5) / beat.cols);
        expect(beat.marks[down * beat.cols + col]).toBe(
          markAt(pushRead(stood, GLYPH_PUSH.value), GLYPH_COUNT, GLYPH_PHASE.value),
        );
      }
    }
    // What it lays at a pixel is that cell's mark, at where in the cell the pixel falls.
    const mark = beat.marks[0] ?? 0;
    expect(beatInk(beat, 2, 3)).toBeCloseTo(markCoverage(mark, 2 / cell, 3 / cell, beat.blur), 10);
  });

  it("brings the second lattice in as the rack fills, and not for one effect", () => {
    // Its presence is the rack's own lattice fold and no look's (0278): a rack of one entry is at
    // the loosest cell, which is no second lattice at all, and it arrives over the entries the
    // fold reaches its tightest at.
    expect(latticeFold(latticeCells(0))).toBe(0);
    expect(latticeFold(latticeCells(1))).toBe(0);
    expect(latticeFold(latticeCells(LATTICE_REACH.value))).toBe(1);
    expect(latticeFold(latticeCells(2))).toBeGreaterThan(0);
    expect(latticeFold(latticeCells(2))).toBeLessThan(1);
    expect(latticeFold(LATTICE_CELLS[1])).toBe(1);
    // And the fold is what the ink it lays is scaled by, so a half-full rack lays half of it.
    const cell = rowPitchPx(2);
    const width = beatTilePx(beatPx(gridPitchPx(2)), cell);
    const body = ramped(width, cell, cell);
    const full = beatLattice(body, width, cell, cell, DRIFT_REST.hue, 0, [], 1);
    const half = beatLattice(body, width, cell, cell, DRIFT_REST.hue, 0, [], 0.5);
    for (let x = 0; x < width; x++)
      expect(beatInk(half, x, 0)).toBeCloseTo(beatInk(full, x, 0) / 2, 10);
  });

  it("grows the tile to both cells as the rack fills, and draws one lattice while it does not", () => {
    const pitch = gridPitchPx(2);
    const cell = rowPitchPx(2);
    // Nothing standing is the tile 0350 shipped, at the width it shipped: the gratings' own beat
    // cell, which is not a whole number of the coarse cell, so there is nowhere for a second
    // lattice to stand. One tile is baked, and it is that one.
    expect(beatPx(pitch) % cell).not.toBe(0);
    const wide = beatTilePx(beatPx(pitch), cell);
    const empty = painting(shapeRest().cells);
    expect(baked(empty, beatPx(pitch))).toBe(1);
    expect(baked(empty, wide)).toBe(0);

    // A full rack, and the tile has grown to the two cells' common multiple — a whole number of
    // both, and still a whole number of the gratings' beat so neither lattice runs a seam.
    expect(wide % pitch).toBe(0);
    expect(wide % cell).toBe(0);
    expect(wide % beatPx(pitch)).toBe(0);
    const full = painting(LATTICE_CELLS[1]);
    expect(baked(full, wide)).toBe(1);
    const pixels = tileOf(full, wide);
    expect(pixels.length).toBe(wide * tilePx(128, cell) * 4);
    // The second lattice is unioned into the alpha and never cut out of it, so the picture carries
    // more ink than the one lattice alone does.
    expect(inked(pixels)).toBeGreaterThan(inked(tileOf(empty, beatPx(pitch))));
  });

  it("reads the three channels' own cell on its own stride across the wider tile", () => {
    // The fringe is one beat cell of the two gratings, repeated (`fringeOf`), and a tile standing
    // the second lattice is seven of those cells wide. Every cell is written in the ramp's middle
    // stop at the resting flatness (`GLYPH_FLAT`, 0346), so what is left across a row of the tile
    // is the channel gain and the fringe alone — and both come round on the beat cell. A tile that
    // read the fringe on its own width instead would step into another row of it at every join.
    const pitch = gridPitchPx(2);
    const cell = rowPitchPx(2);
    const wide = beatTilePx(beatPx(pitch), cell);
    const pixels = tileOf(painting(LATTICE_CELLS[1], 129), wide);
    expect(wide).toBeGreaterThan(beatPx(pitch));
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x + beatPx(pitch) < wide; x++) {
        const here = (y * wide + x) * 4;
        const over = (y * wide + x + beatPx(pitch)) * 4;
        for (let channel = 0; channel < 3; channel++) {
          expect(pixels[over + channel], `x ${x}, y ${y}, channel ${channel}`).toBe(
            pixels[here + channel],
          );
        }
      }
    }
  });

  it("sweeps the crawl across the whole of the wider tile, so the picture never snaps back", () => {
    // A translation of exactly one tile is the identity for a repeating pattern, and a translation
    // of anything else is not: the crawl and the wind on its axis sweep the tile's own period and
    // come back (0267). With the second lattice standing that period is the grown width, and a
    // crawl still sweeping the gratings' beat cell would snap the picture back a seventh of a tile
    // once a cycle.
    const pitch = gridPitchPx(2);
    const cell = rowPitchPx(2);
    const blown = { drift: 0.5, veer: 0 };
    const one = painting(shapeRest().cells, 130, blown).screened[0]?.e ?? 0;
    const both = painting(LATTICE_CELLS[1], 131, blown).screened[0]?.e ?? 0;
    // Half a turn of the wind carries the screen half a tile, whichever tile it is standing on, and
    // both land on a whole cell of the marks (0346).
    expect(one).toBeGreaterThan(0);
    expect(one % pitch).toBe(0);
    expect(both % pitch).toBe(0);
    // And the grown tile's half is past the whole of the narrow one, so what the crawl sweeps is
    // the tile and never the beat cell inside it.
    expect(both).toBeGreaterThan(beatTilePx(beatPx(pitch), cell) / 2 - pitch);
    expect(both).toBeGreaterThan(beatPx(pitch) * 1.5);
  });

  it("sweeps the tile it is drawing and not the one it asked for, while that one is baked", () => {
    // Since 0354 a bake is off this task, so a painting whose key has just moved draws the tile the
    // canvas last stood on — and a translation of exactly one tile is the identity for a repeating
    // pattern while a translation of anything else is not. A crawl swept at the width the *asked*
    // tile would have had snaps the whole picture back once a cycle for as long as the bake lasts,
    // and the fold that stands the second lattice makes that about seven times a tile.
    vi.stubGlobal("devicePixelRatio", 2);
    const pitch = gridPitchPx(2);
    const cell = rowPitchPx(2);
    // A port that keeps every bake and answers only when this case says so.
    const answers: ((result: { t: "baked"; key: string; tile: ImageBitmap }) => void)[] = [];
    const asked: string[] = [];
    forgetScreenTiles(() => ({
      bake: (request) => {
        asked.push(request.order.key);
      },
      listen: (onResult) => {
        answers.push(onResult);
      },
      listenFailure: () => {},
    }));
    const shape = { ...shapeRest(), cells: shapeRest().cells };
    const painted = paintedOn(200, 128, ROWS, 2, 20, {
      frames: 3,
      advance: 0,
      shape,
      wind: { drift: 0.5, veer: 0 },
      between: (frame) => {
        // The narrow tile lands after the first painting, so the second draws it.
        if (frame === 0) {
          const key = asked.at(-1) ?? "";
          // The tile is never drawn from, only stood on: what this case reads is the transform.
          // oxlint-disable-next-line no-unsafe-type-assertion
          for (const answer of answers) answer({ t: "baked", key, tile: {} as ImageBitmap });
          return;
        }
        // And then the rack's fold stands the second lattice, whose tile is never baked at all.
        shape.cells = LATTICE_CELLS[1];
      },
    });
    const last = painted.screened.at(-1);
    const swept = last === undefined ? 0 : last.e;
    // Half a turn of the wind carries the screen half of the tile it is drawing, which is still the
    // narrow one — and nowhere near half of the grown one.
    expect(asked.length).toBeGreaterThan(1);
    expect(swept).toBeGreaterThan(0);
    expect(swept % pitch).toBe(0);
    expect(swept).toBeLessThanOrEqual(beatPx(pitch));
    expect(swept).toBeLessThan(beatTilePx(beatPx(pitch), cell) / 4);
  });
});
