import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ScopeBlock, ScopeGeometry } from "@/lib/playerScope";
import { PLAYER_REPEATS_MAX } from "@/lib/playerRepeats";

import { paintScope, rungOf, SCOPE_RUNGS } from "./playerScopeCanvas";

/** One rectangle the painter laid down, and the ink it was at when it did. */
type Mark = { x: number; y: number; w: number; h: number; alpha: number; hollow: boolean };

const WIDTH = 320;
const HEIGHT = 160;

/**
 * The painter's stand-in canvas: every fill and stroke it made, in order, with the alpha it was
 * carrying — set the way src/ui/peakCanvas.test.ts sets its own, and enough of a context that the
 * whole of `paintScope` runs against it.
 */
function recorder() {
  const marks: Mark[] = [];
  const lines: { from: [number, number]; to: [number, number]; dashed: boolean }[] = [];
  let pen: [number, number] = [0, 0];
  let dash: number[] = [];
  const context = {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    globalAlpha: 1,
    clearRect: () => {},
    fillRect: (x: number, y: number, w: number, h: number) =>
      marks.push({ x, y, w, h, alpha: context.globalAlpha, hollow: false }),
    strokeRect: (x: number, y: number, w: number, h: number) =>
      marks.push({ x, y, w, h, alpha: context.globalAlpha, hollow: true }),
    beginPath: () => {},
    moveTo: (x: number, y: number) => {
      pen = [x, y];
    },
    lineTo: (x: number, y: number) =>
      lines.push({ from: pen, to: [x, y], dashed: dash.length > 0 }),
    stroke: () => {},
    setLineDash: (pattern: number[]) => {
      dash = pattern;
    },
  };
  // The painter reaches for a width, a height and a 2d context and nothing else, the way
  // src/ui/moireScreen.test.ts stands in for the canvas its own painter is handed.
  // oxlint-disable-next-line no-unsafe-type-assertion
  const canvas = {
    width: WIDTH,
    height: HEIGHT,
    getContext: () => context,
  } as unknown as HTMLCanvasElement;
  return { canvas, marks, lines };
}

/** A landing struck `repeats` times, filling the whole sheet unless a case says otherwise. */
const blockOf = (repeats: number, over: Partial<ScopeBlock> = {}): ScopeBlock => ({
  slot: 0,
  from: 0,
  to: 1,
  splits: Array.from({ length: repeats }, (_unused, one) => (one + 1) / repeats),
  gate: 1,
  dropped: false,
  reversed: false,
  moved: false,
  wait: null,
  edge: null,
  sparks: [],
  ...over,
});

const sheet = (blocks: ScopeBlock[], at = 0, bars: number[] = []): ScopeGeometry => ({
  blocks,
  secs: 1,
  at,
  bars,
});

/** How tall a landing struck `repeats` times stands, in this picture's own pixels. */
const tallOf = (repeats: number) => rungOf(repeats) * HEIGHT;

/**
 * Every mark that is a landing rather than a rule under it or the playhead over it. The rules are
 * laid first — one per rung and one per bar — and the playhead last, so the landings are what is
 * between them, which is the order `paintScope` itself is written in.
 */
const landings = (marks: Mark[], bars = 0) => marks.slice(SCOPE_RUNGS.length + bars, -1);

beforeEach(() => {
  vi.stubGlobal("devicePixelRatio", 1);
});

// Twelve cases against one painter, each three lines long. The length is the picture's shape and
// not this function's: split into two describes they would be two names for "what paintScope
// draws". See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("paintScope", () => {
  it("stands a landing on the floor, as tall as the count it is struck (0258)", () => {
    const once = recorder();
    paintScope(once.canvas, sheet([blockOf(1)]), 0, "ink");
    const often = recorder();
    paintScope(often.canvas, sheet([blockOf(16)]), 0, "ink");
    // Both feet on the floor, and the tall one's top well above the short one's.
    expect(Number(landings(once.marks)[0]?.y) + Number(landings(once.marks)[0]?.h)).toBeCloseTo(
      HEIGHT,
      6,
    );
    expect(landings(often.marks)[0]?.y).toBeLessThan(Number(landings(once.marks)[0]?.y));
    expect(landings(once.marks)[0]?.y).toBeCloseTo(HEIGHT - tallOf(1), 6);
  });

  /**
   * Logarithmic and against the dial's own ceiling, which is what keeps one pattern one picture on
   * two sheets (0098): doubling the count is one rung up, whichever two counts are doubled.
   */
  it("reads the count by the ear: each doubling is one rung, up to the dial's own ceiling", () => {
    const rungs = SCOPE_RUNGS.map((count) => rungOf(count));
    for (let step = 1; step < rungs.length; step++) {
      expect(Number(rungs[step]) - Number(rungs[step - 1])).toBeCloseTo(
        Number(rungs[1]) - Number(rungs[0]),
        6,
      );
    }
    expect(rungOf(PLAYER_REPEATS_MAX)).toBeCloseTo(1, 10);
    // And the floor is one rung and never nothing: a landing struck once happened, and a block of
    // no height is a landing the picture did not draw.
    expect(rungOf(1)).toBeCloseTo(1 / SCOPE_RUNGS.length, 10);
  });

  it("rules the picture at the counts themselves, so a height reads as a number", () => {
    const drawn = recorder();
    paintScope(drawn.canvas, sheet([blockOf(1)]), 0, "ink");
    const rules = drawn.marks.slice(0, SCOPE_RUNGS.length);
    expect(rules.map((rule) => rule.w)).toEqual(SCOPE_RUNGS.map(() => WIDTH));
    for (const [index, rule] of rules.entries()) {
      expect(rule.y).toBeCloseTo(HEIGHT - tallOf(Number(SCOPE_RUNGS[index])), 6);
    }
  });

  /** And across, at the loop's own turnovers: without them a cluster and a long hold read alike. */
  it("rules the loop's turnovers across the sheet, at the sheet's own fade", () => {
    const drawn = recorder();
    paintScope(drawn.canvas, sheet([blockOf(1)], 0, [0.25, 0.75]), 0, "ink");
    const bars = drawn.marks.slice(SCOPE_RUNGS.length, SCOPE_RUNGS.length + 2);
    expect(bars.map((bar) => bar.h)).toEqual([HEIGHT, HEIGHT]);
    expect(bars[0]?.x).toBeCloseTo(WIDTH / 4 - 0.5, 6);
    expect(bars[1]?.x).toBeCloseTo((WIDTH * 3) / 4 - 0.5, 6);
    expect(bars[0]?.alpha).toBeLessThan(1);
  });

  it("draws the landing the clock is inside at full ink and the rest of the sheet faint (0187)", () => {
    const drawn = recorder();
    paintScope(drawn.canvas, sheet([blockOf(1), blockOf(1)], 1), 0, "ink");
    const inks = landings(drawn.marks).map((mark) => mark.alpha);
    expect(inks[0]).toBeLessThan(1);
    expect(inks.at(-1)).toBe(1);
  });

  it("draws a hole hollow and a repeat solid, which is what the transport does with one", () => {
    const drawn = recorder();
    paintScope(drawn.canvas, sheet([blockOf(1, { dropped: true })]), 0, "ink");
    expect(landings(drawn.marks)[0]?.hollow).toBe(true);
    const solid = recorder();
    paintScope(solid.canvas, sheet([blockOf(1)]), 0, "ink");
    expect(landings(solid.marks)[0]?.hollow).toBe(false);
  });

  it("cuts a gated repeat at the near end, and a reversed one at the far end (P121)", () => {
    const forward = recorder();
    paintScope(forward.canvas, sheet([blockOf(1, { gate: 0.5 })]), 0, "ink");
    const backward = recorder();
    paintScope(backward.canvas, sheet([blockOf(1, { gate: 0.5, reversed: true })]), 0, "ink");
    const near = landings(forward.marks)[0];
    const far = landings(backward.marks)[0];
    expect(near?.x).toBe(0);
    expect(near?.w).toBeCloseTo(WIDTH / 2, 6);
    expect(far?.x).toBeCloseTo(WIDTH / 2, 6);
    expect(far?.w).toBeCloseTo(WIDTH / 2, 6);
  });

  /**
   * The ground moving was a break in the thread between two slot bands while the picture had one.
   * The score has no such thread, and the fact is still the one a glance needs — so it is a dashed
   * hairline standing exactly where the window the slots are cut from changed (0183, 0258).
   */
  it("stands a dashed mark where the ground moved, and none where it did not", () => {
    const still = recorder();
    paintScope(still.canvas, sheet([blockOf(1), blockOf(1, { from: 0.5 })]), 0, "ink");
    expect(still.lines).toEqual([]);
    const moved = recorder();
    paintScope(moved.canvas, sheet([blockOf(1), blockOf(1, { from: 0.5, moved: true })]), 0, "ink");
    expect(moved.lines[0]?.dashed).toBe(true);
    expect(moved.lines[0]?.from).toEqual([WIDTH / 2, 0]);
    expect(moved.lines[0]?.to).toEqual([WIDTH / 2, HEIGHT]);
  });

  it("lays a wait at the foot of the picture rather than in the gap it already is (P156)", () => {
    const drawn = recorder();
    paintScope(
      drawn.canvas,
      sheet([blockOf(1, { to: 0.5, wait: { from: 0.5, to: 1 } })]),
      0,
      "ink",
    );
    const wait = landings(drawn.marks).at(-1);
    expect(wait?.y).toBeCloseTo(HEIGHT - 1, 6);
    expect(wait?.x).toBeCloseTo(WIDTH / 2, 6);
  });

  /** The ghost has no count of its own: it is the landing sounding once more, so it stands one rung. */
  it("puts a spark where it opens, one rung tall and quieter than the landing that threw it", () => {
    const drawn = recorder();
    const spark = { slot: 5, at: 0.25, level: 1 };
    paintScope(drawn.canvas, sheet([blockOf(8, { sparks: [spark] })]), 0, "ink");
    const drawnSpark = landings(drawn.marks).at(-1);
    expect(drawnSpark?.x).toBeCloseTo(WIDTH / 4, 6);
    expect(drawnSpark?.y).toBeCloseTo(HEIGHT - tallOf(1), 6);
    expect(drawnSpark?.alpha).toBeLessThan(1);
  });

  /** The readout beside the picture says numbers; this is the one thing that says which block. */
  it("outlines the landing a hand picked, at full ink, and nothing where none is picked", () => {
    const drawn = recorder();
    paintScope(drawn.canvas, sheet([blockOf(1), blockOf(1, { from: 0.5 })]), 0, "ink", 1);
    const outline = landings(drawn.marks).at(-1);
    expect(outline?.hollow).toBe(true);
    expect(outline?.alpha).toBe(1);
    expect(outline?.x).toBeCloseTo(WIDTH / 2 + 0.5, 6);
    const none = recorder();
    paintScope(none.canvas, sheet([blockOf(1), blockOf(1, { from: 0.5 })]), 0, "ink");
    expect(landings(none.marks).some((mark) => mark.hollow)).toBe(false);
  });

  it("draws the playhead last, at full strength, over whatever it crosses", () => {
    const drawn = recorder();
    paintScope(drawn.canvas, sheet([blockOf(1)]), 0.5, "ink");
    const head = drawn.marks.at(-1);
    expect(head?.h).toBe(HEIGHT);
    expect(head?.alpha).toBe(1);
    expect(head?.x).toBeCloseTo(WIDTH / 2, 6);
  });

  it("holds the playhead at the end of the sheet rather than letting it run off it", () => {
    const drawn = recorder();
    paintScope(drawn.canvas, sheet([blockOf(1)]), 4, "ink");
    expect(drawn.marks.at(-1)?.x).toBe(WIDTH);
  });
});
