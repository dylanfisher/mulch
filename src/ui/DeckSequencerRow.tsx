/**
 * @role One yard's sequence, in the header's slack under the sequencer view: the run of steps as
 *   a profile with a cursor riding it at wherever the fade has reached, and under it one row per
 *   step — its kind as a picker, its length as a dial, and the press that takes it out — with the
 *   press that adds one on the end. Every edit sends the whole run as one `deck.sequence`, the way
 *   a lane is sent whole (0024, 0379).
 * @instead The maths of the profile and the level → src/lib/deckSequence.ts. The fade's live
 *   position comes from peek() on src/app/facade.ts, never from a clock of this component's own.
 *   The lane preview whose cursor this copies → src/ui/AutomationPreview.tsx.
 */
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";

import type { Instrument } from "@/app/facade";
import { ACTION_TOOLTIPS } from "@/lib/copy";
import {
  SEQUENCE_ADD_LABEL,
  SEQUENCE_ADD_TOOLTIP,
  SEQUENCE_EMPTY,
  SEQUENCE_LABEL,
  SEQUENCE_SECS_LABEL,
  SEQUENCE_SECS_TOOLTIP,
  SEQUENCE_STEP_LABELS,
  SEQUENCE_STEP_TOOLTIPS,
  sequenceSecsLabel,
} from "@/lib/copySequence";
import {
  type DeckSequence,
  SEQUENCE_SECS_MAX,
  SEQUENCE_SECS_MIN,
  SEQUENCE_STEP_KINDS,
  SEQUENCE_STEPS_MAX,
  type SequenceStep,
  type SequenceStepKind,
  sequenceLevelAt,
  sequenceSpanSecs,
} from "@/lib/deckSequence";
import type { DeckId } from "@/state/store";
import { Button } from "@/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/components/select";
import { useOnFrame } from "@/ui/frame";
import { ACTION_ICONS } from "@/ui/icons";
import { Knob } from "@/ui/Knob";
import { Says } from "@/ui/Says";

/** The profile's viewBox. Small on purpose: it says the shape of the run, not its every second. */
const PROFILE_WIDTH = 100;
const PROFILE_HEIGHT = 16;

/** A step a hand adds: a minute of playing, which is what most of a run is. */
const ADDED_STEP: SequenceStep = { kind: "play", secs: 60 };

/** The kinds as the picker's items, in the order the module declares them. */
const KIND_ITEMS = SEQUENCE_STEP_KINDS.map((kind) => ({
  value: kind,
  label: SEQUENCE_STEP_LABELS[kind],
}));

/** How far the length dial travels for its whole range: three and a half doublings a sweep. */
const SECS_TRAVEL_PX = Math.log2(SEQUENCE_SECS_MAX / SEQUENCE_SECS_MIN) * 30;

/** The run as a path: the level at nought, then at every step's edge — a straight line each. */
function profilePath(steps: DeckSequence): string {
  const span = sequenceSpanSecs(steps);
  if (span === 0) return "";
  const point = (at: number): string =>
    `${(at / span) * PROFILE_WIDTH} ${(1 - sequenceLevelAt(steps, at)) * PROFILE_HEIGHT}`;
  let at = 0;
  const parts = [`M${point(0)}`];
  for (const step of steps) {
    // Just inside the edge, so a rest after a fade in is read as the drop it is and not as the
    // level the next step begins at.
    at += step.secs;
    parts.push(`L${point(at - 1e-6)}`, `L${point(at)}`);
  }
  return parts.join(" ");
}

/** One step's row: its kind, its length, and the press that takes it out. */
function StepRow({
  step,
  index,
  onKind,
  onSecs,
  onRemove,
}: {
  step: SequenceStep;
  index: number;
  onKind: (index: number, kind: SequenceStepKind) => void;
  onSecs: (index: number, secs: number) => void;
  onRemove: (index: number) => void;
}) {
  const onValueChange = useCallback(
    (next: SequenceStepKind | null) => {
      // The picker holds no empty item, so a cleared value is a shape nobody can have picked
      // (principle 5).
      if (next === null) throw new Error("a step's kind was cleared");
      onKind(index, next);
    },
    [index, onKind],
  );
  const onChange = useCallback(
    (next: number) => {
      onSecs(index, next);
    },
    [index, onSecs],
  );
  const remove = useCallback(() => {
    onRemove(index);
  }, [index, onRemove]);
  const ordinal = `${SEQUENCE_LABEL} ${index + 1}`;
  return (
    <div className="flex items-center gap-1" data-slot="sequence-step">
      <Says what={SEQUENCE_STEP_TOOLTIPS[step.kind]}>
        <Select value={step.kind} onValueChange={onValueChange} items={KIND_ITEMS}>
          <SelectTrigger size="sm" aria-label={`${ordinal} Kind`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {KIND_ITEMS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Says>
      <Knob
        size="xs"
        label={SEQUENCE_SECS_LABEL}
        name={`${ordinal} ${SEQUENCE_SECS_LABEL}`}
        says={SEQUENCE_SECS_TOOLTIP}
        value={step.secs}
        min={SEQUENCE_SECS_MIN}
        max={SEQUENCE_SECS_MAX}
        step={1}
        curve="log"
        travelPx={SECS_TRAVEL_PX}
        format={sequenceSecsLabel}
        defaultValue={ADDED_STEP.secs}
        onChange={onChange}
        animate={false}
      />
      <Says what={ACTION_TOOLTIPS.remove}>
        <Button size="icon-xs" variant="ghost" aria-label={`Remove ${ordinal}`} onClick={remove}>
          <ACTION_ICONS.remove />
        </Button>
      </Says>
    </div>
  );
}

// One picture and one list, and the four edits that write the list: the length is the row's whole
// surface rather than a judgement of its own. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function DeckSequencerRow({
  instrument,
  deck,
  steps,
  playing,
}: {
  instrument: Instrument;
  deck: DeckId;
  steps: DeckSequence;
  /** Whether the yard is playing, which is the only time the fade's cursor moves (0040). */
  playing: boolean;
}) {
  const span = sequenceSpanSecs(steps);
  const path = useMemo(() => profilePath(steps), [steps]);

  /** The whole run, sent whole, and the gesture over where it lands (0024, 0067). */
  const send = useCallback(
    (next: DeckSequence) => {
      instrument.send({ t: "deck.sequence", deck, steps: next });
      instrument.send({ t: "gesture.end" });
    },
    [instrument, deck],
  );
  const onKind = useCallback(
    (index: number, kind: SequenceStepKind) => {
      send(steps.map((step, at) => (at === index ? { kind, secs: step.secs } : step)));
    },
    [send, steps],
  );
  /**
   * A dial's moves are one gesture: each sends the run, and the boundary is the pointer coming up
   * on the list below, which is where every dial's release bubbles to (0067). Without the end a
   * pick a moment later would join the drag's entry and one undo would take back both. A nudge
   * from the keyboard has no such boundary here and is bounded by history's own idle backstop.
   */
  const onSecs = useCallback(
    (index: number, next: number) => {
      // Whole seconds, which is what the run holds (src/lib/deckSequence.ts): the dial steps by
      // one, and a value typed into its readout is rounded here rather than refused at the wire.
      const secs = Math.round(next);
      instrument.send({
        t: "deck.sequence",
        deck,
        steps: steps.map((step, at) => (at === index ? { kind: step.kind, secs } : step)),
      });
    },
    [instrument, deck, steps],
  );
  const endGesture = useCallback(() => {
    instrument.send({ t: "gesture.end" });
  }, [instrument]);
  const onRemove = useCallback(
    (index: number) => {
      send(steps.filter((_step, at) => at !== index));
    },
    [send, steps],
  );
  const add = useCallback(() => {
    send([...steps, ADDED_STEP]);
  }, [send, steps]);

  /**
   * The cursor, painted from the fade's own position once a frame and never through state
   * (boundary 6, 0070): a frame that would repeat the last paint writes nothing.
   */
  const cursor = useRef<HTMLDivElement>(null);
  const painted = useRef<{ x: number; opacity: string | null }>({ x: Number.NaN, opacity: null });
  const paintCursor = useCallback(() => {
    const element = cursor.current;
    if (element === null) return;
    const last = painted.current;
    if (span === 0) {
      if (last.opacity === "0") return;
      element.style.opacity = "0";
      last.opacity = "0";
      return;
    }
    const at = Math.min(instrument.peek(deck).sequenceAt, span);
    const x = at / span;
    if (last.opacity === "1" && x === last.x) return;
    element.style.left = `${x * 100}%`;
    element.style.opacity = "1";
    last.x = x;
    last.opacity = "1";
  }, [deck, instrument, span]);
  useOnFrame(paintCursor, playing && span > 0);
  // And once in the commit, so a halted yard's cursor stands where its fade is holding (0040).
  useLayoutEffect(paintCursor);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1 self-center" data-slot="sequence">
      <div className="relative h-4 w-full" aria-label={SEQUENCE_LABEL}>
        <svg
          className="size-full"
          viewBox={`0 0 ${PROFILE_WIDTH} ${PROFILE_HEIGHT}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d={path} className="fill-none stroke-primary" vectorEffect="non-scaling-stroke" />
        </svg>
        <div
          ref={cursor}
          data-slot="sequence-playhead"
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-px -translate-x-1/2 bg-primary opacity-0"
        />
      </div>
      <div
        className="flex flex-wrap items-center gap-2"
        onPointerUp={endGesture}
        onLostPointerCapture={endGesture}
      >
        {steps.length === 0 && (
          <span className="type-readout text-muted-foreground">{SEQUENCE_EMPTY}</span>
        )}
        {steps.map((step, index) => (
          <StepRow
            // Steps have no identity of their own: the run is a list and its position is its name.
            // oxlint-disable-next-line react/no-array-index-key
            key={index}
            step={step}
            index={index}
            onKind={onKind}
            onSecs={onSecs}
            onRemove={onRemove}
          />
        ))}
        <Says what={SEQUENCE_ADD_TOOLTIP}>
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={SEQUENCE_ADD_LABEL}
            disabled={steps.length >= SEQUENCE_STEPS_MAX}
            onClick={add}
          >
            <ACTION_ICONS.add />
          </Button>
        </Says>
      </div>
    </div>
  );
}
