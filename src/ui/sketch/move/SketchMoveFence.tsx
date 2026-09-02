/**
 * @role Move sketch 03 — a fence round the loop, two posts on the file a hand drags out or in. The
 *   argument: a hand does not set how far the loop may go, it sets where it may not — so the
 *   reach is the room inside the fence, the way is which side has the room, and a fence pulled in
 *   tight round the loop is the loop staying where it is.
 * @instead The other five readings of the same seam → the files beside this one. How a fence is
 *   read → `fenceOf`, src/ui/sketch/sketchMove.ts. The file the consequence is drawn on →
 *   src/ui/sketch/move/SketchMoveFile.tsx.
 */
// One picture is one function: the geometry is read top to bottom and every corner of it names
// itself, so cutting it into helpers to satisfy a line count would scatter one drawing across five
// scopes. The same waiver every sketch on this bench carries, for the reason 0247 gives (0007).
// oxlint-disable max-lines-per-function
import { useCallback, useMemo, useRef, useState } from "react";

import { SKETCH_VIEW as VIEW } from "@/ui/sketch/SketchFrame";
import { SketchSays, SketchStage, usePointOn } from "@/ui/sketch/SketchStage";
import { alongBox, MoveFile, type MoveBox } from "@/ui/sketch/move/SketchMoveFile";
import {
  fenceOf,
  moveSaid,
  SKETCH_FENCE_AT,
  SKETCH_LOOP,
  SKETCH_MOVE_HELD,
  type SketchMove,
} from "@/ui/sketch/sketchMove";
import { SKETCH_SOURCE_SLOTS } from "@/ui/sketch/sketchWalk";

const FILE: MoveBox = { left: 0, wide: VIEW.wide, top: 40, high: 60 };
const POST = { over: 12, wide: 6 };
const LOOP_END = SKETCH_LOOP.at + SKETCH_LOOP.span;

/** A place on the picture, as a count of sixteenths along the file. */
const slotAt = (x: number): number => Math.round((x / FILE.wide) * SKETCH_SOURCE_SLOTS);

export function SketchMoveFence() {
  const [fence, setFence] = useState<{ left: number; right: number; move: SketchMove }>({
    ...SKETCH_FENCE_AT,
    move: SKETCH_MOVE_HELD,
  });
  /** Which post the hand took hold of at the press, held for the drag — the nearer one, so a
   *  grab a little past a post still moves that post and never swaps to the other mid-drag. */
  const holding = useRef<"left" | "right" | null>(null);
  const move = useCallback((x: number) => {
    setFence((had) => {
      if (holding.current === null) {
        const toLeft = Math.abs(x - alongBox(FILE, had.left));
        const toRight = Math.abs(x - alongBox(FILE, had.right));
        holding.current = toLeft <= toRight ? "left" : "right";
      }
      // A post never crosses into the loop: the room it leaves is nought, not less.
      const left =
        holding.current === "left" ? Math.max(0, Math.min(SKETCH_LOOP.at, slotAt(x))) : had.left;
      const right =
        holding.current === "right"
          ? Math.max(LOOP_END, Math.min(SKETCH_SOURCE_SLOTS, slotAt(x)))
          : had.right;
      return { left, right, move: fenceOf(left, right, had.move) };
    });
  }, []);
  const pointed = usePointOn(move);
  /** Letting go drops the post as well as the pointer, so the next press picks its own post. */
  const drag = useMemo(() => {
    const letGo = () => {
      holding.current = null;
      pointed.onPointerUp();
    };
    return { ...pointed, onPointerUp: letGo, onPointerCancel: letGo, onLostPointerCapture: letGo };
  }, [pointed]);
  const before = SKETCH_LOOP.at - fence.left;
  const after = fence.right - LOOP_END;

  return (
    <SketchStage bench="move" reading="fence" label="The Fence" drag={drag}>
      <SketchSays x={4} y={14}>
        {moveSaid(fence.move)}
      </SketchSays>
      {/* The room inside the fence, shaded, so what the loop may wander over is a place. */}
      <rect
        x={alongBox(FILE, fence.left)}
        y={FILE.top - POST.over}
        width={alongBox(FILE, fence.right) - alongBox(FILE, fence.left)}
        height={FILE.high + POST.over * 2}
        className="fill-primary/5 stroke-none"
      />
      <MoveFile reading="fence" move={fence.move} box={FILE} />
      {(["left", "right"] as const).map((post) => (
        <g key={post}>
          <line
            x1={alongBox(FILE, fence[post])}
            y1={FILE.top - POST.over}
            x2={alongBox(FILE, fence[post])}
            y2={FILE.top + FILE.high + POST.over}
            className="stroke-foreground"
            strokeWidth={2}
          />
          <rect
            x={alongBox(FILE, fence[post]) - POST.wide / 2}
            y={FILE.top - POST.over - 4}
            width={POST.wide}
            height={12}
            className="fill-primary stroke-foreground"
            strokeWidth={1.5}
          />
        </g>
      ))}
      {/* Each side's room named where it is: on the loop's own edge, reading away from it. */}
      <SketchSays x={alongBox(FILE, SKETCH_LOOP.at) - 4} y={FILE.top + FILE.high + 18} end>
        {`${before} back`}
      </SketchSays>
      <SketchSays x={alongBox(FILE, LOOP_END) + 4} y={FILE.top + FILE.high + 18}>
        {`${after} on`}
      </SketchSays>
      <SketchSays x={4} y={VIEW.high - 16}>
        a post out is room, a post on the loop is none
      </SketchSays>
      <SketchSays x={4} y={VIEW.high - 4}>
        twice the room one side leans; the loop keeps its size
      </SketchSays>
    </SketchStage>
  );
}
