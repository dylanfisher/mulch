/**
 * @role Tests the screen the picture is filmed off: that its two grids beat rather than crossing
 *   into a plain mesh, that it splits the caller's ink into three channels and names no colour of
 *   its own, that every motion in it belongs to a parameter, and that not one of them moves when
 *   the picture does not.
 */
// Every case here stands on the same two pitches and the same tile, so splitting the file would
// separate assertions about one screen. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
// One dependency over: the yard's own reading is what the painter now films a scene through, and
// every case here paints one — importing it through another module would be a second name for it
// (0007, principle 1).
// oxlint-disable import/max-dependencies
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DRIFT_DISPERSE_REACH,
  DRIFT_FRINGE_REACH,
  DRIFT_REST,
  type MoireRow,
  type ScreenInk,
} from "@/lib/moire";
import { fractalStopsRest } from "@/lib/moireFractal";
import { SCENE_NAMES, SCENE_RAMP_STOPS } from "@/lib/moireScene";
import { resetTuning, setTuning } from "@/lib/moireTuning";
import { type YardScene, YARD_SCENE_REST } from "@/lib/yardScene";
import { paintMoire } from "@/ui/moireCanvas";
import { arrivedInk, PRODUCT, resolvedInk } from "@/ui/moireCanvasPainted";
import { STAMP_PICTURE_DRAWS } from "@/ui/moireCanvasMarks";
import { bandTurns, termTurns, SCREEN_TERMS } from "@/ui/moireScreen";
import {
  beatPx,
  channelAt,
  blobKeep,
  channelFringe,
  channelKeep,
  columnKeep,
  gridPitchPx,
  rowKeep,
  rowPitchPx,
  tilePx,
} from "@/lib/moireScreenFilm";
import { sceneHue } from "@/lib/moireScreenCells";
import { screenInkRest, inkTravelInto, DRIFT_INK_SECS } from "@/ui/moireScreenInk";
import { leanCells, type MoireShape, shapeRest } from "@/ui/moireShape";
import { tintRest } from "@/ui/moireTint";

import { moireRow as row } from "@/lib/moireRow";

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

/** How far along the crawl's own axis one painting placed the screen. */
const crawledTo = (painting: { moves: Move[] }): number => painting.moves[0]?.e ?? 0;

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
        drawImage: () => {},
        getImageData(): { data: Uint8ClampedArray } {
          return { data: Uint8ClampedArray.from(resolvedInk(this.fillStyle)) };
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
 * `ink` is where the picture's ink stands, for the cases about the travel itself; every other case
 * paints through the ink these rows have already arrived at, which is the picture they claim. And
 * `wind` is how far the rack behind it has blown the field, in turns of one cell: nowhere for every
 * case but the wind's own, which is the picture a dry rack draws (0267). `color` is a token no other
 * painting asked for unless a case names one, which is how the wind's own case paints twice through
 * one tile.
 *
 * Two patterns come out of one context now — the picture's grating and this screen — so each gets
 * its own recorder rather than one shared: a test that could not tell them apart would read the
 * rows' aim as the screen's placement. The painter asks for the grating first, because a canvas
 * that cannot make one draws no picture and must lay no ink down at all.
 */
// The recorder and the painting it records are one function: every stub here writes into the tally
// the painting below reads back, and a helper holding half of them would hand a case a recorder
// with nothing recorded in it. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
function paintedOn(
  width: number,
  height: number,
  rows: readonly MoireRow[],
  ink?: ScreenInk,
  wind = 0,
  color = nextColor(),
  yard: Readonly<YardScene> = YARD_SCENE_REST,
  shape: Readonly<MoireShape> = shapeRest(),
) {
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
    drawImage: () => inks.push(PRODUCT),
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
  // Nothing scattering behind it: what a shatter does to the field is cut in `moireCanvas.test.ts`
  // and nothing here is about it (0269).
  paintMoire(
    canvas,
    rows,
    20,
    color,
    0,
    0,
    fractalStopsRest(),
    0,
    ink ?? arrivedInk(rows),
    { drift: wind, veer: 1 },
    [],
    shape,
    tintRest(),
    // Every case but the scene's own paints the meadow, which is seed heads since 0334: a ramp of
    // the leaf dark, the hot ink, its own tan, the lit leaf and a pale sky, warm for four stops of
    // the five (`YARD_SCENE_REST`, src/lib/yardScene.ts, 0329).
    yard,
    [],
    "marks",
    false,
  );
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
  resetTuning();
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

  it("lights three channels across a cell, each over the row's own ink", () => {
    // The fringe the reference is loudest about: the monitor's three channels pulled apart at
    // every edge. Each third of a cell carries its own channel and no other's, and every one of
    // them still carries the row's ink underneath — so what the painter names is three tokens and
    // the picture is still the caller's (0130).
    vi.stubGlobal("devicePixelRatio", 2);
    const pitch = gridPitchPx(2);
    // Under a claimed saturation, the split resting at nought since 0346 (`CHANNEL_MIX`).
    const { written } = paintedOn(200, 64, [row({ period: 3 })], {
      ...screenInkRest(),
      saturate: 1,
    });
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
    // The three sub-pixel motions rest at nought since 0346; what is read here is the mechanism.
    setTuning("screen.turn", 0.006);
    setTuning("screen.breath", 0.5);
    setTuning("screen.shear", 0.02);
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

  it("blows the whole screen one way along the crawl's own axis, and bakes nothing to do it", () => {
    // What the standing rack's tail buys: the crawl sweeps one cell and comes back, and this is the
    // same axis running one way (0267). A drift on any other cell of the matrix would be a second
    // motion, and one in the tile's key would be a picture-sized bake per frame (0129).
    vi.stubGlobal("devicePixelRatio", 2);
    const pitch = gridPitchPx(2);
    const rows = [claiming("crawl"), row({ period: 4, phase: 1, reference: true })];
    const colour = nextColor();
    const still = paintedOn(200, 64, rows, undefined, 0, colour);
    vi.stubGlobal("devicePixelRatio", 2);
    const blown = paintedOn(200, 64, rows, undefined, 0.25, colour);
    const held = still.moves[0];
    const moved = blown.moves[0];
    // By whole cells of the marks since 0346: as far as the wind says to within a cell, and never
    // a fraction of one.
    const swept = (moved?.e ?? 0) - (held?.e ?? 0);
    expect(Math.abs(swept - 0.25 * beatPx(pitch))).toBeLessThanOrEqual(pitch / 2);
    expect(swept % pitch).toBeCloseTo(0, 10);
    for (const cell of ["a", "b", "c", "d", "f"] as const)
      expect(moved?.[cell]).toBeCloseTo(held?.[cell] ?? 0, 10);
    // And the second painting wrote no tile at all: the first one's answered it, because the wind
    // is a term on the transform and touches nothing the tile is keyed by.
    expect(still.tile).toBeDefined();
    expect(blown.tile).toBeNull();
  });

  it("leans the crawl toward the louder of the output's two sides, and bakes nothing to do it", () => {
    // The eleventh step of the block: the output's two sides reach the picture, and the crawl is
    // the one travel the lattice makes across it — so the lattice is pulled toward the side the
    // sound is louder on, in whole cells of the marks and on no other cell of the matrix.
    vi.stubGlobal("devicePixelRatio", 2);
    const pitch = gridPitchPx(2);
    const rows = [claiming("crawl"), row({ period: 4, phase: 1, reference: true })];
    const colour = nextColor();
    const panned = (sides: number) => {
      vi.stubGlobal("devicePixelRatio", 2);
      return paintedOn(200, 64, rows, undefined, 0, colour, YARD_SCENE_REST, {
        ...shapeRest(),
        sidesCells: leanCells(sides, 0),
      });
    };
    const even = panned(0);
    const left = panned(1);
    const right = panned(-1);
    // Toward the louder side: the left pulls the lattice back along the axis and the right pushes
    // it on, by the same distance either way.
    expect(crawledTo(left)).toBeLessThan(crawledTo(even));
    expect(crawledTo(right)).toBeGreaterThan(crawledTo(even));
    expect(crawledTo(even) - crawledTo(left)).toBeCloseTo(crawledTo(right) - crawledTo(even), 10);
    // By whole cells of the marks, like every other motion of the lattice since 0346.
    expect((crawledTo(even) - crawledTo(left)) % pitch).toBeCloseTo(0, 10);
    // And by more than one of them: a lean of a single cell is inside the swing the crawl already
    // has and would not read as a side at all.
    expect(crawledTo(even) - crawledTo(left)).toBeGreaterThan(pitch);
    // The cells are whole where they are read and not where they are spent, so what the crawl is
    // handed is exactly what it leans by (`leanCells`, src/ui/moireShape.ts).
    expect(crawledTo(even) - crawledTo(left)).toBe(leanCells(1, 0) * pitch);
    // And on that one cell of the matrix and no other: a lean on any of the rest would be a second
    // motion rather than the crawl's own.
    for (const cell of ["a", "b", "c", "d", "f"] as const)
      expect(left.moves[0]?.[cell]).toBeCloseTo(even.moves[0]?.[cell] ?? 0, 10);
    // And no tile at all: the sides are a term on the transform and touch nothing the tile is keyed
    // by, so a mix panned all day bakes nothing (0129).
    expect(even.tile).not.toBeNull();
    expect(left.tile).toBeNull();
    expect(right.tile).toBeNull();
  });

  it("sweeps the lattice through square rather than around it", () => {
    // Where the effect actually is: the blobs only reach full size as the turn passes through
    // zero. A turn that never reached it would draw one fixed hatch and never a blob.
    vi.stubGlobal("devicePixelRatio", 2);
    setTuning("screen.turn", 0.006);
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
    // In one strip, so what is counted is the rows and not the strips of a gust.
    setTuning("wind.strips", 1);
    setTuning("screen.shear", 0.02);
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

  // P283: pop's saturation, the one thing about the picture's colour that no row claims.
  it("saturates the ink a standing look asks for, without moving what the cell averages to", () => {
    // The whole reading, over one tile: how much of each pixel stands on the channel its own third
    // of the cell lights, and how much ink the tile carries in total. A saturated picture says the
    // same colour more strongly — each third purer in its own channel — so the first moves and the
    // second does not.
    const measured = (saturate: number): { purity: number; total: number } => {
      vi.stubGlobal("devicePixelRatio", 2);
      const pitch = gridPitchPx(2);
      const { written } = paintedOn(200, 640, [row({ period: 3 })], {
        ...screenInkRest(),
        saturate,
      });
      const pixels = written?.data ?? new Uint8ClampedArray();
      const width = written?.width ?? 1;
      let purity = 0;
      let total = 0;
      for (let at = 0; at < pixels.length; at += 4) {
        const red = pixels[at] ?? 0;
        const green = pixels[at + 1] ?? 0;
        const blue = pixels[at + 2] ?? 0;
        const sum = red + green + blue;
        // How much of this pixel stands on the channel its own third of the cell lights. The share
        // and not the plain spread between the three: since 0332 the ink under the fringe is the
        // scene's ramp read per pixel rather than one colour, so a pixel already sitting on a
        // saturated stop has a wide spread the fringe did nothing to (`ramp`, src/lib/scene/).
        const own = [red, green, blue][channelAt((at / 4) % width, pitch)] ?? 0;
        purity += sum > 0 ? own / sum : 0;
        total += sum;
      }
      return { purity: purity / (pixels.length / 4), total };
    };
    const rest = measured(0);
    const lit = measured(1);
    const half = measured(0.5);
    expect(lit.purity).toBeGreaterThan(rest.purity);
    expect(half.purity).toBeGreaterThan(rest.purity);
    expect(half.purity).toBeLessThan(lit.purity);
    // And the cell still comes back very nearly to the ink that was sent, which is what a subpixel
    // is (0130): each third gains in its own channel exactly what it gives up in the other two, at
    // any saturation. Nearly, and not exactly, because a purer third is a brighter one and a pixel
    // is a byte — the few per cent lost at the top of the range is the clip, and it is the reason
    // the split is pushed to twice its resting depth rather than to the 0.45 it was first written
    // at.
    expect(lit.total / rest.total).toBeGreaterThan(0.95);
    expect(lit.total / rest.total).toBeLessThanOrEqual(1);
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

  it("reads the scene's own five stops per pixel, and slides the whole field with the travel", () => {
    // Read in the scene's own stops: the picture rests at one ink since 0346 (`GLYPH_FLAT`).
    setTuning("glyph.flat", 0);
    // The fourth crossing of the colour boundary (0141), read along the scene's own ramp (0301,
    // 0329) — and since 0332 read **per pixel**, so one tile holds both ends of that ramp at once
    // and the travel is an offset on where the ground already put each pixel.
    // Through an ink standing at `hue` and not through a claim of it: a claim is spent against the
    // age and the orbit (`agedHue`), and this case is about where on the ramp a hue is read.
    const meanOf = (hue: number, channel: number): number => {
      vi.stubGlobal("devicePixelRatio", 2);
      const { written } = paintedOn(200, 64, [row({ period: 3, hue })], {
        ...screenInkRest(),
        hue,
      });
      const pixels = written?.data ?? new Uint8ClampedArray();
      let total = 0;
      for (let at = channel; at < pixels.length; at += 4) total += pixels[at] ?? 0;
      return total / (pixels.length / 4);
    };
    // The travel slides the field along its ramp, low end to high: the meadow's is the dark of a
    // leaf, a hot shadow, its own tan, a straw and a pale sky, in that order (0334), so the one
    // channel the ramp climbs end to end is the blue the sky stop brings.
    expect(meanOf(1, 2)).toBeGreaterThan(meanOf(DRIFT_REST.hue, 2));
    expect(meanOf(DRIFT_REST.hue, 2)).toBeGreaterThan(meanOf(0, 2));
    expect(meanOf(0.75, 1)).toBeGreaterThan(meanOf(0.25, 1));
    // And it slides the field and never replaces it. A claim is worth one stop of five (`sceneHue`)
    // and this ramp is warm for four of them, so the picture is a warm mass at either end of the
    // travel — the red channel moves a fraction of what the blue does, which is what "the yard's
    // name is the colour and the claim is an offset on it" comes to when it is measured.
    const spread = (channel: number): number => Math.abs(meanOf(1, channel) - meanOf(0, channel));
    expect(spread(0), "the travel repaints the field rather than sliding it").toBeLessThan(
      spread(2) / 4,
    );
    expect(meanOf(0, 0), "the meadow is not warm at the foot of its ramp").toBeGreaterThan(150);
  });

  it("carries a claim by one stop of the ramp and no further", () => {
    // A field that is already two hues at full strength has one stop of travel to spend and not
    // four: the read was the picture's only colour when a scene was read once a tile, and it is an
    // offset on the ground now (0332). One stop is a quarter of a ramp of five.
    const stop = 1 / (SCENE_RAMP_STOPS - 1);
    expect(sceneHue(0.5, 1) - sceneHue(0.5, DRIFT_REST.hue)).toBeCloseTo(stop, 12);
    expect(sceneHue(0.5, DRIFT_REST.hue) - sceneHue(0.5, 0)).toBeCloseTo(stop, 12);
    // And where the ground put the pixel is where a picture nobody has claimed a colour for reads.
    expect(sceneHue(0.2, DRIFT_REST.hue)).toBe(0.2);
    // Off either end it holds rather than wrapping: a claim past the ramp is the ramp's last stop.
    expect(sceneHue(0.95, 1)).toBe(1);
    expect(sceneHue(0.05, 0)).toBe(0);
  });

  it("reads two places of one tile in two inks, and spends none of the alpha doing it", () => {
    // Read in the scene's own stops: the picture rests at one ink since 0346 (`GLYPH_FLAT`).
    setTuning("glyph.flat", 0);
    // The whole of 0332 in one case: a head is scarlet and the ground between two heads is green,
    // inside one tile, and the tile's alpha is the film's alone — so a bloom takes exactly as much
    // of the picture's ink as a meadow does, and `SCREEN_FLOOR` holds for every scene there is.
    vi.stubGlobal("devicePixelRatio", 2);
    const readings = SCENE_NAMES.map((scene) => {
      const { written } = paintedOn(200, 640, [row({ period: 3 })], undefined, 0, nextColor(), {
        ...YARD_SCENE_REST,
        scene,
      });
      const pixels = written?.data ?? new Uint8ClampedArray();
      const inks = new Set<string>();
      for (let at = 0; at < pixels.length; at += 4) {
        inks.add(`${pixels[at]},${pixels[at + 1]},${pixels[at + 2]}`);
      }
      let keep = 0;
      for (let at = 3; at < pixels.length; at += 4) keep = Math.max(keep, pixels[at] ?? 0);
      return { scene, inks: inks.size, keep };
    });
    const meadow = readings[0]?.keep ?? 0;
    for (const { scene, inks, keep } of readings) {
      // Two pixels of one tile in different places on the ground are read in different inks.
      expect(inks, `${scene} is one ink`).toBeGreaterThan(1);
      // And every scene stands its marks at the ink the meadow does: the ground reaches the alpha
      // only as which mark a cell gets (0345), so the top of every scene's alpha is the caller's.
      expect(keep, `${scene} takes a different share of the ink`).toBeCloseTo(meadow, 12);
    }
  });

  it("draws the water darker than the bloom, in its own black and not in the film's alpha", () => {
    // Read in the scene's own stops: the picture rests at one ink since 0346 (`GLYPH_FLAT`).
    setTuning("glyph.flat", 0);
    // A darker water is one token (0333): the deepest stop this instrument held was
    // `--scene-water-deep` at a lightness of 0.42 and the water the glints stand in is near black,
    // so the ramp got a floor under its old one. Read as the median pixel of a whole tile, because
    // a mean is carried by the glints and the blades and what is being said here is what the water
    // between them is. The RGB is the ramp's alone — the alpha is the film's (0332).
    const medianOf = (scene: YardScene["scene"]): number => {
      vi.stubGlobal("devicePixelRatio", 2);
      const { written } = paintedOn(200, 640, [row({ period: 3 })], undefined, 0, nextColor(), {
        ...YARD_SCENE_REST,
        scene,
      });
      const pixels = written?.data ?? new Uint8ClampedArray();
      const lit: number[] = [];
      for (let at = 0; at < pixels.length; at += 4) {
        lit.push((pixels[at] ?? 0) + (pixels[at + 1] ?? 0) + (pixels[at + 2] ?? 0));
      }
      lit.sort((one, two) => one - two);
      return lit[Math.floor(lit.length / 2)] ?? 0;
    };
    expect(medianOf("water"), "the water is not darker than the bloom").toBeLessThan(
      medianOf("bloom"),
    );
  });

  it("films the picture through the ink the travel has reached and not the one the rows claim", () => {
    // Read in the scene's own stops: the picture rests at one ink since 0346 (`GLYPH_FLAT`).
    setTuning("glyph.flat", 0);
    const meanOf = (ink: Readonly<ScreenInk> | undefined, channel: number): number => {
      vi.stubGlobal("devicePixelRatio", 2);
      const { written } = paintedOn(200, 64, [row({ period: 3, hue: 1 })], ink);
      const pixels = written?.data ?? new Uint8ClampedArray();
      let total = 0;
      for (let at = channel; at < pixels.length; at += 4) total += pixels[at] ?? 0;
      return total / (pixels.length / 4);
    };
    // The hot ink is the redder of the two, so how far the picture has travelled toward it is how
    // much red the tile carries. Held at rest, a row claiming it draws the picture it drew before
    // it claimed anything — the claim is where the travel is *going*, and the tile is keyed by
    // where it has got to.
    const partway = screenInkRest();
    inkTravelInto(
      partway,
      [row({ period: 3, hue: 1 })],
      0,
      0,
      0,
      0,
      DRIFT_INK_SECS.value / 8,
      DRIFT_INK_SECS.value,
    );
    const held = meanOf(screenInkRest(), 0);
    const onTheWay = meanOf(partway, 0);
    const arrived = meanOf(undefined, 0);
    expect(onTheWay).toBeGreaterThan(held);
    expect(arrived).toBeGreaterThan(onTheWay);
  });
});
