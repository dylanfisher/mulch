/**
 * @role The picture of one lane: the gesture as a path, a dot riding it at wherever the lane has
 *   reached, and the time axis under both — the one thing here that is not read-only, because a
 *   vertical drag on it stretches the lane's span after the fact (0035, 0079). Shown while a
 *   performer holds Option and hovers the mark on the knob that owns it, which is the only time
 *   it paints.
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
import { clamp } from "@/lib/range";
import { usePointerGesture } from "@/ui/gesture";
import { useOnFrame } from "@/ui/frame";

/**
 * How far the pointer travels to double a lane's span. Downwards is longer, which is the
 * direction every other time axis on this instrument grows in.
 */
const PIXELS_PER_DOUBLING = 120;

/** The stretch in flight: where it started, and the span it has reached but not yet sent. */
type Stretch = { pointerId: number; y: number; from: number; draft: number };

/** The span a pointer that has moved `dy` from where it pressed is asking for. */
export const stretchedSpan = (from: number, dy: number): number =>
  clamp(from * 2 ** (dy / PIXELS_PER_DOUBLING), MIN_LANE_SPAN, MAX_LANE_SPAN);

const spanLabel = (span: number): string => `${span.toFixed(2)}s`;

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
  onSpan,
}: {
  lane: readonly AutomationPoint[];
  min: number;
  max: number;
  base: number;
  /** What a reader and ./scripts/smoke find this by. */
  title: string;
  phase: () => number | null;
  /**
   * The one command a whole stretch sends, at the end of the drag that decided it — never one per
   * pointer event, which is what the readout below moves instead (0065).
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

  // Mounted only while the popover is open, so this is the hover: an unhovered mark costs a page
  // nothing, and a rack of automated knobs runs one frame callback rather than one each.
  useOnFrame(paintDot, true);

  // And once more in the commit, which is what the dial does a tier up (src/ui/Knob.tsx). A
  // frame paints where the lane had reached when it ran; a halt freezes the lane in the same
  // commit that reports the deck stopped, so without this the dot shows a pre-halt position
  // until the next frame catches up — one frame of the dial and the dot disagreeing about the
  // one clock they both read (0040).
  useLayoutEffect(paintDot);

  const stretch = usePointerGesture<Stretch>();
  const readout = useRef<HTMLSpanElement>(null);
  /**
   * The drag's own commit, held where the unmount can reach it: Option coming up takes this whole
   * popover away mid-gesture, and that is a performer saying the stretch is over exactly as it is
   * on the knob that recorded the lane (0034). The pointer is gone with the element, so no
   * pointerup will ever arrive to say it.
   */
  const commit = useRef<() => void>(() => {});
  commit.current = () => {
    const held = stretch.held();
    if (held === null || held.draft === span) return;
    onSpan(held.draft);
  };
  useEffect(
    () => () => {
      commit.current();
    },
    [],
  );

  const onAxisDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (span <= 0) return;
      stretch.begin(event.currentTarget, {
        pointerId: event.pointerId,
        y: event.clientY,
        from: span,
        draft: span,
      });
    },
    [span, stretch],
  );
  const onAxisMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const held = stretch.matched(event);
      if (held === null) return;
      held.draft = stretchedSpan(held.from, event.clientY - held.y);
      // A ref and the DOM, never state: a drag writes the number it has reached on every move,
      // and none of those moves is a command or a render (0070).
      const element = readout.current;
      if (element !== null) element.textContent = spanLabel(held.draft);
    },
    [stretch],
  );
  const onAxisUp = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const held = stretch.ended(event);
      if (held === null || held.draft === span) return;
      onSpan(held.draft);
    },
    [onSpan, span, stretch],
  );
  const onAxisCancel = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      // The browser saying the gesture never happened: the lane keeps the span it had, and the
      // readout goes back to saying so.
      if (stretch.ended(event) === null) return;
      const element = readout.current;
      if (element !== null) element.textContent = spanLabel(span);
    },
    [span, stretch],
  );

  return (
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
      {/* The time axis: the whole width the path is drawn across, dragged vertically to say how
          long that path takes. The lane's own period is the number it is holding, so it is read
          here rather than beside it — one span, one place it is said (0035, 0079). */}
      <div
        data-slot="lane-span"
        aria-label={`${title} Span`}
        className="absolute inset-x-0 bottom-0 h-4 cursor-ns-resize touch-none text-right type-readout text-muted-foreground"
        onPointerDown={onAxisDown}
        onPointerMove={onAxisMove}
        onPointerUp={onAxisUp}
        onPointerCancel={onAxisCancel}
        onLostPointerCapture={onAxisUp}
      >
        <span ref={readout}>{spanLabel(span)}</span>
      </div>
    </div>
  );
}
