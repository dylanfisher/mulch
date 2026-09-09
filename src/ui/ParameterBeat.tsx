/**
 * @role The two gestures a registry parameter that declared `beat` wears beside its dial — a tap
 *   whose presses are the interval, and a hold that rounds whatever is written onto a division of
 *   the yard's own beat — and the runtime state a rack keeps for the second of them. Keyed on the
 *   declaration and never on the effect's id, which is the rule every face a card draws keeps
 *   (0055, 0205, 0325).
 * @instead The dial itself, and the lane a hand rides onto one → src/ui/ParameterKnob.tsx. The
 *   arithmetic — what a run of presses means, and which division of a beat a value lands on →
 *   src/lib/playerBurst.ts. The same two gestures on the mulcher card's burst, which are one
 *   card's and take a whole `PlayerSpec` patch → src/ui/playerBurstControls.ts and
 *   src/ui/PlayerDials.tsx.
 */
// One over the cap, and what is over it is the word each of the two controls says: the labels are
// the mulcher card's own, so a hand that learned Tap and Beat there reads the same two here, and
// the sentences are this surface's because what they name is a length of time rather than the
// burst (principle 1). Waived at the site rather than raised for the tree.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { useCallback, useMemo, useRef, useState } from "react";

import { rackLabel } from "@/lib/copy";
import { PLAYER_BEAT_LABEL, PLAYER_TAP_LABEL } from "@/lib/copyCard";
import { PARAM_BEAT_TOOLTIP, PARAM_TAP_TOOLTIP } from "@/lib/copyParams";
import { instanceHalf, paramKey, PARAMS, type ParamId } from "@/audio/params";
import type { EffectInstanceId } from "@/audio/effects/contract";
import { beatBurst, tapBurst, tapPress } from "@/lib/playerBurst";
import { Button } from "@/ui/components/button";
import { Toggle } from "@/ui/components/toggle";
import { ACTION_ICONS } from "@/ui/icons";
import { ParameterKnob, type ParameterKnobProps } from "@/ui/ParameterKnob";
import { Says } from "@/ui/Says";
// oxlint-enable import/max-dependencies

/**
 * What one rack knows about the beat: the tempo its yard is sounding, and which of its parameters
 * are being held to it.
 *
 * The holds are runtime state the yard keeps beside its folds, as the burst's hold is (P40, 0026,
 * src/ui/Deck.tsx): nothing durable, no command and no history entry — a value a hold rounded is
 * an ordinary value and the session stays the shape it is. Held above the rack's own fold for the
 * reason that fold is held above it, so putting a rack away and opening it again does not quietly
 * let go of every hold in it (P64).
 */
export type RackBeat = {
  /**
   * The **sounding** beat in bpm — `analysis.bpm * deckRate` — and nought where there is no grid
   * to round onto: a yard with no analysis, one whose analysis found no tempo, and the rack that
   * is no yard's, which hears no single deck at all (0031, 0121, 0320). The hold is then refused
   * rather than absent, and the tap is offered anyway.
   */
  bpm: number;
  /** Which (instance, parameter) pairs are held to it, by `paramKey`. */
  holds: ReadonlySet<string>;
  setHold: (key: string, held: boolean) => void;
};

/**
 * A rack holding nothing to the beat, which is what every rack opens holding. One value rather
 * than a set minted per mount: it is never written into — a press builds the next set from it.
 */
const NOTHING_HELD: ReadonlySet<string> = new Set<string>();

/**
 * What a value written to one parameter of one instance becomes, given what its rack is holding:
 * the nearest whole division of the sounding beat where that parameter declared `beat` and a hand
 * has the hold pressed, and the value itself everywhere else.
 *
 * **The one rounding in front of every `param.set` a card sends** — the dial, its readout, the tap
 * and the die all pass through it, which is the shape `heldPatch` already has on the mulcher card
 * (src/ui/playerBurstControls.ts). A rounding repeated per control is one place for the next
 * control to be forgotten at (principle 1, 0326).
 *
 * Bounded by the parameter's own declaration and not by the burst's: the sounding beat is the
 * measured tempo at the deck's rate, so at a doubled speed a thirty-second of it can fall under
 * the delay's own 10ms floor while still lying inside the burst's, and a value the reducer then
 * clamps is a hold that reads pressed over a time on no division at all.
 */
export function heldValue(
  beat: RackBeat,
  instance: EffectInstanceId | null,
  param: ParamId,
  value: number,
): number {
  const spec = PARAMS[param];
  if (spec.beat !== true || beat.bpm <= 0) return value;
  return beat.holds.has(paramKey(instance, param)) ? beatBurst(value, beat.bpm, spec) : value;
}

/** That state, minted where a rack is rendered from — one call per rack (src/ui/Deck.tsx). */
export function useRackBeat(bpm: number): RackBeat {
  const [holds, setHolds] = useState<ReadonlySet<string>>(NOTHING_HELD);
  const setHold = useCallback((key: string, held: boolean) => {
    setHolds((prev) => {
      const next = new Set(prev);
      if (held) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);
  return useMemo(() => ({ bpm, holds, setHold }), [bpm, holds, setHold]);
}

/**
 * The dial, and the two ways of arriving at its value that are not a turn — standing beside it
 * with nothing to open first, the shape the burst's own row has (0195).
 *
 * Neither is durable and neither is a second fact about the time: the tap writes the same
 * `param.set` the dial writes, and the hold rounds whatever is written, so what the graph plays is
 * one number in wall seconds however it was arrived at (principle 1, `docs/plan.md` §4).
 */
// One control's three pieces — the rounding in front of the command, the press the interval is a
// mean of, and the toggle that turns the rounding on — plus the paragraph beside each saying why
// it is written here. Splitting it means a hook with one caller.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function ParameterBeat({ beat, ...knob }: ParameterKnobProps & { beat: RackBeat }) {
  const { instrument, deck, instance, name, param, value } = knob;
  const spec = PARAMS[param];
  const where = name === undefined ? rackLabel(deck) : `${rackLabel(deck)} ${name}`;
  const key = paramKey(instance ?? null, param);
  const held = beat.holds.has(key);
  const bpm = beat.bpm;

  /** This parameter's half of `heldValue` above, handed to the dial and called by the tap. */
  const round = useCallback(
    // Bounded by this parameter's own declaration and not by the burst's: the sounding beat is the
    // measured tempo at the deck's rate, so at a doubled speed a thirty-second of it can fall under
    // the delay's own 10ms floor while still lying inside the burst's 5 — and a value the reducer
    // then clamps is a hold that reads pressed over a time on no division at all (0326).
    (next: number) => (held && bpm > 0 ? beatBurst(next, bpm, spec) : next),
    [held, bpm, spec],
  );

  /**
   * The presses one tap is the mean of. A ref and not state, for the burst's reason: nothing on
   * the page draws them, they outlive no gesture but this one, and a render per press would be a
   * card redrawn for a number that has not been written yet.
   */
  const taps = useRef<readonly number[]>([]);

  /**
   * What both gestures write: the same `param.set` a turn of the dial writes, and no `gesture.end`
   * after it — the burst row's own shape (src/ui/playerBurstControls.ts). A run of taps carries one
   * (deck, instance, parameter) key converging on one value, which is a gesture and not four, so
   * history keeps it as one entry and closes it when the presses stop; ending it per press would
   * leave three undos holding intermediate means nobody asked for (0067).
   */
  const send = useCallback(
    (next: number) => {
      instrument.send({ t: "param.set", deck, ...instanceHalf(instance), param, value: next });
    },
    [instrument, deck, instance, param],
  );

  /**
   * A press of the tap: the mean interval across the last few presses, rounded the way a turn of
   * the dial is — so a tap is held to the beat exactly when the dial is, and a tap of nought
   * presses or one writes nothing at all.
   *
   * `performance.now()` and not the wall clock: what is measured is an interval between two
   * moments in this page's life, which is the one thing a monotonic clock is for.
   */
  const onTap = useCallback(() => {
    const times = tapPress(taps.current, performance.now());
    taps.current = times;
    const next = tapBurst(times, spec);
    if (next !== null) send(round(next));
  }, [send, round, spec]);

  /**
   * The hold turned on or off, and the value standing rounded the moment it goes on: a toggle
   * that said nothing until the next turn of the dial would be a control a hand cannot tell it
   * pressed. Rounded here rather than through `round`, because `held` is still the old value
   * inside this call — a state setter is not a value read back.
   */
  const onHeld = useCallback(
    (next: boolean) => {
      beat.setHold(key, next);
      if (next && bpm > 0) send(beatBurst(value, bpm, spec));
    },
    [beat, key, bpm, send, value, spec],
  );

  return (
    <>
      <ParameterKnob {...knob} round={round} />
      <Says what={PARAM_TAP_TOOLTIP}>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={`${where} ${spec.label} ${PLAYER_TAP_LABEL}`}
          onClick={onTap}
        >
          <ACTION_ICONS.tap />
        </Button>
      </Says>
      {/* Refused and not absent where there is no grid: a control that comes and goes with the
          source is one a hand cannot learn is there (0121, 0173). On the rack that is no yard's
          that is every time — it hears no one deck — so there the tap works and this is greyed. */}
      <Says what={PARAM_BEAT_TOOLTIP}>
        <Toggle
          size="sm"
          variant="outline"
          pressed={held}
          onPressedChange={onHeld}
          disabled={bpm <= 0}
          aria-label={`${where} ${spec.label} ${PLAYER_BEAT_LABEL}`}
        >
          <ACTION_ICONS.snap data-icon="inline-start" />
          {PLAYER_BEAT_LABEL}
        </Toggle>
      </Says>
    </>
  );
}
