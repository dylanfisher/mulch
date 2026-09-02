/**
 * @role The box and the lettering every sketch on either bench shares: one picture in the bench's
 *   own `SKETCH_VIEW`, its eyebrow above it, the one way a picture writes a word on itself, and the
 *   one way a picture a hand drags reads where the hand is. Fourteen drawings each opening their
 *   own `<svg>` would be fourteen chances for one of them to be drawn at a different scale from the
 *   rest, which is a bench comparing boxes instead of arguments.
 * @instead The pictures themselves → src/ui/sketch/ground/ and src/ui/sketch/move/. The arithmetic
 *   they are drawn off → src/ui/sketch/sketchGround.ts and src/ui/sketch/sketchMove.ts. The frame
 *   around the whole entry → src/ui/sketch/SketchFrame.tsx.
 */
import { useCallback, useRef, type PointerEvent, type ReactNode } from "react";

import { SKETCH_PICTURE, SKETCH_VIEW as VIEW, SketchLabel } from "@/ui/sketch/SketchFrame";

/** Which bench a picture is on, which is the attribute a test slices its markup by (0252). */
export type SketchBench = "ground" | "move";

/**
 * The handlers a dragged picture hangs on its own `<svg>`, so a stage can take them as one prop
 * rather than five. Read off `usePointOn` below; never written by hand.
 */
export type SketchDrag = {
  onPointerDown: (event: PointerEvent<SVGSVGElement>) => void;
  onPointerMove: (event: PointerEvent<SVGSVGElement>) => void;
  onPointerUp: () => void;
  onPointerCancel: () => void;
  onLostPointerCapture: () => void;
};

/**
 * One sketch's stage. The `data-ground` or `data-move` attribute is on the box rather than the
 * picture so a case can slice from it to the picture's own `</svg>` and no neighbour can answer
 * for it (0252).
 */
export function SketchStage({
  bench,
  reading,
  label,
  under,
  drag,
  children,
}: {
  bench: SketchBench;
  reading: string;
  label: string;
  /** Anything a hand works below the picture — a slider, a row of presses, a sentence. */
  under?: ReactNode;
  /** The gesture a hand makes on the picture itself, where the picture is the control. */
  drag?: SketchDrag;
  children: ReactNode;
}) {
  return (
    <div {...{ [`data-${bench}`]: reading }} className="flex flex-col gap-2">
      <SketchLabel>{label}</SketchLabel>
      <svg
        viewBox={`0 0 ${VIEW.wide} ${VIEW.high}`}
        className={`${SKETCH_PICTURE} touch-none select-none`}
        {...drag}
      >
        {children}
      </svg>
      {under}
    </div>
  );
}

/**
 * A word inside a picture, in the readout type every other sketch on the bench labels a corner in.
 * Written once because every picture names its corners and a name set in a fifteenth way reads as
 * a different kind of thing (0252).
 */
export function SketchSays({
  x,
  y,
  middle = false,
  end = false,
  children,
}: {
  x: number;
  y: number;
  middle?: boolean;
  /** Written leftwards from `x`, for a name that stands to the left of the thing it names. */
  end?: boolean;
  children: ReactNode;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={middle ? "middle" : end ? "end" : "start"}
      className="fill-current type-readout"
    >
      {children}
    </text>
  );
}

/**
 * Where a hand is on a picture, in the picture's own units, handed to `onPoint` on the press and
 * on every move while it is held. A grab carries the pointer that made it, so a second finger
 * neither drives the first one's puck nor drops its drag, and letting go is wired to
 * `pointercancel` and `lostpointercapture` as well as `pointerup`, since a hold left set drags
 * the next pointer to cross the picture without a press (0255). The place is read off the element's
 * own box rather than assumed a unit to the pixel, so a box that is ever drawn at another size
 * still hands the puck to the finger.
 */
export function usePointOn(onPoint: (x: number, y: number) => void): SketchDrag {
  const held = useRef<number | null>(null);
  const read = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      const box = event.currentTarget.getBoundingClientRect();
      onPoint(
        ((event.clientX - box.left) / box.width) * VIEW.wide,
        ((event.clientY - box.top) / box.height) * VIEW.high,
      );
    },
    [onPoint],
  );
  const onPointerDown = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      held.current = event.pointerId;
      event.currentTarget.setPointerCapture(event.pointerId);
      read(event);
    },
    [read],
  );
  const onPointerMove = useCallback(
    (event: PointerEvent<SVGSVGElement>) => {
      if (held.current !== event.pointerId) return;
      read(event);
    },
    [read],
  );
  const letGo = useCallback(() => {
    held.current = null;
  }, []);
  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: letGo,
    onPointerCancel: letGo,
    onLostPointerCapture: letGo,
  };
}
