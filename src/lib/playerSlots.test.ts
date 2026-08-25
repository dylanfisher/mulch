/**
 * @role What the grid's mask promises: a full one is the identity, a sparse one is snapped to the
 *   nearest permitted slot the way a jump wraps, an empty one is loud rather than answering a slot
 *   nothing permits, and the mask a source's transients make is a read of onsets and never of
 *   anything a machine measured at walk time (0165).
 * @instead What a walk does under one — the same draws an unmasked pattern takes, snapped, the
 *   first landing included → src/lib/playerWalk.test.ts, the suite the walk's own cases are in.
 */
import { describe, expect, it } from "vitest";

import {
  maskFromOnsets,
  nearestSlot,
  PLAYER_GRID,
  PLAYER_MASK_MAX,
  PLAYER_SLOTS,
  slotAllowed,
  withSlot,
} from "./playerSlots.ts";

/** The loop the grid divides: two seconds over sixteen divisions is 125ms each. */
const LOOP = { in: 1, out: 3 };

/** The mask permitting exactly the slots named, which is what a hand's presses build. */
const only = (...slots: readonly number[]): number =>
  slots.reduce((mask, slot) => withSlot(mask, slot, true), 0);

// One case per claim the mask makes, so the length is how many claims there are rather than how
// much this block decides. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the grid a pattern lands on", () => {
  it("permits every slot under a full mask, and reads each bit back as the slot it is", () => {
    for (let slot = 0; slot < PLAYER_SLOTS; slot++) {
      expect(slotAllowed(PLAYER_MASK_MAX, slot)).toBe(true);
      expect(slotAllowed(only(slot), slot)).toBe(true);
      expect(slotAllowed(withSlot(PLAYER_MASK_MAX, slot, false), slot)).toBe(false);
    }
  });

  // The identity, and the whole of why a masked pattern is not a second walk: every slot of the
  // grid is permitted under a full mask, so the snap answers what it was handed.
  it("leaves every slot where it was under a full mask", () => {
    for (let slot = 0; slot < PLAYER_SLOTS; slot++) {
      expect(nearestSlot(PLAYER_MASK_MAX, slot)).toBe(slot);
    }
  });

  it("snaps to the nearest permitted slot, measured around the grid the way a jump wraps", () => {
    const mask = only(0, 8);
    expect(nearestSlot(mask, 1)).toBe(0);
    expect(nearestSlot(mask, 7)).toBe(8);
    expect(nearestSlot(mask, 9)).toBe(8);
    // Fifteen is one behind zero around the wrap, not fifteen ahead of it.
    expect(nearestSlot(mask, 15)).toBe(0);
  });

  // A tie has to break the same way on every machine, and forward is the direction the loop is
  // read in: exactly between two permitted slots, the landing takes the one ahead.
  it("breaks a tie forward", () => {
    expect(nearestSlot(only(2, 6), 4)).toBe(6);
    expect(nearestSlot(only(0, 8), 4)).toBe(4 + 4);
  });

  // Loud rather than answering a slot nothing permits: `assertPlayer` refuses an empty mask, so
  // reaching here with zero is a spec that came from somewhere other than the validator.
  it("throws on a mask that permits nothing", () => {
    expect(() => nearestSlot(0, 0)).toThrow(/permits no slot/u);
  });

  it("marks the slot each onset inside the loop falls in, and no others", () => {
    // A loop from 1s to 3s over sixteen slots is 125ms a slot: 1.0 is slot 0, 1.3 is slot 2,
    // 2.5 is slot 12. The two outside the loop reach nothing.
    const mask = maskFromOnsets([0.5, 1, 1.3, 2.5, 3.2], LOOP);
    expect(PLAYER_GRID.filter((slot) => slotAllowed(mask, slot))).toEqual([0, 2, 12]);
  });

  // The last slot holds the edge: an onset a float's breadth under `out` is inside the loop and
  // has to land somewhere, and `PLAYER_SLOTS` is one past the grid.
  it("lands an onset at the very end of the loop in the last slot", () => {
    expect(nearestSlot(maskFromOnsets([3 * (1 - Number.EPSILON)], LOOP), 0)).toBe(PLAYER_SLOTS - 1);
  });

  // Nothing to send rather than a mask nobody could play: the gesture offers nothing, and
  // `assertPlayer` would refuse a zero anyway.
  it("makes no mask of a loop no onset falls in, or of a loop with no width", () => {
    expect(maskFromOnsets([0.5, 4], LOOP)).toBe(0);
    expect(maskFromOnsets([1], { in: 1, out: 1 })).toBe(0);
  });
});
