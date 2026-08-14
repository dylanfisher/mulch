/**
 * @role One registry-driven automation lane editor: a pointer stroke drafts in refs and commits
 *   one durable lane replacement when the gesture ends.
 */
import { type PointerEvent, useCallback, useMemo, useRef } from "react";

import type { Instrument } from "@/app/facade";
import { PARAMS, type AutomationParamId } from "@/audio/params";
import type { AutomationPoint } from "@/lib/automation";
import type { DeckId } from "@/state/store";

const VIEW_WIDTH = 100;
const VIEW_HEIGHT = 32;
const MIN_WINDOW_SECS = 1;

type Draft = {
  pointerId: number;
  start: number;
  span: number;
  points: AutomationPoint[];
};

const pathFor = (
  points: readonly AutomationPoint[],
  start: number,
  span: number,
  min: number,
  max: number,
): string =>
  points
    .filter((point) => point.at >= start && point.at <= start + span)
    .map((point, index) => {
      const x = ((point.at - start) / span) * VIEW_WIDTH;
      const y = VIEW_HEIGHT - ((point.value - min) / (max - min)) * VIEW_HEIGHT;
      return `${index === 0 ? "M" : "L"}${x} ${y}`;
    })
    .join(" ");

// The gesture's refs and handlers share one SVG pointer-capture machine. Splitting them would
// duplicate its draft and commit boundary. See 0007.
// oxlint-disable-next-line max-lines-per-function
export function AutomationLane({
  instrument,
  deck,
  param,
  points,
  duration,
}: {
  instrument: Instrument;
  deck: DeckId;
  param: AutomationParamId;
  points: readonly AutomationPoint[];
  duration: number;
}) {
  const spec = PARAMS[param];
  const pathRef = useRef<SVGPathElement>(null);
  const draft = useRef<Draft | null>(null);
  const window = useMemo(() => {
    const first = points[0]?.at ?? instrument.probe().at;
    const last = points.at(-1)?.at ?? first;
    return { start: first, span: Math.max(MIN_WINDOW_SECS, duration, last - first) };
  }, [instrument, points, duration]);
  const path = useMemo(
    () => pathFor(points, window.start, window.span, spec.min, spec.max),
    [points, window, spec.min, spec.max],
  );

  const pointAt = useCallback(
    (event: PointerEvent<SVGSVGElement>, active: Draft): AutomationPoint => {
      const bounds = event.currentTarget.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) {
        throw new RangeError("automation lane has no drawable bounds");
      }
      const x = Math.min(bounds.width, Math.max(0, event.clientX - bounds.left));
      const y = Math.min(bounds.height, Math.max(0, event.clientY - bounds.top));
      return {
        at: active.start + (x / bounds.width) * active.span,
        value: spec.max - (y / bounds.height) * (spec.max - spec.min),
      };
    },
    [spec.min, spec.max],
  );

  const drawDraft = useCallback(
    (active: Draft) => {
      pathRef.current?.setAttribute(
        "d",
        pathFor(active.points, active.start, active.span, spec.min, spec.max),
      );
    },
    [spec.min, spec.max],
  );

  const onPointerDown = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      if (draft.current !== null || event.button !== 0) return;
      const active: Draft = {
        pointerId: event.pointerId,
        start: instrument.probe().at,
        span: Math.max(MIN_WINDOW_SECS, duration),
        points: [],
      };
      active.points.push(pointAt(event, active));
      draft.current = active;
      event.currentTarget.setPointerCapture(event.pointerId);
      drawDraft(active);
    },
    [instrument, duration, pointAt, drawDraft],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      const active = draft.current;
      if (active === null || active.pointerId !== event.pointerId) return;
      const next = pointAt(event, active);
      const previous = active.points.at(-1);
      if (previous?.at === next.at && previous.value === next.value) return;
      active.points.push(next);
      drawDraft(active);
    },
    [pointAt, drawDraft],
  );

  const finish = useCallback(
    (event: PointerEvent<SVGSVGElement>, commit: boolean) => {
      const active = draft.current;
      if (active === null || active.pointerId !== event.pointerId) return;
      draft.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (commit) {
        instrument.send({ t: "automation.set", deck, param, points: active.points });
      } else {
        pathRef.current?.setAttribute("d", path);
      }
    },
    [instrument, deck, param, path],
  );
  const onPointerUp = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      finish(event, true);
    },
    [finish],
  );
  const onPointerCancel = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      finish(event, false);
    },
    [finish],
  );
  const onLostPointerCapture = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      // Capture can disappear without pointercancel (for example when browser chrome takes the
      // gesture). Abandon the draft so the next pointer is not permanently locked out.
      finish(event, false);
    },
    [finish],
  );

  return (
    <div className="flex flex-col gap-1" aria-label={`Deck ${deck} ${spec.label} automation`}>
      <span className="type-eyebrow text-muted-foreground">
        {spec.label} automation · draw {Math.max(MIN_WINDOW_SECS, duration).toFixed(1)}s
      </span>
      <svg
        className="h-16 w-full touch-none border border-border bg-muted/20"
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        preserveAspectRatio="none"
        aria-label={`Draw Deck ${deck} ${spec.label} automation`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onLostPointerCapture}
      >
        <title>{`Deck ${deck} ${spec.label} automation lane`}</title>
        <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} className="fill-muted opacity-0" />
        <path
          ref={pathRef}
          d={path}
          className="fill-none stroke-primary"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
