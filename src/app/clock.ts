/**
 * @role The injected clock every scheduling decision reads — live and offline return
 *       `ctx.currentTime`, tests return a number they set.
 */
export type Clock = {
  /** Seconds. Monotonic within a host; the unit every envelope's `at` is stated in. */
  now(): number;
};

/**
 * The live clock until M2: wall time, in seconds so every envelope's `at` keeps its unit.
 * The moment an `AudioContext` exists, the live host reads `ctx.currentTime` instead.
 */
export function realTimeClock(): Clock {
  return { now: () => performance.now() / 1000 };
}

/** The test clock: a number you set. Time moves only when a test says so. */
export function manualClock(start = 0): Clock & { set(t: number): void } {
  let t = start;
  return {
    now: () => t,
    set: (next) => {
      t = next;
    },
  };
}
