/**
 * @role What an automator grows, proved to be a function of its seed and nothing else — the claim
 *   an offline render of the same session rests on (0204).
 */
import { describe, expect, it } from "vitest";
import { DRIFT_OCTAVES_REACH, DRIFT_GEOMETRIES, LINEAR_GEOMETRY } from "./moire.ts";
import { mulberry32 } from "./random.ts";
import {
  createGrowth,
  drawValue,
  drawWeighted,
  GROWTH_COUNT_MAX,
  grownOctaves,
  WANDER_MIN_SECS,
  wanderSecs,
  type GrowthChange,
  type GrowthEntry,
} from "./effectGrowth.ts";

const POOL: readonly GrowthEntry[] = [
  {
    id: "delay",
    weight: 1,
    params: [
      { id: "delay.time", min: 0, max: 2, default: 0.25, lane: true as const },
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

/** The delay alone: a pool whose every entry has a knob a wander may move. */
const WANDERS: readonly GrowthEntry[] = POOL.slice(0, 1);

/**
 * Wander is nothing and Odds is everything unless a case is about them: a still run that fills
 * every place is the one every other case reads.
 */
const run = (
  spec: { most: number; drift: number; wander?: number; least?: number; odds?: number },
  ticks: number,
  seed = 7,
  pool = POOL,
  /** How many wander ticks fall inside one change tick — the second clock the caller keeps. */
  stirs = 1,
) => {
  const growth = createGrowth({ wander: 0, least: 0, odds: 1, ...spec }, mulberry32(seed), pool);
  // The order the automator realizes them in: a stir at the same instant as a tick goes first, so
  // a place laid at that tick is not also moved at it.
  return Array.from({ length: ticks }, (_, tick) => [
    ...Array.from({ length: stirs }, () => growth.stir()).flat(),
    ...growth.tick(tick),
  ]);
};

/** How many places stand at each tick of a run, read off its changes the way the automator does. */
const widths = (ticks: readonly (readonly GrowthChange[])[]): number[] => {
  const standing = new Set<number>();
  return ticks.map((tick) => {
    for (const change of tick) {
      if (change.t === "retire") standing.delete(change.place.place);
      else standing.add(change.place.place);
    }
    return standing.size;
  });
};

describe("effect growth", () => {
  // The whole of what a seed promises, and the reason nothing here holds a generator of its own.
  it("draws the same run twice from one seed", () => {
    expect(run({ most: 3, drift: 0.5 }, 40)).toEqual(run({ most: 3, drift: 0.5 }, 40));
  });

  it("draws a different run from a different seed", () => {
    expect(run({ most: 3, drift: 0.5 }, 40, 7)).not.toEqual(run({ most: 3, drift: 0.5 }, 40, 8));
  });

  // One at a time on the way up, so a fresh automator does not open with everything at once.
  it("lays one place per tick until the run is full, then rolls", () => {
    const ticks = run({ most: 3, drift: 0 }, 6);
    for (const tick of ticks.slice(0, 3)) {
      expect(tick.map(({ t }) => t)).toEqual(["grow"]);
    }
    for (const tick of ticks.slice(3)) {
      expect(tick.map(({ t }) => t)).toEqual(["retire", "grow"]);
    }
  });

  // A place lives exactly `most` ticks, which is what lets the caller keep a life longer than a
  // fade by clamping the tick alone.
  it("keeps a place for exactly as many ticks as the run is wide", () => {
    const ticks = run({ most: 4, drift: 0.5 }, 20);
    for (const [at, tick] of ticks.entries()) {
      for (const change of tick) {
        if (change.t === "retire") expect(at - change.place.born).toBe(4);
      }
    }
  });

  it("never draws an entry whose weight is nothing", () => {
    const pool = POOL.map((entry) => (entry.id === "eq" ? { ...entry, weight: 0 } : entry));
    const drawn = run({ most: 3, drift: 0.5 }, 60, 7, pool)
      .flat()
      .filter((change) => change.t === "grow")
      .map((change) => change.place.effect);
    expect(drawn.length).toBeGreaterThan(0);
    expect(drawn).not.toContain("eq");
  });

  it("grows nothing where every weight is nothing, and where the run is empty", () => {
    const silent = POOL.map((entry) => ({ ...entry, weight: 0 }));
    expect(run({ most: 3, drift: 1 }, 20, 7, silent).flat()).toEqual([]);
    expect(run({ most: 0, drift: 1 }, 20).flat()).toEqual([]);
  });

  // The presence and whatever holds it are the automator's to move, so they are never drawn.
  it("draws every value of an arrival except the held ones", () => {
    const grown = run({ most: 3, drift: 1 }, 30)
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
    const growth = createGrowth(
      { most: 3, least: 0, odds: 1, drift: 0.5, wander: 0 },
      mulberry32(7),
      POOL,
    );
    for (let tick = 0; tick < 200; tick++) {
      for (const change of growth.tick(tick)) {
        if (change.t === "retire") standing.delete(change.place.place);
        else standing.set(change.place.place, change.place.effect);
      }
      expect(standing.size).toBeLessThanOrEqual(3);
    }
    expect(standing.size).toBe(3);
  });

  // Odds all the way up is the only size a run had before there was a range: every place filled,
  // so the floor is never the thing that laid anything.
  it("fills every place at the top of the odds, whatever floor it is given", () => {
    const full = run({ most: 4, drift: 0.5, least: 4 }, 40);
    expect(run({ most: 4, drift: 0.5, least: 0 }, 40)).toEqual(full);
    expect(widths(full).slice(3)).toEqual(Array.from({ length: 37 }, () => 4));
  });

  it("never stands wider than Most, however the rolls fall", () => {
    for (const odds of [0, 0.25, 0.5, 0.75]) {
      const wide = widths(run({ most: 4, drift: 0.5, least: 1, odds }, 200));
      expect(Math.max(...wide)).toBeLessThanOrEqual(4);
    }
  });

  // The decision this dial was added under: a bound is a promise and a chance is a texture, so a
  // tick that would take the run below its floor lays whatever the roll said (0210).
  it("lays against a roll that said no rather than falling below Least", () => {
    // Odds of nothing: every lay in this run is one the floor insisted on.
    const wide = widths(run({ most: 4, drift: 0.5, least: 2, odds: 0 }, 60));
    // Two ticks to reach the floor, and never below it again — nor above it, since nothing else
    // ever lays.
    expect(wide.slice(0, 2)).toEqual([1, 2]);
    expect(wide.slice(1).every((at) => at === 2)).toBe(true);
    // And a floor of nothing leaves the run empty at the same odds: the lays above are the
    // floor's and not a leak in the roll.
    expect(run({ most: 4, drift: 0.5, least: 0, odds: 0 }, 60).flat()).toEqual([]);
  });

  it("skips the same places twice from one seed, and other places from another", () => {
    const spec = { most: 4, drift: 0.5, least: 1, odds: 0.5 } as const;
    const laid = (seed: number) => widths(run(spec, 80, seed));
    expect(laid(7)).toEqual(laid(7));
    expect(laid(7)).not.toEqual(laid(8));
    // A place is actually left empty once the run has been round once, or the case above is true
    // of a run that never skips — every run opens one place at a time, so its first widths are
    // below the ceiling whatever the odds said.
    expect(Math.min(...laid(7).slice(4))).toBeLessThan(4);
  });

  it("clamps a run wider than the rack allows, and a floor above its own ceiling", () => {
    const wide = run({ most: 99, drift: 0 }, GROWTH_COUNT_MAX + 4).flat();
    const places = new Set(wide.map((change) => change.place.place));
    expect(places.size).toBe(GROWTH_COUNT_MAX);
    // A range said backwards is one size and not an empty run: the floor is the ceiling, so this
    // stands full at two however hard the odds say not to (0210).
    const backwards = widths(run({ most: 2, drift: 0, least: 5, odds: 0 }, 20));
    expect(backwards.slice(1).every((at) => at === 2)).toBe(true);
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
    for (const change of run({ most: 6, drift: 1 }, 120).flat()) {
      if (change.t !== "grow") continue;
      const entry = POOL.find(({ id }) => id === change.place.effect);
      for (const { param, value } of change.values) {
        const spec = entry?.params.find(({ id }) => id === param);
        expect(value).toBeGreaterThanOrEqual(spec?.min ?? Number.NaN);
        expect(value).toBeLessThanOrEqual(spec?.max ?? Number.NaN);
      }
    }
  });

  // The window a hand puts on a parameter, which is what P141 is about: a draw lands inside it,
  // and the bottom of Stray is the window's nearer edge rather than a default outside it (0208).
  it("draws inside the window a hand put on a parameter, wherever the default fell", () => {
    const param = {
      id: "filter.cutoff",
      min: 20,
      max: 20_000,
      default: 1_000,
      curve: "log" as const,
      bound: { min: 2_000, max: 4_000 },
    };
    for (const draw of [0, 0.25, 0.5, 0.75, 1]) {
      for (const drift of [0, 0.5, 1]) {
        const value = drawValue(param, drift, draw);
        expect(value).toBeGreaterThanOrEqual(2_000 - 1e-6);
        expect(value).toBeLessThanOrEqual(4_000 + 1e-6);
      }
    }
    // The default is outside the window, so no drift is the window's nearer edge and not 1000.
    expect(drawValue(param, 0, 0.9)).toBeCloseTo(2_000, 6);
    // And the window is travelled in the parameter's own space: half of a log window is its
    // geometric middle, the way half of a whole log range is.
    expect(drawValue(param, 1, 0.5)).toBeCloseTo(Math.sqrt(2_000 * 4_000), 6);
  });

  it("draws exactly the point a window with two equal ends names", () => {
    // The shape a presence carries until a hand widens it: one point, whatever Stray says (0208).
    const param = { id: "eq.gain", min: -24, max: 24, default: 0, bound: { min: 6, max: 6 } };
    for (const drift of [0, 0.5, 1]) expect(drawValue(param, drift, 0.75)).toBeCloseTo(6, 9);
  });

  it("moves a standing value only where it declared a lane, and only as often as Wander says", () => {
    const moves = (wander: number) =>
      run({ most: 2, drift: 0.5, wander }, 60)
        .flat()
        .filter((change) => change.t === "move");
    // Nothing at rest: a run at no wander is drawn once and stands.
    expect(moves(0)).toEqual([]);
    const alive = moves(1);
    expect(alive.length).toBeGreaterThan(0);
    // Only what can be ramped: `delay.mix` is held and `filter.cutoff` declares no lane in this
    // pool, so neither may be moved after the arrival however alive the run is.
    const moved = new Set(alive.flatMap((change) => change.values.map(({ param }) => param)));
    expect([...moved]).toEqual(["delay.time"]);
  });

  /**
   * The wander's own clock. A stir once a change tick is one chance every `stays / most` — a
   * minute over three places is one chance every twenty seconds, which is an occurrence and not a
   * texture (P173).
   */
  it("brings a standing value's chance round many times inside one place's life", () => {
    const moved = (stirs: number) =>
      run({ most: 2, drift: 0.5, wander: 1 }, 3, 7, WANDERS, stirs)
        .flat()
        .filter((change) => change.t === "move" && change.place.born === 0).length;
    // One stir a change tick was one chance a change tick: a place standing two of them got two.
    expect(moved(1)).toBe(2);
    // On its own clock the same life is eight of them a tick.
    expect(moved(8)).toBe(16);
  });

  /**
   * Two clocks, one generator. The order of the draws is the whole of what a seed promises, so the
   * wander's and the tick's are spent in the order their instants fall and never rearranged (0134).
   */
  it("spends the wander's draws and the tick's through one generator in a fixed order", () => {
    const alive = { most: 3, drift: 0.5, wander: 1 };
    // Nothing stands at the first tick, so its stirs spend nothing and the tick's own draws are
    // the same ones at any cadence: what a cadence changes is what is spent after it.
    expect(run(alive, 4, 7, POOL, 1)[0]).toEqual(run(alive, 4, 7, POOL, 8)[0]);
    // Past that they are two performances, because every draw is spent whenever it is due and
    // whatever it says: the wander's cadence is part of the run's own stream (0134).
    expect(run(alive, 4, 7, POOL, 1)).not.toEqual(run(alive, 4, 7, POOL, 8));
    // And at either cadence the run is the seed's alone — the same interleaving twice is the same
    // run twice.
    expect(run(alive, 12, 7, POOL, 5)).toEqual(run(alive, 12, 7, POOL, 5));
    // A stir spends both its draws for every value that could move whatever the dial says, so
    // turning Wander down on the wander's own clock is still a quieter run and never a different
    // one.
    const grown = (wander: number) =>
      run({ most: 3, drift: 0.5, wander }, 12, 7, POOL, 5)
        .flat()
        .filter((change) => change.t === "grow");
    expect(grown(1)).toEqual(grown(0));
  });

  it("spends the same draws whatever Wander says, so turning it down is a quieter run", () => {
    // The stream is a function of the spec and the tick count alone (0134): the arrivals a run
    // lays are the same ones however alive the values standing between them are.
    const grown = (wander: number) =>
      run({ most: 3, drift: 0.5, wander }, 40)
        .flat()
        .filter((change) => change.t === "grow");
    expect(grown(1)).toEqual(grown(0));
  });

  it("takes a whole tick to wander at the bottom of the dial and a swell at the top", () => {
    expect(wanderSecs(0, 8)).toBe(8);
    expect(wanderSecs(0.5, 8)).toBe(4);
    expect(wanderSecs(1, 8)).toBe(WANDER_MIN_SECS);
    // Never a step, however short the tick it is asked to fit inside.
    expect(wanderSecs(0.5, 0.01)).toBe(WANDER_MIN_SECS);
  });

  it("draws a straight row at as many scales as the run is holding, and a curved one at one", () => {
    // A run of one is the picture P138 drew: one row at one scale. Every further effect the
    // automator is holding is one more octave on each of the rows it grew, so a rack that got
    // busier got deeper as well as wider (0143).
    expect(
      [0, 1, 2, 3, 4, 5, GROWTH_COUNT_MAX].map((held) => grownOctaves(held, LINEAR_GEOMETRY)),
    ).toEqual([1, 1, 2, 3, 3, 3, 3]);
    // The cap is the picture's own and not the run's: past three the coarsest copy is already four
    // times the coarsest spacing the picture reads at, and a fourth would be one bar across it.
    expect(grownOctaves(GROWTH_COUNT_MAX, LINEAR_GEOMETRY)).toBe(DRIFT_OCTAVES_REACH);
    // And a curved row is one scale as the answer rather than as a claim dropped in the painter:
    // an octave of a ring family is a picture-sized bake per copy, which is what 0142 refuses a
    // curved entry a claim on at load. The automator's own geometry is one of these.
    for (const geometry of DRIFT_GEOMETRIES) {
      if (geometry === LINEAR_GEOMETRY) continue;
      for (const held of [1, 3, GROWTH_COUNT_MAX]) expect(grownOctaves(held, geometry)).toBe(1);
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
