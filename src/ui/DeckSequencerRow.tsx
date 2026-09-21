/**
 * @role One yard's run under the sequencer view, drawn the width of the yard in two lines: the
 *   picture of the run, and under it the strip that edits it — one chip per step, holding its
 *   kind as a picker, its length as a reading a hand presses to type, and the press that takes it
 *   out — with the press that adds one on the end. Every edit sends the whole run as one
 *   `deck.sequence`, the way a lane is sent whole (0024, 0379). And the yard's own play/pause,
 *   which the header draws beside its name under this view.
 * @instead The picture and its cursor → src/ui/DeckSequenceTimeline.tsx. The maths of the run →
 *   src/lib/deckSequence.ts. The play toggle is the transport's own, sending the same command →
 *   src/ui/DeckTransport.tsx.
 */
// Every import is the run's own words, its maths, or one control the chip is built out of — the
// picker, the reading, the button, the toggle, the tooltip, the picture and the icons — so the
// count is what a step is edited with and not what this file decides.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { useCallback, useRef } from "react";

import type { Instrument } from "@/app/facade";
import { ACTION_TOOLTIPS } from "@/lib/copy";
import {
  readSequenceSecs,
  SEQUENCE_ADD_LABEL,
  SEQUENCE_ADD_TOOLTIP,
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
} from "@/lib/deckSequence";
import type { DeckId } from "@/state/store";
import { playToggleCommand } from "@/ui/actions";
import { Button } from "@/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ui/components/select";
import { Toggle } from "@/ui/components/toggle";
import { DeckSequenceTimeline } from "@/ui/DeckSequenceTimeline";
import { ACTION_ICONS } from "@/ui/icons";
import { KnobReadout } from "@/ui/KnobReadout";
import { Says } from "@/ui/Says";

/** A step a hand adds: a minute of playing, which is what most of a run is. */
const ADDED_STEP: SequenceStep = { kind: "play", secs: 60 };

/** The kinds as the picker's items, in the order the module declares them. */
const KIND_ITEMS = SEQUENCE_STEP_KINDS.map((kind) => ({
  value: kind,
  label: SEQUENCE_STEP_LABELS[kind],
}));

/** The column a length reading holds, so `0:05` and `59:59` sit in one width. */
const SECS_COLUMN = { minWidth: "5ch" };

/**
 * The yard's play/pause, drawn beside its name under the sequencer: the one toggle Space, the
 * palette and the transport send, so a press here means what a press there means (P41).
 * Controlled by the session — `pressed` is read off the yard (src/ui/DeckTransport.tsx).
 */
export function SequencePlayToggle({
  instrument,
  deck,
  playing,
  loaded,
}: {
  instrument: Instrument;
  deck: DeckId;
  playing: boolean;
  /** Whether the yard has anything to play: an empty one offers no play, as its transport does. */
  loaded: boolean;
}) {
  const onPlayToggle = useCallback(() => {
    instrument.send(playToggleCommand(deck));
  }, [instrument, deck]);
  const PlayIcon = playing ? ACTION_ICONS.pause : ACTION_ICONS.play;
  return (
    <Says what={playing ? ACTION_TOOLTIPS.pause : ACTION_TOOLTIPS.play}>
      <Toggle
        size="sm"
        variant="outline"
        pressed={playing}
        onPressedChange={onPlayToggle}
        disabled={!loaded}
      >
        <PlayIcon data-icon="inline-start" />
        {playing ? "Pause" : "Play"}
      </Toggle>
    </Says>
  );
}

/** One step's chip: its kind, its length, and the press that takes it out — one box, one edge. */
// One control per thing a step holds — the picker, the reading, the press that takes it out — each
// under its own tooltip with the callback it sends through. Lifting any one of them parts the chip's
// one edge from what it draws inside it. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
function StepChip({
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
  const readout = useRef<HTMLOutputElement>(null);
  const ordinal = `${SEQUENCE_LABEL} ${index + 1}`;
  return (
    <div className="flex h-7 items-center border border-input" data-slot="sequence-step">
      <Says what={SEQUENCE_STEP_TOOLTIPS[step.kind]}>
        <Select value={step.kind} onValueChange={onValueChange} items={KIND_ITEMS}>
          {/* The chip draws the one edge; the picker inside it draws none of its own. */}
          <SelectTrigger size="sm" className="border-0" aria-label={`${ordinal} Kind`}>
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
      <Says what={SEQUENCE_SECS_TOOLTIP}>
        <KnobReadout
          readout={readout}
          aria-label={`${ordinal} ${SEQUENCE_SECS_LABEL}`}
          className="type-readout tabular-nums"
          style={SECS_COLUMN}
          value={step.secs}
          min={SEQUENCE_SECS_MIN}
          max={SEQUENCE_SECS_MAX}
          step={1}
          format={sequenceSecsLabel}
          parse={readSequenceSecs}
          onChange={onChange}
          disabled={false}
        />
      </Says>
      <Says what={ACTION_TOOLTIPS.remove}>
        <Button size="icon-xs" variant="ghost" aria-label={`Remove ${ordinal}`} onClick={remove}>
          <ACTION_ICONS.remove />
        </Button>
      </Says>
    </div>
  );
}

// One callback per edit the strip offers — a kind, a length, a step gone, a step added — each
// sending the whole run through the one `send`, and then the strip that draws them. The edits and
// the strip read the same `steps`, so a helper for either would take that list with it.
// See docs/decisions/0007-reviewed-oversized-functions.md.
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
  /** Whether the yard is playing, which is the only time the picture's cursor moves (0040). */
  playing: boolean;
}) {
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
   * A length is typed and committed once, so it is one edit and one gesture like a pick: whole
   * seconds, which is what the run holds (src/lib/deckSequence.ts), rounded here rather than
   * refused at the wire.
   */
  const onSecs = useCallback(
    (index: number, next: number) => {
      const secs = Math.round(next);
      send(steps.map((step, at) => (at === index ? { kind: step.kind, secs } : step)));
    },
    [send, steps],
  );
  const onRemove = useCallback(
    (index: number) => {
      send(steps.filter((_step, at) => at !== index));
    },
    [send, steps],
  );
  const add = useCallback(() => {
    send([...steps, ADDED_STEP]);
  }, [send, steps]);

  return (
    <div className="flex flex-col gap-2" data-slot="sequence">
      <DeckSequenceTimeline instrument={instrument} deck={deck} steps={steps} playing={playing} />
      <div className="flex flex-wrap items-center gap-2">
        {steps.map((step, index) => (
          <StepChip
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
            size="sm"
            variant="outline"
            aria-label={SEQUENCE_ADD_LABEL}
            disabled={steps.length >= SEQUENCE_STEPS_MAX}
            onClick={add}
          >
            <ACTION_ICONS.add data-icon="inline-start" />
            Step
          </Button>
        </Says>
      </div>
    </div>
  );
}
