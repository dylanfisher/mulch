/**
 * @role What a state count does to a grown run: that every parameter is thrown between exactly as
 *   many values as the knob asks for however long the run goes, that those values are the seed's
 *   own rather than a lattice every run shares, and that the floor of the dial spends nothing and
 *   is the run as it was (0204).
 * @instead Everything else a run promises — its seed, its width, its odds and its wander →
 *   ./effectGrowth.test.ts. The knob that carries this into the automator →
 *   src/audio/effects/automator.test.ts.
 */
import { describe, expect, it } from "vitest";
import { mulberry32 } from "./random.ts";
import {
  createGrowth,
  GROWTH_STATES_MAX,
  GROWTH_STATES_MIN,
  stateDraw,
  type GrowthEntry,
} from "./effectGrowth.ts";

/**
 * Three entries, one of them with a knob a wander may move: enough that an arrival and a stir are
 * both drawing, and few enough that a long run lands on every state of every one of them.
 */
const POOL: readonly GrowthEntry[] = [
  {
    id: "delay",
    weight: 1,
    params: [{ id: "delay.time", min: 0, max: 2, default: 0.25, lane: true as const }],
  },
  {
    id: "panner",
    weight: 1,
    params: [{ id: "panner.rate", min: 0.05, max: 8, default: 1, curve: "log" }],
  },
  { id: "eq", weight: 1, params: [{ id: "eq.gain", min: -24, max: 24, default: 0 }] },
];

/** A run at full stray and full wander, four stirs to the tick — every draw this module makes. */
const run = (states: number, ticks: number, seed = 7, random = mulberry32(seed)) => {
  const growth = createGrowth(
    { most: 3, least: 0, odds: 1, drift: 1, wander: 1, states },
    random,
    POOL,
  );
  return Array.from({ length: ticks }, (_, tick) => [
    ...Array.from({ length: 4 }, () => growth.stir()).flat(),
    ...growth.tick(tick),
  ]);
};

// Six cases and the reading they share: the helper below is what makes each of them two lines of
// their own, and hoisting it out of the block would put the run's settings in one place and what
// they prove in another. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("a run thrown between states", () => {
  /** Every value a long run drew, by the parameter it was drawn for. */
  const drawnBy = (states: number, seed = 7): Map<string, Set<number>> => {
    const seen = new Map<string, Set<number>>();
    for (const tick of run(states, 200, seed)) {
      for (const change of tick) {
        if (change.t === "retire") continue;
        for (const { param, value } of change.values) {
          const at = seen.get(param) ?? new Set<number>();
          at.add(value);
          seen.set(param, at);
        }
      }
    }
    return seen;
  };

  it("throws every parameter between exactly as many states as it was asked for", () => {
    for (let states = GROWTH_STATES_MIN + 1; states <= GROWTH_STATES_MAX; states++) {
      const seen = drawnBy(states);
      // Every parameter the pool declares a draw for, and every one of them at exactly that many
      // values however long the run goes — an arrival and a wander land on the same states.
      expect(seen.size).toBe(POOL.length);
      for (const [param, values] of seen) {
        expect(`${param} ${states}: ${values.size}`).toBe(`${param} ${states}: ${states}`);
      }
    }
  });

  it("draws a fresh value every time at the bottom of the dial", () => {
    // One is not one state: it is the run as it was before there was a knob for this, and a run
    // that took one value per parameter for two hundred ticks would be the opposite of it.
    for (const values of drawnBy(GROWTH_STATES_MIN).values()) {
      expect(values.size).toBeGreaterThan(GROWTH_STATES_MAX);
    }
  });

  it("draws its states off the seed rather than off a lattice every run shares", () => {
    // What a run throws between is this run's: two automators at two seeds and one state count
    // throw the same parameter between two different pairs of values, which is what "two random
    // states" asks for and what a fixed quantizer could not give.
    const here = drawnBy(2, 7);
    const there = drawnBy(2, 9);
    for (const [param, values] of here) {
      expect(`${param}: ${values.size}`).toBe(`${param}: 2`);
      expect([...values]).not.toEqual([...(there.get(param) ?? new Set())]);
    }
    // And the same count on the same seed is the same run to the value: the phases are drawn with
    // the cursor and stored nowhere.
    expect(run(2, 60)).toEqual(run(2, 60));
  });

  it("spends one draw per parameter on its states, and none at all at the floor", () => {
    // The floor is the automator as it was, which is a claim about the generator and not only
    // about the values: a run with no states takes the draws it always took, in the order it took
    // them. Above the floor it takes exactly one more per parameter the pool lets it draw, once,
    // before the first tick.
    const spent = (states: number) => {
      let draws = 0;
      const seeded = mulberry32(7);
      run(states, 40, 7, () => {
        draws++;
        return seeded();
      });
      return draws;
    };
    const drawable = POOL.flatMap((entry) => entry.params).length;
    for (let states = GROWTH_STATES_MIN + 1; states <= GROWTH_STATES_MAX; states++) {
      expect(spent(states) - spent(GROWTH_STATES_MIN)).toBe(drawable);
    }
  });

  it("reads a draw off the state it fell in, at the phase that run drew", () => {
    // Equal shares of the window, taken at the phase: half way through is the middles, nought is
    // each state on its own share's floor, and the shares are the same wherever the phase sits.
    expect([0, 0.49, 0.5, 0.99, 1].map((draw) => stateDraw(draw, 2, 0.5))).toEqual([
      0.25, 0.25, 0.75, 0.75, 0.75,
    ]);
    expect([0, 0.99].map((draw) => stateDraw(draw, 2, 0))).toEqual([0, 0.5]);
    expect(stateDraw(0.5, 3, 0.5)).toBeCloseTo(0.5, 12);
    // Out of its own range either way: a count below the floor is the floor, which hands the draw
    // straight back, and one above the ceiling is the ceiling.
    expect(stateDraw(0.31, 0, 0.5)).toBe(0.31);
    expect(stateDraw(0.31, GROWTH_STATES_MAX + 3, 0.5)).toBe(
      stateDraw(0.31, GROWTH_STATES_MAX, 0.5),
    );
    // A draw outside its own turn is clamped before it is counted, never wrapped past the top.
    expect(stateDraw(2, 4, 0.5)).toBe(stateDraw(1, 4, 0.5));
    expect(stateDraw(-1, 4, 0.5)).toBe(stateDraw(0, 4, 0.5));
  });

  it("takes at most that many, and fewer where the window is a point", () => {
    // The honest reading of the count: a parameter whose window has no width — a presence, which
    // every poolable entry has, or a hand's own two ends set equal (0208) — has one value however
    // many states the run is thrown between, and so has every parameter at no stray at all. States
    // is a ceiling on how many values a knob takes, and exactly that many where there is a window
    // to take them in.
    const point = [
      {
        id: "delay",
        weight: 1,
        params: [
          { id: "delay.mix", min: 0, max: 1, default: 0.25, bound: { min: 1, max: 1 } },
          { id: "delay.time", min: 0, max: 2, default: 0.25 },
        ],
      },
    ] satisfies GrowthEntry[];
    const values = new Map<string, Set<number>>();
    const growth = createGrowth(
      { most: 2, least: 0, odds: 1, drift: 1, wander: 0, states: 3 },
      mulberry32(7),
      point,
    );
    for (let tick = 0; tick < 60; tick++) {
      for (const change of growth.tick(tick)) {
        if (change.t === "retire") continue;
        for (const { param, value } of change.values) {
          values.set(param, (values.get(param) ?? new Set<number>()).add(value));
        }
      }
    }
    expect(values.get("delay.mix")?.size).toBe(1);
    expect(values.get("delay.time")?.size).toBe(3);
    // And at no stray at all every parameter is its plugin's own default, whatever it is thrown
    // between: a state is a place in a window, and there is no window here to place it in.
    const still = createGrowth(
      { most: 2, least: 0, odds: 1, drift: 0, wander: 0, states: GROWTH_STATES_MAX },
      mulberry32(7),
      point,
    );
    const drawnStill = Array.from({ length: 30 }, (_, tick) => still.tick(tick))
      .flat()
      .flatMap((change) => (change.t === "retire" ? [] : change.values))
      .filter(({ param }) => param === "delay.time")
      .map(({ value }) => value);
    expect([...new Set(drawnStill)]).toEqual([0.25]);
  });
});
