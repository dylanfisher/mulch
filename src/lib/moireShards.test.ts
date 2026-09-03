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
import {
  SHARD_CAP,
  SHARD_LAYER,
  SHARD_REACH,
  SHARD_STEP,
  SHARD_WIDEST,
  shardsInto,
  shardsLook,
  shardWidth,
} from "@/lib/moireShards";
import { GROWTH_COUNT_MAX } from "@/lib/effectGrowth";

/** The popped-out picture the shot was read on, and the radius the kernel reads it against. */
const WIDTH = 480;
const HEIGHT = 160;
const REF = geometryRef(WIDTH, HEIGHT);

/** Where the picture rests on the plane with nothing roaming it. */
const SEED = fractalRest();

/**
 * The table `presences` automators fill, in rack order, each holding a full run unless `helds` says
 * otherwise, over a table poisoned so a slot missed shows.
 */
function thrown(
  presences: number[],
  helds: number[] = presences.map(() => GROWTH_COUNT_MAX),
): Float64Array {
  const out = new Float64Array(SHARD_CAP * SHARD_LAYER).fill(Number.NaN);
  const at = new Float64Array(SHARD_CAP);
  const held = new Float64Array(SHARD_CAP);
  presences.forEach((presence, index) => {
    at[index] = presence;
    held[index] = helds[index] ?? GROWTH_COUNT_MAX;
  });
  shardsInto(out, SEED, REF, WIDTH, HEIGHT, at, held, presences.length);
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
    const over = new Float64Array(SHARD_CAP + 1);
    expect(() => {
      shardsInto(out, SEED, REF, WIDTH, HEIGHT, over, over, SHARD_CAP + 1);
    }).toThrow("not a count");
    expect(() => {
      shardsInto(new Float64Array(SHARD_LAYER), SEED, REF, WIDTH, HEIGHT, over, over, 1);
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

  it("is cut and reads no term at all", () => {
    expect(shardsLook.at).toBe("cut");
    expect(shardsLook.terms).toEqual({});
    expect("pass" in shardsLook).toBe(false);
  });
});
