/**
 * @role The seconds one landing occupies, how much buffer it has read into itself, and the window
 *   of buffer one slot of it loops: the pure arithmetic the pass lays a step down by and the
 *   cursor reads a step back by. Out of src/audio/player.ts because that file sits at the hard cap
 *   and none of it touches the graph (0045).
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

/** The window of buffer one slot's source loops, and where inside it that source starts. */
export type SlotRead = {
  /** The window's own beginning, in buffer seconds read forwards. */
  from: number;
  /** How long it is: the burst at its rate, or the whole bed where the burst outlives it. */
  span: number;
  /** How far into that window, forwards, the slot this step landed on begins — nought unless the
   *  burst wrapped, and what the cursor adds before it takes its modulo. */
  enters: number;
  /** The offset the source is started at, in the buffer it was handed: the slot itself forwards,
   *  and the mirror of the window's own end where the landing reads backwards. */
  reads: number;
};

/**
 * Where one slot reads and how much of the buffer it loops there.
 *
 * A burst shorter than what is left of the bed is the window it asks for, looped from the slot:
 * the read it always was. A burst that **outlives** the bed from where it landed loops the whole
 * bed instead, entered at the slot — so it plays its slot, runs off the bed's end and carries on
 * from the bed's head rather than snapping back to the slot every few hundred milliseconds. That
 * is what makes a sixteen-second burst over a two-second loop a loop being played rather than a
 * fragment of one stuttered (`PLAYER_BURST_MAX`, src/lib/player.ts). The bed's own end and never
 * the buffer's, for the reason the clamp here had: a landing on the last slot of a moved loop that
 * read on past it would read audio the pattern never chose.
 *
 * Backwards it is the same window mirrored — a point `t` of the buffer is `duration - t` of the
 * reversed copy, so `[from, from + span)` is entered at `duration - from - span` and walked to its
 * start. A wrapping landing therefore enters at the bed's **end** and walks down through the whole
 * of it: read backwards, a burst that covers the bed has no slot left to begin at, only a phase,
 * and entering where the clamped read already entered keeps that subtraction exactly as it was.
 *
 * Floored at zero, and it has to be: the forward path never subtracts, while this one takes two
 * independently rounded quantities away from the duration. A loop ending on the clip's own end and
 * starting after zero recomputes its grid a couple of ulps past its out point, so the last slot of
 * it mirrors to a few femtoseconds below zero — which `start` answers with a `RangeError` and
 * `loopStart` answers by ignoring the loop points and repeating the whole reversed clip.
 */
export function slotRead(
  /** Where the slot begins and where the bed holding it does, both in buffer seconds. */
  at: number,
  bed: { from: number; span: number },
  /** The buffer seconds this burst asks for: its wall length at the rate it is read. */
  want: number,
  duration: number,
  reversed: boolean,
): SlotRead {
  const room = bed.from + bed.span - at;
  const wraps = want > room;
  const from = wraps ? bed.from : at;
  const span = wraps ? bed.span : want;
  return {
    from,
    span,
    enters: at - from,
    reads: reversed ? Math.max(0, duration - from - span) : at,
  };
}
