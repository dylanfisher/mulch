/**
 * @role What dragging a planted ground about on the source actually does: where a chip lands, how
 *   wide it may be resized to, and which pointer is allowed to move it. Out of the component for
 *   the reason the pile's arithmetic is (0253): a static render never drags, so this is the only
 *   place the gesture can be proven, and a chip dragged off the end of the file is the picture
 *   failing silently at a setting the surface's one control reaches.
 * @instead The picture this drives → src/ui/sketch/parts/SketchPartGround.tsx. The beds themselves
 *   → src/ui/sketch/sketchWalk.ts.
 */
import { fixtureAt, type SketchBed } from "@/ui/sketch/sketchWalk";

/** The narrowest a bed can be dragged to — under this a chip is a line and has nothing to grab. */
export const BED_LEAST = 0.02;

/**
 * What a hand has hold of: which pointer, which bed, whether it is moving or resizing it, and
 * where both stood when it took hold — so a drag is an offset from the grab and never a jump to
 * the pointer, and a second finger cannot drive the first one's chip.
 */
export type Grab = {
  pointer: number;
  index: number;
  edge: boolean;
  from: number;
  at: number;
  span: number;
};

/** Taking hold: the bed's own place is read once, here, and every later move is measured off it. */
export function grabbed(
  beds: readonly SketchBed[],
  index: number,
  edge: boolean,
  from: number,
  pointer: number,
): Grab {
  const bed = fixtureAt(beds, index, "bed");
  return { pointer, index, edge, from, at: bed.at, span: bed.span };
}

/**
 * The beds after a pointer has moved to `at`. Nothing moves unless the pointer that took hold is
 * the one that moved: a second finger pressing a second chip would otherwise drive this one's drag
 * from wherever it happened to be.
 *
 * Both amounts are clamped to the file rather than to the picture, because the picture is the
 * file: a chip whose right edge is past one is drawn outside the box it is read in, and a chip
 * narrower than `BED_LEAST` cannot be taken hold of again.
 */
export function dragged(
  beds: readonly SketchBed[],
  held: Grab | null,
  pointer: number,
  at: number,
): readonly SketchBed[] {
  if (held === null || held.pointer !== pointer) return beds;
  const by = at - held.from;
  return beds.map((bed, index) => {
    if (index !== held.index) return bed;
    if (held.edge) {
      return { ...bed, span: Math.min(1 - bed.at, Math.max(BED_LEAST, held.span + by)) };
    }
    return { ...bed, at: Math.min(1 - bed.span, Math.max(0, held.at + by)) };
  });
}

/**
 * Letting go, on every way a press can end and not on `pointerup` alone: a cancelled gesture or a
 * lost capture leaves the hold set otherwise, and the next pointer to cross a chip drags it
 * without ever having been pressed. A different pointer ending its own gesture leaves this one.
 */
export function letGo(held: Grab | null, pointer: number): Grab | null {
  return held === null || held.pointer === pointer ? null : held;
}
