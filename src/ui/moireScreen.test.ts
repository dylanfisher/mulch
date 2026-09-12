/**
 * @role Tests the screen the picture is filmed off: that its two grids beat rather than crossing
 *   into a plain mesh, that it splits the caller's ink into three channels and names no colour of
 *   its own, and that the three lattices diverge without a seam in the tile.
 * @instead Every motion of the screen, and that none of them moves when the picture does not →
 *   src/ui/moireScreenMotion.test.ts. The scene's own ramp, read through the screen →
 *   src/ui/moireScreenGround.test.ts. Both split out of this file at the 800-line hard cap (0045),
 *   and all three paint through the one recorder in src/ui/moireScreenPainted.ts. The terms
 *   themselves, with nothing painted → src/ui/moireScreenTerms.test.ts.
 */
// oxlint-disable import/max-dependencies
import { afterEach, describe, expect, it, vi } from "vitest";
import { DRIFT_DISPERSE_REACH, DRIFT_FRINGE_REACH, DRIFT_REST } from "@/lib/moire";
import { resetTuning, setTuning } from "@/lib/moireTuning";
import { PRODUCT } from "@/ui/moireCanvasPainted";
import { STAMP_PICTURE_DRAWS } from "@/ui/moireCanvasMarks";
import { bandTurns } from "@/ui/moireScreen";
import {
  beatPx,
  blobKeep,
  channelFringe,
  channelKeep,
  columnKeep,
  gridPitchPx,
  rowKeep,
  rowPitchPx,
  tilePx,
} from "@/lib/moireScreenFilm";
import { screenInkRest } from "@/ui/moireScreenInk";
import { moireRow as row } from "@/lib/moireRow";
import { screenPainterOn } from "@/ui/moireScreenPainted";
/** The recorder, bound to this file's own way of stubbing a global (src/ui/moireScreenPainted.ts). */
const paintedOn = screenPainterOn((name, value) => {
  vi.stubGlobal(name, value);
});

// The stand-in document and display live for exactly the one test that asks for them.
afterEach(() => {
  vi.unstubAllGlobals();
  resetTuning();
});

// One flat list of the lattice's cases (0007).
// oxlint-disable-next-line max-lines-per-function
describe("moireScreen", () => {
  it("beats two grids a pixel apart into a lattice of blobs", () => {
    // The whole of what the reference shows, and the thing neither the pattern transform nor the
    // two gratings multiplied could give us (0129): a slow term across the cell the two grids come
    // back into step over, deep enough to read as a blob.
    for (const dpr of [0.5, 1, 2, 3]) {
      expect(gridPitchPx(dpr)).toBeGreaterThanOrEqual(2);
      expect(rowPitchPx(dpr)).toBeGreaterThanOrEqual(2);
      // Equal pitches would draw a square mesh, and a mesh beats with nothing.
      expect(rowPitchPx(dpr)).not.toBe(gridPitchPx(dpr));
      // Both grids come back into step at the cell's end, which is what lets a tile repeat.
      const pitch = gridPitchPx(dpr);
      expect(beatPx(pitch) % pitch).toBe(0);
      expect(beatPx(pitch) % (pitch + 1)).toBe(0);
    }
    const pitch = gridPitchPx(2);
    const rowPitch = rowPitchPx(2);
    const cell = beatPx(pitch);
    // The blob is brightest where both slow terms crest and darkest a half cell away on either
    // axis — a lattice, not a stripe: moving down alone has to dim it as much as moving across.
    const bright = blobKeep(0, 0, pitch, rowPitch);
    expect(blobKeep(cell / 2, 0, pitch, rowPitch)).toBeLessThan(bright);
    expect(blobKeep(0, beatPx(rowPitch) / 2, pitch, rowPitch)).toBeLessThan(bright);
    // Deep enough to be seen, and it comes round at the cell so a tile repeats without a seam.
    expect(bright - blobKeep(cell / 2, 0, pitch, rowPitch)).toBeGreaterThan(0.15);
    expect(blobKeep(cell, 0, pitch, rowPitch)).toBeCloseTo(bright, 10);
    // And the blob is slower than the grating it rides on: that is what makes it a blob.
    // Shallower than the blob, and deliberately: this screen films the picture rather than being
    // it (P93), so its own gratings only have to be present, not to compete with the rows'.
    const stripes = Array.from({ length: cell }, (_, x) => columnKeep(x, pitch));
    expect(Math.max(...stripes) - Math.min(...stripes)).toBeGreaterThan(0.1);
    for (const [x, keep] of stripes.entries())
      expect(columnKeep(x + pitch, pitch)).toBeCloseTo(keep, 10);
    expect(cell).toBeGreaterThan(4 * pitch);
    // And the rows carry the same grating on their own pitch: the grid's other axis, so the blobs
    // sit in a lattice rather than in one column of stripes.
    const down = Array.from({ length: beatPx(rowPitch) }, (_, y) => rowKeep(y, rowPitch));
    expect(Math.max(...down) - Math.min(...down)).toBeGreaterThan(0.1);
    for (const [y, keep] of down.entries())
      expect(rowKeep(y + rowPitch, rowPitch)).toBeCloseTo(keep, 10);
  });

  // P99: the picture went one colour. The split the channels had then was a fringe a third of a
  // cell wide, so the eye integrated the three back into the row's ink and a yard drawn in one
  // token read as that token everywhere; it stands whole cells apart now and only under a pop
  // (0367). Standing each channel's lattice back by its own share of a beat cell separates them at
  // the blob's scale whatever the pop is doing, which is the scale nothing averages away.
  it("pulls the three channels apart across a blob rather than across a subpixel", () => {
    const pitch = gridPitchPx(2);
    const rowPitch = rowPitchPx(2);
    const cell = beatPx(pitch);
    // Asserted on what the tile writes — the multiplier per channel — rather than on the lattice
    // behind it: the two are not the same claim, and the picture is drawn with this one.
    // Somewhere on the way down a blob's flank the three stand visibly apart — an edge that is
    // one channel before it is the others, which is what a camera photographs off a monitor.
    const flank = [...channelFringe(cell / 4, 0, pitch, rowPitch)];
    expect(Math.max(...flank) - Math.min(...flank)).toBeGreaterThan(0.1);
    // Never above one, on any pixel of a whole cell: a channel is eight bits with a ceiling, and
    // an ink near it has no room to be boosted — a fringe that clipped would be flat exactly
    // where it is brightest, which is the half of every blob it exists for.
    const rowCell = beatPx(rowPitch);
    const totals = [0, 0, 0];
    // Read at every pixel, asserted once, naming the pixel that broke it — for the reason the
    // spread's own ceiling is, further down this file.
    let clipped: { x: number; y: number; value: number } | null = null;
    for (let y = 0; y < rowCell; y++) {
      for (let x = 0; x < cell; x++) {
        const lit = channelFringe(x, y, pitch, rowPitch);
        for (const [channel, value] of lit.entries()) {
          if (!(value <= 1) && clipped === null) clipped = { x, y, value };
          totals[channel] = (totals[channel] ?? 0) + value;
        }
      }
    }
    expect(clipped).toBeNull();
    // And over a whole beat cell each channel gives up what the others give up, so the cell keeps
    // the hue the row was drawn in (0130) — a fringe and never a tint. Over the whole cell and not
    // one row of it: the lattice stands back on both axes at once. Within a fiftieth rather than
    // exactly, and that bound is the ceiling's: dividing by the largest of the three is what keeps
    // every channel under 255, and it cannot also be exactly even-handed, because the middle
    // lattice is the largest of the three a little less often than the outer two are. Measured at
    // 1.1%, which is three of the ink's own 255 levels.
    const flat = totals[1] ?? 0;
    for (const total of totals) expect(Math.abs(total / flat - 1)).toBeLessThan(0.02);
    // A tenth of that bound would fail today, so the figure above is measured and not a ceiling
    // nobody is near.
    expect(Math.abs((totals[0] ?? 0) / flat - 1)).toBeGreaterThan(0.002);
  });

  it("writes the tile once, a cell wide, and is the ink the whole picture is cut out of", () => {
    // The picture the painter actually puts down: one tile as wide as a beat cell and as tall as
    // `tilePx` says, written in a single pass over its pixels. One pass, because the loop over the
    // pixels is the rebuild's and never a frame's (0129).
    vi.stubGlobal("devicePixelRatio", 2);
    // In one strip: the gust lays the screen down once per strip and this case is about the tile
    // behind all of them, written once whatever the fill does.
    setTuning("wind.strips", 1);
    const pitch = gridPitchPx(2);
    const rowPitch = rowPitchPx(2);
    const rows = [row({ period: 3 }), row({ period: 4, phase: 1, reference: true })];
    const { tile, written, moves, inks, screen } = paintedOn(200, 64, rows);
    expect(tile?.width).toBe(beatPx(pitch));
    expect(tile?.height).toBe(tilePx(64, rowPitch));
    expect(written?.width).toBe(tile?.width);
    expect(written?.height).toBe(tile?.height);
    // The screen goes down once, under everything, and the rows' whole product is taken back out
    // of it in one stroke — so the screen is what the picture is *made of* rather than a wash over
    // it, and it is laid down exactly once however many rows there are.
    // And then the marks: since 0350 the same product is laid back over the picture as a lattice
    // of marks, after the cut — in one draw, the ten passes running on the marks' own bit grid
    // since checkpoint A (`STAMP_PICTURE_DRAWS`, 0353).
    const marks = Array.from({ length: STAMP_PICTURE_DRAWS }, () => PRODUCT);
    expect(inks).toEqual([screen, PRODUCT, ...marks]);
    // To within a cell of the marks, on whole cells (0346).
    const rolled = bandTurns(rows) * (tile?.height ?? 0);
    expect(Math.abs((moves[0]?.f ?? 0) - rolled)).toBeLessThanOrEqual(pitch / 2);
    expect((moves[0]?.f ?? 0) % pitch).toBeCloseTo(0, 10);
  });

  it("stands the three channels in one lattice, and a whole cell apart under a pop", () => {
    // What a pop's Sheen does to the colour: the three channels of a mark stand a whole cell apart
    // rather than a third of one, so what a saturated picture grows is a coloured ghost of the
    // lattice either side of it (0367, replacing the subpixel fringe 0130 asked for). Read as the
    // pixels that carry one channel and not another — the cut leaves every covered pixel on one of
    // the scene's five stops (0366), and a stop is an ink with all three channels in it, so a pixel
    // missing one is a cell lit by a neighbour's mark and nothing else.
    const ghosts = (saturate: number): number => {
      vi.stubGlobal("devicePixelRatio", 2);
      const { written } = paintedOn(200, 64, [row({ period: 3 })], {
        ...screenInkRest(),
        saturate,
      });
      const pixels = written?.data ?? new Uint8ClampedArray();
      let seen = 0;
      for (let at = 0; at < pixels.length; at += 4) {
        if ((pixels[at + 3] ?? 0) === 0) continue;
        const ink = [pixels[at] ?? 0, pixels[at + 1] ?? 0, pixels[at + 2] ?? 0];
        if (Math.min(...ink) === 0 && Math.max(...ink) > 0) seen += 1;
      }
      return seen;
    };
    expect(ghosts(0), "the rested picture stands a ghost").toBe(0);
    expect(ghosts(1), "a saturated picture stands no ghost").toBeGreaterThan(0);
  });

  // P102: the picture answered to knob positions in one hue whatever a yard was playing. Colour is
  // something an effect turns now (0141), and these are the two dimensions that turn it.
  it("stands the three channels apart by what a row claims, and folds them together at nothing", () => {
    const pitch = gridPitchPx(2);
    const rowPitch = rowPitchPx(2);
    const cell = beatPx(pitch);
    const rowCell = beatPx(rowPitch);
    /**
     * The widest the three channels stand apart anywhere in one cell: how chromatic the ink is.
     *
     * The ceiling is read at every pixel and asserted once, naming the first pixel that broke it.
     * The claim is about the worst pixel in the cell, and an `expect` per channel per pixel is
     * tens of thousands of assertions for it — most of this file's runtime spent on the framework
     * rather than on the screen. What a failure prints is the same either way.
     */
    const spreadAt = (fringe: number, disperse: number = DRIFT_REST.disperse): number => {
      let widest = 0;
      let clipped: { x: number; y: number; value: number } | null = null;
      for (let y = 0; y < rowCell; y++) {
        for (let x = 0; x < cell; x++) {
          const lit = channelFringe(x, y, pitch, rowPitch, fringe, disperse);
          // `!(value <= 1)` and not `value > 1`: the `expect` this replaced failed on a NaN,
          // and a comparison against it is false either way round.
          for (const value of lit) if (!(value <= 1) && clipped === null) clipped = { x, y, value };
          widest = Math.max(widest, Math.max(...lit) - Math.min(...lit));
        }
      }
      expect(clipped).toBeNull();
      return widest;
    };
    // Claimed at nothing: the three lattices sit on top of each other, so every pixel of the cell
    // carries the row's own ink and none of the other two — the near-monochrome end of the travel.
    expect(spreadAt(0)).toBeCloseTo(0, 12);
    // The picture at rest is what 0130 built, and one knob's travel reaches past it either way.
    const resting = spreadAt(DRIFT_REST.fringe);
    expect(resting).toBeGreaterThan(0.1);
    expect(spreadAt(DRIFT_FRINGE_REACH)).toBeGreaterThan(resting);
    // And dispersing them is a second thing to claim rather than a deeper first: it separates the
    // three even where they stand at no lag at all, because they are no longer one lattice.
    expect(spreadAt(0, DRIFT_DISPERSE_REACH)).toBeGreaterThan(0.1);
  });

  it("diverges the three lattices without a seam in the tile", () => {
    // The divergence is whole cycles and whole cells either way, and that is the constraint rather
    // than a choice: a tile that did not repeat would ride a hue seam down the picture once a
    // cycle, which is the one artefact these terms are here instead of.
    const pitch = gridPitchPx(2);
    const rowPitch = rowPitchPx(2);
    const width = beatPx(pitch);
    const height = tilePx(6 * beatPx(rowPitch), rowPitch);
    const lattices: number[] = [];
    for (const channel of [0, 1, 2]) {
      const keep = (x: number, y: number): number =>
        channelKeep(x, y, pitch, rowPitch, channel, DRIFT_FRINGE_REACH, DRIFT_DISPERSE_REACH);
      for (const [x = 0, y = 0] of [
        [0, 0],
        [3, 5],
        [width - 2, height - 7],
      ]) {
        expect(keep(x + width, y)).toBeCloseTo(keep(x, y), 10);
        expect(keep(x, y + height)).toBeCloseTo(keep(x, y), 10);
      }
      lattices.push(keep(3, 5));
    }
    // And they are three lattices rather than three copies of one, which is what dispersing means.
    expect(new Set(lattices).size).toBe(3);
  });
});
