/**
 * @role Tests that a row is a continuous wave rather than a run of ticks, and that a row's
 *   identity — its parameter's waveform and its lane's own bend — and not only its period is what
 *   decides the ink it lays down.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { EFFECTS } from "@/audio/effects/registry";
import { DECK_AUTOMATION_PARAM_IDS, effectAutomationParamIds } from "@/audio/params";
import { fold } from "@/lib/copy";
import { FLAT_BEND } from "@/lib/moire";
import {
  affordableDensity,
  bandTurns,
  bendAt,
  columnKeep,
  gridPitchPx,
  paintMoire,
  scanKeep,
  tilePx,
  rowAlpha,
  rowDensity,
  rowInk,
  rowSamples,
  rowSpread,
  ROW_SHAPES,
  type MoireRow,
} from "@/ui/moireCanvas";

const row = (over: Partial<MoireRow> = {}): MoireRow => ({
  period: 1,
  phase: 0,
  reference: false,
  shape: 0,
  bend: FLAT_BEND,
  ...over,
});

/** Two rows a hair apart, so their fringes are far slower than the crests that make them. */
const BEATING = [row({ period: 1 }), row({ period: 1.1 })] as const;
/** Four fringes' worth of window at the density the proportions were chosen at. */
const BEATING_WINDOW = 44;
/** Enough columns that every crest above is a whole number of them at every density asked for. */
const COLUMNS = 8800;

/** Which column an index off either end of the window is: the picture is read round, not off it. */
const wrapped = (column: number): number => ((column % COLUMNS) + COLUMNS) % COLUMNS;

/**
 * A mean taken over exactly one crest of one row, read round the window. A whole cycle of a wave
 * averages to nothing, so passing the field through one of these per row leaves neither row's own
 * crests in it — what survives both is the beat between them, which is the fringe.
 */
function smoothed(field: readonly number[], span: number): number[] {
  return field.map((_, column) => {
    let sum = 0;
    for (let step = 0; step < span; step++) sum += field[wrapped(column + step - (span >> 1))] ?? 0;
    return sum / span;
  });
}

/**
 * How many fringes the picture holds across its whole window: the rows' ink multiplied — a fringe
 * is where two translucent crests land on the same column — with each row's own crests averaged
 * out of it, counted as the maxima that are left. Read round the window, because a fringe landing
 * on the edge belongs to one side of it and not to both.
 */
function fringes(rows: readonly MoireRow[], density: number): number {
  let field: number[] = Array.from({ length: COLUMNS }, (_, column) =>
    rows.reduce(
      (product, each) => product * rowInk(each, (column / COLUMNS) * BEATING_WINDOW, density),
      1,
    ),
  );
  for (const each of rows) {
    field = smoothed(field, Math.round((COLUMNS * each.period) / (BEATING_WINDOW * density)));
  }
  return field.filter(
    (value, column) =>
      value > (field[wrapped(column - 1)] ?? 0) && value >= (field[wrapped(column + 1)] ?? 0),
  ).length;
}

/** One fill the painter asked a context for, with the ink it was carrying when it asked. */
type Fill = { x: number; y: number; w: number; h: number; alpha: number };

/**
 * The painter run against a canvas of `width` × `height` device pixels, recording the tile it built
 * and what every row was filled with — the shape src/ui/peakCanvas.test.ts uses for the same
 * reason: an element is, to a painter, one measurement and one 2d context.
 */
function paintedOn(width: number, height: number, rows: readonly MoireRow[]) {
  const tileFills: Fill[] = [];
  const tile = {
    width: 0,
    height: 0,
    getContext: () => ({
      fillStyle: "",
      globalAlpha: 1,
      globalCompositeOperation: "",
      fillRect(x: number, y: number, w: number, h: number) {
        tileFills.push({ x, y, w, h, alpha: this.globalAlpha });
      },
    }),
  };
  const rolls: number[] = [];
  const pattern = {
    setTransform: (matrix: { f: number }) => rolls.push(matrix.f),
  };
  const inks: unknown[] = [];
  const context = {
    fillStyle: "" as unknown,
    globalAlpha: 1,
    clearRect: () => {},
    createPattern: () => pattern,
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    fill(): void {
      inks.push(this.fillStyle);
    },
  };
  // The painter reaches for a size and a 2d context and nothing else, the way
  // src/ui/DebugConsole.test.tsx stands in for a collection its own caller only iterates.
  // oxlint-disable-next-line no-unsafe-type-assertion
  const canvas = { width, height, getContext: () => context } as unknown as HTMLCanvasElement;
  vi.stubGlobal("document", { createElement: () => tile });
  paintMoire(canvas, rows, 20, "the token the theme resolved");
  return { tile, tileFills, rolls, inks, pattern };
}

// The stand-in document and display live for exactly the one test that asks for them.
afterEach(() => {
  vi.unstubAllGlobals();
});

// One flat list of the painter's cases (0007).
// oxlint-disable-next-line max-lines-per-function
describe("moireCanvas", () => {
  it("samples the canvas at least twice, and never more than it has pixels", () => {
    for (const width of [1, 3, 640, 3000]) {
      expect(rowSamples(width)).toBeGreaterThanOrEqual(2);
      expect(rowSamples(width)).toBeLessThanOrEqual(Math.max(2, width));
    }
  });

  it("draws a continuous field rather than ticks laid down one at a time", () => {
    // A tick pattern is ink or no ink. A wave is a field: neighbouring samples move by a little,
    // every value between the trough and the crest is reached, and it stays inside its bounds.
    const wave = row({ period: 4 });
    const window = 4;
    const samples = Array.from({ length: 200 }, (_, index) => rowInk(wave, (index / 200) * window));
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...samples)).toBeLessThanOrEqual(1);
    const steps = samples.map((ink, index) => Math.abs(ink - (samples[index - 1] ?? ink)));
    expect(Math.max(...steps)).toBeLessThan(0.1);
    // Neither flat nor two-valued: the middle of the range is where a fringe is made.
    expect(samples.filter((ink) => ink > 0.4 && ink < 0.6).length).toBeGreaterThan(10);
  });

  it("slides the whole field as the phase moves, without changing its pitch", () => {
    const still = row({ period: 4 });
    const moved = row({ period: 4, phase: 1 });
    expect(rowInk(moved, 0)).toBeCloseTo(rowInk(still, 1), 9);
    // A whole cycle on is the same picture again: the phase slides the field and nothing else.
    expect(rowInk(row({ period: 4, phase: 4 }), 0.7)).toBeCloseTo(rowInk(still, 0.7), 9);
  });

  it("draws two lanes of the same period on different parameters as different rows", () => {
    // The period sets the fringe pitch; the parameter picks the shape. Same pitch, different row.
    const first = row({ period: 3, shape: 0 });
    const second = row({ period: 3, shape: 1 });
    const at = Array.from({ length: 40 }, (_, index) => index / 10);
    expect(at.some((t) => Math.abs(rowInk(first, t) - rowInk(second, t)) > 0.05)).toBe(true);
    // Every waveform on the list is reachable, and no two of them draw the same row.
    expect(ROW_SHAPES.length).toBeGreaterThan(1);
    const inks = Array.from({ length: ROW_SHAPES.length }, (_, shape) =>
      at.map((t) => rowInk(row({ period: 3, shape }), t)),
    );
    for (let left = 0; left < inks.length; left++) {
      for (let right = left + 1; right < inks.length; right++) {
        const one = inks[left] ?? [];
        const other = inks[right] ?? [];
        expect(one.some((ink, index) => Math.abs(ink - (other[index] ?? ink)) > 0.05)).toBe(true);
      }
    }
    // And there are more parameters than waveforms, so the fold turns the row as well as picking
    // one: the whole of it is spread across a cycle, and half of it is half a cycle round.
    const half = row({ period: 3, shape: 2 ** 31 });
    expect(rowInk(half, 0)).toBeCloseTo(rowInk(row({ period: 3 }), 1.5), 9);
    expect(at.some((t) => Math.abs(rowInk(row({ period: 3 }), t) - rowInk(half, t)) > 0.05)).toBe(
      true,
    );
  });

  it("bends the wave by the lane's own values, and leaves a flat lane straight", () => {
    // The same period and the same shape, bent by a gesture that rises across its cycle.
    const straight = row({ period: 3 });
    const bent = row({ period: 3, bend: [0, 0.25, 0.75, 1] });
    const at = Array.from({ length: 40 }, (_, index) => index / 10);
    expect(at.some((t) => Math.abs(rowInk(straight, t) - rowInk(bent, t)) > 0.05)).toBe(true);
    // A lane holding one value bends nothing, wherever in its cycle it is read.
    expect(bendAt(FLAT_BEND, 0)).toBe(0.5);
    expect(bendAt(FLAT_BEND, 0.7)).toBe(0.5);
    // And the bend itself is continuous and wraps: a table is read round, not off its end.
    expect(bendAt([0, 1], 0)).toBe(0);
    expect(bendAt([0, 1], 0.25)).toBeCloseTo(0.5, 9);
    expect(bendAt([0, 1], 0.75)).toBeCloseTo(0.5, 9);
    expect(bendAt([0, 1], 1.25)).toBeCloseTo(bendAt([0, 1], 0.25), 9);
  });

  it("holds the same number of fringes per band at every height, not the same spacing", () => {
    // Every proportion is read against the band a row gets, so a band a quarter of the reference's
    // is drawn four times as dense: the same interference tightened, rather than the same pitch
    // folded down until the crests are wider than the band and the row reads as a run of blobs.
    expect(rowDensity(48)).toBe(1);
    expect(rowDensity(12)).toBe(4);
    // Four beats of two rows a tenth apart across the window, which is what the pair actually is:
    // the count is of fringes and not of the crests inside them.
    const tall = fringes(BEATING, rowDensity(48));
    expect(tall).toBe(4);
    // A quarter of the height, four times the fringes: what two heights hold in common is how many
    // fringes a band buys, and what differs is how far apart they land. A fixed pitch is the other
    // way round — the same spacing at both heights, and at the short one no fringe at all.
    expect(fringes(BEATING, rowDensity(12))).toBe(tall * 4);
    // Bounded either side: a taller canvas is a bigger picture of the same thing rather than a
    // slower one, and no band is ever drawn finer than the field is sampled.
    expect(rowDensity(480)).toBe(1);
    expect(rowDensity(1)).toBe(rowDensity(0));
  });

  it("lets the pixels decline a tightening they cannot carry", () => {
    // The density a short band asks for is not always one the field can be sampled at: a fast row
    // in a wide window is already near its own sampling, and drawing it denser is aliasing rather
    // than interference. The fastest row decides for the whole picture, because one density is
    // what keeps the ratios between rows — and the bound never asks for less than their own pitch.
    const fast = [row({ period: 0.4 }), row({ period: 2 })];
    expect(affordableDensity(fast, 8, 720)).toBeGreaterThan(1);
    expect(affordableDensity(fast, 200, 720)).toBe(1);
    // A wider canvas carries more of it, and a picture with no row in it constrains nothing.
    expect(affordableDensity(fast, 8, 1440)).toBeGreaterThan(affordableDensity(fast, 8, 720));
    expect(affordableDensity([], 8, 720)).toBe(rowDensity(0));
  });

  it("spends more of the band and more ink the denser it is drawn", () => {
    expect(rowSpread(4)).toBeGreaterThan(rowSpread(1));
    expect(rowAlpha(false, 4)).toBeGreaterThan(rowAlpha(false, 1));
    // The reference stays underneath at every density: it is what the others are read against.
    for (const density of [1, 4, 8]) {
      expect(rowAlpha(true, density)).toBeLessThan(rowAlpha(false, density));
      // And neither runs away: a crest reaches a couple of bands at most and a row stays
      // translucent, because a fringe is two crests multiplied and an opaque row is a rectangle.
      expect(rowSpread(density)).toBeLessThanOrEqual(rowSpread(Number.MAX_SAFE_INTEGER));
      expect(rowAlpha(false, density)).toBeLessThan(1);
    }
  });

  it("inks the rows through a screen: an unlit column every pitch, a scan line every few", () => {
    // The two still terms out of the reference. The pitch is device pixels and never under two,
    // because a pitch of one is a lit column with nowhere to put its gap.
    for (const dpr of [0.5, 1, 2, 3]) expect(gridPitchPx(dpr)).toBeGreaterThanOrEqual(2);
    const pitch = gridPitchPx(2);
    const columns = Array.from({ length: 4 * pitch }, (_, x) => columnKeep(x, pitch));
    expect(columns.filter((keep) => keep < 1)).toHaveLength(4);
    expect(columns.every((keep, x) => keep === columnKeep(x + pitch, pitch))).toBe(true);
    // The scan runs coarser than the grid and takes less: it crosses the columns, it is not one.
    const height = 0;
    const rows = Array.from({ length: 6 * pitch }, (_, y) => scanKeep(y, pitch, height));
    const lines = rows.filter((keep) => keep < 1);
    expect(lines).toHaveLength(2);
    expect(Math.min(...lines)).toBeGreaterThan(Math.min(...columns));
  });

  it("keeps more of the ink than the screen takes, at every density", () => {
    // A texture over the picture and not a mask cut out of it: a fringe is a product of two
    // translucent crests, so whatever one row loses to the screen the fringe loses twice.
    for (const dpr of [1, 2, 3]) {
      const pitch = gridPitchPx(dpr);
      const height = 24 * pitch;
      let kept = 0;
      for (let y = 0; y < height; y++)
        for (let x = 0; x < pitch; x++) kept += columnKeep(x, pitch) * scanKeep(y, pitch, height);
      expect(kept / (pitch * height)).toBeGreaterThan(0.6);
    }
  });

  it("rolls the band on the picture's own motion and holds where that stops", () => {
    // No clock of its own: the reference row is the deck's read position, so a halted yard — the
    // one that is painted and not animated (0040) — draws the band where it stopped.
    const other = row({ period: 2, phase: 0.7 });
    const reference = (phase: number): MoireRow => row({ period: 4, phase, reference: true });
    expect(bandTurns([other, reference(0)])).toBe(0);
    expect(bandTurns([other, reference(1)])).toBeCloseTo(0.25, 10);
    expect(bandTurns([other, reference(3)])).toBeCloseTo(0.75, 10);
    // Twice, with nothing moved between: the same picture, and not a frame further on.
    expect(bandTurns([other, reference(1)])).toBe(bandTurns([other, reference(1)]));
    // A picture with no loop under it has no band to roll and no second clock to roll it.
    expect(bandTurns([other])).toBe(0);
  });

  it("brings the band round rather than running a seam down the picture", () => {
    // The tile is shifted, not rebuilt, so its two ends are the same place: a discontinuity here
    // is an edge travelling down the picture once a cycle.
    // Read at the heights a canvas actually takes and not at the divisible ones: the strip is 32
    // CSS pixels and the overlay is whatever the shell leaves, so a tile as tall as the canvas
    // would put one long gap in the scan grid and ride it down the picture once a cycle.
    const pitch = gridPitchPx(2);
    const scan = 3 * pitch;
    for (const canvasPx of [1, 17, 64, 599, 1200]) {
      const height = tilePx(canvasPx, pitch);
      expect(height % scan).toBe(0);
      expect(height).toBeGreaterThanOrEqual(canvasPx);
      for (const y of [0, 1, scan - 1, scan, height - 1])
        expect(scanKeep(y + height, pitch, height)).toBeCloseTo(scanKeep(y, pitch, height), 10);
    }
    // And it is a band and not a flat tint: darkest at the tile's own zero, gone at its middle.
    const tall = tilePx(599, pitch);
    expect(scanKeep(0, pitch, tall)).toBeLessThan(scanKeep(tall / 2, pitch, tall));
    expect(scanKeep(tall / 2, pitch, tall)).toBe(1);
  });

  it("draws the screen it declares, and fills every row through it", () => {
    // The picture the painter actually puts down, not the functions beside it: the tile is as wide
    // as one pitch and as tall as `tilePx` says, its unlit column is where `columnKeep` puts it,
    // every row is filled with the screen rather than with flat ink, and the roll is a whole
    // device pixel of the tile's own height.
    vi.stubGlobal("devicePixelRatio", 2);
    const pitch = gridPitchPx(2);
    const rows = [row({ period: 3 }), row({ period: 4, phase: 1, reference: true })];
    const { tile, tileFills, rolls, inks, pattern } = paintedOn(200, 64, rows);
    expect(tile.width).toBe(pitch);
    expect(tile.height).toBe(tilePx(64, pitch));
    const columns = tileFills.filter((fill) => fill.w === 1 && fill.h === tile.height);
    expect(columns.map((fill) => fill.x)).toEqual([pitch - 1]);
    expect(columns[0]?.alpha).toBeCloseTo(1 - columnKeep(pitch - 1, pitch), 10);
    expect(inks).toEqual([pattern, pattern]);
    expect(rolls).toEqual([Math.round(bandTurns(rows) * tile.height)]);
  });

  it("gives every automatable parameter a row of its own", () => {
    // The step's claim, against the real registry rather than two made-up numbers: two lanes of
    // the same period on different parameters never draw the same row. There are more parameters
    // than there are waveforms, so this is the fold's turn of the row doing the work.
    const params = [
      ...DECK_AUTOMATION_PARAM_IDS,
      ...EFFECTS.flatMap((effect) => effectAutomationParamIds(effect.id)),
    ];
    expect(params.length).toBeGreaterThan(ROW_SHAPES.length);
    const drawn = params.map((param) => ({
      param,
      // The same period and the same gesture on every one of them: only the parameter differs.
      ink: Array.from({ length: 60 }, (_, index) =>
        rowInk(row({ period: 3, shape: fold(param) }), index / 10),
      ),
    }));
    for (const [index, left] of drawn.entries()) {
      for (const right of drawn.slice(index + 1)) {
        const apart = left.ink.some((ink, at) => Math.abs(ink - (right.ink[at] ?? ink)) > 0.05);
        expect(apart, `${left.param} and ${right.param} draw the same row`).toBe(true);
      }
    }
  });
});
