/**
 * @role The two ways of arriving at a burst that are not the dial: the mean interval a hand taps
 *   out, and the whole division of the beat a written burst is held to. Pure arithmetic on wall
 *   seconds — no clock, no PRNG, no analysis and no React; the times come in as numbers and the
 *   answer is a burst the dial could have been turned to.
 * @instead What a burst *is*, and the range and step it is turned on → src/lib/player.ts and
 *   docs/decisions/0119-a-burst-is-seconds-and-the-rest-is-slots.md. The controls that call these
 *   and the sounding beat they hand over → src/ui/PlayerDials.tsx and src/ui/PlayerCard.tsx. The
 *   words on those controls → src/lib/copyCard.ts. Snapping a *place* to the grid, which is the
 *   same gesture said for a point rather than a length → `snapLoop`, src/lib/analysis.ts.
 */

import { PLAYER_BURST_MAX, PLAYER_BURST_MIN, PLAYER_BURST_STEP } from "@/lib/player";
import { clamp, snapToStep } from "@/lib/range";

/**
 * How many presses one tap remembers. Four, so the mean is over the last three intervals: fewer
 * and a single unsteady press is the whole answer, more and a hand correcting itself is still
 * being averaged against the tempo it has left. The oldest is dropped on every press, so a tap
 * that keeps going follows the hand rather than settling on where it started.
 */
export const PLAYER_TAP_PRESSES = 4;

/**
 * The presses this tap is made of after one more at `at`, in milliseconds off a monotonic clock.
 * The oldest beyond `PLAYER_TAP_PRESSES` is dropped, and a gap longer than the longest burst the
 * dial can name starts the run again: an interval the burst cannot hold is not a tempo being
 * tapped, it is the last tap being left alone and a new one begun.
 */
export function tapPress(times: readonly number[], at: number): readonly number[] {
  const last = times.at(-1);
  const run = last === undefined || at - last > PLAYER_BURST_MAX * 1000 ? [] : times;
  return [...run.slice(1 - PLAYER_TAP_PRESSES), at];
}

/**
 * What those presses say the burst is: the mean interval between them, clamped onto the dial's
 * own range and stepped by its own step, so a tap can name nothing the dial cannot.
 *
 * Null for nought presses and for one — an interval needs two — which is what the press returns
 * when there is nothing to write yet rather than a burst it invented.
 */
export function tapBurst(times: readonly number[]): number | null {
  const first = times[0];
  const last = times.at(-1);
  if (first === undefined || last === undefined || times.length < 2) return null;
  const mean = (last - first) / (times.length - 1) / 1000;
  return snapToStep(mean, PLAYER_BURST_MIN, PLAYER_BURST_MAX, PLAYER_BURST_STEP);
}

/**
 * The whole divisions of a beat a held burst may land on: the beat itself, and the halvings down
 * to a thirty-second of one. That is what "a sixteenth, or the equivalent for a burst that long"
 * has to mean on a range spanning three orders of magnitude — the same six lengths at every
 * tempo, rather than one division that is the whole loop at 40bpm and inaudible at 200.
 */
export const PLAYER_BEAT_DIVISIONS = [1, 1 / 2, 1 / 4, 1 / 8, 1 / 16, 1 / 32] as const;

/**
 * `burst` rounded onto the nearest of those divisions of a beat of `bpm`, in wall seconds.
 *
 * **Nearest in ratio and not in difference**, because the divisions are a halving sequence and the
 * dial that draws them is logarithmic (`playerKnobs.ts`): measured by difference the top division
 * would take a third of the sweep and the bottom two would share a hair of it, so a hand turning
 * the dial with the hold on would fall to the beat itself and stay there. The crossover between
 * two divisions is their geometric mean, which is the middle of the dial's own travel between
 * them.
 *
 * Only divisions the dial can name are candidates, and the answer is stepped like any other value
 * it holds: a burst held to the beat is turned by that same dial afterwards, and a value between
 * two of its steps is one it would move off on the first arrow key. A beat with no division inside
 * the range at all — a bpm no analysis produces — holds nothing, so the burst is left where it is.
 */
export function beatBurst(burst: number, bpm: number): number {
  // A deck with no analysis, or one whose analysis found no tempo, has no grid at all — its
  // toggle is refused rather than absent (0121, 0173), so a call with one is a caller that
  // skipped that refusal and not a burst to guess at (principle 5).
  if (!(bpm > 0)) throw new RangeError(`a beat needs a tempo: ${bpm}bpm`);
  const beat = 60 / bpm;
  let best: number | null = null;
  let nearest = Infinity;
  for (const division of PLAYER_BEAT_DIVISIONS) {
    const secs = beat * division;
    if (secs < PLAYER_BURST_MIN || secs > PLAYER_BURST_MAX) continue;
    const away = Math.abs(Math.log(secs / burst));
    if (away >= nearest) continue;
    nearest = away;
    best = secs;
  }
  if (best === null) return clamp(burst, PLAYER_BURST_MIN, PLAYER_BURST_MAX);
  return snapToStep(best, PLAYER_BURST_MIN, PLAYER_BURST_MAX, PLAYER_BURST_STEP);
}
