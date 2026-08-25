/**
 * @role The shared jump clock: how often any jumping yard's next step may begin, and the
 *   arithmetic that puts a step onto the next tick of it (0097). Declared here rather than in
 *   src/lib/player.ts because that file is at the hard cap and each family of the module's numbers
 *   now sits in a module of its own beside what reads it (0045, P119, P123). Pure maths: no clock
 *   of its own, no context and no React — a tick is a function of a number and a period.
 * @instead The one validator a session's clock comes through, which is where every durable number
 *   of this module is checked → `assertSync` in src/lib/player.ts. What waits for a tick — the
 *   queue end a jumping pass arms from → src/audio/player.ts. The dial that sets one →
 *   src/ui/SyncClock.tsx.
 */

/**
 * The shared jump clock, in seconds: how often any jumping yard's next step may begin. Wall
 * seconds rather than slots, because seconds are the one thing yards with different loops can
 * share — a slot is a sixteenth of whatever loop its own deck holds, and no two decks need hold
 * the same one (P68, 0097).
 *
 * An eighth of a second at the short end, where a clock is faster than the bursts it is gathering
 * and gathers nothing; eight seconds at the long end, past which two yards landing together is no
 * longer something a listener hears as together.
 */
export const SYNC_MIN_SECS = 0.125;
export const SYNC_MAX_SECS = 8;

/** A tick is a multiple of the period, so a step already on one must not be pushed to the next. */
const SYNC_TOLERANCE = 1e-9;

/**
 * When the next step may begin: `at` itself with no clock, and otherwise the first tick at or
 * after it. Ticks are counted from the context's own zero and from nothing else — never from
 * whichever deck happened to start first — which is what keeps a synced render a function of the
 * session rather than of the order its yards were played (0097, 0068).
 */
export const syncedFrom = (at: number, sync: number | null): number =>
  sync === null ? at : Math.ceil(at / sync - SYNC_TOLERANCE) * sync;
