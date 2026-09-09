/**
 * @role What the Count is: the arithmetic that turns one delay into a rhythm, and the jumps the
 *   walk draws when a landing throws more than one companion (P123, 0175).
 * @instead What one spark is — the odds, the level and the delay — → src/lib/playerWalk.test.ts,
 *   whose spark block is at the file's own cap, which is why the count is a file of its own
 *   (0045, docs/plan.md §4). What the transport builds out of it →
 *   src/audio/playerSparkCount.test.ts.
 */
import { describe, expect, it } from "vitest";

import type { PlayerSpec } from "./player.ts";
import { PLAYER_DEFAULTS } from "./playerCharacter.ts";
import { PLAYER_SLOTS } from "./playerSlots.ts";
import {
  PLAYER_SPARK_COUNT_MAX,
  PLAYER_SPARK_COUNT_MIN,
  PLAYER_SPARK_MAX,
  sparkStartOf,
} from "./playerSpark.ts";
import { playerSequence, type PlayerStep } from "./playerWalk.ts";

/** The same pattern the walk's own spark cases are asked of: no song, so what moves is the jump. */
const jumping = (fields: Partial<PlayerSpec>): PlayerSpec => ({
  seed: 11,
  ...PLAYER_DEFAULTS,
  ...fields,
});

/** Where each step read from, which is the only field these cases are about. */
const slots = (steps: readonly PlayerStep[]) => steps.map((step) => step.slot);

/**
 * What a pattern sparking at every landing lays down at the floor of the count, captured off the
 * build before a landing could throw more than one. The count's floor has to leave it exactly
 * where it found it, which is the same golden `SWITCH_LEAVES` is in src/lib/playerWalk.test.ts:
 * one companion is one draw (0089, 0096, P123).
 */
const SPARKING_LEAVES = [
  0, 13, 15, 1, 5, 1, 13, 9, 6, 4, 6, 4, 1, 15, 2, 0, 1, 14, 11, 15, 12, 13, 12, 11,
];

describe("a spark's own start", () => {
  /**
   * The delay is the *last* one's and the rest divide the stretch before it, so the count is a
   * rhythm rather than a pile: at a delay of nought every spark sounds with the landing, and at
   * the top of the dial they are evenly across the window with the landing itself as the first
   * read of it. At a count of one it is the delay itself, which is what makes a pattern at the
   * floor sound exactly as it did before the count existed.
   */
  it("puts the last one on the delay and the rest evenly before it", () => {
    expect(sparkStartOf(0, 1, 0.5)).toBeCloseTo(0.5, 12);
    expect([0, 1, 2].map((index) => sparkStartOf(index, 3, 0.6))).toEqual([
      expect.closeTo(0.2, 12),
      expect.closeTo(0.4, 12),
      expect.closeTo(0.6, 12),
    ]);
    // A chord at nought, whatever the count: every one of them opens with the landing.
    expect([0, 1, 2, 3].map((index) => sparkStartOf(index, 4, 0))).toEqual([0, 0, 0, 0]);
    // And never past the dial, which is the bound no reading of it may cross (0175).
    for (let count = PLAYER_SPARK_COUNT_MIN; count <= PLAYER_SPARK_COUNT_MAX; count++) {
      for (let index = 0; index < count; index++) {
        expect(sparkStartOf(index, count, 1)).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("a landing that sparks, at a count", () => {
  /**
   * And how many it throws is the Count, rolled nowhere: the odds are rolled once per landing —
   * the Spark dial says *whether* — and the count says how many that one roll is worth. Each of
   * them takes a jump of its own off the same generator, so the three of one landing are three
   * regions rather than one region three times (P123).
   */
  it("throws as many companions as the count says, a jump each", () => {
    const three = playerSequence(
      jumping({ spark: PLAYER_SPARK_MAX, sparkLevel: 0.25, sparkCount: 3 }),
      64,
    );
    expect(three.every((step) => step.sparked?.slots.length === 3)).toBe(true);
    // Every one of them inside the grid, which is what makes each a region and not an index.
    expect(
      three.every((step) =>
        (step.sparked?.slots ?? []).every(
          (slot) => Number.isInteger(slot) && slot >= 0 && slot < PLAYER_SLOTS,
        ),
      ),
    ).toBe(true);
    // And three jumps rather than one jump copied three times: nearly every landing's three are
    // three different slots. Nearly, because the jump may wrap or come home onto another of them,
    // which is the jump answering and not a case the walk draws again for (P123).
    expect(three.filter((step) => new Set(step.sparked?.slots).size === 3).length).toBeGreaterThan(
      32,
    );
    // The top of the dial is the top of the list: nothing clamps it further down.
    const most = playerSequence(
      jumping({ spark: PLAYER_SPARK_MAX, sparkCount: PLAYER_SPARK_COUNT_MAX }),
      8,
    );
    expect(most.every((step) => step.sparked?.slots.length === PLAYER_SPARK_COUNT_MAX)).toBe(true);
  });

  /**
   * And the floor of the count is the count that changes nothing: one jump per sparking landing is
   * exactly the one draw a spark took before it could be counted, so a pattern at the floor lays
   * down the stream it laid before the field existed — the golden below, captured off that build.
   * Anything above the floor takes a draw more per landing and walks somewhere else, which is what
   * says the golden is sensitive rather than a number that would hold either way (0089, 0096).
   */
  it("lays the stream it laid before the field at a count of one, and another above it", () => {
    const one = jumping({ spark: PLAYER_SPARK_MAX, sparkLevel: 0.25 });
    expect(one.sparkCount).toBe(1);
    expect(slots(playerSequence(one, SPARKING_LEAVES.length))).toEqual(SPARKING_LEAVES);
    expect(slots(playerSequence({ ...one, sparkCount: 2 }, SPARKING_LEAVES.length))).not.toEqual(
      SPARKING_LEAVES,
    );
  });
});
