/**
 * @role Tests the ink a tile's cells are written in: that the scene's ramp is **cut** where the
 *   mark is chosen, so a covered pixel of a tile the three channels stand level across is exactly
 *   one of the five stops the scene named and never a mix of two, and that the flatness pulls
 *   those five toward the ramp's middle stop until at one there is only the middle stop left
 *   (0366). Level across the three, because the fringe multiplies the cell's ink after the cut and
 *   is a term of its own (0130): what is read here is the cut. And beside it, where a standing pop
 *   stands those three channels — one lattice at rest and a whole cell apart at a full saturation,
 *   so a ghost of the lattice is a mark and never a stroke (0367).
 * @instead Where the stops come from → src/ui/moireScreenStops.ts. The ramp itself and the cut →
 *   src/lib/moireColour.ts. Which mark a cell is written in and where it stands →
 *   src/lib/moireScreenCells.ts. Who bakes the tile and when → src/ui/moireScreenShop.test.ts.
 */
import { afterEach, describe, expect, it } from "vitest";

import { type Ink } from "@/lib/moireColour";
import { sceneCells, sceneRepeat } from "@/lib/moireScene";
import { forgetScreenField, screenField, type ScreenBake } from "@/lib/moireScreenField";
import { channelMix, GLYPH_FLAT } from "@/lib/moireScreenFilm";
import { resetTuning, setTuning } from "@/lib/moireTuning";
import { YARD_SCENE_REST } from "@/lib/yardScene";

/** A tile big enough to hold a whole lattice and small enough to bake in a case. */
const WIDE = 200;
const DEEP = 200;

/**
 * Five stops no two of which are near each other, so a mix of any two is a colour that is none of
 * them: what this file reads is whether a covered pixel landed on a stop or between two.
 */
const STOPS: readonly Ink[] = [
  [10, 10, 10, 255],
  [60, 40, 20, 255],
  [120, 90, 40, 255],
  [190, 150, 85, 255],
  [235, 225, 200, 255],
];

/** The stop the flatness pulls the other four toward, found the way the cut finds its own. */
const MID = STOPS[Math.floor(STOPS.length / 2)] ?? [0, 0, 0, 0];

/** The cell the orders below are cut on, and how the tile snaps to it (`sceneRepeat`, 0345). */
const CELL = 10;
const ACROSS = sceneRepeat(WIDE, CELL);
const DOWN = sceneRepeat(DEEP, CELL);
const COLS = sceneCells(WIDE, CELL);
const ROWS = sceneCells(DEEP, CELL);

/** One order with nothing on it but the ink: no fringe and no dispersion. */
const order = (hue: number, saturate = 0): ScreenBake => ({
  key: `stops|${hue}|${saturate}`,
  width: WIDE,
  height: DEEP,
  seen: DEEP,
  pitch: 10,
  rowPitch: 14,
  cell: CELL,
  beat: 0,
  own: [200, 120, 40, 255],
  lift: STOPS,
  tint: { fringe: 0, disperse: 0, hue, saturate },
  yard: { ...YARD_SCENE_REST },
  cells: [],
  alphabet: "marks",
  armed: null,
});

/**
 * Every colour a covered pixel was written in at `flat`, counted — over the whole travel of the
 * hue rather than at one rung of it, because a claim slides the whole field along the ramp
 * (`sceneHue`) and one tile of one ground stands on two of the five stops. What the sweep says is
 * that the cut holds wherever the ground has been carried to.
 */
function coveredInks(flat: number): Map<string, number> {
  setTuning("glyph.flat", flat);
  const seen = new Map<string, number>();
  for (const hue of [0, 0.25, 0.5, 0.75, 1]) {
    forgetScreenField();
    const pixels = new Uint8ClampedArray(WIDE * DEEP * 4);
    screenField(order(hue), pixels);
    for (let at = 0; at < pixels.length; at += 4) {
      if (pixels[at + 3] === 0) continue;
      const ink = `${pixels[at]},${pixels[at + 1]},${pixels[at + 2]}`;
      seen.set(ink, (seen.get(ink) ?? 0) + 1);
    }
  }
  return seen;
}

// One flat list of what a mark is written in (0007).
describe("the ink a mark is written in", () => {
  afterEach(() => {
    resetTuning();
    forgetScreenField();
  });

  it("writes every covered pixel in one of the scene's five stops and never a mix of two", () => {
    const named = new Set(STOPS.map((stop) => `${stop[0]},${stop[1]},${stop[2]}`));
    const seen = coveredInks(0);
    // The case is worth reading only if the sweep actually walked the ramp: one stop everywhere
    // would pass this by drawing a picture of nothing. Three of the five, because a ground read
    // through a claim's whole travel reaches that much of its own ramp and the ends are the
    // rarest inks a nearest-stop cut has (`rampStop`, whose own cases read all five).
    expect(seen.size, "the sweep came out in one ink").toBeGreaterThan(2);
    for (const ink of seen.keys()) {
      expect(named.has(ink), `a covered pixel is ${ink}, which is no stop of the scene`).toBe(true);
    }
  });

  it("pulls all five to the ramp's middle stop at a flatness of one", () => {
    const seen = coveredInks(1);
    expect([...seen.keys()]).toEqual([`${MID[0]},${MID[1]},${MID[2]}`]);
  });

  it("rests where the five are still several inks and not the middle stop alone", () => {
    // Where the flatness rests is what the page actually draws, and under 0346 it rested at one —
    // the whole picture in the middle stop. Colour comes back by resting short of that (0366).
    expect(coveredInks(GLYPH_FLAT.rest).size, "the resting picture is one ink").toBeGreaterThan(1);
  });
});

/** One tile at `saturate`, with `over` laid over it: the rack's second lattice and the scatter. */
function splitTile(saturate: number, over: Partial<ScreenBake> = {}): Uint8ClampedArray {
  forgetScreenField();
  const pixels = new Uint8ClampedArray(WIDE * DEEP * 4);
  screenField({ ...order(0.5, saturate), ...over }, pixels);
  return pixels;
}

/**
 * How many of a tile's covered pixels carry one channel and not another: a stop of this scene has
 * all three in it (`STOPS`), so a covered pixel missing one is a cell lit by a neighbour's mark
 * and nothing else — the coloured ghost a split stands either side of the lattice.
 */
function ghostsOf(pixels: Uint8ClampedArray): { covered: number; ghosts: number; blank: number } {
  let covered = 0;
  let ghosts = 0;
  let blank = 0;
  for (let at = 0; at < pixels.length; at += 4) {
    if ((pixels[at + 3] ?? 0) === 0) continue;
    covered += 1;
    const ink = [pixels[at] ?? 0, pixels[at + 1] ?? 0, pixels[at + 2] ?? 0];
    if (Math.max(...ink) === 0) blank += 1;
    else if (Math.min(...ink) === 0) ghosts += 1;
  }
  return { covered, ghosts, blank };
}

/**
 * One tile at `saturate`, read at the middle pixel of every cell: a mark's own centre is either
 * solidly written or solidly blank, where its edge is the blur (`markBlur`), so a cell read there
 * says which channel the lattice stands in and not how a stroke was feathered.
 */
function centreInks(saturate: number): Uint8ClampedArray[] {
  const pixels = splitTile(saturate);
  const read: Uint8ClampedArray[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = Math.floor((col + 0.5) * ACROSS);
      const y = Math.floor((row + 0.5) * DOWN);
      const at = (y * WIDE + x) * 4;
      read.push(pixels.slice(at, at + 4));
    }
  }
  return read;
}

/** The two lattices that stand on cells of their own and are not split with this one. */
const OTHERS = [
  ["the second lattice", { beat: 0.9 }],
  ["the scatter", { yard: { ...YARD_SCENE_REST, specks: "flock" } }],
] as const;

/** Whether cell `col` of `row` carries any of `channel` at its own centre. */
const lit = (
  read: readonly Uint8ClampedArray[],
  col: number,
  row: number,
  channel: number,
): boolean => (read[row * COLS + col]?.[channel] ?? 0) > 0;

// And where the three of them stand, which is the same list one cell over (0007, 0367).
describe("where a pop stands the three channels", () => {
  afterEach(() => {
    resetTuning();
    forgetScreenField();
  });

  it("stands one lattice where nothing is saturated, and three under a pop", () => {
    // One lattice is every covered pixel in the ink its own cell was written in, all three channels
    // of it: a stop of this scene has all three, so a covered pixel carrying one and not another is
    // the lattice standing somewhere else in that channel.
    const rested = ghostsOf(splitTile(0));
    expect(rested.covered, "the rested tile is blank").toBeGreaterThan(0);
    expect(rested.ghosts, "the rested picture stands a ghost").toBe(0);
    const popped = ghostsOf(splitTile(1));
    expect(popped.ghosts, "a saturated picture stands no ghost").toBeGreaterThan(0);
  });

  it("writes the other two lattices in the cell's own ink while a pop stands", () => {
    // The rack's second lattice and the specks' scatter stand on cells of their own, so the split
    // does not reach them — but they union into the same alpha, and a pixel they cover where this
    // lattice is blank has to carry the cell's ink and not the nothing the three channels have
    // there. Read as covered pixels in no ink at all, which is what a page shows as a black mark.
    for (const [what, over] of OTHERS) {
      const read = ghostsOf(splitTile(1, over));
      expect(read.covered, `${what} covered nothing`).toBeGreaterThan(0);
      expect(read.blank, `${what} is covered in no ink at all`).toBe(0);
    }
  });

  it("stands the red channel's marks one whole cell left of the green's at a full saturation", () => {
    // One cell and not a fraction of one: the knob moves whole marks now (`channelMix`).
    expect(channelMix(1)).toBe(1);
    const read = centreInks(1);
    let ghosts = 0;
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col + 1 < COLS; col++) {
        // The red of a cell is the mark standing a cell to its right, so the red lattice stands a
        // cell left of the green's; the blue is the same the other way.
        expect(lit(read, col, row, 0), `red at ${col},${row}`).toBe(lit(read, col + 1, row, 1));
        expect(lit(read, col + 1, row, 2), `blue at ${col + 1},${row}`).toBe(
          lit(read, col, row, 1),
        );
        if (lit(read, col, row, 0) !== lit(read, col, row, 1)) ghosts += 1;
      }
    }
    // And the split is something the picture shows: cells the green lattice left blank and a
    // channel a cell over lit, which is the coloured ghost either side.
    expect(ghosts, "a saturated tile stands no ghost").toBeGreaterThan(0);
  });
});
