/**
 * @role The injected clock every scheduling decision reads — live and offline return
 *       `ctx.currentTime`, tests return a number they set.
 */
export type Clock = {
  /** Seconds. Monotonic within a host; the unit every envelope's `at` is stated in. */
  now(): number;
};

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
