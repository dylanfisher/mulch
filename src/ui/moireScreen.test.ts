/**
 * @role Tests the screen the picture is filmed off: that its two grids beat rather than crossing
 *   into a plain mesh, that it splits the caller's ink into three channels and names no colour of
 *   its own, that every motion in it belongs to a parameter, and that not one of them moves when
 *   the picture does not.
 */
// Every case here stands on the same two pitches and the same tile, so splitting the file would
// separate assertions about one screen. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { afterEach, describe, expect, it, vi } from "vitest";
import { foldNothing } from "@/lib/moireFractal";

import { DRIFT_DISPERSE_REACH, DRIFT_FRINGE_REACH, DRIFT_REST, type MoireRow } from "@/lib/moire";
import { paintMoire } from "@/ui/moireCanvas";
import {
  bandKeep,
  bandTurns,
  beatPx,
  channelAt,
  blobKeep,
  channelFringe,
  channelKeep,
  screenDisperse,
  screenFringe,
  screenHue,
  columnKeep,
  gridPitchPx,
  rowKeep,
  rowPitchPx,
  scanKeep,
  termTurns,
  tilePx,
  SCREEN_FLOOR,
  SCREEN_TERMS,
} from "@/ui/moireScreen";

import { moireRow as row } from "@/lib/moireRow";

/** How much of the picture's ink a tile leaves standing, averaged over its pixels. */
const tileKeep = (pixels: Uint8ClampedArray): number => {
  let total = 0;
  for (let at = 3; at < pixels.length; at += 4) total += (pixels[at] ?? 0) / 255;
  return total / (pixels.length / 4);
};

/** The loop's own row at a phase: the reference every band in this file is rolled against. */
const reference = (phase: number): MoireRow => row({ period: 4, phase, reference: true });

/** A shape landing in the middle of `term`'s slice of the fold, so that term and no other. */
const claiming = (term: (typeof SCREEN_TERMS)[number], over: Partial<MoireRow> = {}): MoireRow =>
  row({
    period: 4,
    phase: 1,
    shape: ((SCREEN_TERMS.indexOf(term) + 0.5) / SCREEN_TERMS.length) * 2 ** 32,
    ...over,
  });

/** Where the painter put the screen for one fill: the whole matrix, not just how far it rolled. */
type Move = { a: number; b: number; c: number; d: number; e: number; f: number };

/**
 * What the theme resolved a colour the painter asked for to. The three channels are distinct and
 * primary on purpose: a test that gave them one colour could not tell a fringe from a tint.
 */
function resolved(css: string): [number, number, number, number] {
  if (css.includes("--screen-red")) return [255, 0, 0, 255];
  if (css.includes("--screen-green")) return [0, 255, 0, 255];
  if (css.includes("--screen-blue")) return [0, 0, 255, 255];
  // The two inks the picture travels between: distinct from each other and from the resting ink
  // below, or a test could not tell a picture that travelled from one that did not (0141).
  if (css.includes("--drift-hot")) return [240, 40, 40, 255];
  if (css.includes("--drift-cool")) return [40, 80, 240, 255];
  return [200, 120, 40, 255];
}

/**
 * A colour no other painting in this file asked for. The painter holds its tiles by what they are
 * of rather than by who asked, which is the point of that cache and would otherwise leave one test
 * reading the tile another one built.
 */
let asked = 0;
const nextColor = (): string => `the token the theme resolved ${(asked += 1)}`;

/**
 * The tile the painter builds its screen in: a stand-in whose context is real enough for `inkOf` to
 * read a colour back out of it, which is how the painter learns what a token resolved to without
 * parsing one, and which keeps the pixels it was handed so a test can read the screen itself.
 */
function tileStub() {
  let written: ImageData | null = null;
  let drawn: { width: number; height: number } | null = null;
  // One per `createElement`, because the painter asks for two: the tile, and the single pixel it
  // reads a colour back through. A stub shared between them would let one resize the other.
  const create = () => {
    const canvas = {
      width: 0,
      height: 0,
      // Enough of a context to be any of the three surfaces the painter now asks `createElement`
      // for: the screen's tile, the one pixel a colour is read back through, and the surface the
      // rows' product is built on — which is the one that needs a pattern and a composite mode.
      getContext: () => ({
        fillStyle: "",
        globalAlpha: 1,
        globalCompositeOperation: "source-over",
        clearRect: () => {},
        fillRect: () => {},
        setTransform: () => {},
        createPattern: () => ({ setTransform: () => {} }),
        getImageData(): { data: Uint8ClampedArray } {
          return { data: Uint8ClampedArray.from(resolved(this.fillStyle)) };
        },
        createImageData: (w: number, h: number) => ({
          width: w,
          height: h,
          data: new Uint8ClampedArray(w * h * 4),
        }),
        putImageData: (field: ImageData) => {
          written = field;
          drawn = canvas;
        },
      }),
    };
    return canvas;
  };
  return { create, taken: () => written, tile: () => drawn };
}

/**
 * The painter run against a canvas of `width` × `height` device pixels, recording the tile it
 * built, the pixels it wrote into it, where it put the screen, and what every fill was made with.
 *
 * Two patterns come out of one context now — the picture's grating and this screen — so each gets
 * its own recorder rather than one shared: a test that could not tell them apart would read the
 * rows' aim as the screen's placement. The painter asks for the grating first, because a canvas
 * that cannot make one draws no picture and must lay no ink down at all.
 */
function paintedOn(width: number, height: number, rows: readonly MoireRow[]) {
  const { create, taken, tile } = tileStub();
  const made: { moves: Move[]; pattern: unknown }[] = [];
  const recorder = () => {
    const moves: Move[] = [];
    const pattern = { setTransform: (matrix: Move) => moves.push({ ...matrix }) };
    made.push({ moves, pattern });
    return pattern;
  };
  const inks: unknown[] = [];
  const context = {
    fillStyle: "" as unknown,
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    clearRect: () => {},
    setTransform: () => {},
    createPattern: recorder,
    // The product, cut out of the screen in one go: what it holds is the picture and is asserted
    // in `moireCanvas.test.ts`; here it only has to happen.
    drawImage: () => {
      inks.push("the rows' own product");
    },
    fillRect(): void {
      inks.push(this.fillStyle);
    },
  };
  // The painter reaches for a size and a 2d context and nothing else, the way
  // src/ui/DebugConsole.test.tsx stands in for a collection its own caller only iterates.
  // oxlint-disable-next-line no-unsafe-type-assertion
  const canvas = { width, height, getContext: () => context } as unknown as HTMLCanvasElement;
  vi.stubGlobal("document", { createElement: create });
  // The channels arrive the way the browser hands them over — resolved, one per token — so the
  // painter is tested naming tokens and never colours (0130).
  vi.stubGlobal("getComputedStyle", () => ({
    getPropertyValue: (token: string) => `the ${token} the theme resolved`,
  }));
  paintMoire(canvas, rows, 20, nextColor(), 0, foldNothing(), 0);
  // Only one pattern is made on *this* context now: the screen. The picture's grating belongs to
  // the surface the rows' product is built on, which is a canvas of its own (P93).
  const [screen] = made;
  return {
    tile: tile(),
    written: taken(),
    // The screen's own placement, which is what every test here is about. The grating's aims
    // belong to the picture and are asserted in `moireCanvas.test.ts`.
    moves: screen?.moves ?? [],
    screen: screen?.pattern,
    inks,
  };
}

// The stand-in document and display live for exactly the one test that asks for them.
afterEach(() => {
  vi.unstubAllGlobals();
});

// One flat list of the screen's cases (0007).
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

  // P99: the picture went one colour. The subpixel split is a fringe a third of a cell wide, so
  // the eye integrates the three channels back into the row's ink and a yard drawn in one token
  // reads as that token everywhere. Standing each channel's lattice back by its own share of a
  // beat cell separates them at the blob's scale instead, which is the scale nothing averages away.
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

  it("keeps more of the ink than the screen takes, at every density", () => {
    // A texture over the picture and not a mask cut out of it: four gratings and a band multiply
    // into every pixel, so the floor is on the whole tile and not on any one of them.
    for (const dpr of [1, 2, 3]) {
      const pitch = gridPitchPx(dpr);
      const rowPitch = rowPitchPx(dpr);
      const width = beatPx(pitch);
      const height = tilePx(6 * beatPx(rowPitch), rowPitch);
      let kept = 0;
      for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++)
          kept +=
            columnKeep(x, pitch) * scanKeep(y, rowPitch, height) * blobKeep(x, y, pitch, rowPitch);
      expect(kept / (width * height)).toBeGreaterThan(SCREEN_FLOOR);
    }
  });

  it("rolls the band on the picture's own motion and holds where that stops", () => {
    // No clock of its own: the reference row is the deck's read position, so a halted yard — the
    // one that is painted and not animated (0040) — draws the band where it stopped.
    const other = row({ period: 2, phase: 0.7 });
    expect(bandTurns([other, reference(0)])).toBe(0);
    expect(bandTurns([other, reference(1)])).toBeCloseTo(0.25, 10);
    expect(bandTurns([other, reference(3)])).toBeCloseTo(0.75, 10);
    // Twice, with nothing moved between: the same picture, and not a frame further on.
    expect(bandTurns([other, reference(1)])).toBe(bandTurns([other, reference(1)]));
    // A picture with no loop under it has no band to roll and no second clock to roll it.
    expect(bandTurns([other])).toBe(0);
  });

  it("brings the lattice round rather than running a seam down the picture", () => {
    // The tile is shifted, not rebuilt, so its two ends are the same place: a discontinuity here
    // is an edge travelling down the picture once a cycle. Read at the heights a canvas actually
    // takes and not at the divisible ones — the strip is 32 CSS pixels and the overlay is whatever
    // the shell leaves.
    const rowPitch = rowPitchPx(2);
    const cell = beatPx(rowPitch);
    for (const canvasPx of [1, 17, 64, 599, 1200]) {
      const height = tilePx(canvasPx, rowPitch);
      expect(height % cell).toBe(0);
      expect(height).toBeGreaterThanOrEqual(canvasPx);
      for (const y of [0, 1, cell - 1, cell, height - 1])
        expect(scanKeep(y + height, rowPitch, height)).toBeCloseTo(
          scanKeep(y, rowPitch, height),
          10,
        );
    }
    // And it is a band and not a flat tint: darkest at the tile's own zero, gone at its middle.
    const tall = tilePx(599, rowPitch);
    expect(bandKeep(0, tall)).toBeLessThan(bandKeep(tall / 2, tall));
    expect(bandKeep(tall / 2, tall)).toBe(1);
  });

  it("writes the tile once, a cell wide, and is the ink the whole picture is cut out of", () => {
    // The picture the painter actually puts down: one tile as wide as a beat cell and as tall as
    // `tilePx` says, written in a single pass over its pixels. One pass, because the loop over the
    // pixels is the rebuild's and never a frame's (0129).
    vi.stubGlobal("devicePixelRatio", 2);
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
    expect(inks).toEqual([screen, "the rows' own product"]);
    expect(moves[0]?.f).toBeCloseTo(bandTurns(rows) * (tile?.height ?? 0), 10);
  });

  it("lights three channels across a cell, each over the row's own ink", () => {
    // The fringe the reference is loudest about: the monitor's three channels pulled apart at
    // every edge. Each third of a cell carries its own channel and no other's, and every one of
    // them still carries the row's ink underneath — so what the painter names is three tokens and
    // the picture is still the caller's (0130).
    vi.stubGlobal("devicePixelRatio", 2);
    const pitch = gridPitchPx(2);
    const { written } = paintedOn(200, 64, [row({ period: 3 })]);
    expect(written).not.toBeNull();
    const at = (x: number): number[] => {
      const from = x * 4;
      return [0, 1, 2].map((channel) => written?.data[from + channel] ?? 0);
    };
    // Every third of the cell reads as a different colour: one hue shift applied evenly would
    // leave these three the same, which is the picture a screen with no colour in it draws.
    const thirds = [0, 1, 2].map((third) => at(Math.floor(((third + 0.5) / 3) * pitch)));
    expect(new Set(thirds.map((ink) => ink.join(","))).size).toBe(3);
    // Each leans toward its own channel and away from the other two.
    expect(thirds[0]?.[0]).toBeGreaterThan(thirds[1]?.[0] ?? 0);
    expect(thirds[1]?.[1]).toBeGreaterThan(thirds[2]?.[1] ?? 0);
    expect(thirds[2]?.[2]).toBeGreaterThan(thirds[0]?.[2] ?? 0);
    // And none of them is its channel outright: the row's ink is under all three.
    expect(thirds[0]?.[1]).toBeGreaterThan(0);
    expect(thirds[1]?.[0]).toBeGreaterThan(0);
    // The channels sit where `channelAt` puts them, and it covers the cell without a gap.
    expect(Array.from({ length: pitch }, (_, x) => channelAt(x, pitch))).toEqual(
      Array.from({ length: pitch }, (_, x) => channelAt(x + pitch, pitch)),
    );
    expect(new Set(Array.from({ length: pitch }, (_, x) => channelAt(x, pitch))).size).toBe(3);
  });

  it("gives each of the screen's motions a parameter of its own, and none to no one", () => {
    // The system the motions hang off: a parameter owns exactly one of them, picked by the same
    // fold that already picks its waveform, so a rack of them drives all four against each other
    // (0128). Every term is reachable — a term no fold can claim is a motion that never happens.
    for (const term of SCREEN_TERMS) {
      expect(termTurns([claiming(term)], term)).toBeCloseTo(0.25, 10);
      // And nobody else's: a row in one term's slice moves that term and no other.
      for (const other of SCREEN_TERMS)
        if (other !== term) expect(termTurns([claiming(term)], other)).toBe(0);
    }
    // No row in a term's slice leaves it still — the honest answer, not a fall back to some other
    // row's phase, because nothing is automating it (principle 5).
    for (const term of SCREEN_TERMS) expect(termTurns([], term)).toBe(0);
    // The reference row is skipped whatever it folds to: it already owns the band's roll (0126).
    expect(termTurns([row({ period: 4, phase: 1, reference: true })], SCREEN_TERMS[0])).toBe(0);
    // P146: and so is a row with no depth of its own, whatever slot it folds into. The field's own
    // row is a reading spread over the picture and belongs to no parameter, so it may not turn one
    // of the four motions a parameter owns — a yard nobody is automating would otherwise breathe
    // because it is playing (0128, 0213).
    for (const term of SCREEN_TERMS) {
      expect(termTurns([claiming(term, { depth: 0 })], term)).toBe(0);
      // And it does not stand in front of a row that does own the term, either.
      expect(termTurns([claiming(term, { depth: 0 }), claiming(term)], term)).toBeCloseTo(0.25, 10);
    }
  });

  it("moves the screen on the picture's own phases and holds every one of them where it stops", () => {
    // The whole of 0040 for the whole of the screen, and the failure this step most invites: four
    // more motions is four more chances to reach for a wall clock. Paint twice with nothing moved
    // and the matrix has to be the same matrix, cell for cell.
    vi.stubGlobal("devicePixelRatio", 2);
    const rows = [
      ...SCREEN_TERMS.map((term) => claiming(term)),
      row({ period: 3, phase: 2, reference: true }),
    ];
    const first = paintedOn(200, 64, rows).moves;
    vi.stubGlobal("devicePixelRatio", 2);
    expect(paintedOn(200, 64, rows).moves).toEqual(first);
    // And it is moving: with every term claimed, no cell is left at rest.
    const [placed] = first;
    expect(placed?.e).not.toBe(0);
    expect(placed?.f).not.toBe(0);
    expect(placed?.b).not.toBe(0);
    expect(placed?.a).not.toBe(1);
  });

  it("sweeps the lattice through square rather than around it", () => {
    // Where the effect actually is: the blobs only reach full size as the turn passes through
    // zero. A turn that never reached it would draw one fixed hatch and never a blob.
    vi.stubGlobal("devicePixelRatio", 2);
    const leans = [0, 0.25, 0.5, 0.75].map(
      (turns) =>
        paintedOn(200, 64, [claiming("turn", { period: 1, phase: turns })]).moves[0]?.b ?? 0,
    );
    expect(Math.min(...leans)).toBeLessThan(0);
    expect(Math.max(...leans)).toBeGreaterThan(0);
    expect(leans.some((lean) => lean === 0)).toBe(true);
  });

  it("leans the whole lattice once, and places the screen once however many rows there are", () => {
    // The lean is now a skew on the tile rather than a tilt under each row: no row is drawn on its
    // own any more, so there is nothing for a per-row lean to be under (0128 amended). What that
    // buys is the cost 0128 called its one exception — a `setTransform` and a `fillStyle` per row
    // drawn — so the screen is placed exactly once whatever a yard holds.
    vi.stubGlobal("devicePixelRatio", 2);
    const others = [row({ period: 3, phase: 1 }), row({ period: 5, phase: 4 })];
    const leaned = paintedOn(200, 64, [claiming("shear"), ...others]).moves;
    expect(leaned).toHaveLength(1);
    vi.stubGlobal("devicePixelRatio", 2);
    const flat = paintedOn(200, 64, others).moves;
    expect(flat).toHaveLength(1);
    // Owned, the lattice leans; owned by nobody it is square, which is the honest answer and not a
    // fall back to some other row's phase (principle 5).
    expect(leaned[0]?.c).not.toBeCloseTo(flat[0]?.c ?? 0, 10);
    expect(flat[0]?.c).toBeCloseTo(-(flat[0]?.b ?? 0), 10);
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

  it("keeps SCREEN_FLOOR across the widest fringe and the whole of disperse", () => {
    // What stops a screen becoming a grille is the floor, and neither dimension that is colour may
    // spend it: they divide the ink the row was already drawn in among the three channels it is
    // made of and never reach the alpha. Read off the tile the painter actually wrote.
    const chromatic = [
      row({ period: 3, fringe: DRIFT_FRINGE_REACH, disperse: DRIFT_DISPERSE_REACH }),
      row({ period: 4, phase: 1, reference: true }),
    ];
    const plain = [row({ period: 3 }), row({ period: 4, phase: 1, reference: true })];
    const tileOf = (rows: readonly MoireRow[]): Uint8ClampedArray => {
      vi.stubGlobal("devicePixelRatio", 2);
      const { written } = paintedOn(200, 640, rows);
      expect(written).not.toBeNull();
      return written?.data ?? new Uint8ClampedArray();
    };
    const chromaticPixels = tileOf(chromatic);
    const plainPixels = tileOf(plain);
    expect(tileKeep(chromaticPixels)).toBeGreaterThan(SCREEN_FLOOR);
    expect(tileKeep(chromaticPixels)).toBeCloseTo(tileKeep(plainPixels), 12);
    // And the two are still different screens, or the floor above would be holding across a
    // dimension that reached nothing: what the widest fringe spends is the ink, never the alpha.
    expect(chromaticPixels).not.toEqual(plainPixels);
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

  it("carries the picture's ink toward a second one, and neither of them at rest", () => {
    // The fourth crossing of the colour boundary (0141): a claiming value blends the ink its
    // caller resolved between the two the theme holds, so a yard can be cool where another is hot.
    const meanOf = (hue: number, channel: number): number => {
      vi.stubGlobal("devicePixelRatio", 2);
      const { written } = paintedOn(200, 64, [row({ period: 3, hue })]);
      const pixels = written?.data ?? new Uint8ClampedArray();
      let total = 0;
      for (let at = channel; at < pixels.length; at += 4) total += pixels[at] ?? 0;
      return total / (pixels.length / 4);
    };
    // The theme's cool ink is blue where the resting one is amber, and its hot one is redder.
    expect(meanOf(0, 2)).toBeGreaterThan(meanOf(DRIFT_REST.hue, 2));
    expect(meanOf(1, 0)).toBeGreaterThan(meanOf(DRIFT_REST.hue, 0));
    // At rest neither token is reached at all: the picture is the ink its caller resolved (0130).
    expect(meanOf(DRIFT_REST.hue, 0)).toBeGreaterThan(meanOf(0, 0));
  });

  it("reads each thing a row says about colour off the row that says it loudest", () => {
    // One tile is one screen, so unlike a pitch or a depth these cannot be per row. The boldest
    // claim wins rather than the mean: an effect that says nothing about colour leaves the picture
    // where it rests, and a mean would let it dilute the knob whose travel this is.
    const quiet = row({ period: 3 });
    const loud = row({
      period: 5,
      fringe: DRIFT_FRINGE_REACH,
      disperse: DRIFT_DISPERSE_REACH,
      hue: 1,
    });
    expect(screenFringe([quiet])).toBe(DRIFT_REST.fringe);
    expect(screenFringe([quiet, loud])).toBe(DRIFT_FRINGE_REACH);
    expect(screenDisperse([quiet, loud], 0)).toBe(DRIFT_DISPERSE_REACH);
    expect(screenHue([quiet, loud])).toBe(1);
    // Loud is either way round rest: a knob at nothing takes the picture monochrome as surely as
    // one at the top takes it chromatic.
    expect(screenFringe([quiet, row({ period: 5, fringe: 0 })])).toBe(0);
    // A row with no period of its own is not drawn, so it does not vote — and a picture with no
    // rows in it at all is the one every yard drew before an effect could turn any of this.
    expect(screenHue([quiet, row({ period: 0, hue: 1 })])).toBe(DRIFT_REST.hue);
    expect(screenFringe([])).toBe(DRIFT_REST.fringe);
  });
});
