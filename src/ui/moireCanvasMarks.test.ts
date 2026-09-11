/**
 * @role Tests the marks the painter puts down: that a cell's read is pushed toward the ends of its
 *   ramp before it is cut, so a field is mostly the sparse mark its ground is written in with a
 *   band of dense ones through it, and that the push is spent on the mark and never on the scene's
 *   own ink (0348).
 * @instead What the film's four terms take off the read, and the alpha being a mark's coverage at
 *   every share → src/ui/moireCanvasFilm.test.ts, which this stands beside because that file
 *   stands near the line cap (0045). The marks and the wrap onto them → src/lib/moireGlyph.ts and
 *   its own test. Everything else a scene reads through the painter →
 *   src/ui/moireCanvasScene.test.ts.
 */
// One dependency over the cap, and it is the file this one is the painter's cases for: the stamp
// declares its own dial and its own bands, and a case that restated either would be asserting a
// second copy of them rather than the shipped one (principle 1).
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { afterEach, describe, expect, it, vi } from "vitest";

import { GLYPH_COUNT, GLYPH_GRID, GLYPH_PUSH, markAt, markWeight } from "@/lib/moireGlyph";
import { type SceneName, sceneRepeat } from "@/lib/moireScene";
import { moireRow as row } from "@/lib/moireRow";
import { resetTuning, setTuning } from "@/lib/moireTuning";
import { type YardScene, YARD_SCENE_REST } from "@/lib/yardScene";
import { type LookName, type LookTerms } from "@/lib/moireLook";
import { painterOn, type Painted, tileOf as tileFrom } from "@/ui/moireCanvasPainted";
import { bandFloor, boxCells, CELL_ROWS } from "@/ui/moireCanvasMarks";
import type { MoireLook } from "@/ui/moireLooks";
import { beatPx, gridPitchPx } from "@/ui/moireScreenTile";
// oxlint-enable import/max-dependencies

/** The recorder, bound to this file's own way of stubbing a global (src/ui/moireCanvasPainted.ts). */
const paintedOn = painterOn((name, value) => {
  vi.stubGlobal(name, value);
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetTuning();
});

/** The rows every painting here is made of: one claiming row, and the deck's own reference. */
const ROWS = [row({ period: 3 }), row({ period: 4, phase: 1, reference: true })];

/** The screen's own tile out of one painting: the one surface a beat cell wide (`beatPx`). */
const tileOf = (painted: Painted): Uint8ClampedArray => tileFrom(painted, beatPx(gridPitchPx(2)));

/** One painting of a yard reading as `yard`, on a display of two device pixels to the CSS one. */
function paintingOf(yard: Readonly<YardScene>, looks: readonly MoireLook[] = []): Painted {
  vi.stubGlobal("devicePixelRatio", 2);
  return paintedOn(200, 128, ROWS, 2, 20, { yard, looks });
}

/** One look of a standing rack, arrived — the shape `rackLooks` answers with. */
const look = (name: LookName, terms: LookTerms): MoireLook => ({
  key: name,
  look: name,
  presence: 1,
  at: 1,
  terms,
  held: 0,
});

/**
 * How much of each cell of a tile is inked, cell by cell across the whole of it: the alpha is the
 * caller's whole times the mark's coverage and nothing else (0345), so a heavier mark is a heavier
 * cell and this is the picture a pass over the cells moves.
 */
function coverOf(pixels: Uint8ClampedArray): number[] {
  const pitch = gridPitchPx(2);
  const wide = beatPx(pitch);
  const deep = pixels.length / 4 / wide;
  const across = sceneRepeat(wide, pitch);
  const down = sceneRepeat(deep, pitch);
  const cells: number[] = [];
  for (let top = 0; top + down <= deep; top += down) {
    for (let left = 0; left + across <= wide; left += across) {
      let sum = 0;
      let read = 0;
      for (let y = Math.floor(top); y < Math.floor(top + down); y += 1) {
        for (let x = Math.floor(left); x < Math.floor(left + across); x += 1) {
          sum += (pixels[(y * wide + x) * 4 + 3] ?? 0) / 255;
          read += 1;
        }
      }
      cells.push(sum / Math.max(1, read));
    }
  }
  return cells;
}

/**
 * What share of a scene's tile is written in a mark heavier than the plus, under one setting of the
 * push. A cell's mark is read back off the tile as the mean of its coverage — the alpha is the
 * caller's whole times that coverage and nothing else (0345) — so a cell heavier than the plus is
 * one whose mean stands above the plus's own weight.
 */
function heavyShare(scene: SceneName, push: number): number {
  const plus = markWeight(4);
  setTuning("glyph.push", push);
  const pixels = tileOf(paintingOf({ ...YARD_SCENE_REST, scene }));
  const pitch = gridPitchPx(2);
  const wide = beatPx(pitch);
  const deep = pixels.length / 4 / wide;
  const across = sceneRepeat(wide, pitch);
  const down = sceneRepeat(deep, pitch);
  let heavy = 0;
  let cells = 0;
  for (let top = 0; top + down <= deep; top += down) {
    for (let left = 0; left + across <= wide; left += across) {
      let sum = 0;
      let read = 0;
      for (let y = Math.floor(top); y < Math.floor(top + down); y += 1) {
        for (let x = Math.floor(left); x < Math.floor(left + across); x += 1) {
          sum += (pixels[(y * wide + x) * 4 + 3] ?? 0) / 255;
          read += 1;
        }
      }
      cells += 1;
      if (sum / Math.max(1, read) > plus) heavy += 1;
    }
  }
  return heavy / Math.max(1, cells);
}

/**
 * How many patterns one painting of the stamp asks the engine for: the picture's own two — the
 * rows' grating and the screen — and then one per mark it fills the sound's rows through.
 */
const STAMP_PATTERNS = 2 + GLYPH_COUNT;

/** One painting at `dpr` device pixels to the CSS one, with every pattern the stamp asks for. */
function stampedOn(dpr: number, frames = 1): Painted {
  vi.stubGlobal("devicePixelRatio", dpr);
  return paintedOn(200, 128, ROWS, STAMP_PATTERNS, 20, { frames });
}

/**
 * Every fill one painting made through a mark's own pattern, which is the stamp's and nothing
 * else's: `source-in` on a surface the size of the picture (`stampMarks`). Counted off the
 * recorder rather than off the pixels, because what the step promises is the *cost* — one fill a
 * mark however many cells the picture is cut into (0129).
 */
function stampFills(painted: Painted, span: number): number {
  return painted.surfaces.reduce(
    (count, surface, at) =>
      painted.elements[at]?.width === span
        ? count + surface.fills.filter((fill) => fill.over === "source-in").length
        : count,
    0,
  );
}

/**
 * How many bits each of the marks' own tiles inks, in the order the stamp minted them: a tile is a
 * cell square and every inked bit of it is one fill (`markTile`), so the fills it made are the
 * mark. Nothing else the painter makes is a cell square.
 */
function markTiles(painted: Painted, cell: number): number[] {
  return painted.surfaces.flatMap((surface, at) => {
    const element = painted.elements[at];
    return element?.width === cell && element.height === cell ? [surface.fills.length] : [];
  });
}

/**
 * Which surface the stamp fills its bands through: the one the size of the picture that fills
 * `source-in`, which is the mask and nothing else the painter makes.
 */
const maskAt = (painted: Painted, span: number): number =>
  painted.surfaces.findIndex(
    (surface, at) =>
      painted.elements[at]?.width === span &&
      surface.fills.some((fill) => fill.over === "source-in"),
  );

// One flat list of the marks' cases, all painted through the one stand-in canvas (0007).
// oxlint-disable-next-line max-lines-per-function
describe("the marks the painter puts down", () => {
  it("leaves most of a field's cells at the sparse ground mark its phase names", () => {
    // The first step of the lattice block (0348): a cell's read is pushed toward the ends of its
    // ramp before it is cut, so a field is mostly the sparse mark its ground is written in with a
    // band of dense ones through it — the reference's ground with ribbons, where 0346 shipped a
    // field half of whose cells are heavier than the plus.
    // The bloom the step names, read at each end of the dial in turn — the tile is held per tuning
    // and rebaked when one moves (`tuneStamp`).
    expect(heavyShare("bloom", 0), "the bloom 0346 shipped is the dense one").toBeGreaterThan(
      1 / 3,
    );
    expect(
      heavyShare("bloom", GLYPH_PUSH.rest),
      "a pushed bloom is still mostly dense",
    ).toBeLessThan(1 / 3);
    // And the meadow, which this dial reaches but cannot make a ground of: its read clusters at the
    // ramp's own middle, which is the one read a push about that middle does not move, so every
    // cell of it is heavier than the plus at nought and half of them still are at the top of the
    // dial (docs/plan.md §4). Asserted rather than left out, so the day a step gives the meadow a
    // ground this case is what says so.
    expect(heavyShare("meadow", 0), "a shipped meadow is all dense").toBe(1);
    expect(heavyShare("meadow", GLYPH_PUSH.max), "the push does not reach the meadow").toBeLessThan(
      heavyShare("meadow", GLYPH_PUSH.rest),
    );
    expect(heavyShare("meadow", GLYPH_PUSH.max), "the meadow is a ground already").toBeGreaterThan(
      1 / 3,
    );
  });

  it("bakes a rack's own passes into the tile, raising marks and spending no ink", () => {
    // The second step of the block (0349): a look may act on the cells. A delay standing in the
    // rack is a ladder of lighter marks behind every dense one, and a reverb is a halo of them —
    // both baked into the tile, so the lattice still stands still between frames (0346).
    const yard = { ...YARD_SCENE_REST, scene: "bloom" } as const;
    setTuning("glyph.push", GLYPH_PUSH.rest);
    const plain = tileOf(paintingOf(yard));
    const echoed = tileOf(paintingOf(yard, [look("echoes", { spacing: 1, count: 1, fade: 1 })]));
    const bloomed = tileOf(paintingOf(yard, [look("bloom", { amount: 1, radius: 1 })]));
    const ground = coverOf(plain);
    for (const [name, pixels] of [
      ["the delay's ladder", echoed],
      ["the reverb's halo", bloomed],
    ] as const) {
      const cells = coverOf(pixels);
      // A pass raises a cell and never lightens one, and the picture it raises is one every cell
      // of the plain tile is still under.
      let raised = 0;
      cells.forEach((cover, at) => {
        expect(cover, `${name} lightened cell ${at}`).toBeGreaterThanOrEqual(
          (ground[at] ?? 0) - 1e-9,
        );
        if (cover > (ground[at] ?? 0) + 1e-9) raised += 1;
      });
      expect(raised, `${name} moved no cell`).toBeGreaterThan(0);
      // And it spends no ink at all: which mark a cell is written in is the pass's, and the colour
      // underneath it is read at the cell's own stand, before the cut (0348).
      for (let at = 0; at < plain.length; at += 4) {
        for (const channel of [0, 1, 2]) {
          expect(pixels[at + channel], `${name} changed ink at ${at}`).toBe(plain[at + channel]);
        }
      }
    }
  });

  it("bakes the tile it was already holding for a look that declares no pass", () => {
    // The step's own case: a pass declared by no standing effect runs nothing and the key is
    // unchanged — so a rack of sways and crushes draws the lattice 0346 shipped, down to the byte,
    // and the tile it draws it from is the one already in hand.
    const yard = { ...YARD_SCENE_REST, scene: "bloom" } as const;
    setTuning("glyph.push", GLYPH_PUSH.rest);
    // One painting with nothing standing, so the plain tile is in hand whether this case built it
    // or the one before it did.
    paintingOf(yard);
    const rack = paintingOf(yard, [
      look("warp", { bend: 1, wander: 1 }),
      look("blocks", { block: 1, levels: 0 }),
    ]);
    // Not one pixel of a tile is written: the key those two looks make is the key the plain
    // picture was held under, so the painting is handed the tile already in hand.
    const wide = beatPx(gridPitchPx(2));
    const written = rack.surfaces.flatMap((surface, at) =>
      rack.elements[at]?.width === wide ? surface.wrote : [],
    );
    expect(written).toHaveLength(0);
  });

  it("spends the push on the mark alone and never on the scene's own ground", () => {
    // The step's own refusal: the push is a cut of the ramp, so it moves which mark a cell is
    // written in and not one stop of the ink underneath it — the ink is read at the cell's own
    // stand, before the cut (`build`, src/ui/moireScreenTile.ts).
    const bloom = { ...YARD_SCENE_REST, scene: "bloom", stand: "steps" } as const;
    setTuning("glyph.push", 0);
    const flat = tileOf(paintingOf(bloom));
    setTuning("glyph.push", GLYPH_PUSH.rest);
    const pushed = tileOf(paintingOf(bloom));
    expect(pushed, "the push moved no mark at all").not.toEqual(flat);
    for (let at = 0; at < flat.length; at += 4) {
      for (const channel of [0, 1, 2]) {
        expect(pushed[at + channel], `pixel ${at} changed ink`).toBe(flat[at + channel]);
      }
    }
  });
  it("stamps the sound's rows over the picture in one fill a mark, whatever the cell count", () => {
    // The third step of the block (0350): the boxed field — the mean the rows' gratings leave over
    // each cell (0346) — read through one threshold pass per mark and filled with that mark's own
    // pattern, so the sound's cut is a second lattice of marks and a frame pays ten fills however
    // many cells the picture holds. A draw per cell is what this refuses.
    const dense = stampedOn(2);
    const coarse = stampedOn(1);
    expect(boxCells(200, gridPitchPx(2)), "both displays read the same cell count").not.toBe(
      boxCells(200, gridPitchPx(1)),
    );
    expect(stampFills(dense, 200)).toBe(GLYPH_COUNT);
    expect(stampFills(coarse, 200)).toBe(GLYPH_COUNT);
    // A fill a mark a *frame*, and the second frame pays exactly what the first did: the surfaces
    // and the marks' own tiles are minted once a canvas and never once a painting.
    expect(stampFills(stampedOn(2, 2), 200)).toBe(2 * GLYPH_COUNT);
    // And every one of them is laid over the picture after the product is cut back out of it: the
    // cut stays, and the marks are what the product adds where it is strong (0131).
    const overs = dense.laid.map((fill) => fill.over);
    expect(overs.lastIndexOf("destination-out")).toBeLessThan(overs.length - GLYPH_COUNT);
    expect(overs.slice(-GLYPH_COUNT)).toEqual(
      Array.from({ length: GLYPH_COUNT }, () => "source-over"),
    );
  });

  it("stamps nothing at all at no depth", () => {
    // The step's own case: the dial at nothing is the picture 0346 shipped, holes and all — no
    // pass runs, no fill is made, and nothing is laid over the cut.
    setTuning("cells.rows", 0);
    const none = stampedOn(2);
    expect(stampFills(none, 200)).toBe(0);
    expect(none.laid.at(-1)?.over).toBe("destination-out");
    setTuning("cells.rows", CELL_ROWS.rest);
    expect(stampFills(stampedOn(2), 200)).toBe(GLYPH_COUNT);
  });

  it("writes nothing for a cell the rows leave quiet, the read being unwrapped", () => {
    // The step's other case: a frame whose boxed field is all nought stamps nothing. The bands are
    // the ramp cut straight — `markAt` at no phase — so a quiet cell falls in the first band, and
    // the first mark is the one that carries no ink at all. The lattice under it wraps (0345); this
    // one must not, or silence would be written as the sparse mark the ground is written in.
    expect(bandFloor(0)).toBe(0);
    expect(markWeight(0)).toBe(0);
    for (let mark = 1; mark < GLYPH_COUNT; mark++) {
      expect(bandFloor(mark), `band ${mark} starts at nought`).toBeGreaterThan(0);
      expect(markWeight(mark), `mark ${mark} carries no ink`).toBeGreaterThan(0);
    }
    // And a band is where the unwrapped ramp says it is, all the way up: the heaviest band a read
    // stands above is the mark `markAt` writes that read in.
    for (const read of [0, 0.01, 0.1, 0.35, 0.5, 0.9, 0.99, 1]) {
      let stood = 0;
      for (let mark = 0; mark < GLYPH_COUNT; mark++) if (read >= bandFloor(mark)) stood = mark;
      expect(stood, `a read of ${read}`).toBe(markAt(read, GLYPH_COUNT, 0));
    }
    // And the painting carries the whole alphabet as tiles, one square of the cell per mark, each
    // inked bit a fill of its own: the first inks nothing at all — which is what the quiet band is
    // filled through — and the last inks every bit of its grid.
    const inked = markTiles(stampedOn(2), gridPitchPx(2));
    expect(inked).toHaveLength(GLYPH_COUNT);
    expect(inked[0], "the mark a quiet cell is written in inks something").toBe(0);
    expect(inked.at(-1), "the heaviest mark is not the block").toBe(GLYPH_GRID * GLYPH_GRID);
  });

  it("reads the boxed field on the very grid it stamps the marks back onto", () => {
    // The box wrote the product's mean on whole cells and laid it back out to `wide * cell`, which
    // overhangs a picture whose width is not a whole number of them (`boxField`). Read over the
    // field's own width instead and every cell after the first is sampled a little to the left of
    // where it stands — the stamp drifts off the lattice it is a picture of, a cell out by the far
    // edge. The two draws carry the same span, which is what says they are on one grid.
    const cell = gridPitchPx(2);
    const painted = stampedOn(2);
    const wide = boxCells(200, cell);
    const deep = boxCells(128, cell);
    // The stamp's own draws and never the box's, which reads the same picture on the same counts:
    // the read is a draw onto a surface one pixel a cell, and a blow-up is a draw onto the mask.
    const down = painted.surfaces
      .flatMap((surface, at) => {
        const element = painted.elements[at];
        return element?.width === wide && element.height === deep ? surface.drew : [];
      })
      .filter((each) => each.box.length === 8)
      .map((each) => each.box);
    const up = (painted.surfaces[maskAt(painted, 200)]?.drew ?? [])
      .filter((each) => each.box.length === 8)
      .map((each) => each.box);
    expect(down, "the field is read at the cell grid once a frame").toHaveLength(1);
    expect(up, "a band is blown back up once a pass").toHaveLength(GLYPH_COUNT);
    expect(down[0]?.slice(0, 4)).toEqual([0, 0, wide * cell, deep * cell]);
    for (const box of up) expect(box.slice(4)).toEqual([0, 0, wide * cell, deep * cell]);
  });
});
