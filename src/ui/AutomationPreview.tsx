/**
 * @role The read-only picture of one lane: the gesture as a path, and a dot riding it at wherever
 *   the lane has reached. Shown while a performer holds Option and hovers the mark on the knob
 *   that owns it, which is the only time it paints (0035).
 * @instead Editing a lane → ride the knob again; there is no editor (0028). The lane's live phase
 *   comes from peek() on src/app/facade.ts, never from a clock of this component's own.
 */
import { useCallback, useRef } from "react";

import { automationValueAt, laneSpan, type AutomationPoint } from "@/lib/automation";
import { useOnFrame } from "@/ui/frame";

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
}: {
  lane: readonly AutomationPoint[];
  min: number;
  max: number;
  base: number;
  /** What a reader and ./scripts/smoke find this by. */
  title: string;
  phase: () => number | null;
}) {
  const span = laneSpan(lane);
  const dot = useRef<HTMLDivElement>(null);

  const paintDot = useCallback(() => {
    const element = dot.current;
    if (element === null) return;
    const at = phase();
    if (at === null) {
      element.style.opacity = "0";
      return;
    }
    const { x, y } = place({ at, value: automationValueAt(lane, at, base) }, min, max, span);
    element.style.left = `${x * 100}%`;
    element.style.top = `${y * 100}%`;
    element.style.opacity = "1";
  }, [base, lane, max, min, phase, span]);

  // Mounted only while the popover is open, so this is the hover: an unhovered mark costs a page
  // nothing, and a rack of automated knobs runs one frame callback rather than one each.
  useOnFrame(paintDot, true);

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
    </div>
  );
}
