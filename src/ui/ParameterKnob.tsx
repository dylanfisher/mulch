/**
 * @role A registry-bound parameter knob that sends the generic param.set command, and — while
 *   Option is held — records the whole press, from the press to the release, into one whole-lane
 *   automation command, marking the lane it owns and previewing it on hover (0028, 0125). While
 *   a lane plays, the dial follows it.
 */
// One import over the cap, and the one over it is the noun the labels below say (0057): the
// word is declared once and imported, never typed into a label.
// oxlint-disable import/max-dependencies
import { memo, useCallback, useEffect, useRef } from "react";

import { PARAM_TOOLTIPS, yardLabel } from "@/lib/copy";
import type { Instrument } from "@/app/facade";
import type { EffectInstanceId } from "@/audio/effects/contract";
import { instanceHalf, paramKey, PARAMS, type ParamId } from "@/audio/params";
import { PARAM_RAMP_SECS, SAME_GESTURE_GAP_SECS } from "@/audio/ramp";
import { automationValueAt, type AutomationPoint } from "@/lib/automation";
import type { DeckId } from "@/state/store";
import { AutomationPreview } from "@/ui/AutomationPreview";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/ui/components/popover";
import { Knob } from "@/ui/Knob";
import { useAltHeld } from "@/ui/shortcuts";
// oxlint-enable import/max-dependencies

/**
 * The recorded gesture: when the press landed on the audio clock, the points relative to that,
 * and whether the hand ever moved — a press that rode nothing commits no lane (0028).
 */
type Recording = { start: number; points: AutomationPoint[]; moved: boolean };

/**
 * A gesture that already committed, whose drag has not ended yet: the rest of that drag is inert
 * — it neither records nor clears, so the lane just committed survives it (0034).
 */
const DONE = "done";

/**
 * The gesture a move belongs to: the press behind it, which is where it began and whose value is
 * its first point, or — for a move with nothing pressed, a keyboard nudge or a double-click reset
 * — the move itself. A move stamped at the same instant as the press replaces that first point,
 * because a lane collapses two points at one time last-write-wins.
 */
function openRecording(press: { start: number; value: number } | null, now: number): Recording {
  if (press === null) return { start: now, points: [], moved: false };
  return { start: press.start, points: [{ at: 0, value: press.value }], moved: false };
}

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
  /** Whether the deck is playing, which is the only time a lane's phase is moving (0035, 0040). */
  playing: boolean;
}) {
  const spec = PARAMS[param];
  const where = name === undefined ? yardLabel(deck) : `${yardLabel(deck)} ${name}`;
  const armed = useAltHeld() && spec.automation !== undefined;
  /**
   * The one place a registry value is turned into text: the precision is the parameter's own
   * declaration, so a cutoff reads whole Hz and a per-frame readout has a string to be unchanged
   * from rather than seventeen digits that never repeat (0064).
   */
  const format = useCallback(
    (at: number) => {
      // Rounded first, then re-signed: a parameter whose range crosses zero reaches values just
      // under it — a pan of -0.004, an EQ cut of -0.01 — and `toFixed` alone reads those as
      // "-0.0", a minus sign on a number the same call is displaying as nothing.
      const rounded = Number(at.toFixed(spec.precision));
      return (rounded === 0 ? 0 : rounded).toFixed(spec.precision);
    },
    [spec.precision],
  );
  /** The gesture being recorded. A ref, never state: no draft point re-renders anything. */
  const recording = useRef<Recording | typeof DONE | null>(null);
  /** Whether a pointer is down on this knob — which keyups belong to that drag and end nothing. */
  const dragging = useRef(false);
  /**
   * Where an armed press landed: the clock it landed on and the value that was under the hand,
   * until the first move of that press turns it into the recording above. Held apart from the
   * recording because this wrapper hears presses that are not a hand on the dial — the lane's own
   * popover renders through a portal, so its span dial and its title bubble their `pointerdown`
   * here along the React tree — and a recording opened by one of those would take the dial off
   * the lane it is painting (0035) for as long as that press lasted.
   */
  const pressed = useRef<{ start: number; value: number } | null>(null);

  /**
   * The (instance, param) this knob rides, as the key `peek()` files phases under — built here
   * rather than inside the frame callback below, because `paramKey` is a `JSON.stringify` and
   * this pair does not change between renders, let alone between frames (0070).
   */
  const key = paramKey(instance ?? null, param);

  /**
   * How far into its own cycle this knob's lane is, or null when it has none or a drag is in
   * flight — a hand on the knob outranks the lane it is replacing. A halted deck answers with the
   * phase it is holding, which is what the dial holds too (0040).
   */
  const phase = useCallback((): number | null => {
    if (lane === null || recording.current !== null) return null;
    return instrument.peek(deck).automation.get(key) ?? null;
  }, [deck, instrument, key, lane]);

  const live = useCallback((): number | null => {
    const at = phase();
    return at === null || lane === null ? null : automationValueAt(lane, at, value);
  }, [lane, phase, value]);

  const onChange = useCallback(
    (next: number) => {
      const owner = instanceHalf(instance);
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
        const gesture = current ?? openRecording(pressed.current, now);
        recording.current = gesture;
        const at = Math.max(0, now - gesture.start);
        const last = gesture.points.at(-1);
        // A move further than a pointer's own cadence from the one before it is a move out of a
        // stillness, which 0065 already reads as a move standing alone: what was heard was the
        // value held flat and then the immediate ramp, so that is what the lane keeps. Without
        // this the recording ramps across the stretch the hand did nothing in.
        if (last !== undefined && at - last.at > SAME_GESTURE_GAP_SECS) {
          gesture.points.push({ at: at - PARAM_RAMP_SECS, value: last.value });
        }
        gesture.points.push({ at, value: next });
        gesture.moved = true;
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
   *
   * The ending is a position in the lane and not only a boundary: the recording runs to it,
   * holding the last value flat across a stretch the hand rode nothing in, so the lane is the
   * whole press rather than the moving part of it.
   */
  const commit = useCallback(() => {
    const recorded = recording.current;
    if (recorded === null || recorded === DONE) return;
    // A press that never rode leaves nothing behind — not even the inert state, so the rest of
    // that drag is the ordinary move that clears a lane.
    if (!recorded.moved) {
      recording.current = null;
      return;
    }
    recording.current = DONE;
    const last = recorded.points.at(-1);
    const end = Math.max(0, instrument.probe().at - recorded.start);
    // Only a press has a release to run to. A recording opened by a keyboard nudge ends at the
    // value it reached, not at whenever the performer happened to let Option up — that would be a
    // lane as long as a modifier was held rather than as long as a gesture was.
    if (pressed.current !== null && last !== undefined && end > last.at) {
      recorded.points.push({ at: end, value: last.value });
    }
    const owner = instanceHalf(instance);
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
   * not the value, is known to be over. Only a cancel — the browser saying the gesture never
   * happened — drops what was ridden; a release and the lost capture that release takes with it
   * both commit, because they are two reports of one ending in an order nothing promises, and
   * whichever arrives second finds the ref already cleared (0072).
   */
  const finish = useCallback(
    (keep: boolean) => {
      if (keep) commit();
      recording.current = null;
      pressed.current = null;
      dragging.current = false;
      // The hand let go, which is the only place that knows it: history takes back a whole drag
      // rather than its last value, and this is the boundary that says which drag it was (0067).
      instrument.send({ t: "gesture.end" });
    },
    [commit, instrument],
  );
  const onPointerUp = useCallback(() => {
    finish(true);
  }, [finish]);
  const onPointerCancel = useCallback(() => {
    finish(false);
  }, [finish]);
  const onLostPointerCapture = useCallback(() => {
    finish(true);
  }, [finish]);
  /**
   * A knob nudged from the keyboard ends its gesture when the key comes up — an arrow sends a
   * value exactly the way a pointer move does, and the graph pays for a held rebuild at that
   * ending like any other (0090). Never during a pointer drag: the slider keeps focus for the
   * whole of one, so Option coming up mid-recording is a keyup here too, and ending the gesture
   * there would take back the lane that drag has just committed (0034) and split one drag into
   * two history entries (0067). The pointer's own three endings are the boundary for that drag.
   */
  const onKeyUp = useCallback(() => {
    if (!dragging.current) instrument.send({ t: "gesture.end" });
  }, [instrument]);

  /**
   * Every gesture starts from nothing. The knob captures the pointer, and a gesture can end
   * without any of the three ending events reaching this wrapper — the element unmounting
   * mid-drag — which would otherwise leave points in the ref for the next drag to append to,
   * recording one lane out of two gestures.
   *
   * A press made with Option down is where the recording begins, and the value under the hand is
   * its first point: holding still for four seconds before moving is four seconds of the gesture,
   * not four seconds the lane never knew about. Nothing is written per frame that press stays
   * still — a stillness costs the one point that ends it. What is kept here is the press and not
   * a recording, so a press that never reaches the dial leaves nothing to record with.
   */
  const onGestureStart = useCallback(() => {
    recording.current = null;
    pressed.current = armed ? { start: instrument.probe().at, value } : null;
    dragging.current = true;
  }, [armed, instrument, value]);

  /**
   * The end of a stretch: the whole drag on the preview's span dial arrives here as one length,
   * and leaves as one command — never one per pointer event (0065, 0079).
   */
  const onSpan = useCallback(
    (span: number) => {
      const owner = instanceHalf(instance);
      instrument.send({ t: "automation.span", deck, ...owner, param, span });
    },
    [instrument, deck, instance, param],
  );

  return (
    // The wrapper is not the control: every one of these handlers observes an event bubbling out
    // of the `role="slider"` Knob inside it, which is the focusable, keyboard-operable element and
    // carries the accessible name. Giving this box a role of its own would announce a second
    // control that is not there. Waived at the site, as 0007 requires.
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className={armed ? "relative rounded-md ring-1 ring-primary" : "relative"}
      // The reveal: every automatable knob is visibly armed while Option is down, and the flag is
      // readable by ./scripts/smoke without depending on a colour.
      data-automation={armed ? "armed" : "off"}
      onPointerDown={onGestureStart}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onLostPointerCapture={onLostPointerCapture}
      onKeyUp={onKeyUp}
    >
      <Knob
        label={spec.label}
        value={value}
        onChange={onChange}
        min={spec.min}
        max={spec.max}
        defaultValue={spec.default}
        format={format}
        curve={spec.curve ?? "linear"}
        // The registry's own id, not the label: two effects can label a knob the same word and
        // mean two different things, and the id is what declares which parameter this is (0030).
        // Spread the way `step` is: a parameter nothing has been written for hands over no prop
        // at all, rather than an `undefined` the caption would reserve a box for.
        {...(PARAM_TOOLTIPS[param] === undefined ? {} : { says: PARAM_TOOLTIPS[param] })}
        size="sm"
        {...(spec.step === undefined ? {} : { step: spec.step })}
        // A knob with no lane hands the dial no live read at all, and so registers no frame
        // callback (0035). One that has a lane always hands it over — a halted deck holds its
        // gesture where it stopped, and the dial holds with it — but only a playing deck is
        // reading a value that moves, so only that one is painted per frame (0040).
        {...(lane === null ? {} : { live })}
        animate={playing}
      />
      {armed && lane !== null ? (
        // Only while Option is held: the marker belongs to the gesture that made the lane, and a
        // dot on every automated knob all the time is one more thing between a performer and the
        // sound (0028). Its shape is edited by riding the knob again; only its length is reached
        // from here, by a drag on the preview's time axis (0079).
        <Popover>
          <PopoverTrigger
            openOnHover
            delay={0}
            aria-label={`${where} ${spec.label} Automation`}
            data-automated="true"
            // Square, at the ring's own radius: the marker sits in the corner of that ring, and
            // one corner shape reads as one armed control rather than a dot stuck to a box.
            className="absolute top-0 right-0 size-2 rounded-md bg-primary"
          />
          <PopoverContent side="top" align="end" className="w-48">
            <PopoverTitle>{spec.label}</PopoverTitle>
            <AutomationPreview
              lane={lane}
              min={spec.min}
              max={spec.max}
              base={value}
              title={`${where} ${spec.label} Lane, ${lane.length} points`}
              phase={phase}
              playing={playing}
              onSpan={onSpan}
            />
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
});
