/**
 * @role The injected clock every scheduling decision reads — live and offline return
 *       `ctx.currentTime`, tests return a number they set.
 */
export type Clock = {
  /** Seconds. Monotonic within a host; the unit every envelope's `at` is stated in. */
  now(): number;
};
