/**
 * @role The skeleton every single-pointer drag on this instrument is built on: one gesture at a
 *   time, the capture that keeps the pointer reaching the surface however far it leaves it, and
 *   the identity test that says a move, an up or a cancel belongs to the gesture in flight rather
 *   than to a second finger. One gesture, one record, one history entry (0067).
 * @instead What a gesture reads, paints and finally commits belongs to the surface that owns it —
 *   src/ui/Knob.tsx, src/ui/LoopHandles.tsx, src/ui/Waveform.tsx, src/ui/listDrag.ts. Pixels and
 *   seconds → src/lib/timeline.ts.
 */

import { useRef } from "react";

/** The one thing the skeleton asks of a surface's drag record: whose pointer it belongs to. */
type Pointered = { pointerId: number };

/** What a surface holds instead of its own `useRef<Drag | null>` and the guards around it. */
export type PointerGesture<T extends Pointered> = {
  /** The drag in flight, or null — for a surface that has to know whether one is running. */
  held: () => T | null;
  /**
   * Capture on `target` and record the drag. Where capture goes is the caller's to say, because
   * it is not always the element pressed: the rack captures on the list, which outlives any card
   * the gesture moves. A second pointer landing mid-gesture is refused rather than allowed to
   * steal it, or the first pointer's overlay writes are orphaned with nobody left to clear them.
   */
  begin: (target: Element, record: T) => void;
  /** The drag this event belongs to, or null when it belongs to no live gesture. */
  matched: (event: Pointered) => T | null;
  /** The same test, and the gesture is over: the record is cleared before it is handed back. */
  ended: (event: Pointered) => T | null;
};

/**
 * One surface's drag, as a ref and the four operations every surface performed on its own copy
 * of it. The object is stable for the life of the component, so it can be a dependency of the
 * handlers built over it without rebuilding them.
 */
export function usePointerGesture<T extends Pointered>(): PointerGesture<T> {
  const drag = useRef<T | null>(null);
  // Built into a ref rather than memoized, so it is the same object for the life of the
  // component with no dependency list to keep honest — the four operations close over `drag`
  // and over nothing else that a render can change.
  const gesture = useRef<PointerGesture<T> | null>(null);
  gesture.current ??= {
    held: () => drag.current,
    begin: (target, record) => {
      if (drag.current !== null) return;
      target.setPointerCapture(record.pointerId);
      drag.current = record;
    },
    matched: (event) => {
      const active = drag.current;
      return active !== null && active.pointerId === event.pointerId ? active : null;
    },
    ended: (event) => {
      const active = drag.current;
      if (active === null || active.pointerId !== event.pointerId) return null;
      drag.current = null;
      return active;
    },
  };
  return gesture.current;
}
