/**
 * @role How long a rack has to run before what it is doing stops depending on what it did — the
 *   arithmetic an export's warm-up is bounded by, as pure maths over seconds and gains.
 * @instead How long a given effect remembers → its own plugin's `settle`, which is where the
 *   values are (src/audio/effects/). Nothing here knows what a reverb or a tape is: it is told a
 *   memory in seconds and combines them.
 */

/**
 * Where a decaying thing is judged to be gone, in decibels. The same threshold the reverb's own
 * impulse is cut at (./impulse.ts) and for the same reason: 60dB down is the number every decay
 * time in this instrument is stated against, so a settle measured to any other one would be
 * settling to a different silence than the one the ear was promised.
 */
export const SETTLE_DB = 60;

/**
 * The floor no settle goes under. Every rack holds one-poles and biquads whose time constants are
 * milliseconds, and rather than have each of them declare a number that rounds to nothing, they
 * declare nothing and this is what they get. It is not a guess at their cost — it is a margin, and
 * a second of it is far past the longest of them.
 */
export const SETTLE_FLOOR_SECS = 1;

/**
 * How long a feedback loop takes to fall `SETTLE_DB`: one repeat costs `-20·log10(gain)` decibels,
 * so the answer is that many repeats of the loop's own length.
 *
 * **At a gain of one or more it is `Infinity`, and that is the point of this function.** A loop at
 * unity does not decay at all and one above it is bounded only by whatever saturates it, so what
 * such a loop holds is everything it has ever been given — there is no window that reconstructs it,
 * and an export of one has to render its whole history or render something else. `tape.feedback`
 * reaches 1.4 on purpose (src/audio/effects/tape.ts), so this is a case the instrument actually
 * has rather than a bound being defensive.
 */
export function feedbackSettleSecs(loopSecs: number, gain: number): number {
  if (!(loopSecs > 0)) return 0;
  if (gain >= 1) return Number.POSITIVE_INFINITY;
  if (gain <= 0) return loopSecs;
  return (loopSecs * SETTLE_DB) / (-20 * Math.log10(gain));
}

/**
 * The settle a whole rack needs: the longest memory in it, never under the floor. Max and not sum,
 * because the stages run at once — a reverb tailing for eight seconds beside a delay repeating for
 * four is settled when the reverb is, not twelve seconds later.
 *
 * One `Infinity` carries: a rack holding anything that remembers everything needs the whole
 * warm-up, whatever else is in it.
 */
export function rackSettleSecs(memories: Iterable<number>): number {
  let longest = SETTLE_FLOOR_SECS;
  for (const memory of memories) {
    if (!Number.isFinite(memory)) return Number.POSITIVE_INFINITY;
    if (memory > longest) longest = memory;
  }
  return longest;
}
