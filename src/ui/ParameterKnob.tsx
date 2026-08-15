/**
 * @role A registry-bound parameter knob that sends the generic param.set command, and — while
 *   Option is held — records its own movement into one whole-lane automation command, marking
 *   the lane it owns and previewing it on hover (0028).
 */
import { memo, useCallback, useRef } from "react";

import type { Instrument } from "@/app/facade";
import type { EffectInstanceId } from "@/audio/effects/contract";
import { PARAMS, type ParamId } from "@/audio/params";
import type { AutomationPoint } from "@/lib/automation";
import type { DeckId } from "@/state/store";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/ui/components/popover";
import { Knob } from "@/ui/Knob";
import { useAltHeld } from "@/ui/shortcuts";

/** The preview's viewBox. Tiny on purpose: it says what the gesture did, not what it was. */
const PREVIEW_WIDTH = 100;
const PREVIEW_HEIGHT = 28;

/** The recorded gesture: when it started on the audio clock, and the points relative to that. */
type Recording = { start: number; points: AutomationPoint[] };

const previewPath = (
  lane: readonly AutomationPoint[],
  min: number,
  max: number,
  span: number,
): string =>
  lane
    .map((point, index) => {
      const x = span === 0 ? 0 : (point.at / span) * PREVIEW_WIDTH;
      const y = PREVIEW_HEIGHT - ((point.value - min) / (max - min)) * PREVIEW_HEIGHT;
      return `${index === 0 ? "M" : "L"}${x} ${y}`;
    })
    .join(" ");

// Over the line cap by design: what is here is one control's three mutually exclusive gestures —
// record, clear, plain set — plus the marker that says which of them this knob is holding.
// Splitting them means hooks with one caller each and the gesture boundary in two files. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export const ParameterKnob = memo(function ParameterKnob({
  instrument,
  deck,
  instance,
  name,
  param,
  value,
  lane,
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
}) {
  const spec = PARAMS[param];
  const where = name === undefined ? `Deck ${deck}` : `Deck ${deck} ${name}`;
  const armed = useAltHeld() && spec.automation !== undefined;
  /** The gesture being recorded. A ref, never state: no draft point re-renders anything. */
  const recording = useRef<Recording | null>(null);

  const onChange = useCallback(
    (next: number) => {
      // Spread rather than a shared object: a value lookup is (instance, param), and a deck
      // parameter names no instance at all (0030).
      const owner = instance === undefined ? {} : { instance };
      const set = { t: "param.set", deck, ...owner, param, value: next } as const;
      if (armed) {
        // probe().at is the audio clock; what is stored is the distance from the start of this
        // gesture, so where the playhead was while it happened is never part of the lane (0028).
        const now = instrument.probe().at;
        const gesture = (recording.current ??= { start: now, points: [] });
        gesture.points.push({ at: Math.max(0, now - gesture.start), value: next });
        instrument.send(set);
        return;
      }
      // Option is the recording boundary, not the pointer: a knob moved unarmed is an ordinary
      // move, so anything recorded before the key came up is no longer part of a gesture (0024).
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
   * The end of a gesture, which is where the recording either becomes one lane or is dropped.
   * Pointer events from the knob bubble here, which is where the gesture, not the value, is known
   * to be over. Only a deliberate release with Option still down commits: a cancel, a lost
   * capture or a released Option abandons.
   */
  const finish = useCallback(
    (commit: boolean) => {
      const recorded = recording.current;
      recording.current = null;
      if (!commit || !armed || recorded === null || recorded.points.length === 0) return;
      const owner = instance === undefined ? {} : { instance };
      instrument.send({ t: "automation.set", deck, ...owner, param, points: recorded.points });
    },
    [armed, instrument, deck, instance, param],
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
  const span = lane === null ? 0 : (lane.at(-1)?.at ?? 0);

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
            <PopoverTitle>{`${spec.label} · ${span.toFixed(2)}s`}</PopoverTitle>
            <svg
              className="h-10 w-full"
              viewBox={`0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}`}
              preserveAspectRatio="none"
              aria-label={`${where} ${spec.label} lane, ${lane.length} points`}
            >
              <title>{`${where} ${spec.label} lane, ${lane.length} points`}</title>
              <path
                d={previewPath(lane, spec.min, spec.max, span)}
                className="fill-none stroke-primary"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  );
});
