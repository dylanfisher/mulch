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

/** Whether the loop's callbacks are running right now. */
let ticking = false;

/**
 * Whether the caller is inside a frame — the one place a read keyed on `frameStamp` is honest. A
 * reader many frame callbacks share, but that a commit reaches as well, reuses this frame's answer
 * in here and asks afresh out there (src/ui/deckHeard.ts).
 */
export function inFrame(): boolean {
  return ticking;
}

function tick(): void {
  // Cleared before the callbacks run: this id has already fired, so a subscribe during the
  // loop below must see an honest "nothing scheduled" — otherwise an unsubscribe-then-
  // subscribe inside one tick leaves its fresh frame overwritten by the tail, un-cancellable,
  // and every callback runs twice a frame forever after.
  frame = null;
  stamp += 1;
  const started = measuring ? performance.now() : 0;
  ticking = true;
  try {
    for (const callback of callbacks) callback();
  } finally {
    ticking = false;
  }
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

const ALWAYS = (): boolean => true;

/**
 * A share of each frame for work many callers do: yes to the first `count()` asks inside one frame
 * and no to the rest, which stand and ask again on the next. Handed to `paced` as its gate, it is
 * what spreads eight pictures that come due together over the frames after it instead of spending
 * all eight on one (0399). Keyed on `frameStamp`, so an ask between frames spends the last frame's.
 */
export function perFrame(count: () => number): () => boolean {
  let at = -1;
  let taken = 0;
  return () => {
    if (at !== stamp) {
      at = stamp;
      taken = 0;
    }
    if (taken >= count()) return false;
    taken += 1;
    return true;
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
 *
 * It is asked for rather than held, because a budget's length can move under it while the budget
 * stands: what the drift's painting costs is what the rack it is of asks for, and that is read off
 * the set the painting walks and not off the commit that built it (`looksPaintMs`,
 * src/ui/moireLooks.ts, 0284). A budget rebuilt to change its length would restart the gap it was
 * halfway through.
 *
 * `askWiped()` is the same ask for work that redraws something just wiped: it keeps the cadence but
 * never waits on `may`, because a share refused there is a blank canvas and not a slower picture.
 */
export function paced(
  everyMs: () => number,
  work: () => void,
  may: () => boolean = ALWAYS,
): { ask: () => void; askWiped: () => void; stop: () => void } {
  let last = Number.NEGATIVE_INFINITY;
  let standing: (() => void) | null = null;
  // A paint owed to a canvas that was just wiped: the ration spreads the animation's cadence, and a
  // wiped canvas refused its share would stand blank until one came round (0399).
  let wiped = false;
  const stop = (): void => {
    standing?.();
    standing = null;
  };
  const take = (): void => {
    stop();
    last = performance.now();
    wiped = false;
    work();
  };
  // The gate is asked last, and only of work that is otherwise due: a ration spends a share on the
  // ask it answers yes to, so asking it of work that would not have run spends a share for nothing.
  const due = (): boolean => performance.now() - last >= everyMs() && (wiped || may());
  const ask = (): void => {
    if (due()) {
      take();
      return;
    }
    standing ??= onFrame(() => {
      if (due()) take();
    });
  };
  return {
    ask,
    askWiped: () => {
      wiped = true;
      ask();
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
