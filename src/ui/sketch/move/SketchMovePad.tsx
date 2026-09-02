/**
 * @role Move sketch 02 — a pad with a puck on it: across is which way, up is how far, and the foot
 *   of the pad is the loop staying where it is. The argument: the three amounts are two axes and a
 *   corner, so one puck says all three and a hand feels "further" and "more that way" as
 *   directions rather than as numbers.
 * @instead The other five readings of the same seam → the files beside this one. How a puck is
 *   read → `padOf`, src/ui/sketch/sketchMove.ts. The file the consequence is drawn on →
 *   src/ui/sketch/move/SketchMoveFile.tsx.
 */
// One picture is one function: the geometry is read top to bottom and every corner of it names
// itself, so cutting it into helpers to satisfy a line count would scatter one drawing across five
// scopes. The same waiver every sketch on this bench carries, for the reason 0247 gives (0007).
// oxlint-disable max-lines-per-function
import { useCallback, useState } from "react";

import { SKETCH_VIEW as VIEW } from "@/ui/sketch/SketchFrame";
import { SketchSays, SketchStage, usePointOn } from "@/ui/sketch/SketchStage";
import { MoveFile, type MoveBox } from "@/ui/sketch/move/SketchMoveFile";
import {
  moveSaid,
  padOf,
  SKETCH_MOVE_HELD,
  SKETCH_PAD_AT,
  SKETCH_PAD_EDGES,
  SKETCH_PAD_HEIGHT,
  SKETCH_REACHES,
  SKETCH_WANDERS_SAID,
  type SketchMove,
} from "@/ui/sketch/sketchMove";

const PAD = { left: 24, top: 22, size: 106 };
const FILE: MoveBox = { left: 156, wide: VIEW.wide - 156 - 8, top: 22, high: 56 };

/** A height up the pad, nought at the foot, as a place on the picture. */
const upPad = (height: number): number => PAD.top + (1 - height) * PAD.size;
/** A way across the pad, −1…1, as a place on the picture. */
const acrossPad = (across: number): number => PAD.left + ((across + 1) / 2) * PAD.size;

export function SketchMovePad() {
  const [puck, setPuck] = useState<{ x: number; y: number; move: SketchMove }>({
    ...SKETCH_PAD_AT,
    move: SKETCH_MOVE_HELD,
  });
  const aim = useCallback((px: number, py: number) => {
    // A press on the file beside the pad is not a press on the pad.
    if (px > PAD.left + PAD.size + 16) return;
    const x = Math.max(-1, Math.min(1, ((px - PAD.left) / PAD.size) * 2 - 1));
    const y = Math.max(0, Math.min(1, 1 - (py - PAD.top) / PAD.size));
    setPuck((had) => ({ x, y, move: padOf(x, y, had.move) }));
  }, []);
  const drag = usePointOn(aim);

  return (
    <SketchStage bench="move" reading="pad" label="The Pad" drag={drag}>
      <SketchSays x={4} y={14}>
        {moveSaid(puck.move)}
      </SketchSays>
      <rect
        x={PAD.left}
        y={PAD.top}
        width={PAD.size}
        height={PAD.size}
        className="fill-card stroke-border"
      />
      {/* The bands the reach changes at, ruled across the pad and named inside their own band —
          the puck is read against these and a band a hand cannot see is a number with no dial. */}
      {[SKETCH_PAD_EDGES.stays, SKETCH_PAD_EDGES.nudge, SKETCH_PAD_EDGES.bed].map((edge) => (
        <line
          key={edge}
          x1={PAD.left}
          y1={upPad(edge)}
          x2={PAD.left + PAD.size}
          y2={upPad(edge)}
          className="stroke-border"
          strokeDasharray="2 3"
        />
      ))}
      {SKETCH_REACHES.map((reach) => (
        <SketchSays key={reach} x={PAD.left + 4} y={upPad(SKETCH_PAD_HEIGHT[reach]) + 4}>
          {reach}
        </SketchSays>
      ))}
      <SketchSays x={PAD.left + 4} y={upPad(SKETCH_PAD_EDGES.stays / 2) + 4}>
        {SKETCH_WANDERS_SAID.stays}
      </SketchSays>
      {/* The middle third goes either way, ruled off the two thirds that lean. */}
      {[-1 / 3, 1 / 3].map((third) => (
        <line
          key={third}
          x1={acrossPad(third)}
          y1={upPad(SKETCH_PAD_EDGES.stays)}
          x2={acrossPad(third)}
          y2={PAD.top}
          className="stroke-border"
          strokeDasharray="2 3"
        />
      ))}
      {/* The middle word on a line of its own: three names across a pad this wide run together. */}
      <SketchSays x={PAD.left} y={PAD.top + PAD.size + 14}>
        back
      </SketchSays>
      <SketchSays x={PAD.left + PAD.size} y={PAD.top + PAD.size + 14} end>
        on
      </SketchSays>
      <SketchSays x={PAD.left + PAD.size / 2} y={PAD.top + PAD.size + 24} middle>
        either way
      </SketchSays>
      <circle
        cx={acrossPad(puck.x)}
        cy={upPad(puck.y)}
        r={8}
        className="fill-primary stroke-foreground"
        strokeWidth={2}
      />
      <MoveFile reading="pad" move={puck.move} box={FILE} />
      <SketchSays x={FILE.left} y={FILE.top + FILE.high + 16}>
        no third axis: no grow, no shrink
      </SketchSays>
      <SketchSays x={FILE.left} y={VIEW.high - 4}>
        the foot of the pad is staying put
      </SketchSays>
    </SketchStage>
  );
}
