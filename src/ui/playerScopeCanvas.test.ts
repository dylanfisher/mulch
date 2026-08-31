import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ScopeBlock, ScopeGeometry } from "@/lib/playerScope";
import { PLAYER_SLOTS } from "@/lib/playerSlots";

import { paintScope } from "./playerScopeCanvas";

/** One rectangle the painter laid down, and the ink it was at when it did. */
type Mark = { x: number; y: number; w: number; h: number; alpha: number; hollow: boolean };

const WIDTH = 320;
const HEIGHT = 160;
/** One slot's band, at the size every case here paints at. */
const DEEP = HEIGHT / PLAYER_SLOTS;

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

/** A landing on its slot, filling the whole sheet unless a case says otherwise. */
const blockAt = (slot: number, over: Partial<ScopeBlock> = {}): ScopeBlock => ({
  slot,
  from: 0,
  to: 1,
  splits: [1],
  gate: 1,
  dropped: false,
  reversed: false,
  moved: false,
  wait: null,
  edge: null,
  spark: null,
  ...over,
});

const sheet = (blocks: ScopeBlock[], at = 0): ScopeGeometry => ({ blocks, secs: 1, at });

/** Every mark that is a landing rather than the playhead or a rule, in the order it was laid. */
const landings = (marks: Mark[]) => marks.filter((mark) => mark.h < HEIGHT);

beforeEach(() => {
  vi.stubGlobal("devicePixelRatio", 1);
});

// Eleven cases against one painter, each three lines long. The length is the picture's shape and
// not this function's: split into two describes they would be two names for "what paintScope
// draws". See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("paintScope", () => {
  it("reads the loop up the picture: slot 0 at the bottom, the top slot at the top", () => {
    const low = recorder();
    paintScope(low.canvas, sheet([blockAt(0)]), 0, "ink");
    const high = recorder();
    paintScope(high.canvas, sheet([blockAt(PLAYER_SLOTS - 1)]), 0, "ink");
    expect(landings(low.marks)[0]?.y).toBeGreaterThan(Number(landings(high.marks)[0]?.y));
    expect(landings(low.marks)[0]?.y).toBeCloseTo(HEIGHT - DEEP + 1, 6);
    expect(landings(high.marks)[0]?.y).toBeCloseTo(1, 6);
  });

  it("gives every slot the same band, so a sheet is a ladder and not a taper", () => {
    const tops = Array.from({ length: PLAYER_SLOTS }, (_unused, slot) => {
      const drawn = recorder();
      paintScope(drawn.canvas, sheet([blockAt(slot)]), 0, "ink");
      return Number(landings(drawn.marks)[0]?.y);
    });
    for (let slot = 1; slot < tops.length; slot++) {
      expect(Number(tops[slot - 1]) - Number(tops[slot])).toBeCloseTo(DEEP, 6);
    }
  });

  it("draws the landing the clock is inside at full ink and the rest of the sheet faint (0187)", () => {
    const drawn = recorder();
    paintScope(drawn.canvas, sheet([blockAt(0), blockAt(1)], 1), 0, "ink");
    const inks = landings(drawn.marks).map((mark) => mark.alpha);
    expect(inks[0]).toBeLessThan(1);
    expect(inks.at(-1)).toBe(1);
  });

  it("draws a hole hollow and a repeat solid, which is what the transport does with one", () => {
    const drawn = recorder();
    paintScope(drawn.canvas, sheet([blockAt(0, { dropped: true })]), 0, "ink");
    expect(landings(drawn.marks)[0]?.hollow).toBe(true);
    const solid = recorder();
    paintScope(solid.canvas, sheet([blockAt(0)]), 0, "ink");
    expect(landings(solid.marks)[0]?.hollow).toBe(false);
  });

  it("cuts a gated repeat at the near end, and a reversed one at the far end (P121)", () => {
    const forward = recorder();
    paintScope(forward.canvas, sheet([blockAt(0, { gate: 0.5 })]), 0, "ink");
    const backward = recorder();
    paintScope(backward.canvas, sheet([blockAt(0, { gate: 0.5, reversed: true })]), 0, "ink");
    const near = landings(forward.marks)[0];
    const far = landings(backward.marks)[0];
    expect(near?.x).toBe(0);
    expect(near?.w).toBeCloseTo(WIDTH / 2, 6);
    expect(far?.x).toBeCloseTo(WIDTH / 2, 6);
    expect(far?.w).toBeCloseTo(WIDTH / 2, 6);
  });

  it("breaks the thread where the ground moved, on the thread and not on either landing (0183)", () => {
    const still = recorder();
    paintScope(still.canvas, sheet([blockAt(0), blockAt(3)]), 0, "ink");
    expect(still.lines[0]?.dashed).toBe(false);
    const moved = recorder();
    paintScope(moved.canvas, sheet([blockAt(0), blockAt(3, { moved: true })]), 0, "ink");
    expect(moved.lines[0]?.dashed).toBe(true);
  });

  it("runs the thread between the two bands' middles, so it reads as a link and not a step", () => {
    const drawn = recorder();
    paintScope(drawn.canvas, sheet([blockAt(0), blockAt(2)]), 0, "ink");
    expect(drawn.lines[0]?.from[1]).toBeCloseTo(HEIGHT - DEEP / 2, 6);
    expect(drawn.lines[0]?.to[1]).toBeCloseTo(HEIGHT - DEEP * 2 - DEEP / 2, 6);
  });

  it("lays a wait at the foot of the landing's own band rather than between two of them (P156)", () => {
    const drawn = recorder();
    paintScope(
      drawn.canvas,
      sheet([blockAt(0, { to: 0.5, wait: { from: 0.5, to: 1 } })]),
      0,
      "ink",
    );
    const wait = landings(drawn.marks).at(-1);
    expect(wait?.y).toBeCloseTo(HEIGHT - 1, 6);
    expect(wait?.x).toBeCloseTo(WIDTH / 2, 6);
  });

  it("puts a spark on its own slot's band, not on the landing that threw it", () => {
    const drawn = recorder();
    const spark = { slot: 5, at: 0.25, level: 1 };
    paintScope(drawn.canvas, sheet([blockAt(0, { spark })]), 0, "ink");
    const drawnSpark = landings(drawn.marks).at(-1);
    expect(drawnSpark?.x).toBeCloseTo(WIDTH / 4, 6);
    expect(drawnSpark?.y).toBeCloseTo(HEIGHT - 6 * DEEP + 1, 6);
  });

  it("draws the playhead last, at full strength, over whatever it crosses", () => {
    const drawn = recorder();
    paintScope(drawn.canvas, sheet([blockAt(0)]), 0.5, "ink");
    const head = drawn.marks.at(-1);
    expect(head?.h).toBe(HEIGHT);
    expect(head?.alpha).toBe(1);
    expect(head?.x).toBeCloseTo(WIDTH / 2, 6);
  });

  it("holds the playhead at the end of the sheet rather than letting it run off it", () => {
    const drawn = recorder();
    paintScope(drawn.canvas, sheet([blockAt(0)]), 4, "ink");
    expect(drawn.marks.at(-1)?.x).toBe(WIDTH);
  });
});
