/**
 * @role One registry-driven automation lane editor: create, move and delete points, each gesture
 *   drafted in refs and committed as one durable lane replacement (0024).
 */
import { type MouseEvent, type PointerEvent, useCallback, useMemo, useRef } from "react";

import type { Instrument } from "@/app/facade";
import { PARAMS, type AutomationParamId } from "@/audio/params";
import type { AutomationPoint } from "@/lib/automation";
import type { DeckId } from "@/state/store";

const VIEW_WIDTH = 100;
const VIEW_HEIGHT = 32;
const MIN_WINDOW_SECS = 1;
/** How near a pointer has to land, in element pixels, to grab a point rather than make one. */
const HIT_RADIUS_PX = 10;

type Window = { start: number; span: number };
/** Where a pointer landed inside the lane, and how big the lane was when it did. */
type Place = { x: number; y: number; width: number; height: number };
/** Both gestures read the same three fields; only the moving one needs a pointer id. */
type LaneEvent = Pick<MouseEvent<SVGSVGElement>, "clientX" | "clientY" | "currentTarget">;

/** The gesture in flight: the whole lane as a working copy, and the one point being moved. */
type Draft = { pointerId: number; moving: AutomationPoint; points: AutomationPoint[] } & Window;

const xOf = (at: number, { start, span }: Window): number => ((at - start) / span) * VIEW_WIDTH;
const yOf = (value: number, min: number, max: number): number =>
  VIEW_HEIGHT - ((value - min) / (max - min)) * VIEW_HEIGHT;

const visibleIn = (points: readonly AutomationPoint[], { start, span }: Window) =>
  points.filter((point) => point.at >= start && point.at <= start + span);

const pathFor = (
  points: readonly AutomationPoint[],
  window: Window,
  min: number,
  max: number,
): string =>
  visibleIn(points, window)
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"}${xOf(point.at, window)} ${yOf(point.value, min, max)}`,
    )
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
  const handlesRef = useRef<SVGGElement>(null);
  const draft = useRef<Draft | null>(null);
  const window = useMemo(() => {
    const first = points[0]?.at ?? instrument.probe().at;
    const last = points.at(-1)?.at ?? first;
    return { start: first, span: Math.max(MIN_WINDOW_SECS, duration, last - first) };
  }, [instrument, points, duration]);
  const path = useMemo(() => pathFor(points, window, spec.min, spec.max), [points, window, spec]);
  const handles = useMemo(() => visibleIn(points, window), [points, window]);

  /** Where in the lane the pointer is, in element pixels — the one place bounds are read. */
  const placeOf = useCallback((event: LaneEvent): Place => {
    const bounds = event.currentTarget.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) {
      throw new RangeError("automation lane has no drawable bounds");
    }
    return {
      width: bounds.width,
      height: bounds.height,
      x: Math.min(bounds.width, Math.max(0, event.clientX - bounds.left)),
      y: Math.min(bounds.height, Math.max(0, event.clientY - bounds.top)),
    };
  }, []);

  const pointAt = useCallback(
    (place: Place, at: Window) => ({
      at: at.start + (place.x / place.width) * at.span,
      value: spec.max - (place.y / place.height) * (spec.max - spec.min),
    }),
    [spec],
  );

  /** The existing point under the pointer, or null — what decides move from create and delete. */
  const grabbed = useCallback(
    (place: Place) => {
      let closest: AutomationPoint | null = null;
      let nearest = HIT_RADIUS_PX;
      for (const point of visibleIn(points, window)) {
        const dx = (xOf(point.at, window) / VIEW_WIDTH) * place.width - place.x;
        const dy = (yOf(point.value, spec.min, spec.max) / VIEW_HEIGHT) * place.height - place.y;
        const distance = Math.hypot(dx, dy);
        if (distance > nearest) continue;
        nearest = distance;
        closest = point;
      }
      return closest;
    },
    [points, window, spec],
  );

  const drawDraft = useCallback(
    (active: Draft) => {
      pathRef.current?.setAttribute("d", pathFor(active.points, active, spec.min, spec.max));
    },
    [spec],
  );

  const onPointerDown = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      if (draft.current !== null || event.button !== 0) return;
      const place = placeOf(event);
      const hit = grabbed(place);
      const next = pointAt(place, window);
      const moving = hit === null ? next : { at: hit.at, value: hit.value };
      const working = points.map((point) => (point === hit ? moving : { ...point }));
      if (hit === null) working.push(moving);
      const active: Draft = { ...window, pointerId: event.pointerId, moving, points: working };
      draft.current = active;
      event.currentTarget.setPointerCapture(event.pointerId);
      // The rendered handles are a render behind a moving point; the path is the live feedback.
      handlesRef.current?.setAttribute("opacity", "0");
      drawDraft(active);
    },
    [placeOf, grabbed, pointAt, window, points, drawDraft],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      const active = draft.current;
      if (active === null || active.pointerId !== event.pointerId) return;
      const next = pointAt(placeOf(event), active);
      if (active.moving.at === next.at && active.moving.value === next.value) return;
      active.moving.at = next.at;
      active.moving.value = next.value;
      // Dragged past a neighbour, the working copy has to stay in time order or the drawn path
      // doubles back. The executor normalizes the committed lane the same way.
      // oxlint-disable-next-line unicorn/no-array-sort
      active.points.sort((left, right) => left.at - right.at);
      drawDraft(active);
    },
    [pointAt, placeOf, drawDraft],
  );

  const finish = useCallback(
    (event: PointerEvent<SVGSVGElement>, commit: boolean) => {
      const active = draft.current;
      if (active === null || active.pointerId !== event.pointerId) return;
      draft.current = null;
      handlesRef.current?.setAttribute("opacity", "1");
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

  /** Deleting is the secondary button, so it never opens a drag and never commits twice. */
  const onContextMenu = useCallback(
    (event: MouseEvent<SVGSVGElement>) => {
      event.preventDefault();
      if (draft.current !== null) return;
      const hit = grabbed(placeOf(event));
      if (hit === null) return;
      instrument.send({
        t: "automation.set",
        deck,
        param,
        points: points.filter((point) => point !== hit),
      });
    },
    [grabbed, placeOf, instrument, deck, param, points],
  );

  return (
    <div className="flex flex-col gap-1" aria-label={`Deck ${deck} ${spec.label} automation`}>
      <span className="type-eyebrow text-muted-foreground">
        {spec.label} · drag to add or move a point · right-click one to delete
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
        onContextMenu={onContextMenu}
      >
        <title>{`Deck ${deck} ${spec.label} automation lane`}</title>
        <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} className="fill-muted opacity-0" />
        <path
          ref={pathRef}
          d={path}
          className="fill-none stroke-primary"
          vectorEffect="non-scaling-stroke"
        />
        <g ref={handlesRef}>
          {handles.map((point) => (
            <circle
              key={`${point.at}:${point.value}`}
              cx={xOf(point.at, window)}
              cy={yOf(point.value, spec.min, spec.max)}
              r={1}
              className="fill-primary"
            />
          ))}
        </g>
      </svg>
    </div>
  );
}
