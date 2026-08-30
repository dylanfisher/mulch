/**
 * @role The one RAF loop (docs/plan.md §4): it starts with its first subscriber, stops with its
 *   last, and runs every registered callback once per frame. Callbacks peek, write refs and
 *   paint — nothing per-frame ever enters React state. Work that wants a cadence slower than the
 *   frame rate takes a budget on this loop (`paced`) rather than a subscription of its own.
 * @instead A component calling requestAnimationFrame itself is the second loop plan §5 names —
 *   register here. A value that changes discretely → subscribe to the store.
 */
import { useEffect, useRef } from "react";

const callbacks = new Set<() => void>();
let frame: number | null = null;

/**
 * What the last frame's callbacks cost, in milliseconds — measured only while something is
 * watching, because two clock reads a frame is not nothing and the number has one reader. With
 * nobody measuring this loop pays one boolean test per frame, which is the whole cost of a
 * closed debug console.
 */
let measuring = false;
let costMs = 0;

/** Start or stop measuring. Stopping clears the number rather than leaving a stale one behind. */
export function measureFrameCost(enabled: boolean): void {
  measuring = enabled;
  if (!enabled) costMs = 0;
}

/** The last measured frame cost in milliseconds, or 0 while nothing is measuring. */
export function frameCostMs(): number {
  return costMs;
}

/** How many frames this loop has run. Raised at the top of the tick, so every callback inside one
 *  frame reads the same number. */
let stamp = 0;

/**
 * Which frame the loop is on, for a read many callbacks share inside one of them: a caller that
 * peeks once and hands the answer to forty painters tells "again, this frame" from "a new frame"
 * by comparing this against the one it cached, which is a memo of what cannot change rather than a
 * second clock or a subscription of its own (0070).
 *
 * It moves only inside the tick, so a cache keyed on it is only honest for a caller *on* this loop:
 * one reading between frames, or with the loop stopped, holds whatever the last frame left and is
 * never told. Read it from a frame callback or not at all.
 */
export function frameStamp(): number {
  return stamp;
}

function tick(): void {
  // Cleared before the callbacks run: this id has already fired, so a subscribe during the
  // loop below must see an honest "nothing scheduled" — otherwise an unsubscribe-then-
  // subscribe inside one tick leaves its fresh frame overwritten by the tail, un-cancellable,
  // and every callback runs twice a frame forever after.
  frame = null;
  stamp += 1;
  const started = measuring ? performance.now() : 0;
  for (const callback of callbacks) callback();
  // The console's own paint is one of those callbacks, deliberately: what it reports is what
  // this frame actually cost, including the cost of reporting it.
  if (measuring) costMs = performance.now() - started;
  if (callbacks.size > 0) frame ??= requestAnimationFrame(tick);
}

/** Run `callback` every frame until the returned unsubscribe is called. */
export function onFrame(callback: () => void): () => void {
  callbacks.add(callback);
  frame ??= requestAnimationFrame(tick);
  return () => {
    callbacks.delete(callback);
    if (callbacks.size === 0 && frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  };
}

/**
 * A budget on the one loop rather than a subscription of its own: `ask()` takes the work now if
 * `everyMs` has passed since it last ran, and otherwise leaves it standing until the frame it is
 * due on — one frame subscription for as long as something is standing, and none once nothing is.
 *
 * That is what lets a surface keep a cadence slower than the frame rate without a second RAF loop
 * (docs/plan.md §2) and without an idle page running frames: forty asks inside one frame are one
 * take, so a caller whose work is expensive costs the number of frames its gesture lasted rather
 * than the number of times it was asked.
 *
 * `everyMs` of nothing is every ask taken where it stands, which is what a surface with no cadence
 * of its own wants.
 */
export function paced(everyMs: number, work: () => void): { ask: () => void; stop: () => void } {
  let last = Number.NEGATIVE_INFINITY;
  let standing: (() => void) | null = null;
  const stop = (): void => {
    standing?.();
    standing = null;
  };
  const take = (): void => {
    stop();
    last = performance.now();
    work();
  };
  const due = (): boolean => performance.now() - last >= everyMs;
  return {
    ask: () => {
      if (due()) {
        take();
        return;
      }
      standing ??= onFrame(() => {
        if (due()) take();
      });
    },
    stop,
  };
}

/**
 * `onFrame` as an effect, registered only while `enabled` — an idle page runs zero frames.
 * The callback lives in a ref so a re-render never churns the registration.
 */
export function useOnFrame(callback: () => void, enabled: boolean): void {
  const latest = useRef(callback);
  useEffect(() => {
    latest.current = callback;
  });
  useEffect(
    () =>
      enabled
        ? onFrame(() => {
            latest.current();
          })
        : undefined,
    [enabled],
  );
}
