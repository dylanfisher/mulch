/**
 * @role The skeleton every single-pointer drag on this instrument is built on: one gesture at a
 *   time, the capture that keeps the pointer reaching the surface however far it leaves it, the
 *   identity test that says a move, an up or a cancel belongs to the gesture in flight rather
 *   than to a second finger, and the two endings nobody sends an event for — a capture lost and
 *   a button already up. One gesture, one record, one history entry (0067), and a gesture that
 *   cannot end is the one thing a surface must never be left holding (0114).
 * @instead What a gesture reads, paints and finally commits belongs to the surface that owns it —
 *   src/ui/Knob.tsx, src/ui/LoopHandles.tsx, src/ui/Waveform.tsx, src/ui/listDrag.ts. Pixels and
 *   seconds → src/lib/timeline.ts.
 */

import { useEffect, useRef } from "react";

/** The one thing the skeleton asks of a surface's drag record: whose pointer it belongs to. */
type Pointered = { pointerId: number };

/**
 * A pointer arriving at the surface, as much of it as the skeleton reads: whose it is, and
 * whether a button is still down. `buttons` is only ever read on a move and a press — a
 * `pointerup` reports 0 for the button it is releasing, which is a release and not a loss.
 */
type Arriving = Pointered & { buttons: number };

/** What a surface holds instead of its own `useRef<Drag | null>` and the guards around it. */
export type PointerGesture<T extends Pointered> = {
  /** The drag in flight, or null — for a surface that has to know whether one is running. */
  held: () => T | null;
  /**
   * Capture on `target` and record the drag. Where capture goes is the caller's to say, because
   * it is not always the element pressed: the rack captures on the list, which outlives any card
   * the gesture moves. A second pointer landing mid-gesture is refused rather than allowed to
   * steal it, or the first pointer's overlay writes are orphaned with nobody left to clear them.
   * The lost-capture ending is wired here, on the element the capture was taken on (0114).
   */
  begin: (target: Element, event: Arriving, record: T) => void;
  /** The drag this event belongs to, or null when it belongs to no live gesture. */
  matched: (event: Arriving) => T | null;
  /** The same test, and the gesture is over: the record is cleared before it is handed back. */
  ended: (event: Pointered) => T | null;
};

/** The refs the operations below close over, and the only things about them a render can move. */
type Held<T> = {
  /** The drag in flight. */
  drag: { current: T | null };
  /** The surface's cancel path, re-read every render so it is never a stale closure. */
  cancel: { current: (record: T) => void };
  /** Gives back whatever `begin` took on the element it captured on: the listener and the
   *  capture itself. */
  release: { current: () => void };
};

/**
 * The capture taken and the lost-capture ending wired, both on the one element the caller named,
 * as a single closure that gives both back. Everything `begin` takes is undone by calling it.
 */
function capture(target: Element, pointerId: number, onLost: () => void): () => void {
  /**
   * A capture taken away while the button is still down, and only that. The release of a pointer
   * that ended properly reports its lost capture too, and nothing promises whether that report or
   * the `pointerup` arrives first (0072) — so a lost capture carrying no button is the ordinary
   * release, and the release is what ends that gesture.
   */
  const lost: EventListener = (event) => {
    if (Reflect.get(event, "buttons") !== 0) onLost();
  };
  target.setPointerCapture(pointerId);
  target.addEventListener("lostpointercapture", lost);
  return () => {
    target.removeEventListener("lostpointercapture", lost);
    // The capture outlives an ending nobody reported — the browser is still holding it — so it is
    // given back here, or every later press is retargeted at this element. Released after the
    // listener came off, so this gesture is not ended a second time by its own
    // `lostpointercapture`; that event still reaches anything above (0072, 0114).
    if (target.hasPointerCapture(pointerId)) target.releasePointerCapture(pointerId);
  };
}

/**
 * The four operations, over one surface's refs. A plain function rather than a closure inside
 * the hook so the hook stays readable at the line cap; it is called once per component.
 */
function operations<T extends Pointered>({ drag, cancel, release }: Held<T>): PointerGesture<T> {
  /** The record, cleared and handed back — one place, so the capture always comes off with it. */
  const clear = (): T | null => {
    const active = drag.current;
    drag.current = null;
    release.current();
    release.current = () => {};
    return active;
  };
  /** Cleared and abandoned: the two endings that arrive with no chance to commit anything. */
  const abandon = (): void => {
    const active = clear();
    if (active !== null) cancel.current(active);
  };
  /**
   * This gesture's own pointer, arriving with no button down: its release nobody saw, because
   * the window it was let go outside of sends neither `pointerup` nor `pointercancel`, so the
   * record would sit there refusing every later gesture. Ended here, before this event is
   * matched. Its own pointer and no other — a mouse hovering across a surface a finger is
   * dragging on reports `buttons === 0` for the whole of that drag.
   */
  const lapsed = (event: Arriving): void => {
    if (drag.current?.pointerId === event.pointerId && event.buttons === 0) abandon();
  };
  return {
    held: () => drag.current,
    begin: (target, event, record) => {
      lapsed(event);
      if (drag.current !== null) return;
      drag.current = record;
      release.current = capture(target, record.pointerId, abandon);
    },
    matched: (event) => {
      lapsed(event);
      const active = drag.current;
      return active !== null && active.pointerId === event.pointerId ? active : null;
    },
    ended: (event) => {
      const active = drag.current;
      if (active === null || active.pointerId !== event.pointerId) return null;
      return clear();
    },
  };
}

/**
 * One surface's drag, as a ref and the four operations every surface performed on its own copy
 * of it. The object is stable for the life of the component, so it can be a dependency of the
 * handlers built over it without rebuilding them.
 *
 * `abandon` is the surface's cancel path — what `pointercancel` runs, because an ending nobody
 * reported is not an ending that said where it meant to land: nothing is committed and whatever
 * the drag painted ahead of the store goes back to what the store holds (0114).
 */
export function usePointerGesture<T extends Pointered>(
  abandon: (record: T) => void,
): PointerGesture<T> {
  const drag = useRef<T | null>(null);
  const cancel = useRef(abandon);
  cancel.current = abandon;
  const release = useRef<() => void>(() => {});
  // Built once rather than memoized, so it is the same object for the life of the component with
  // no dependency list to keep honest — the operations close over these three refs and over
  // nothing else that a render can change.
  const gesture = useRef<PointerGesture<T> | null>(null);
  gesture.current ??= operations({ drag, cancel, release });
  // A gesture still held when the surface goes takes its capture target with it, and the browser
  // fires the lost capture at an element nobody is left to answer for: the listener would run the
  // last render's cancel path against a deck that no longer exists. It comes off with the
  // component, which is the one ending a pointer never reaches.
  useEffect(
    () => () => {
      release.current();
      release.current = () => {};
    },
    [],
  );
  return gesture.current;
}
