/**
 * @role The one RAF loop (docs/plan.md §4): it starts with its first subscriber, stops with its
 *   last, and runs every registered callback once per frame. Callbacks peek, write refs and
 *   paint — nothing per-frame ever enters React state.
 * @instead A component calling requestAnimationFrame itself is the second loop plan §5 names —
 *   register here. A value that changes discretely → subscribe to the store.
 */
import { useEffect, useRef } from "react";

const callbacks = new Set<() => void>();
let frame: number | null = null;

function tick(): void {
  for (const callback of callbacks) callback();
  frame = callbacks.size > 0 ? requestAnimationFrame(tick) : null;
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
