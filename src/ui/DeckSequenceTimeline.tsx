/**
 * @role The picture of one yard's run under the sequencer view, drawn the width of the yard: one
 *   band per step, as wide as the step is long and tinted by what it does, the level drawn over
 *   them as one line, and a cursor riding it at wherever the fade has reached. A picture and not
 *   a control: the steps are edited in the strip under it (0379).
 * @instead The strip that edits the run → src/ui/DeckSequencerRow.tsx. The maths of the level →
 *   src/lib/deckSequence.ts. The fade's live position comes from peek() on src/app/facade.ts,
 *   never from a clock of this component's own. The lane preview whose cursor this copies →
 *   src/ui/AutomationPreview.tsx.
 */
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";

import type { Instrument } from "@/app/facade";
import { SEQUENCE_EMPTY, SEQUENCE_LABEL, SEQUENCE_STEP_LABELS } from "@/lib/copySequence";
import {
  type DeckSequence,
  type SequenceStepKind,
  sequenceLevelAt,
  sequencePhaseSecs,
  sequenceSpanSecs,
} from "@/lib/deckSequence";
import type { DeckId } from "@/state/store";
import { useOnFrame } from "@/ui/frame";

/** The line's viewBox. Small on purpose: it says the shape of the run, not its every second. */
const PROFILE_WIDTH = 100;
const PROFILE_HEIGHT = 16;

/** How each kind of step is tinted: a fade is a wash that grows or shrinks, a rest is nothing. */
const KIND_TINTS: Record<SequenceStepKind, string> = {
  in: "bg-linear-to-r from-transparent to-primary/15",
  play: "bg-primary/15",
  out: "bg-linear-to-r from-primary/15 to-transparent",
  rest: "bg-muted/50",
};

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

export function DeckSequenceTimeline({
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
  /** Each band's width, as much of the run as its step is: made once per run, not per render. */
  const widths = useMemo(
    () => steps.map((step) => ({ width: `${(step.secs / span) * 100}%` })),
    [span, steps],
  );

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
    const at = sequencePhaseSecs(steps, instrument.peek(deck).sequenceAt);
    const x = at / span;
    if (last.opacity === "1" && x === last.x) return;
    element.style.left = `${x * 100}%`;
    element.style.opacity = "1";
    last.x = x;
    last.opacity = "1";
  }, [deck, instrument, span, steps]);
  useOnFrame(paintCursor, playing && span > 0);
  // And once in the commit, so a halted yard's cursor stands where its fade is holding (0040).
  useLayoutEffect(paintCursor);

  if (span === 0) {
    return (
      <div
        className="flex h-7 items-center type-readout text-muted-foreground"
        data-slot="sequence-timeline"
      >
        {SEQUENCE_EMPTY}
      </div>
    );
  }
  return (
    <div className="relative h-7 w-full" aria-label={SEQUENCE_LABEL} data-slot="sequence-timeline">
      <div className="absolute inset-0 flex" aria-hidden="true">
        {steps.map((step, index) => (
          <div
            // Steps have no identity of their own: the run is a list and its position is its name.
            // oxlint-disable-next-line react/no-array-index-key
            key={index}
            className={`flex min-w-0 items-end overflow-hidden px-1 pb-0.5 type-readout text-muted-foreground ${KIND_TINTS[step.kind]}`}
            style={widths[index]}
          >
            <span className="truncate">{SEQUENCE_STEP_LABELS[step.kind]}</span>
          </div>
        ))}
      </div>
      <svg
        className="absolute inset-0 size-full"
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
  );
}
