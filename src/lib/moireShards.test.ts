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
import { SHARD_CAP, SHARD_CEILING, SHARD_REACH, shardsInto, shardsLook } from "@/lib/moireShards";

/** The popped-out picture the shot was read on, and the radius the kernel reads it against. */
const WIDTH = 480;
const HEIGHT = 160;
const REF = geometryRef(WIDTH, HEIGHT);

/** Where the picture rests on the plane with nothing roaming it. */
const SEED = fractalRest();

/** The table `presences` automators fill, in rack order, over a table poisoned so a slot missed shows. */
function thrown(...presences: number[]): Float64Array {
  const out = new Float64Array(2 * LENS_SLICES).fill(Number.NaN);
  const at = new Float64Array(SHARD_CAP);
  presences.forEach((presence, index) => {
    at[index] = presence;
  });
  shardsInto(out, SEED, REF, WIDTH, HEIGHT, at, presences.length);
  return out;
}

/** The across throws and the down throws, as plain lists. */
const across = (table: Float64Array): number[] => Array.from(table.subarray(0, LENS_SLICES));
const down = (table: Float64Array): number[] => Array.from(table.subarray(LENS_SLICES));

/** How many distinct throws a list holds, at a thousandth of the height. */
const distinct = (throws: number[]): number =>
  new Set(throws.map((slid) => Math.round(slid * 1000))).size;

describe("the shards", () => {
  it("throws nothing where nothing stands, and a tear where one automator does", () => {
    const none = thrown();
    expect(across(none).every((slid) => slid === 0)).toBe(true);
    expect(down(none).every((slid) => slid === 0)).toBe(true);
    const one = thrown(1);
    // Non-zero, bounded by one reach, and many different values: a tear, not a shift of the field.
    expect(across(one).some((slid) => slid !== 0)).toBe(true);
    for (const slid of one) expect(Math.abs(slid)).toBeLessThanOrEqual(SHARD_REACH + 1e-12);
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
    for (const throws of [across(thrown(1)), down(thrown(1))]) {
      const seams = throws.slice(1).map((slid, at) => Math.abs(slid - (throws[at] ?? 0)));
      expect(seams.some((seam) => seam === 0)).toBe(true);
      expect(Math.max(...seams)).toBeGreaterThan(SHARD_REACH);
    }
  });

  it("reads the second automator at its own depth and phase, so it is a different tear", () => {
    const first = across(thrown(1));
    const second = across(thrown(0, 1));
    expect(second).not.toEqual(first);
    // Not the first tear scaled: no one factor takes the one table to the other.
    const ratios = new Set(
      first.map((slid, at) => (slid === 0 ? 0 : Math.round(((second[at] ?? 0) / slid) * 100))),
    );
    expect(ratios.size).toBeGreaterThan(2);
  });

  it("sums two automators where the sum is under the ceiling, and never normalises them", () => {
    const first = thrown(1);
    const second = thrown(0, 1);
    const both = thrown(1, 1);
    for (let at = 0; at < 2 * LENS_SLICES; at++) {
      const sum = (first[at] ?? 0) + (second[at] ?? 0);
      expect(Math.abs(sum)).toBeLessThanOrEqual(SHARD_CEILING);
      expect(both[at]).toBeCloseTo(sum, 12);
    }
  });

  it("holds the cap's worth of automators under the ceiling, and refuses more", () => {
    const full = thrown(...Array.from({ length: SHARD_CAP }, () => 1));
    for (const slid of full) expect(Math.abs(slid)).toBeLessThanOrEqual(SHARD_CEILING);
    expect(across(full).some((slid) => slid !== 0)).toBe(true);
    const out = new Float64Array(2 * LENS_SLICES);
    expect(() => {
      shardsInto(out, SEED, REF, WIDTH, HEIGHT, new Float64Array(SHARD_CAP + 1), SHARD_CAP + 1);
    }).toThrow("not a count");
    expect(() => {
      shardsInto(new Float64Array(LENS_SLICES), SEED, REF, WIDTH, HEIGHT, out, 1);
    }).toThrow("holds no");
  });

  it("halves an automator's tear at half its presence, and fills the same table twice", () => {
    const whole = thrown(1);
    const half = thrown(0.5);
    for (let at = 0; at < 2 * LENS_SLICES; at++) {
      expect(half[at]).toBeCloseTo((whole[at] ?? 0) / 2, 12);
    }
    expect(Array.from(thrown(1, 0.5))).toEqual(Array.from(thrown(1, 0.5)));
  });

  it("is cut and reads no term at all", () => {
    expect(shardsLook.at).toBe("cut");
    expect(shardsLook.terms).toEqual({});
    expect("pass" in shardsLook).toBe(false);
  });
});
