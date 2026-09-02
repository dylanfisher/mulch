/**
 * @role The seconds one landing occupies, and how much buffer it has read into itself: the pure
 *   arithmetic the pass lays a step down by and the cursor reads a step back by. Out of
 *   src/audio/player.ts because that file sits at the hard cap and neither function touches the
 *   graph (0045).
 * @instead The pass that arms a step by this window → src/audio/player.ts. Where the seams of one
 *   step fall → src/audio/playerSeam.ts. How long a burst is, and how its repeats are cut →
 *   src/lib/player.ts.
 */
import { PLAYER_MIN_SLOT_SECS, repeatSpans } from "@/lib/player";
import type { PlayerStep } from "@/lib/playerWalk";
import type { Grid } from "./playerGrid";

/**
 * The seconds one step occupies: the rate it reads at, how long one burst of it sounds, when the
 * whole step ends and when the step after it begins. The player's own clock, and no longer the
 * grid's at all: only `rest` is measured in slots now, so a pattern's rhythm follows the loop
 * while the grain inside it does not (0119, P67).
 */
export function windowOf(
  step: PlayerStep,
  grid: Grid,
  deckRate: number,
  at: number,
): { rates: number[]; burstSecs: number; spans: number[]; ends: number; next: number } {
  // The deck's own rate times the ratio each repeat of this step is climbed to: a step that let go
  // of the hold reads at a rate of its own, and a step that climbs reads at one per repeat (0167).
  const rates = step.rates.map((ratio) => deckRate * ratio);
  // The landing's own first rung is what the rest is measured in the seconds of, and what the
  // source's loop window is cut at: the climb moves how fast the region is read and never which
  // region it is, so everything about *where* this landing lives is the rung it landed on.
  const rate = rates[0] ?? deckRate;
  const slotSecs = grid.slot / rate;
  // The burst is already wall seconds and is neither scaled by the grid nor divided by the rate:
  // a grain sounds for as long as it says, on any loop and at any speed, and the rate then decides
  // only how much buffer it gets through (0119). The floor is the shortest window that can carry
  // its fades — the same floor a loop too short to jump around is refused by. Below it two seams
  // overlap, which is a NotSupportedError (0089). `PLAYER_BURST_MIN` is now this same number, so
  // the clamp is unreachable from a valid spec and kept anyway: it is what keeps one arming ahead
  // of the next — `PLAYER_MIN_SLOT_SECS` per repeat is what makes `MAX_PLAYER_STEPS` cover the
  // re-arm cadence, and that has to hold whatever the knob's own floor becomes.
  const burstSecs = Math.max(step.burst, PLAYER_MIN_SLOT_SECS);
  // Where the repeats end is the sum of their own lengths rather than the count times one of them:
  // they stand equal only until the ratchet shrinks them, and how long each of them is belongs to
  // the module rather than to the transport, because the picture runs its row on the same sum
  // (`repeatSpans`, src/lib/player.ts — P118).
  const spans = repeatSpans(burstSecs, step.repeats, step.ratchet);
  const ends = spans.reduce((end, secs) => end + secs, at);
  return { rates, burstSecs, spans, ends, next: ends + step.rest * slotSecs };
}

/**
 * How much buffer one landing has read `secs` into itself: every repeat it has finished, each at
 * the rung it was climbed to, plus the part of the one it is inside.
 *
 * A sum over the windows the landing is already cut into rather than one multiplication, and that
 * is what P124 costs the cursor: a rate that moves between repeats means the read head is no
 * longer a linear function of the wall clock across a whole landing (0167). It stays exact
 * arithmetic and never an integral, because the ladder is stepped — inside one repeat the rate
 * does stand still.
 *
 * `spans` sums to the landing's own length, so a call at exactly its end walks every repeat and
 * lands on the total; the caller clamps there rather than past it.
 */
export function readInto(
  step: { rates: readonly number[]; spans: readonly number[] },
  secs: number,
): number {
  let read = 0;
  let left = Math.max(0, secs);
  // An indexed loop and no iterator: this runs once per deck per frame, and `entries()` allocates
  // one iterator per call and one pair per repeat — up to 65 objects a frame on a landing at
  // `PLAYER_REPEATS_MAX` (0070). The two fallbacks below are unreachable: `armStep` refuses a
  // landing whose ladder and windows are not the same length, which is where that can be said
  // loudly (principle 5).
  for (let repeat = 0; repeat < step.spans.length; repeat++) {
    const span = step.spans[repeat] ?? 0;
    const rate = step.rates[repeat] ?? 0;
    if (left <= span) return read + left * rate;
    read += span * rate;
    left -= span;
  }
  return read;
}
