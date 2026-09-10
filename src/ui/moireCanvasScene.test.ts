/**
 * @role Tests that the picture is the field its yard's name says: that two yards named for
 *   different plants lay down different tiles, that every row still cuts a grating whatever the
 *   scene, and that a scene's ground is written on a rebuild and never on a frame (0329).
 * @instead Every other case the painter has → src/ui/moireCanvas.test.ts, which this stands beside
 *   rather than inside because that file is within forty lines of the 800-line hard cap (0045).
 *   The reading these paint through → src/lib/yardScene.ts. The grounds themselves →
 *   src/ui/scene/.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { SCENE_NAMES } from "@/lib/moireScene";
import { moireRow as row } from "@/lib/moireRow";
import { resetTuning, setTuning } from "@/lib/moireTuning";
import { type YardScene, yardScene, YARD_SCENE_REST } from "@/lib/yardScene";
import { painterOn, type Painted } from "@/ui/moireCanvasPainted";
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

/**
 * The screen's own tile out of one painting: the surface a beat cell wide, which is the only one
 * the screen writes a pixel field into (`beatPx`, src/ui/moireScreenTile.ts). Exactly one write, which
 * is the rule the third case below is about — the loop over a tile's pixels runs on a rebuild and
 * never on a frame (0129).
 */
function tileOf(painted: Painted): Uint8ClampedArray {
  const wide = beatPx(gridPitchPx(2));
  const written = painted.surfaces.flatMap((surface, at) =>
    painted.elements[at]?.width === wide ? surface.wrote : [],
  );
  expect(written).toHaveLength(1);
  return written[0]?.data ?? new Uint8ClampedArray();
}

/** One painting of a yard reading as `yard`, on a display of two device pixels to the CSS one. */
function paintingOf(yard: Readonly<YardScene>): Painted {
  vi.stubGlobal("devicePixelRatio", 2);
  return paintedOn(200, 128, ROWS, 2, 20, { yard });
}

// One flat list of the scene's cases, all painted through the one stand-in canvas (0007).
// oxlint-disable-next-line max-lines-per-function
describe("the picture is the field its name says", () => {
  it("lays down a different tile for every plant a yard could be named for", () => {
    // The whole of the step: a rack of yards is a rack of fields, and which field is read off the
    // name and nothing else (0329). Four names, one plant per field, drawn through the reading itself and never through a scene
    // handed in: what the step claims is that a *name* picks the picture.
    const named = ["Heather", "Foxglove", "Reed", "Willow"].map((plant) =>
      yardScene(`Quiet ${plant} by the Shed`),
    );
    expect(named.map((yard) => yard.scene)).toEqual([...SCENE_NAMES]);
    // Every one against every other, and never one against the rest: two scenes that happened to
    // agree would hide inside a set comparison of four.
    const tiles = named.map((yard) => tileOf(paintingOf(yard)));
    for (const [at, tile] of tiles.entries()) {
      for (const other of tiles.slice(at + 1)) expect(tile).not.toEqual(other);
    }
  });

  it("still aims one grating per row whatever the scene, and lays the screen down once", () => {
    // A scene is a ground and a ramp and never a second painter: the rows, the looks and the
    // lattice reach it untouched, so what a painting is made of cannot move with the name.
    for (const scene of SCENE_NAMES) {
      const painted = paintingOf({ ...YARD_SCENE_REST, scene });
      expect(painted.aims, scene).toHaveLength(ROWS.length);
      expect(
        painted.laid.filter((each) => each.over === "source-over"),
        scene,
      ).toHaveLength(1);
    }
  });

  it("bakes the ground again when the number it was baked under moves", () => {
    // A scene's constants are tunables argued on the bench (0247), and they are read *inside* the
    // build — so the tile they are baked into has to stop being the tile the cache answers with the
    // moment one of them moves, or the slider is inert everywhere but the bench
    // (src/lib/moireTuning.ts @instead: a number a tile is baked under). One counter in the key,
    // bumped on every tuning, is what says so.
    // A reading no other case here paints, so the first tile is built rather than answered out of
    // the cache and only the second one is about the counter.
    const yard = yardScene("Quiet Heather by the Gate in Frost");
    const first = tileOf(paintingOf(yard));
    setTuning("meadow.fibre", 4);
    expect(tileOf(paintingOf(yard))).not.toEqual(first);
    resetTuning();
    expect(tileOf(paintingOf(yard))).toEqual(first);
  });

  it("lays down a bloom whose pixels span more than one of its own stops", () => {
    // The whole of 0332 through the painter: the bloom's ramp is read per pixel, so one tile holds
    // a scarlet head and a green stem at full strength — and not one ink the ground dimmed. The
    // stops are src/ui/scene/bloom.ts's own, resolved by the recorder (`resolvedInk`).
    const pixels = tileOf(paintingOf(yardScene("Quiet Foxglove by the Shed")));
    let heads = 0;
    let stems = 0;
    for (let at = 0; at < pixels.length; at += 4) {
      const red = pixels[at] ?? 0;
      const green = pixels[at + 1] ?? 0;
      if (red > green + 60) heads += 1;
      if (green > red + 60) stems += 1;
    }
    // A twentieth of the tile each way: a picture with a handful of red pixels in it is a fringe,
    // and what this claims is a field of heads standing in a field of stems.
    const share = pixels.length / 4 / 20;
    expect(heads, "the bloom has no heads").toBeGreaterThan(share);
    expect(stems, "the bloom has no stems").toBeGreaterThan(share);
    // And the meadow, painted through the same recorder, is not that picture: the two grounds read
    // their own ramps and neither is the other's.
    const meadow = tileOf(paintingOf(yardScene("Quiet Heather by the Shed")));
    expect(meadow).not.toEqual(pixels);
  });

  it("writes the ground on a rebuild and never on a frame", () => {
    // The one rule a per-pixel pass in this picture lives under (0129): the loop over the tile's
    // pixels runs when what the tile is *of* moves, and four frames of a playing deck move the
    // screen on its transform instead. A scene is part of what the tile is of, so it is keyed and
    // not drawn again.
    vi.stubGlobal("devicePixelRatio", 2);
    const rows = ROWS.map((each) => Object.assign({}, each));
    const painted = paintedOn(200, 128, rows, 2, 20, {
      frames: 4,
      advance: 0.05,
      yard: yardScene("Wild Willow past the Gate in Falling Dusk"),
    });
    expect(tileOf(painted)).not.toHaveLength(0);
  });
});
