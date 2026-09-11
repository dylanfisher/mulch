/**
 * @role Tests the scatter: that its big marks stand where the body's third channel peaks and
 *   nowhere it is nought, that one of them covers exactly nine of the fine lattice's cells, that
 *   its grid comes round on the tile it is laid across, and that the tile a yard with a flock in it
 *   is written on carries the scatter's ink over the lattice underneath.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { ALPHABETS, GLYPH_COUNT, markWeight } from "@/lib/moireAlphabets";
import { markAt } from "@/lib/moireGlyph";
import { moireRow as row } from "@/lib/moireRow";
import type { SceneSpecks } from "@/lib/moireScene";
import { YARD_SCENE_REST } from "@/lib/yardScene";
import { painterOn, type Painted, tileOf } from "@/ui/moireCanvasPainted";
import { PER_PIXEL } from "@/lib/moireScreenCells";
import { SCATTER_SPAN, scatterInk, scatterLattice } from "@/lib/moireScreenScatter";
import { beatPx, gridPitchPx } from "@/lib/moireScreenFilm";

/** The recorder, bound to this file's own way of stubbing a global (src/ui/moireCanvasPainted.ts). */
const paintedOn = painterOn((name, value) => {
  vi.stubGlobal(name, value);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** The rows every painting here is made of: one claiming row, and the deck's own reference. */
const ROWS = [row({ period: 3 }), row({ period: 4, phase: 1, reference: true })];

/** The fine cell every case below reads in blocks of, in device pixels, and a block of it. */
const CELL = 10;
const BLOCK = CELL * SCATTER_SPAN;

/**
 * A body whose ground and pull are flat and whose third channel is `speck(col, row)` over each
 * block of cells: the one channel the scatter reads, and nothing else that could stand in for it.
 */
function specked(
  width: number,
  height: number,
  speck: (col: number, row: number) => number,
): Float32Array {
  const body = new Float32Array(width * height * PER_PIXEL);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const at = (y * width + x) * PER_PIXEL;
      body[at] = 0.5;
      body[at + 1] = 1;
      body[at + 2] = speck(Math.floor(x / BLOCK), Math.floor(y / BLOCK));
    }
  }
  return body;
}

/** What share of a tile's pixels carry any ink at all. */
function inked(pixels: Uint8ClampedArray): number {
  let lit = 0;
  for (let at = 3; at < pixels.length; at += 4) if ((pixels[at] ?? 0) > 0) lit += 1;
  return (4 * lit) / pixels.length;
}

/** One painting of a yard whose detail ends on `specks`, at the display the tile is baked for. */
function painting(specks: SceneSpecks): Painted {
  vi.stubGlobal("devicePixelRatio", 2);
  return paintedOn(200, 128, ROWS, 2, 20, {
    yard: { ...YARD_SCENE_REST, scene: "canopy", specks },
  });
}

// One flat list of the scatter's cases (0007).
// oxlint-disable-next-line max-lines-per-function
describe("moireScreenScatter", () => {
  it("writes a big mark where the specks' channel peaks and none where it is nought", () => {
    // Four blocks across, one of them at the top of the channel, one partway up it and two at
    // nought: what a flock is, read nine cells at a time.
    const stands = [1, 0, 0.45, 0];
    const body = specked(BLOCK * stands.length, BLOCK, (col) => stands[col] ?? 0);
    const scatter = scatterLattice(body, BLOCK * stands.length, BLOCK, CELL, CELL);
    expect(scatter.cols).toBe(stands.length);
    // The threshold is the specks' own: between what the channel means over the tile and what it
    // reaches, and never a dial. Cut into the ten marks **at no phase**, because the wrap is what
    // makes a ground and a peak share a mark and this layer is only ever its peaks.
    const floor = stands.reduce((sum, stood) => sum + stood, 0) / stands.length;
    const reach = Math.max(...stands) - floor;
    for (const [col, stood] of stands.entries()) {
      expect(scatter.marks[col]).toBe(markAt((stood - floor) / reach, GLYPH_COUNT, 0));
    }
    // The peak is the block, the shoulder is a mark between, and a channel at nought is the mark
    // that inks nothing — so a scatter lays no ink at all where the yard's detail put none.
    expect(scatter.marks[0]).toBe(GLYPH_COUNT - 1);
    expect(scatter.marks[2]).toBeGreaterThan(0);
    expect(scatter.marks[2]).toBeLessThan(GLYPH_COUNT - 1);
    for (let y = 0; y < BLOCK; y++) {
      for (let x = 0; x < BLOCK; x++) {
        expect(scatterInk(scatter, x, y, ALPHABETS.marks)).toBeGreaterThan(0);
        expect(scatterInk(scatter, BLOCK + x, y, ALPHABETS.marks)).toBe(0);
        expect(scatterInk(scatter, 3 * BLOCK + x, y, ALPHABETS.marks)).toBe(0);
      }
    }
  });

  it("covers exactly nine cells' worth of the picture with one big mark", () => {
    const body = specked(BLOCK * 2, BLOCK, (col) => (col === 0 ? 0.65 : 0));
    const scatter = scatterLattice(body, BLOCK * 2, BLOCK, CELL, CELL);
    // The coarse cell is the fine one read in blocks: three of its cells on each axis, so the
    // square it covers is nine of them.
    expect(scatter.across).toBe(BLOCK);
    expect(scatter.down).toBe(BLOCK);
    const mark = scatter.marks[0] ?? 0;
    // Every device pixel of the big cell, read at its own centre: what the mark covers of the
    // square, in pixels, is the area the picture spends on one big mark.
    let laid = 0;
    for (let y = 0; y < BLOCK; y++) {
      for (let x = 0; x < BLOCK; x++)
        laid += scatterInk(scatter, x + 0.5, y + 0.5, ALPHABETS.marks);
    }
    // And what it inks is that mark's own share of the square — the same mark the fine lattice
    // writes, at nine cells' size and not at a cell's, which is the whole of what the layer is.
    expect(laid).toBeCloseTo(
      markWeight(ALPHABETS.marks, mark) * SCATTER_SPAN * SCATTER_SPAN * CELL * CELL,
      10,
    );
  });

  it("comes round on the tile it is laid across, whatever the cell count", () => {
    // The tile is laid as a repeating pattern, so a coarse cell that did not come round at its edge
    // would step by a fraction of itself at every join — and the cell count a tile carries is the
    // two pitches' business and is not a multiple of the span (`beatPx`).
    for (const dpr of [1, 2, 3]) {
      const cell = gridPitchPx(dpr);
      const width = beatPx(cell);
      const body = specked(width, cell * 3, () => 1);
      const scatter = scatterLattice(body, width, cell * 3, cell, cell);
      expect(scatter.cols * scatter.across).toBeCloseTo(width, 10);
      // And a channel flat across the tile has no peak to scatter, so it draws none of this: the
      // threshold being the specks' own spread, a flock spread evenly is a flock with no flock in it.
      expect(scatter.marks.every((mark) => mark === 0)).toBe(true);
      // And it is the span's own stride within that snap, never a size of its own: exactly three
      // cells where the tile's cell count divides by three, and the nearest whole number of blocks
      // to that where it does not — a tile is `pitch + 1` cells across (`beatPx`), so a 1x display
      // gets six cells in two blocks of three and a 2x display eleven in four of two and three
      // quarters. **That is what "nine cells' worth" is held to in a tile the app bakes**: nine
      // where the span divides, and the snapped block's own square where it does not.
      const cells = width / cell;
      expect(scatter.across / cell).toBeCloseTo(cells / Math.round(cells / SCATTER_SPAN), 10);
      expect(Math.abs(scatter.across - cell * SCATTER_SPAN)).toBeLessThan(cell);
    }
    expect(beatPx(gridPitchPx(1)) / gridPitchPx(1)).toBe(SCATTER_SPAN * 2);
  });

  it("lays the scatter over the lattice on the tile a yard with a flock is drawn on", () => {
    // A flock is the scene's own bright points at three times their count (`SCENE_FLOCK`): read
    // into the fine lattice alone it moves a cell's mean by a fortieth, and read nine cells at a
    // time it is a layer of big marks. The tile carries close to twice the ink the same yard's own
    // specks draw, where the read alone moves it by a part in five hundred.
    // All three at one canvas height, so what separates the tiles is the detail and never their
    // geometry: the key already carries `specks`, so each is baked on its own.
    const wide = beatPx(gridPitchPx(2));
    const own = inked(tileOf(painting("own"), wide));
    const flock = inked(tileOf(painting("flock"), wide));
    const kept = inked(tileOf(painting("kept"), wide));
    expect(own).toBeGreaterThan(0);
    expect(flock).toBeGreaterThan(own * 1.5);
    // And the one kept thing is one big mark and not a scatter of them: more ink than the scene's
    // own specks draw and far less than a flock's.
    expect(kept).toBeGreaterThan(own);
    expect(kept).toBeLessThan(flock);
  });
});
