/**
 * @role The injected clock every scheduling decision reads — live and offline return
 *       `ctx.currentTime`, tests return a number they set.
 */
export type Clock = {
  /** Seconds. Monotonic within a host; the unit every envelope's `at` is stated in. */
  now(): number;
};

/**
 * The clock of a live or offline context — the one every host uses now that audio exists.
 *
 * It is deliberately not wall time. A suspended context's clock stands still, so a scheduled
 * envelope waits for audio to actually be running rather than firing into a graph that cannot
 * hear it; and offline, `currentTime` is the render timeline, which is what lets one file of
 * stamped envelopes describe a whole performance rendered faster than realtime.
 *
 * The adapter lives here rather than in `src/audio` because `Clock` does, and `audio` may not
 * import `app`. It asks for the one member it reads rather than a whole `BaseAudioContext`,
 * which every context satisfies and a test can stand in for without a cast.
 */
export function contextClock(ctx: { readonly currentTime: number }): Clock {
  return { now: () => ctx.currentTime };
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
