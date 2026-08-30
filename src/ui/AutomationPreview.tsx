/**
 * @role The picture of one lane: the gesture as a path, a dot riding it at wherever the lane has
 *   reached, and the dial above them — the one thing here that is not read-only, because turning
 *   it stretches the lane's span after the fact (0035, 0079). Shown while a performer holds Option
 *   and either hovers the mark on the knob that owns it or has pressed that mark (0154).
 * @instead Editing a lane's shape or its values → ride the knob again; there is no editor (0028).
 *   The lane's live phase comes from peek() on src/app/facade.ts, never from a clock of this
 *   component's own.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, type PointerEvent } from "react";

import {
  automationValueAt,
  laneSpan,
  MAX_LANE_SPAN,
  MIN_LANE_SPAN,
  type AutomationPoint,
} from "@/lib/automation";
import { Knob, secondsLabel, secondsValue } from "@/ui/Knob";
import { useOnFrame } from "@/ui/frame";

/**
 * How far the pointer travels to double a lane's span. Up is longer, which is the direction every
 * dial on this instrument grows in, and the travel is longer than the drag this replaced so a span
 * is landed rather than overshot.
 */
const PIXELS_PER_DOUBLING = 180;

/**
 * That, as the whole range's worth of travel, which is what a dial's drag is measured in. The span
 * is read on a log curve, so the ratio a pixel is worth is the same wherever the dial is standing.
 */
const SPAN_TRAVEL_PX = Math.log2(MAX_LANE_SPAN / MIN_LANE_SPAN) * PIXELS_PER_DOUBLING;

/** The preview's viewBox. Tiny on purpose: it says what the gesture did, not what it was. */
const PREVIEW_WIDTH = 100;
const PREVIEW_HEIGHT = 28;

/** Where a point sits in the box, as fractions — the one mapping the path and the dot share. */
const place = (
  point: AutomationPoint,
  min: number,
  max: number,
  span: number,
): { x: number; y: number } => ({
  x: span === 0 ? 0 : point.at / span,
  y: 1 - (point.value - min) / (max - min),
});

const previewPath = (
  lane: readonly AutomationPoint[],
  min: number,
  max: number,
  span: number,
): string =>
  lane
    .map((point, index) => {
      const { x, y } = place(point, min, max, span);
      return `${index === 0 ? "M" : "L"}${x * PREVIEW_WIDTH} ${y * PREVIEW_HEIGHT}`;
    })
    .join(" ");

/**
 * `phase` is seconds into the lane's own cycle, or null when there is no lane to be in one — read
 * once a frame, and only while this is on screen. A halted deck answers with the phase it froze
 * at, so the dot parks on the path rather than going out (0040). `base` is the manual value the
 * lane falls back to, so the dot sits exactly where the parameter is.
 */
// Over the line cap by design: this is one picture — the path, the dot that rides it, and the
// mapping both read. Splitting them means the geometry in one file and its playhead in another.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function AutomationPreview({
  lane,
  min,
  max,
  base,
  title,
  phase,
  playing,
  onSpan,
}: {
  lane: readonly AutomationPoint[];
  min: number;
  max: number;
  base: number;
  /** What a reader and ./scripts/smoke find this by. */
  title: string;
  phase: () => number | null;
  /** Whether the yard is playing, which is the only time a lane's phase moves (0035, 0040). */
  playing: boolean;
  /**
   * The one command a whole stretch sends, at the end of the drag that decided it — never one per
   * pointer event, which moves the dial above and nothing else (0065).
   */
  onSpan: (span: number) => void;
}) {
  const span = laneSpan(lane);
  const dot = useRef<HTMLDivElement>(null);
  /**
   * Where the last paint left the dot, so a frame that would repeat it writes nothing at all —
   * the rule the knob's readout and the console's counters keep (0070). A halted lane freezes
   * its phase by design (0040), which is precisely the state that would otherwise rebuild three
   * position strings sixty times a second and hand the CSSOM the values already on the element.
   * `opacity` is null until the first paint, so that one always lands.
   */
  const painted = useRef<{ x: number; y: number; opacity: string | null }>({
    x: Number.NaN,
    y: Number.NaN,
    opacity: null,
  });

  const paintDot = useCallback(() => {
    const element = dot.current;
    if (element === null) return;
    const last = painted.current;
    const at = phase();
    if (at === null) {
      if (last.opacity === "0") return;
      element.style.opacity = "0";
      last.opacity = "0";
      return;
    }
    const { x, y } = place({ at, value: automationValueAt(lane, at, base) }, min, max, span);
    if (last.opacity === "1" && x === last.x && y === last.y) return;
    element.style.left = `${x * 100}%`;
    element.style.top = `${y * 100}%`;
    element.style.opacity = "1";
    last.x = x;
    last.y = y;
    last.opacity = "1";
  }, [base, lane, max, min, phase, span]);

  // Mounted only while the popover is open, which is one mark peeked at or latched (0154): a mark
  // that is neither costs a page nothing, and a rack of automated knobs runs one or two frame
  // callbacks rather than one each. And only while the yard plays: a halted lane holds the phase
  // it stopped on (0040), so a frame would place the dot where the commit below already put it —
  // the rule the dial beside it keeps.
  useOnFrame(paintDot, playing);

  // And once more in the commit, which is what the dial does a tier up (src/ui/Knob.tsx). A
  // frame paints where the lane had reached when it ran; a halt freezes the lane in the same
  // commit that reports the deck stopped, so without this the dot shows a pre-halt position
  // until the next frame catches up — one frame of the dial and the dot disagreeing about the
  // one clock they both read (0040).
  useLayoutEffect(paintDot);

  /**
   * The span the dial has reached in a drag that has not ended. A ref and the frame loop, never
   * state: a drag paints the number it has reached on every move, and none of those moves is a
   * command or a render (0070). At rest it is the lane's own span, so the dial reads the session.
   */
  const draft = useRef(span);
  /** The pointer whose stretch is in flight, or null — a second finger on the dial is not it. */
  const stretching = useRef<number | null>(null);
  // The draft is the drag's own paint surface; at rest it tracks the session's span.
  // oxlint-disable-next-line react/refs -- no render reads it (0070)
  if (stretching.current === null) draft.current = span;
  const readDraft = useCallback(() => draft.current, []);

  const sendSpan = useCallback(
    (next: number) => {
      if (next !== span) onSpan(next);
    },
    [onSpan, span],
  );

  const onDial = useCallback(
    (next: number) => {
      draft.current = next;
      // A drag sends nothing until it ends (0065, 0079). A keyboard nudge and a reset are whole
      // gestures on their own, so those land at once.
      if (stretching.current === null) sendSpan(next);
    },
    [sendSpan],
  );

  /**
   * The dial captures the pointer on itself, so the gesture's ending is known here, where its
   * events bubble to — the same seam the knob's own recording is closed at
   * (src/ui/ParameterKnob.tsx). The start is the capture rather than the press, because a press
   * the dial refused — a second button, or the readout beside it — takes no pointer and so has no
   * ending to arrive: it would latch this open for the life of the popover.
   */
  const onStretchStart = useCallback((event: PointerEvent<HTMLDivElement>) => {
    stretching.current ??= event.pointerId;
  }, []);
  const onStretchUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (stretching.current !== event.pointerId) return;
      stretching.current = null;
      sendSpan(draft.current);
    },
    [sendSpan],
  );
  const onStretchCancel = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      // The browser saying the gesture never happened: the lane keeps the span it had, and the
      // dial goes back to standing on it.
      if (stretching.current !== event.pointerId) return;
      stretching.current = null;
      draft.current = span;
    },
    [span],
  );

  /**
   * The drag's own commit, held where the unmount can reach it: Option coming up takes this whole
   * popover away mid-gesture, and that is a performer saying the stretch is over exactly as it is
   * on the knob that recorded the lane (0034). The pointer is gone with the element, so no
   * pointerup will ever arrive to say it.
   */
  const commit = useRef<() => void>(() => {});
  // oxlint-disable-next-line react/refs -- kept current so the unmount above can reach the commit
  commit.current = () => {
    if (stretching.current === null) return;
    sendSpan(draft.current);
  };
  useEffect(
    () => () => {
      commit.current();
    },
    [],
  );

  return (
    <div className="flex w-full flex-col gap-1">
      {/* The lane's length, at the top right: one dial, with the number it is holding beside it —
          the span and the thing that changes it are one control (0035, 0079). */}
      <div
        className="flex justify-end"
        onGotPointerCapture={onStretchStart}
        onPointerUp={onStretchUp}
        onPointerCancel={onStretchCancel}
        onLostPointerCapture={onStretchUp}
      >
        <Knob
          size="xs"
          label={`${title} Span`}
          value={span}
          min={MIN_LANE_SPAN}
          max={MAX_LANE_SPAN}
          curve="log"
          travelPx={SPAN_TRAVEL_PX}
          format={secondsLabel}
          parse={secondsValue}
          // A lane that never moved has no length to scale and is refused rather than invented
          // (0079), so there is nothing here for a hand to do.
          disabled={span <= 0}
          // A lane's span has no factory value — it is whatever the gesture ran for, and the
          // length it was recorded at is gone the moment it is stretched. The only value a reset
          // can mean is the one the dial already reads, which is that length on the dial's own
          // step.
          defaultValue={span}
          onChange={onDial}
          live={readDraft}
        />
      </div>
      <div className="relative h-10 w-full">
        <svg
          className="size-full"
          viewBox={`0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}`}
          preserveAspectRatio="none"
          aria-label={title}
        >
          <title>{title}</title>
          <path
            d={previewPath(lane, min, max, span)}
            className="fill-none stroke-primary"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {/* An element rather than a circle in the SVG: the box is stretched to fit, and anything
            drawn inside it is stretched with it — a round dot has to sit above it. */}
        <div
          ref={dot}
          data-slot="lane-playhead"
          aria-hidden="true"
          className="pointer-events-none absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary opacity-0"
        />
      </div>
    </div>
  );
}
