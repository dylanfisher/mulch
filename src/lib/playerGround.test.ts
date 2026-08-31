/**
 * @role What the ground's picture promises: the blocks it draws ahead are the grounds the walk
 *   actually moves to, and the bed a point on the source names is the whole loop-length it falls in
 *   (0191).
 */
import { describe, expect, it } from "vitest";

import { PLAYER_DEFAULTS } from "./playerCharacter.ts";
import {
  PLAYER_BED_MAX,
  PLAYER_BED_MIN,
  PLAYER_BED_ROUND,
  PLAYER_BEDS_MAX,
  type PlantedBed,
} from "./playerBed.ts";
import { PLAYER_GROUND_LOOK, bedAt, groundsAhead, keepBed, plantBed } from "./playerGround.ts";
import { PLAYER_SLOTS } from "./playerSlots.ts";
import { playerSequence } from "./playerWalk.ts";
import type { PlayerSpec } from "./player.ts";

/** A pattern whose ground moves every other jump, which is the only kind that has any ahead. */
const spec = (over: Partial<PlayerSpec> = {}): PlayerSpec => ({
  seed: 5,
  ...PLAYER_DEFAULTS,
  bedEvery: 2,
  bedDistance: 4,
  bedBias: 1,
  ...over,
});

describe("the ground as a picture", () => {
  /**
   * The blocks ahead are read off the walk the transport lays rather than drawn again here, so the
   * picture shows the moves being made and not a second opinion about them (0089, principle 1).
   */
  it("names the grounds the walk moves to next, in the order it reaches them", () => {
    const held = spec();
    const ahead = groundsAhead(held);
    expect(ahead.length).toBeGreaterThan(0);
    const walked: number[] = [];
    let last = held.bed * PLAYER_SLOTS;
    for (const step of playerSequence(held, PLAYER_GROUND_LOOK)) {
      if (step.bed === last) continue;
      last = step.bed;
      walked.push(step.bed);
    }
    expect(ahead).toEqual(walked.slice(0, ahead.length));
    // And no more than it was asked for, however many the look finds.
    expect(groundsAhead(held, 1)).toEqual(ahead.slice(0, 1));
  });

  /**
   * A pattern whose ground never moves has none: `bedEvery: 0` is the whole of "the loop stays
   * where the hand put it" (src/lib/playerBed.ts), so an empty strip is the honest drawing of it
   * rather than a block a hand would wait for.
   */
  it("draws nothing ahead of a ground that never moves", () => {
    expect(groundsAhead(spec({ bedEvery: 0 }))).toEqual([]);
    expect(groundsAhead(spec(), 0)).toEqual([]);
  });

  /**
   * And which bed a point names: whole loop-lengths from the loop's own start, because that is the
   * unit the dial this writes is counted in. The sixteenths between two beds are the crawl's, drawn
   * by the pattern rather than placed by a hand (0185).
   */
  it("names the whole bed a point on the source falls in", () => {
    expect(bedAt(1, 1, 2)).toBe(0);
    expect(bedAt(2.4, 1, 2)).toBe(1);
    expect(bedAt(3, 1, 2)).toBe(1);
    expect(bedAt(0.1, 1, 2)).toBe(0);
    expect(bedAt(-4, 1, 2)).toBe(-2);
    // Clamped to the dial's own reach rather than to the file's: what a buffer holds is folded
    // where that is known (`bedWrap`), and a loop of no length names no bed at all.
    expect(bedAt(1e6, 0, 1)).toBe(PLAYER_BED_MAX);
    expect(bedAt(-1e6, 0, 1)).toBe(PLAYER_BED_MIN);
    expect(bedAt(5, 0, 0)).toBe(0);
  });
});

/**
 * And what keeping one does to the list a hand holds. Two functions and not one: the `+` at the
 * end of the row adds, and the Option press on the picture toggles — one arithmetic meaning two
 * things is what emptied a row a hand had pressed `+` on twice (P165, 0194).
 */
describe("keeping a ground", () => {
  it("keeps one that is not kept, at the count a press leaves", () => {
    expect(keepBed([], 3)).toEqual([{ bed: 3, every: PLAYER_BED_ROUND }]);
  });

  /**
   * And never takes one away: a second press on the same ground is a press with nothing to do,
   * which the caller reads off the identical list rather than off a row that has emptied itself.
   */
  it("hands the same list back where the ground is already kept", () => {
    const kept: readonly PlantedBed[] = [
      { bed: -2, every: 4 },
      { bed: 3, every: 16 },
    ];
    expect(keepBed(kept, 3)).toBe(kept);
    expect(keepBed(keepBed(kept, 5), 5).map((one) => one.bed)).toEqual([-2, 3, 5]);
  });

  /** In the source's own order, so the row under the picture reads the way the blocks over it do. */
  it("holds them in the order of the source", () => {
    const kept = keepBed(keepBed(keepBed([], 4), -2), 1);
    expect(kept.map((one) => one.bed)).toEqual([-2, 1, 4]);
  });

  /**
   * And the same list back where there is no room for another, which the caller reads as nothing
   * to do: a press at the ceiling is a gesture with nothing to keep rather than one that quietly
   * drops the ground it was aimed at (principle 5).
   */
  it("hands the same list back where there is no room", () => {
    // Beds 1…MAX, so the ground asked for below is one the ceiling refuses rather than one the
    // list already holds: a fixture starting at 0 tests the wrong early return.
    const full = Array.from({ length: PLAYER_BEDS_MAX }, (_, at) => ({ bed: at + 1, every: 4 }));
    expect(keepBed(full, PLAYER_BEDS_MAX + 1)).toBe(full);
    expect(keepBed(full, 0)).toBe(full);
  });
});

/** The picture's Option press, which is the same add with a take-away in front of it. */
describe("keeping a ground, or letting it go", () => {
  it("keeps one that is not kept and lets go of one that is", () => {
    expect(plantBed([], 3)).toEqual([{ bed: 3, every: PLAYER_BED_ROUND }]);
    expect(plantBed([{ bed: 3, every: 16 }], 3)).toEqual([]);
  });

  /** The add underneath it is `keepBed`'s, ceiling and ordering both (principle 1). */
  it("adds by the same arithmetic the row's press uses", () => {
    expect(plantBed([{ bed: 4, every: 4 }], -2).map((one) => one.bed)).toEqual([-2, 4]);
    const full = Array.from({ length: PLAYER_BEDS_MAX }, (_, at) => ({ bed: at, every: 4 }));
    expect(plantBed(full, PLAYER_BEDS_MAX + 1)).toBe(full);
    expect(plantBed(full, 0)).toHaveLength(PLAYER_BEDS_MAX - 1);
  });
});
