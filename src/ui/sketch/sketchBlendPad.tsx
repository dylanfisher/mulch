/**
 * @role The one square every blend of the cast is drawn in — its coordinates, where the six sit
 *   round it, the name each corner draws for itself, and the drag that turns a hand's place into
 *   six weights over one.
 * @instead The four blends drawn on it → src/ui/sketch/sketchBlends.tsx. The readout they all
 *   write → src/ui/sketch/SketchCast.tsx.
 */
import { useCallback, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode, RefObject } from "react";

import { cn } from "@/lib/cn";
import { SKETCH_CAST } from "@/ui/sketch/sketchWalk";

/** Four pictures in one square, so what differs between them is the weighting and not the size. */
export const PAD = 200;
export const MIDDLE = PAD / 2;
/**
 * How far the box spills past the square on each side. The geometry is the square; the names sit
 * outside it, and a name that runs off the edge of its own picture is the failure this sketch
 * exists to fix — so the box is wider than the pad rather than the names smaller (0252).
 */
export const SPILL = 52;
const VIEW = PAD + SPILL * 2;
/**
 * The width of the box, said once for the pad and for the column it sits in. It is `h-40` at the
 * box's own 304:200, because anything else letterboxes the drawing inside the element and
 * `placeOf` — which stretch-fits — would then hand a blend a place a few units off the finger.
 */
export const BLEND_WIDTH = "w-61";
/** How far out the geometry sits, and how far out the names sit — outside it, never under a puck. */
export const RING = 72;
export const NAMES = 92;

/** A place in a pad's own coordinates. */
export type Point = { x: number; y: number };
/** A place on a circle round the middle of the pad: where it is, and which way out that is. */
export type Place = { angle: number; x: number; y: number };
/** What every blend hands the one readout: the six, in the module's declaration order. */
export type WroteWeights = (weights: readonly number[]) => void;
export type BlendProps = { wrote: WroteWeights };

/**
 * Six shares of one, which is what a blend is. A blend standing on nothing has no answer to
 * give — there is no such place — so it says so rather than handing back six NaNs.
 */
export function normalise(raw: readonly number[]): number[] {
  const total = raw.reduce((sum, one) => sum + one, 0);
  if (total <= 0) throw new Error("A blend weighed the whole cast at nothing, which is nowhere.");
  return raw.map((one) => one / total);
}

/** Where the nth of `count` sits going round, starting at the top. */
export function around(index: number, count: number, radius: number): Place {
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  return { angle, x: MIDDLE + Math.cos(angle) * radius, y: MIDDLE + Math.sin(angle) * radius };
}

/** The six round the pad: where each one's mark is drawn, and where its own name is drawn. */
export const CORNERS = SKETCH_CAST.map((name, index) => {
  const mark = around(index, SKETCH_CAST.length, RING);
  return {
    name,
    angle: mark.angle,
    x: mark.x,
    y: mark.y,
    label: around(index, SKETCH_CAST.length, NAMES),
  };
});

/**
 * A corner's own name, in its own picture, with its weight beside it. A pad whose corners are
 * unlabelled cannot answer the one question it exists to ask — can a hand find the character it
 * wants — so no blend here draws a legend underneath instead (0252).
 */
export function CornerName({ name, weight, at }: { name: string; weight: number; at: Place }) {
  const across = Math.cos(at.angle);
  return (
    <text
      x={at.x}
      y={at.y}
      textAnchor={Math.abs(across) < 0.3 ? "middle" : across > 0 ? "start" : "end"}
      dominantBaseline="middle"
      fill="currentColor"
      className="type-readout"
    >
      {name} {Math.round(weight * 100)}
    </text>
  );
}

/** The square every blend is drawn in, so four pictures share one stage and one gesture surface. */
export function BlendPad({
  pad,
  children,
  ...handlers
}: {
  pad: RefObject<SVGSVGElement | null>;
  children: ReactNode;
  onPointerDown: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerMove: (event: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerUp: () => void;
}) {
  return (
    <svg
      ref={pad}
      viewBox={`${-SPILL} 0 ${VIEW} ${PAD}`}
      className={cn(
        "h-40 touch-none rounded-lg bg-muted text-muted-foreground select-none",
        BLEND_WIDTH,
      )}
      {...handlers}
    >
      {children}
    </svg>
  );
}

/** Where in the pad's own coordinates a pointer event landed. */
export function placeOf(event: ReactPointerEvent<SVGSVGElement>, box: DOMRect): Point {
  return {
    x: -SPILL + ((event.clientX - box.left) / box.width) * VIEW,
    y: ((event.clientY - box.top) / box.height) * PAD,
  };
}

/**
 * A press, a drag while it is down, and a release — the three handlers every picture on the bench
 * a hand drags across wants, holding nothing but whether it is down. What the drag *means* is the
 * caller's `act`, which is the only part that differs between a pad, a row of levers and a drum.
 */
export function useHeld(act: (event: ReactPointerEvent<SVGSVGElement>) => void) {
  const [held, setHeld] = useState(false);
  const onPointerDown = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      setHeld(true);
      act(event);
    },
    [act],
  );
  const onPointerMove = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      if (held) act(event);
    },
    [held, act],
  );
  const onPointerUp = useCallback(() => {
    setHeld(false);
  }, []);
  return { onPointerDown, onPointerMove, onPointerUp };
}

/** A pad a hand drags a point around, reporting the six it weighs as the point moves. */
export function useAim(start: Point, weigh: (at: Point) => number[], wrote: WroteWeights) {
  const pad = useRef<SVGSVGElement>(null);
  const [at, setAt] = useState(start);

  const aim = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>) => {
      const box = pad.current?.getBoundingClientRect();
      if (box === undefined) return;
      const next = placeOf(event, box);
      setAt(next);
      wrote(weigh(next));
    },
    [weigh, wrote],
  );

  return { pad, at, handlers: useHeld(aim) };
}
