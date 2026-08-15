/**
 * @role A registry-bound parameter knob that sends the generic param.set command, and — while
 *   Option is held — records its own movement into one whole-lane automation command, marking
 *   the lane it owns and previewing it on hover (0028). While a lane plays, the dial follows it.
 */
import { memo, useCallback, useEffect, useRef } from "react";

import type { Instrument } from "@/app/facade";
import type { EffectInstanceId } from "@/audio/effects/contract";
import { paramKey, PARAMS, type ParamId } from "@/audio/params";
import { automationValueAt, laneSpan, type AutomationPoint } from "@/lib/automation";
import type { DeckId } from "@/state/store";
import { AutomationPreview } from "@/ui/AutomationPreview";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/ui/components/popover";
import { Knob } from "@/ui/Knob";
import { useAltHeld } from "@/ui/shortcuts";

/** The recorded gesture: when it started on the audio clock, and the points relative to that. */
type Recording = { start: number; points: AutomationPoint[] };

/**
 * A gesture that already committed, whose drag has not ended yet: the rest of that drag is inert
 * — it neither records nor clears, so the lane just committed survives it (0034).
 */
const DONE = "done";

// Over the line cap by design: what is here is one control's three mutually exclusive gestures —
// record, clear, plain set — plus the live read that paints the lane and the marker that says
// which of them this knob is holding. Splitting them means hooks with one caller each and the
// gesture boundary in two files. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export const ParameterKnob = memo(function ParameterKnob({
  instrument,
  deck,
  instance,
  name,
  param,
  value,
  lane,
  playing,
}: {
  instrument: Instrument;
  deck: DeckId;
  /** Which rack instance owns this value, or absent for one the deck owns itself (0030). */
  instance?: EffectInstanceId;
  /** What the owner is called on screen, for the names a reader and ./scripts/smoke read by. */
  name?: string;
  param: ParamId;
  value: number;
  /** The lane this value holds, or null. A normal move is what clears it. */
  lane: readonly AutomationPoint[] | null;
  /** Whether the deck is playing, which is the only time a lane has a phase to paint (0035). */
  playing: boolean;
}) {
  const spec = PARAMS[param];
  const where = name === undefined ? `Deck ${deck}` : `Deck ${deck} ${name}`;
  const armed = useAltHeld() && spec.automation !== undefined;
  /** The gesture being recorded. A ref, never state: no draft point re-renders anything. */
  const recording = useRef<Recording | typeof DONE | null>(null);

  /**
   * How far into its own cycle this knob's lane is, or null when it has none, nothing is playing
   * it, or a drag is in flight — a hand on the knob outranks the lane it is replacing.
   */
  const phase = useCallback((): number | null => {
    if (lane === null || recording.current !== null) return null;
    return instrument.peek(deck).automation.get(paramKey(instance ?? null, param)) ?? null;
  }, [deck, instance, instrument, lane, param]);

  const live = useCallback((): number | null => {
    const at = phase();
    return at === null || lane === null ? null : automationValueAt(lane, at, value);
  }, [lane, phase, value]);

  const onChange = useCallback(
    (next: number) => {
      // Spread rather than a shared object: a value lookup is (instance, param), and a deck
      // parameter names no instance at all (0030).
      const owner = instance === undefined ? {} : { instance };
      const set = { t: "param.set", deck, ...owner, param, value: next } as const;
      const current = recording.current;
      if (current === DONE) {
        // Still dragging after Option ended the recording: an ordinary move that must not clear
        // the lane the same drag just recorded.
        instrument.send(set);
        return;
      }
      if (armed) {
        // probe().at is the audio clock; what is stored is the distance from the start of this
        // gesture, so where the playhead was while it happened is never part of the lane (0028).
        const now = instrument.probe().at;
        const gesture = current ?? { start: now, points: [] };
        recording.current = gesture;
        gesture.points.push({ at: Math.max(0, now - gesture.start), value: next });
        instrument.send(set);
        return;
      }
      // A knob moved with no recording in flight is an ordinary move.
      recording.current = null;
      if (lane !== null) {
        // Moving an automated knob normally clears its lane, and the value that replaced it
        // travels in the same transaction so one undo takes both back (0024).
        instrument.send({
          t: "history.group",
          commands: [{ t: "automation.set", deck, ...owner, param, points: [] }, set],
        });
        return;
      }
      instrument.send(set);
    },
    [armed, lane, instrument, deck, instance, param],
  );

  /**
   * The end of a recording: whatever it captured becomes one lane, and the drag it belongs to is
   * left inert. Both endings come here — Option coming up, and the pointer coming up with Option
   * still down — because either is the performer saying the gesture is over.
   */
  const commit = useCallback(() => {
    const recorded = recording.current;
    if (recorded === null || recorded === DONE) return;
    recording.current = DONE;
    if (recorded.points.length === 0) return;
    const owner = instance === undefined ? {} : { instance };
    instrument.send({ t: "automation.set", deck, ...owner, param, points: recorded.points });
  }, [instrument, deck, instance, param]);

  // Option is the recording boundary, and letting it up is how a performer stops recording: the
  // lane commits there, without waiting for a pointer that may be held for the rest of the move,
  // and the transport starts replaying it from that moment (0034).
  useEffect(() => {
    if (!armed) commit();
  }, [armed, commit]);

  /**
   * The end of a gesture. Pointer events from the knob bubble here, which is where the gesture,
   * not the value, is known to be over. A deliberate release commits what Option has not already
   * committed; a cancel or a lost capture drops it.
   */
  const finish = useCallback(
    (keep: boolean) => {
      if (keep) commit();
      recording.current = null;
    },
    [commit],
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
   * recording one lane out of two gestures.
   */
  const onGestureStart = useCallback(() => {
    recording.current = null;
  }, []);

  // Not memoised: it is computed only for the knob that owns a lane, only while Option is held,
  // and only when something already re-rendered this control.
  const span = lane === null ? 0 : laneSpan(lane);

  return (
    <div
      className={armed ? "relative rounded-md ring-1 ring-primary" : "relative"}
      // The reveal: every automatable knob is visibly armed while Option is down, and the flag is
      // readable by ./scripts/smoke without depending on a colour.
      data-automation={armed ? "armed" : "off"}
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
        // A knob with no lane, or a deck that is not playing, hands the dial no live read at all
        // — and so registers no frame callback (0035).
        {...(lane !== null && playing ? { live } : {})}
      />
      {armed && lane !== null ? (
        // Only while Option is held: the marker belongs to the gesture that made the lane, and a
        // dot on every automated knob all the time is one more thing between a performer and the
        // sound (0028). Read-only — the lane is edited by riding the knob again.
        <Popover>
          <PopoverTrigger
            openOnHover
            delay={0}
            aria-label={`${where} ${spec.label} automation`}
            data-automated="true"
            className="absolute top-0 right-0 size-2 rounded-full bg-primary"
          />
          <PopoverContent side="top" align="end" className="w-48">
            {/* The length is the lane's own period, which is what it repeats on (0035). */}
            <PopoverTitle>{`${spec.label} · ${span.toFixed(2)}s`}</PopoverTitle>
            <AutomationPreview
              lane={lane}
              min={spec.min}
              max={spec.max}
              base={value}
              title={`${where} ${spec.label} lane, ${lane.length} points`}
              phase={phase}
            />
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
});
