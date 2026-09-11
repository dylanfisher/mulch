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
import { afterEach, describe, expect, it, vi } from "vitest";

import { GLYPH_PUSH, markWeight } from "@/lib/moireGlyph";
import { type SceneName, sceneRepeat } from "@/lib/moireScene";
import { moireRow as row } from "@/lib/moireRow";
import { resetTuning, setTuning } from "@/lib/moireTuning";
import { type YardScene, YARD_SCENE_REST } from "@/lib/yardScene";
import { type LookName, type LookTerms } from "@/lib/moireLook";
import { painterOn, type Painted } from "@/ui/moireCanvasPainted";
import type { MoireLook } from "@/ui/moireLooks";
import { beatPx, gridPitchPx } from "@/ui/moireScreenTile";

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
function tileOf(painted: Painted): Uint8ClampedArray {
  const wide = beatPx(gridPitchPx(2));
  const written = painted.surfaces.flatMap((surface, at) =>
    painted.elements[at]?.width === wide ? surface.wrote : [],
  );
  expect(written).toHaveLength(1);
  return written[0]?.data ?? new Uint8ClampedArray();
}

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
});
