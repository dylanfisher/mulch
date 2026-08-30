/**
 * @role What an automator grows, proved to be a function of its seed and nothing else — the claim
 *   an offline render of the same session rests on (0204).
 */
import { describe, expect, it } from "vitest";
import { mulberry32 } from "./random.ts";
import {
  createGrowth,
  drawValue,
  drawWeighted,
  GROWTH_COUNT_MAX,
  type GrowthEntry,
} from "./effectGrowth.ts";

const POOL: readonly GrowthEntry[] = [
  {
    id: "delay",
    weight: 1,
    params: [
      { id: "delay.time", min: 0, max: 2, default: 0.25 },
      { id: "delay.mix", min: 0, max: 1, default: 0.25, held: true },
    ],
  },
  {
    id: "filter",
    weight: 1,
    params: [{ id: "filter.cutoff", min: 20, max: 20_000, default: 1_000, curve: "log" }],
  },
  { id: "eq", weight: 1, params: [{ id: "eq.gain", min: -24, max: 24, default: 0 }] },
];

const run = (spec: { count: number; drift: number }, ticks: number, seed = 7, pool = POOL) => {
  const growth = createGrowth(spec, mulberry32(seed), pool);
  return Array.from({ length: ticks }, (_, tick) => growth(tick));
};

describe("effect growth", () => {
  // The whole of what a seed promises, and the reason nothing here holds a generator of its own.
  it("draws the same run twice from one seed", () => {
    expect(run({ count: 3, drift: 0.5 }, 40)).toEqual(run({ count: 3, drift: 0.5 }, 40));
  });

  it("draws a different run from a different seed", () => {
    expect(run({ count: 3, drift: 0.5 }, 40, 7)).not.toEqual(run({ count: 3, drift: 0.5 }, 40, 8));
  });

  // One at a time on the way up, so a fresh automator does not open with everything at once.
  it("lays one place per tick until the run is full, then rolls", () => {
    const ticks = run({ count: 3, drift: 0 }, 6);
    for (const tick of ticks.slice(0, 3)) {
      expect(tick.map(({ t }) => t)).toEqual(["grow"]);
    }
    for (const tick of ticks.slice(3)) {
      expect(tick.map(({ t }) => t)).toEqual(["retire", "grow"]);
    }
  });

  // A place lives exactly `count` ticks, which is what lets the caller keep a life longer than a
  // fade by clamping the tick alone.
  it("keeps a place for exactly as many ticks as the run is wide", () => {
    const ticks = run({ count: 4, drift: 0.5 }, 20);
    for (const [at, tick] of ticks.entries()) {
      for (const change of tick) {
        if (change.t === "retire") expect(at - change.place.born).toBe(4);
      }
    }
  });

  it("never draws an entry whose weight is nothing", () => {
    const pool = POOL.map((entry) => (entry.id === "eq" ? { ...entry, weight: 0 } : entry));
    const drawn = run({ count: 3, drift: 0.5 }, 60, 7, pool)
      .flat()
      .filter((change) => change.t === "grow")
      .map((change) => change.place.effect);
    expect(drawn.length).toBeGreaterThan(0);
    expect(drawn).not.toContain("eq");
  });

  it("grows nothing where every weight is nothing, and where the run is empty", () => {
    const silent = POOL.map((entry) => ({ ...entry, weight: 0 }));
    expect(run({ count: 3, drift: 1 }, 20, 7, silent).flat()).toEqual([]);
    expect(run({ count: 0, drift: 1 }, 20).flat()).toEqual([]);
  });

  // The presence and whatever holds it are the automator's to move, so they are never drawn.
  it("draws every value of an arrival except the held ones", () => {
    const grown = run({ count: 3, drift: 1 }, 30)
      .flat()
      .filter((change) => change.t === "grow");
    for (const change of grown) {
      expect(change.values.map(({ param }) => param)).not.toContain("delay.mix");
      if (change.place.effect === "delay") {
        expect(change.values.map(({ param }) => param)).toEqual(["delay.time"]);
      }
    }
  });

  it("holds the run inside the width it was asked for, however long it goes", () => {
    const standing = new Map<number, string>();
    const growth = createGrowth({ count: 3, drift: 0.5 }, mulberry32(7), POOL);
    for (let tick = 0; tick < 200; tick++) {
      for (const change of growth(tick)) {
        if (change.t === "retire") standing.delete(change.place.place);
        else standing.set(change.place.place, change.place.effect);
      }
      expect(standing.size).toBeLessThanOrEqual(3);
    }
    expect(standing.size).toBe(3);
  });

  it("clamps a run wider than the rack allows", () => {
    const wide = run({ count: 99, drift: 0 }, GROWTH_COUNT_MAX + 4).flat();
    const places = new Set(wide.map((change) => change.place.place));
    expect(places.size).toBe(GROWTH_COUNT_MAX);
  });

  // At no drift a value is exactly what its plugin shipped — not very nearly.
  it("draws a value at its own default where there is no drift", () => {
    const param = {
      id: "filter.cutoff",
      min: 20,
      max: 20_000,
      default: 1_000,
      curve: "log" as const,
    };
    for (const draw of [0, 0.25, 0.5, 1]) {
      expect(drawValue(param, 0, draw)).toBeCloseTo(1_000, 6);
    }
  });

  // A log range strays by octaves, so a cutoff wanders as the ear hears it.
  it("draws a log value in its own space", () => {
    const param = {
      id: "filter.cutoff",
      min: 20,
      max: 20_000,
      default: 1_000,
      curve: "log" as const,
    };
    const half = drawValue(param, 1, 0.5);
    expect(half).toBeCloseTo(Math.sqrt(20 * 20_000), 6);
    expect(drawValue(param, 1, 0)).toBeCloseTo(20, 6);
    expect(drawValue(param, 1, 1)).toBeCloseTo(20_000, 6);
  });

  it("draws every value inside its own range", () => {
    for (const change of run({ count: 6, drift: 1 }, 120).flat()) {
      if (change.t !== "grow") continue;
      const entry = POOL.find(({ id }) => id === change.place.effect);
      for (const { param, value } of change.values) {
        const spec = entry?.params.find(({ id }) => id === param);
        expect(value).toBeGreaterThanOrEqual(spec?.min ?? Number.NaN);
        expect(value).toBeLessThanOrEqual(spec?.max ?? Number.NaN);
      }
    }
  });

  it("weighs the pool against itself rather than against one", () => {
    // Weights are proportions, so doubling one is twice as often and not "the rest turned down".
    expect(drawWeighted([1, 3], 0.2)).toBe(0);
    expect(drawWeighted([1, 3], 0.3)).toBe(1);
    expect(drawWeighted([2, 6], 0.2)).toBe(0);
    expect(drawWeighted([2, 6], 0.3)).toBe(1);
    expect(drawWeighted([0, 0], 0.5)).toBeNull();
    // A negative weight is nothing, never a subtraction from its neighbour.
    expect(drawWeighted([-5, 1], 0.9)).toBe(1);
  });
});
