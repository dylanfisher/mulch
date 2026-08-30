/**
 * @role The mulcher card's burst gestures as one hook: the presses a tap is the mean of, the
 *   toggle that holds a written burst to the beat, and the patch every control on the card writes
 *   through once that toggle is on. Its own file because the card is at the hard line cap and this
 *   is a whole gesture rather than a line of one (0045, `docs/plan.md` §"What a step costs").
 * @instead The arithmetic itself — what a run of presses means and which division of a beat a
 *   burst lands on → src/lib/playerBurst.ts. The two controls it feeds → src/ui/PlayerDials.tsx.
 *   The one `deck.player` its patch ends in, and the yard that holds the toggle's state →
 *   src/ui/PlayerCard.tsx and src/ui/Deck.tsx.
 */
import { useCallback, useRef } from "react";

import type { PlayerSpec } from "@/lib/player";
import { beatBurst, tapBurst, tapPress } from "@/lib/playerBurst";
import type { PlayerBurstProps } from "@/ui/PlayerDials";

// Three callbacks and the ref one of them reads, and what is over the cap is the paragraph on each
// saying why it is written where it is: this is one gesture's whole wiring, and splitting it would
// name half of one. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function usePlayerBurst({
  patch,
  beat,
  burst,
  held: [held, setHeld],
}: {
  /** The card's own dial patch: one `deck.player` per gesture, carrying the whole spec (0089). */
  patch: (fields: Partial<PlayerSpec>) => void;
  /** The sounding beat in bpm, nought for a deck with no grid (src/ui/PlayerCard.tsx). */
  beat: number;
  /** The burst standing on the card — the pattern's own, or the selected part's (0176). */
  burst: number;
  /** Whether a written burst is held to that beat, held by the yard beside its folds. */
  held: [held: boolean, setHeld: (held: boolean) => void];
}): {
  /** What every control on the card patches through, rounding included. */
  patch: (fields: Partial<PlayerSpec>) => void;
  controls: PlayerBurstProps;
} {
  /**
   * The card's patch with one rounding in front of it: with the hold on, a burst arriving from the
   * dial, from a number typed into its readout (0201) or from the tap below is written as the
   * nearest whole division of the beat. One place, because "rounds whatever is written" is one
   * rule and three writers, and a rounding repeated per control is three places for the fourth to
   * be forgotten at (principle 1). Every other field passes through untouched.
   */
  const heldPatch = useCallback(
    (fields: Partial<PlayerSpec>) => {
      const next = fields.burst;
      patch(
        held && beat > 0 && next !== undefined
          ? { ...fields, burst: beatBurst(next, beat) }
          : fields,
      );
    },
    [patch, held, beat],
  );
  /**
   * The presses one tap is the mean of. A ref and not state: nothing on the page draws them, they
   * outlive no gesture but this one, and a render per press would be a card redrawn for a number
   * that has not been written yet.
   */
  const taps = useRef<readonly number[]>([]);
  /**
   * A press of the tap: the mean interval across the last few presses, written as the burst
   * through the same patch the dial writes through — so a tap is held to the beat exactly when
   * the dial is, and a tap of nought presses or one writes nothing at all.
   *
   * `performance.now()` and not the wall clock: what is measured is an interval between two
   * moments in this page's life, which is the one thing a monotonic clock is for.
   */
  const onTap = useCallback(() => {
    const times = tapPress(taps.current, performance.now());
    taps.current = times;
    const next = tapBurst(times);
    if (next !== null) heldPatch({ burst: next });
  }, [heldPatch]);
  /**
   * The hold turned on or off, and the burst standing rounded the moment it goes on: a toggle that
   * said nothing until the next turn of the dial would be a control a hand cannot tell it pressed.
   * Rounded here rather than through `heldPatch`, because `held` is still the old value inside
   * this call — a state setter is not a value read back. It is one ordinary `deck.player` either
   * way, so it undoes, persists and archives like every other edit on the card (0089).
   */
  const onHeld = useCallback(
    (next: boolean) => {
      setHeld(next);
      if (next && beat > 0) patch({ burst: beatBurst(burst, beat) });
    },
    [setHeld, beat, burst, patch],
  );
  return { patch: heldPatch, controls: { bpm: beat, held, onHeld, onTap } };
}
