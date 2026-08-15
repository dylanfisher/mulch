/**
 * @role A registry-bound parameter knob that sends the generic param.set command, and — while
 *   Option is held — records its own movement into one whole-lane automation command (0024).
 */
import { memo, useCallback, useRef } from "react";

import type { Instrument } from "@/app/facade";
import { PARAMS, type ParamId } from "@/audio/params";
import { repeatedLane, type AutomationPoint } from "@/lib/automation";
import type { DeckId, DeckState } from "@/state/store";
import { Knob } from "@/ui/Knob";
import { useAltHeld } from "@/ui/shortcuts";

/**
 * The seconds a recorded gesture is tiled across so it plays back on a loop: the deck's loop when
 * it has one, otherwise all of its audio. Derived here so both call sites ask the same question.
 */
export const automationWindow = (state: DeckState): number =>
  state.loop === null ? state.duration : state.loop.out - state.loop.in;

// Over the line cap by design: what is here is one control's three mutually exclusive gestures —
// record, clear, plain set — and the props they read. Splitting them means hooks with one caller
// each and the gesture boundary in two files. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export const ParameterKnob = memo(function ParameterKnob({
  instrument,
  deck,
  param,
  value,
  automated,
  repeatWindow,
}: {
  instrument: Instrument;
  deck: DeckId;
  param: ParamId;
  value: number;
  /** Whether this parameter currently holds a lane — a normal move is what clears it. */
  automated: boolean;
  /** Seconds a recorded gesture repeats across; see `automationWindow`. */
  repeatWindow: number;
}) {
  const spec = PARAMS[param];
  const armed = useAltHeld() && spec.automation !== undefined;
  /** The gesture being recorded. A ref, never state: no draft point re-renders anything. */
  const recording = useRef<AutomationPoint[] | null>(null);

  const onChange = useCallback(
    (next: number) => {
      const set = { t: "param.set", deck, param, value: next } as const;
      if (armed) {
        // probe().at is the same clock Envelope.at and every stored point are on (0022).
        (recording.current ??= []).push({ at: instrument.probe().at, value: next });
        instrument.send(set);
        return;
      }
      // Option is the recording boundary, not the pointer: a knob moved unarmed is an ordinary
      // move, so anything recorded before the key came up is no longer part of a gesture (0024).
      recording.current = null;
      if (automated) {
        // Moving an automated knob normally clears its lane, and the value that replaced it
        // travels in the same transaction so one undo takes both back (0024).
        instrument.send({
          t: "history.group",
          commands: [{ t: "automation.set", deck, param, points: [] }, set],
        });
        return;
      }
      instrument.send(set);
    },
    [armed, automated, instrument, deck, param],
  );

  /**
   * The end of a gesture, which is where the recording either becomes one lane — repeated so it
   * keeps playing — or is dropped. Pointer events from the knob bubble here, which is where the
   * gesture, not the value, is known to be over. Only a deliberate release with Option still down
   * commits: a cancel, a lost capture or a released Option abandons, the way AutomationLane's
   * `finish` does.
   */
  const finish = useCallback(
    (commit: boolean) => {
      const recorded = recording.current;
      recording.current = null;
      if (!commit || !armed || recorded === null || recorded.length === 0) return;
      instrument.send({
        t: "automation.set",
        deck,
        param,
        points: repeatedLane(recorded, repeatWindow),
      });
    },
    [armed, instrument, deck, param, repeatWindow],
  );
  const onPointerUp = useCallback(() => {
    finish(true);
  }, [finish]);
  const onPointerCancel = useCallback(() => {
    finish(false);
  }, [finish]);
  const onLostPointerCapture = useCallback(() => {
    finish(false);
  }, [finish]);

  /**
   * Every gesture starts from nothing. The knob captures the pointer, and a gesture can end
   * without any of the three ending events reaching this wrapper — the element unmounting
   * mid-drag — which would otherwise leave points in the ref for the next drag to append to,
   * recording one lane out of two gestures. AutomationLane guards the same way.
   */
  const onGestureStart = useCallback(() => {
    recording.current = null;
  }, []);

  return (
    <div
      // The reveal: every automatable knob is visibly armed while Option is down, and the flag is
      // readable by ./scripts/smoke without depending on a colour.
      data-automation={armed ? "armed" : "off"}
      className={armed ? "rounded-md ring-1 ring-primary" : undefined}
      onPointerDown={onGestureStart}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onLostPointerCapture}
    >
      <Knob
        label={spec.label}
        value={value}
        onChange={onChange}
        min={spec.min}
        max={spec.max}
        defaultValue={spec.default}
        curve={spec.curve ?? "linear"}
        size="sm"
        {...(spec.step === undefined ? {} : { step: spec.step })}
      />
    </div>
  );
});
