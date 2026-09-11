/**
 * @role Tests the automator's look as a table of throws: that nothing standing throws nothing, that
 *   one automator is a tear and not a shift, that the second is a different tear and never the
 *   first one deeper, that two together are the sum under the ceiling and never a normalisation,
 *   and that the cap holds. The real kernel at the painter's own rest, no canvas, no clock.
 * @instead Where the table is spent on the slices → src/ui/moireCanvasField.test.ts. How many
 *   automators stand and how far each is in → src/ui/moireLooks.test.ts. What a look is →
 *   src/lib/moireLook.test.ts.
 */
import { describe, expect, it } from "vitest";

import { fractalRest } from "@/lib/moireFractal";
import { geometryRef, LENS_SLICES } from "@/lib/moireGeometry";
import type { LookTerms } from "@/lib/moireLook";
import {
  SHARD_CAP,
  SHARD_LAYER,
  SHARD_FADED,
  SHARD_REACH,
  SHARD_STEP,
  SHARD_WIDEST,
  shardsInto,
  shardsLook,
  type ShardRun,
  shardWidth,
} from "@/lib/moireShards";
import { GROWTH_COUNT_MAX } from "@/lib/effectGrowth";

/** The popped-out picture the shot was read on, and the radius the kernel reads it against. */
const WIDTH = 480;
const HEIGHT = 160;
const REF = geometryRef(WIDTH, HEIGHT);

/** Where the picture rests on the plane with nothing roaming it. */
const SEED = fractalRest();

/** Two seeds far enough apart to fall on two stops of the valley, as a minted one always is. */
const ONE = 0x12_34_56_78;
const TWO = 0x89_ab_cd_ef;

/**
 * The table `presences` automators fill, in rack order, each holding a full run unless `helds` says
 * otherwise, over a table poisoned so a slot missed shows.
 */
function thrown(
  presences: number[],
  helds: number[] = presences.map(() => GROWTH_COUNT_MAX),
  terms: LookTerms[] = [],
  waiteds: number[] = [],
): Float64Array {
  const out = new Float64Array(SHARD_CAP * SHARD_LAYER).fill(Number.NaN);
  const runs: ShardRun[] = Array.from({ length: SHARD_CAP }, (_each, at) => ({
    presence: presences[at] ?? 0,
    held: helds[at] ?? GROWTH_COUNT_MAX,
    waited: waiteds[at] ?? 0,
    terms: terms[at] ?? {},
  }));
  shardsInto(out, SEED, REF, WIDTH, HEIGHT, runs, presences.length);
  return out;
}

/** One automator's layer of the table. */
const layer = (table: Float64Array, k: number): Float64Array =>
  table.subarray(k * SHARD_LAYER, (k + 1) * SHARD_LAYER);

/** The across throws and the down throws of a layer, as plain lists. */
const across = (table: Float64Array): number[] => Array.from(table.subarray(0, LENS_SLICES));
const down = (table: Float64Array): number[] => Array.from(table.subarray(LENS_SLICES));

/** How many seams a list of throws holds: neighbours thrown by different amounts. */
const seamsOf = (throws: number[]): number =>
  throws.slice(1).filter((slid, at) => slid !== throws[at]).length;

/** How many of a layer's throws are not thrown at all: a piece the odds left standing. */
const untorn = (table: Float64Array): number =>
  Array.from(table).filter((slid) => slid === 0).length;

/** How many distinct throws a list holds, at a thousandth of the height. */
const distinct = (throws: number[]): number =>
  new Set(throws.map((slid) => Math.round(slid * 1000))).size;

describe("the shards", () => {
  it("throws nothing where nothing stands, and a tear where one automator does", () => {
    expect(thrown([]).every((slid) => Number.isNaN(slid))).toBe(true);
    const one = layer(thrown([1]), 0);
    // Non-zero, bounded by one reach, and many different values: a tear, not a shift of the field.
    expect(across(one).some((slid) => slid !== 0)).toBe(true);
    for (const slid of one) expect(Math.abs(slid)).toBeLessThanOrEqual(SHARD_REACH.value + 1e-12);
    expect(distinct(across(one))).toBeGreaterThan(8);
    // And the columns are thrown by the centre row and not by the centre column again.
    expect(down(one)).not.toEqual(across(one));
    expect(distinct(down(one))).toBeGreaterThan(8);
  });

  it("throws contiguous slices as one piece and breaks between pieces, never as a wave", () => {
    // A tear is flat pieces with hard seams (0297): somewhere two neighbouring slices fall in one
    // piece and are thrown exactly alike, and somewhere two fall either side of a seam and land
    // further apart than one reach — which a cosine of the raw count, climbing slowly down the
    // open plane, never does.
    for (const throws of [across(layer(thrown([1]), 0)), down(layer(thrown([1]), 0))]) {
      const seams = throws.slice(1).map((slid, at) => Math.abs(slid - (throws[at] ?? 0)));
      expect(seams.some((seam) => seam === 0)).toBe(true);
      expect(Math.max(...seams)).toBeGreaterThan(SHARD_REACH.value);
    }
  });

  it("tears a young run into a few wide pieces and a full run into the step's fine break", () => {
    // Widest at one held and never wider, the step itself at a full run, and monotone between
    // (`shardWidth`, 0298).
    expect(shardWidth(1)).toBeCloseTo(SHARD_STEP.value * SHARD_WIDEST.value, 12);
    expect(shardWidth(0)).toBe(shardWidth(1));
    expect(shardWidth(GROWTH_COUNT_MAX)).toBeCloseTo(SHARD_STEP.value, 12);
    expect(shardWidth(GROWTH_COUNT_MAX + 3)).toBe(shardWidth(GROWTH_COUNT_MAX));
    for (let held = 1; held < GROWTH_COUNT_MAX; held++) {
      expect(shardWidth(held + 1)).toBeLessThan(shardWidth(held));
    }
    // And on the table: fewer seams down the column for a run holding one than for a run holding
    // six, and the full run's table is the one a full run was always thrown by.
    const young = layer(thrown([1], [1]), 0);
    const full = layer(thrown([1], [GROWTH_COUNT_MAX]), 0);
    expect(seamsOf(across(young))).toBeLessThan(seamsOf(across(full)));
    expect(seamsOf(down(young))).toBeLessThan(seamsOf(down(full)));
    expect(seamsOf(across(young))).toBeGreaterThan(0);
    expect(Array.from(full)).toEqual(Array.from(layer(thrown([1]), 0)));
  });

  it("reads the second automator at its own depth and phase, so it is a different tear", () => {
    const first = across(layer(thrown([1, 1]), 0));
    const second = across(layer(thrown([1, 1]), 1));
    expect(second).not.toEqual(first);
    // Not the first tear scaled: no one factor takes the one table to the other.
    const ratios = new Set(
      first.map((slid, at) => (slid === 0 ? 0 : Math.round(((second[at] ?? 0) / slid) * 100))),
    );
    expect(ratios.size).toBeGreaterThan(2);
  });

  it("lays every automator in a layer of its own, and never adds one to another", () => {
    // The second automator's layer is the same whether or not the first is standing, and the first's
    // is the same whether or not a second has arrived: each tears what the last left (0298).
    const both = thrown([1, 1]);
    expect(Array.from(layer(both, 0))).toEqual(Array.from(layer(thrown([1]), 0)));
    expect(Array.from(layer(both, 1))).toEqual(Array.from(layer(thrown([0, 1]), 1)));
    // An automator at no presence throws nothing in its layer, and nothing past the standing is
    // written at all.
    expect(Array.from(layer(thrown([0, 1]), 0)).every((slid) => slid === 0)).toBe(true);
    expect(Array.from(layer(both, 2)).every((slid) => Number.isNaN(slid))).toBe(true);
  });

  it("holds the cap's worth of automators, and refuses more", () => {
    const full = thrown(Array.from({ length: SHARD_CAP }, () => 1));
    for (const slid of full) expect(Math.abs(slid)).toBeLessThanOrEqual(SHARD_REACH.value + 1e-12);
    expect(across(layer(full, SHARD_CAP - 1)).some((slid) => slid !== 0)).toBe(true);
    const out = new Float64Array(SHARD_CAP * SHARD_LAYER);
    const over: ShardRun[] = Array.from({ length: SHARD_CAP + 1 }, () => ({
      presence: 1,
      held: 1,
      waited: 0,
      terms: {},
    }));
    expect(() => {
      shardsInto(out, SEED, REF, WIDTH, HEIGHT, over, SHARD_CAP + 1);
    }).toThrow("not a count");
    expect(() => {
      shardsInto(new Float64Array(SHARD_LAYER), SEED, REF, WIDTH, HEIGHT, over, 1);
    }).toThrow("holds no");
  });

  it("halves an automator's tear at half its presence, and fills the same table twice", () => {
    const whole = layer(thrown([1]), 0);
    const half = layer(thrown([0.5]), 0);
    for (let at = 0; at < SHARD_LAYER; at++) {
      expect(half[at]).toBeCloseTo((whole[at] ?? 0) / 2, 12);
    }
    expect(Array.from(thrown([1, 0.5]))).toEqual(Array.from(thrown([1, 0.5])));
  });

  it("is cut and reads the six knobs that shape a run", () => {
    expect(shardsLook.at).toBe("cut");
    expect(shardsLook.terms).toEqual({
      seed: "value",
      lens: "turn",
      share: "turn",
      spacing: "turn",
      fade: "turn",
      wander: "turn",
    });
    expect(Object.keys(shardsLook.terms)).toHaveLength(6);
    expect("pass" in shardsLook).toBe(false);
    // And a run that states none of them is torn exactly as 0296 and 0298 tore it, which is what
    // lets every case above state no term at all.
    expect(Array.from(thrown([1], [3], [{}]))).toEqual(Array.from(thrown([1], [3])));
  });

  // P356 step 10: two seeds are two valleys, which is the outcome the step is for (0360).
  it("reads each run's own seed as its own valley, so two seeds tear two planes", () => {
    const one = Array.from(layer(thrown([1, 1], undefined, [{ seed: ONE }, { seed: ONE }]), 1));
    const other = Array.from(layer(thrown([1, 1], undefined, [{ seed: ONE }, { seed: TWO }]), 1));
    expect(other).not.toEqual(one);
    // The same seed is the same tear, and no seed at all is the plane the picture already stands on.
    expect(one).toEqual(
      Array.from(layer(thrown([1, 1], undefined, [{ seed: TWO }, { seed: ONE }]), 1)),
    );
    expect(Array.from(layer(thrown([1]), 0))).toEqual(
      Array.from(layer(thrown([1], undefined, [{ seed: 0 }]), 0)),
    );
  });

  // And the hourglass: how much of a hold is left turns the whole layer round (0215, 0360).
  it("turns a held run's whole layer, and stands where it always did once the wait has run out", () => {
    const still = across(layer(thrown([1]), 0));
    const held = across(layer(thrown([1], undefined, undefined, [1]), 0));
    expect(held).not.toEqual(still);
    // A phase and not a fade: the layer moves, it is still a tear, and nothing is thrown further
    // than the reach. Said without predicting the turn itself, because `SHARD_WAIT` is a dial and a
    // case that recomputed its cosine would be red the first time anybody moved it.
    expect(held.some((slid) => slid !== 0)).toBe(true);
    for (const slid of held) expect(Math.abs(slid)).toBeLessThanOrEqual(SHARD_REACH.value + 1e-12);
    // And it travels: a glass half run out is neither where it started nor where it was turned to.
    const halfway = across(layer(thrown([1], undefined, undefined, [0.5]), 0));
    expect(halfway).not.toEqual(still);
    expect(halfway).not.toEqual(held);
    expect(across(layer(thrown([1], undefined, undefined, [0]), 0))).toEqual(still);
  });

  // And the four that shape the tear itself, each in its own direction.
  it("thins, widens, deepens and shortens the tear by the four knobs that say so", () => {
    const plain = layer(thrown([1], [3]), 0);
    // Odds: a piece outside the share is not thrown at all, and no odds at all is no tear.
    const thin = layer(thrown([1], [3], [{ share: 0.5 }]), 0);
    expect(untorn(thin)).toBeGreaterThan(untorn(plain));
    // And never all of it: the floor beats the odds in the run, so an automator at no odds at all
    // is still standing, still holding its floor and still a tear (`SHARD_LEAST_TORN`).
    const thinnest = layer(thrown([1], [3], [{ share: 0 }]), 0);
    expect(untorn(thinnest)).toBeGreaterThan(untorn(thin));
    expect(Array.from(thinnest).some((slid) => slid !== 0)).toBe(true);
    // Wait: the seams stand further apart, so there are fewer of them down the same column.
    expect(seamsOf(across(layer(thrown([1], [3], [{ spacing: 1 }]), 0)))).toBeLessThan(
      seamsOf(across(plain)),
    );
    // Least: read from inside the structure, where the same slices span fewer cycles of the count,
    // so the pieces are larger — and larger by a different number than the Wait widens them by.
    const deep = across(layer(thrown([1], [3], [{ lens: 1 }]), 0));
    expect(seamsOf(deep)).toBeLessThan(seamsOf(across(plain)));
    expect(deep).not.toEqual(across(layer(thrown([1], [3], [{ spacing: 1 }]), 0)));
    // Fade: the same tear, every throw a share of what it was, and never past the reach.
    const faded = layer(thrown([1], [3], [{ fade: 1 }]), 0);
    for (const [at, slid] of Array.from(plain).entries()) {
      expect(faded[at]).toBeCloseTo(slid * SHARD_FADED.value, 12);
    }
    // Wander: the scatter itself, so which pieces pair up moves and the tear is still a tear.
    const stirred = across(layer(thrown([1], [3], [{ wander: 1 }]), 0));
    expect(stirred).not.toEqual(across(plain));
    expect(distinct(stirred)).toBeGreaterThan(4);
  });
});
