/**
 * The tape's picture as maths: that the reels follow the rate the deck reads at and the repeat the
 * effect is holding, and nothing else. The paint itself is a canvas context these tests have no DOM
 * for — what it puts on that canvas is the fill, the radius and the spin below, and those are what
 * is asserted here, the way the tone's own view is (src/ui/ToneScope.test.tsx).
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { PARAMS } from "@/audio/params";
import { automationValueAt, type AutomationPoint } from "@/lib/automation";
import {
  advanceReelSpin,
  newReelSpin,
  paintTapeReels,
  reelFill,
  reelRadius,
  reelTurns,
  woundTime,
  type ReelSpin,
} from "@/ui/TapeReels";

const TIME = PARAMS["tape.time"];

/** A spin already started, so the first step measures an elapsed rather than seeding the clock. */
const started = (at: number): ReelSpin => ({ supply: 0, takeUp: 0, at });

describe("what the reels are wound by", () => {
  it("reads the repeat against the range that parameter declares", () => {
    expect(reelFill(TIME.min)).toBe(0);
    expect(reelFill(TIME.max)).toBe(1);
    expect(reelFill((TIME.min + TIME.max) / 2)).toBeCloseTo(0.5, 12);
  });

  it("winds tape from one reel onto the other as the repeat lengthens", () => {
    const shortT = reelRadius(reelFill(0.1));
    const longT = reelRadius(reelFill(1.5));
    expect(longT).toBeGreaterThan(shortT);
    // The same tape: what the take-up reel gains, the supply reel loses.
    expect(reelRadius(1 - reelFill(1.5))).toBeLessThan(reelRadius(1 - reelFill(0.1)));
  });

  it("keeps an empty reel turning rather than dividing by nothing", () => {
    expect(reelRadius(0)).toBeGreaterThan(0);
    expect(Number.isFinite(reelTurns(1, reelRadius(0)))).toBe(true);
  });
});

/**
 * `tape.time` declares a lane of its own, and a card whose knob is sweeping while its picture sits
 * at the value the knob left is the step's own claim — a time change seen before it is heard —
 * read backwards. The phase is one `peek()` already files under this instance's key, so this costs
 * the graph nothing it was not already reporting.
 */
describe("the repeat the reels are wound by", () => {
  const lane: readonly AutomationPoint[] = [
    { at: 0, value: 0.2 },
    { at: 1, value: 1.8 },
  ];

  it("follows the lane bending it, where one is running", () => {
    expect(woundTime(0.35, lane, 0.5)).toBeCloseTo(automationValueAt(lane, 0.5, 0.35), 12);
    expect(woundTime(0.35, lane, 0.5)).not.toBeCloseTo(0.35, 6);
    // Two phases of one lane are two different windings, which is the whole of the picture moving.
    expect(woundTime(0.35, lane, 0.25)).not.toBeCloseTo(woundTime(0.35, lane, 0.75), 6);
  });

  it("holds the value the instance holds when nothing is bending it", () => {
    expect(woundTime(0.35, null, null)).toBe(0.35);
    // A lane the voice has not armed reports no phase; the picture is not drawn from a lane that
    // is not running.
    expect(woundTime(0.35, lane, null)).toBe(0.35);
  });
});

describe("what the reels turn at", () => {
  it("turns twice as far in a second when the deck reads twice as fast", () => {
    const slow = started(1);
    const fast = started(1);
    advanceReelSpin(slow, 1.05, 1, 0.5);
    advanceReelSpin(fast, 1.05, 2, 0.5);
    expect(fast.takeUp).toBeCloseTo(2 * slow.takeUp, 12);
    expect(fast.supply).toBeCloseTo(2 * slow.supply, 12);
  });

  it("turns the fuller reel slower, so a longer repeat is seen and not only measured", () => {
    const spin = started(1);
    advanceReelSpin(spin, 1.05, 1, 0.9);
    expect(spin.takeUp).toBeLessThan(spin.supply);
    // And the same rate on a repeat wound the other way turns the same two reels the other way
    // round — the picture follows the time, not just the clock.
    const other = started(1);
    advanceReelSpin(other, 1.05, 1, 0.1);
    expect(other.takeUp).toBeGreaterThan(other.supply);
  });

  it("holds still while the deck is not reading, and resumes from where it held", () => {
    const spin = started(1);
    advanceReelSpin(spin, 1.05, 1, 0.5);
    const held = spin.takeUp;
    // A halted deck reads at no rate: the caller passes zero and the angle survives the frames.
    advanceReelSpin(spin, 1.09, 0, 0.5);
    advanceReelSpin(spin, 60, 0, 0.5);
    expect(spin.takeUp).toBe(held);
    advanceReelSpin(spin, 60.05, 1, 0.5);
    expect(spin.takeUp).toBeGreaterThan(held);
  });

  it("does not make up the turns a backgrounded tab missed", () => {
    const spin = started(1);
    advanceReelSpin(spin, 400, 1, 0.5);
    const capped = started(1);
    advanceReelSpin(capped, 1.1, 1, 0.5);
    expect(spin.takeUp).toBe(capped.takeUp);
  });

  it("starts from a standstill rather than from the epoch", () => {
    const spin = newReelSpin();
    advanceReelSpin(spin, 12345, 1, 0.5);
    expect(spin.takeUp).toBe(0);
    expect(spin.at).toBe(12345);
  });
});

/** One arc the paint asked for: where its centre is and how far out it reached. */
type Arc = { x: number; y: number; radius: number };
/** One straight run of a path: a spoke, or the tape between the reels. */
type Segment = { from: [number, number]; to: [number, number] };

/**
 * A canvas that records what was drawn on it rather than drawing it. There is no DOM here and no
 * 2D context to be had, so what the picture is gets asserted the way the graph's is: through a
 * double that keeps every call (src/audio/deckDouble.ts).
 */
function recorder(): { canvas: HTMLCanvasElement; arcs: Arc[]; segments: Segment[] } {
  const arcs: Arc[] = [];
  const segments: Segment[] = [];
  let at: [number, number] = [0, 0];
  const context = {
    clearRect: () => {},
    beginPath: () => {},
    stroke: () => {},
    strokeStyle: "",
    lineWidth: 0,
    globalAlpha: 1,
    arc: (x: number, y: number, radius: number) => arcs.push({ x, y, radius }),
    moveTo: (x: number, y: number) => {
      at = [x, y];
    },
    lineTo: (x: number, y: number) => {
      segments.push({ from: at, to: [x, y] });
      at = [x, y];
    },
  };
  const canvas = {
    width: 400,
    height: 100,
    // oxlint-disable-next-line no-unsafe-type-assertion -- only the calls the paint makes are faked
    getContext: () => context as unknown as CanvasRenderingContext2D,
  };
  // oxlint-disable-next-line no-unsafe-type-assertion -- the paint reads a size and a context
  return { canvas: canvas as unknown as HTMLCanvasElement, arcs, segments };
}

/** How far a spoke's outer end is from the reel it belongs to, and at what angle. */
const spokeAngles = (segments: readonly Segment[], centre: number): number[] =>
  segments
    .filter(({ from }) => Math.abs(from[0] - centre) < 200 && from[1] !== 50)
    .map(({ to }) => Math.atan2(to[1] - 50, to[0] - centre));

describe("what lands on the canvas", () => {
  // The paint is written for a browser and reads the display's density for its line width; there
  // is no display here, so the tests stand one up rather than the painter carrying a fallback for
  // a machine it never runs on (principle 5).
  beforeAll(() => {
    vi.stubGlobal("devicePixelRatio", 2);
  });
  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("draws two reels, each wound to the share of the tape it holds", () => {
    const short = recorder();
    paintTapeReels(short.canvas, "canvastext", reelFill(0.1), newReelSpin());
    const long = recorder();
    paintTapeReels(long.canvas, "canvastext", reelFill(1.9), newReelSpin());
    // Two flanges apiece — one per reel — and the wound ring inside each of them.
    expect(short.arcs).toHaveLength(4);
    const [, shortSupply, , shortTakeUp] = short.arcs;
    const [, longSupply, , longTakeUp] = long.arcs;
    expect(longTakeUp!.radius).toBeGreaterThan(shortTakeUp!.radius);
    expect(longSupply!.radius).toBeLessThan(shortSupply!.radius);
    // The two reels are drawn apart, at the same height, inside the canvas.
    expect(shortSupply!.x).toBeLessThan(shortTakeUp!.x);
    expect(shortSupply!.y).toBe(shortTakeUp!.y);
  });

  it("turns the spokes as the reels spin, and draws nothing on a canvas of nothing", () => {
    const still = recorder();
    const spun = recorder();
    const spin: ReelSpin = { supply: 0.25, takeUp: 0.25, at: 0 };
    paintTapeReels(still.canvas, "canvastext", 0.5, newReelSpin());
    paintTapeReels(spun.canvas, "canvastext", 0.5, spin);
    const centre = still.arcs[0]!.x;
    expect(spokeAngles(spun.segments, centre)).not.toEqual(spokeAngles(still.segments, centre));

    const empty = recorder();
    empty.canvas.height = 0;
    paintTapeReels(empty.canvas, "canvastext", 0.5, newReelSpin());
    expect(empty.arcs).toHaveLength(0);
  });
});
