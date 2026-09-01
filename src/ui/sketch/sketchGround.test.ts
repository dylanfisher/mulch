import { describe, expect, it } from "vitest";

import { BED_LEAST, dragged, grabbed, letGo } from "@/ui/sketch/sketchGround";
import { SKETCH_BEDS } from "@/ui/sketch/sketchWalk";

/** The first two of the fixture, since every case here is about one chip and its neighbour. */
const FIRST = 0;
const SECOND = 1;

/** One pointer, and a second one that never took hold of anything. */
const HAND = 1;
const OTHER = 2;

/** Where the fixture's first bed opens and how much it holds, so a case can say what moved. */
function bedAt(beds: readonly { at: number; span: number }[], index: number) {
  const bed = beds[index];
  if (bed === undefined) throw new Error(`no bed ${index}`);
  return bed;
}

describe("dragging a planted ground", () => {
  it("moves a chip by the distance the pointer moved, not to where the pointer is", () => {
    const held = grabbed(SKETCH_BEDS, FIRST, false, 0.5, HAND);
    const moved = dragged(SKETCH_BEDS, held, HAND, 0.6);
    // Grabbed at 0.5 and moved to 0.6 is a step of a tenth, wherever in the chip it was taken.
    expect(bedAt(moved, FIRST).at).toBeCloseTo(bedAt(SKETCH_BEDS, FIRST).at + 0.1);
    // And nothing else moved: a drag is one chip's.
    expect(bedAt(moved, SECOND)).toEqual(bedAt(SKETCH_BEDS, SECOND));
  });

  it("resizes from the edge and leaves where it opens alone", () => {
    const held = grabbed(SKETCH_BEDS, FIRST, true, 0.5, HAND);
    const sized = dragged(SKETCH_BEDS, held, HAND, 0.58);
    expect(bedAt(sized, FIRST).at).toBe(bedAt(SKETCH_BEDS, FIRST).at);
    expect(bedAt(sized, FIRST).span).toBeCloseTo(bedAt(SKETCH_BEDS, FIRST).span + 0.08);
  });

  it("keeps a chip inside the file at both ends", () => {
    const held = grabbed(SKETCH_BEDS, FIRST, false, 0.5, HAND);
    // Dragged far off the head and far off the tail: the chip stops at the file, not at the
    // pointer, because a chip drawn past one is drawn outside the box it is read in.
    expect(bedAt(dragged(SKETCH_BEDS, held, HAND, -5), FIRST).at).toBe(0);
    const tail = bedAt(dragged(SKETCH_BEDS, held, HAND, 5), FIRST);
    expect(tail.at).toBeCloseTo(1 - bedAt(SKETCH_BEDS, FIRST).span);
    expect(tail.at + tail.span).toBeLessThanOrEqual(1);
  });

  it("never resizes a chip narrower than a hand can take hold of, or past the end", () => {
    const shrink = grabbed(SKETCH_BEDS, FIRST, true, 0.5, HAND);
    expect(bedAt(dragged(SKETCH_BEDS, shrink, HAND, -5), FIRST).span).toBe(BED_LEAST);
    const grow = bedAt(dragged(SKETCH_BEDS, shrink, HAND, 5), FIRST);
    expect(grow.at + grow.span).toBeCloseTo(1);
  });

  /**
   * The whole reason a grab carries a pointer at all. Two fingers on one picture is not exotic on
   * a trackpad or a touchscreen, and without the guard the chip the first finger is holding jumps
   * to wherever the second one happens to be.
   */
  it("moves nothing for a pointer that never took hold", () => {
    const held = grabbed(SKETCH_BEDS, FIRST, false, 0.5, HAND);
    expect(dragged(SKETCH_BEDS, held, OTHER, 0.9)).toBe(SKETCH_BEDS);
  });

  it("moves nothing when nothing is held", () => {
    expect(dragged(SKETCH_BEDS, null, HAND, 0.9)).toBe(SKETCH_BEDS);
  });
});

describe("letting a planted ground go", () => {
  it("lets go for the pointer that took hold", () => {
    const held = grabbed(SKETCH_BEDS, FIRST, false, 0.5, HAND);
    expect(letGo(held, HAND)).toBeNull();
  });

  /**
   * And keeps the hold when a different pointer ends its own gesture. Without this, a second
   * finger lifting anywhere on the picture drops the drag the first one is still making.
   */
  it("keeps the hold when another pointer ends", () => {
    const held = grabbed(SKETCH_BEDS, FIRST, false, 0.5, HAND);
    expect(letGo(held, OTHER)).toBe(held);
  });
});
