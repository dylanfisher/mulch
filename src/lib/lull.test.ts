/**
 * @role What a lull asks for, proved to be a function of its seed and its horizon and nothing
 *   else — the claim an offline render of the same rests rests on (0204, 0371).
 */
import { describe, expect, it } from "vitest";
import {
  beatLength,
  createLull,
  LULL_GAP_MAX,
  LULL_GAP_MIN,
  LULL_REST_MAX,
  LULL_REST_MIN,
  type HoldEdge,
  type LullSpec,
} from "./lull.ts";
import { mulberry32 } from "./random.ts";

const spec = (over: Partial<LullSpec> = {}): LullSpec => ({
  chance: () => 1,
  rest: [1, 2],
  gap: [3, 4],
  skip: 0,
  ...over,
});

/** Every edge up to `until`, pumped at `step` seconds a time, as one list. */
function pumped(cursor: ReturnType<typeof createLull>, until: number, step: number): HoldEdge[] {
  const all: HoldEdge[] = [];
  const out: HoldEdge[] = [];
  for (let horizon = step; horizon <= until + 1e-9; horizon += step) {
    const n = cursor.edges(horizon, out);
    all.push(...out.slice(0, n));
  }
  return all;
}

/** The next edge's instant, from a cursor that has one. */
function nextOf(cursor: ReturnType<typeof createLull>): number {
  const next = cursor.nextAt();
  if (next === null) throw new Error("the cursor lays nothing");
  return next;
}

const isRelease = (edge: HoldEdge): edge is HoldEdge & { t: "release" } => edge.t === "release";

// The cursor's whole contract in one block: the same list at two cadences, the roll, the skip, the
// reset — each case is a few lines and the block is their count. See 0007.
// oxlint-disable-next-line max-lines-per-function
describe("a lull's edges", () => {
  it("are the same list whether the horizon comes in eights or in halves", () => {
    const coarse = pumped(createLull(spec(), mulberry32(7), 0, null), 120, 8);
    const fine = pumped(createLull(spec(), mulberry32(7), 0, null), 120, 0.5);
    expect(coarse.length).toBeGreaterThan(10);
    expect(fine).toEqual(coarse);
  });

  it("alternate a hold and a release at even chance, each length inside its range", () => {
    const edges = pumped(createLull(spec(), mulberry32(3), 0, null), 200, 4);
    let last = 0;
    for (const [i, edge] of edges.entries()) {
      expect(edge.t).toBe(i % 2 === 0 ? "hold" : "release");
      const length = edge.at - last;
      if (edge.t === "hold") expect(length).toBeGreaterThanOrEqual(3);
      if (edge.t === "hold") expect(length).toBeLessThanOrEqual(4);
      if (edge.t === "release") expect(length).toBeGreaterThanOrEqual(1);
      if (edge.t === "release") expect(length).toBeLessThanOrEqual(2);
      last = edge.at;
    }
  });

  it("lay nothing at a chance of nought, and spend the draws all the same", () => {
    const random = mulberry32(11);
    let spent = 0;
    const counting = () => {
      spent++;
      return random();
    };
    const cursor = createLull(spec({ chance: () => 0 }), counting, 0, null);
    expect(pumped(cursor, 100, 4)).toEqual([]);
    // Four draws a cycle, a gap of three to four seconds each: at least twenty-five cycles.
    expect(spent).toBeGreaterThanOrEqual(100);
    expect(spent % 4).toBe(0);
  });

  it("carry a jump inside the skip either way, and nought with none", () => {
    const skipped = pumped(createLull(spec({ skip: 2 }), mulberry32(5), 0, null), 100, 4);
    const releases = skipped.filter((edge) => isRelease(edge));
    expect(releases.length).toBeGreaterThan(5);
    for (const edge of releases) expect(Math.abs(edge.jump)).toBeLessThanOrEqual(2);
    expect(releases.some((edge) => edge.jump < 0)).toBe(true);
    expect(releases.some((edge) => edge.jump > 0)).toBe(true);
    const still = pumped(createLull(spec(), mulberry32(5), 0, null), 100, 4);
    for (const edge of still.filter((each) => isRelease(each))) expect(edge.jump).toBe(0);
  });

  it("read the chance at each roll rather than once", () => {
    let chance = 0;
    const cursor = createLull(spec({ chance: () => chance }), mulberry32(2), 0, null);
    expect(pumped(cursor, 40, 4)).toEqual([]);
    chance = 1;
    const out: HoldEdge[] = [];
    expect(cursor.edges(80, out)).toBeGreaterThan(0);
    expect(out[0]?.t).toBe("hold");
  });

  it("count the gap again from a reset, on the draws that follow", () => {
    const cursor = createLull(spec(), mulberry32(9), 0, null);
    const out: HoldEdge[] = [];
    const first = nextOf(cursor);
    expect(cursor.edges(first, out)).toBe(1);
    expect(cursor.resting()).toBe(true);
    cursor.reset(50);
    expect(cursor.resting()).toBe(false);
    const next = nextOf(cursor);
    expect(next).toBeGreaterThanOrEqual(53);
    expect(next).toBeLessThanOrEqual(54);
    expect(cursor.edges(52, out)).toBe(0);
  });

  it("answer the next edge without moving it", () => {
    const cursor = createLull(spec(), mulberry32(1), 0, null);
    const first = cursor.nextAt();
    expect(cursor.nextAt()).toBe(first);
    const out: HoldEdge[] = [];
    expect(cursor.edges(10, out)).toBeGreaterThanOrEqual(2);
    expect(out[0]?.at).toBe(first);
  });
});

describe("a lull on the beat", () => {
  it("rounds a length onto whole beats above one and a division below", () => {
    expect(beatLength(10, 120)).toBe(10);
    expect(beatLength(5.2, 120)).toBe(5);
    expect(beatLength(0.3, 120)).toBe(0.25);
    expect(beatLength(0.4, 120)).toBe(0.5);
    expect(beatLength(0.02, 120)).toBeCloseTo(0.5 / 32);
    expect(() => beatLength(1, 0)).toThrow(RangeError);
  });

  it("lays every edge on a tick of the session clock, each length a multiple of the beat", () => {
    const cursor = createLull(spec(), mulberry32(4), 0.3, { bpm: 120, sync: 0.5 });
    const edges = pumped(cursor, 100, 4);
    expect(edges.length).toBeGreaterThan(10);
    for (const edge of edges)
      expect(Math.abs(edge.at / 0.5 - Math.round(edge.at / 0.5))).toBeLessThan(1e-9);
  });

  it("lays nothing on a yard whose beat was never found", () => {
    const cursor = createLull(spec(), mulberry32(4), 0, { bpm: 0, sync: null });
    expect(pumped(cursor, 100, 4)).toEqual([]);
    expect(cursor.nextAt()).toBeNull();
  });

  it("keeps a rounded length inside the dial's own range", () => {
    const cursor = createLull(
      spec({ rest: [LULL_REST_MIN, LULL_REST_MIN * 1.5], gap: [LULL_GAP_MAX / 1.5, LULL_GAP_MAX] }),
      mulberry32(6),
      0,
      { bpm: 30, sync: null },
    );
    const edges = pumped(cursor, 500, 4);
    let last = 0;
    for (const edge of edges) {
      const length = edge.at - last;
      if (edge.t === "hold") expect(length).toBeLessThanOrEqual(LULL_GAP_MAX + 1e-9);
      if (edge.t === "release") expect(length).toBeGreaterThanOrEqual(LULL_REST_MIN - 1e-9);
      last = edge.at;
    }
    expect(LULL_GAP_MIN).toBeLessThan(LULL_REST_MAX);
  });
});
