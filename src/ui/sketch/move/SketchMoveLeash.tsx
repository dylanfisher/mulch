/**
 * @role Move sketch 01 — the loop on a leash a hand pulls out along the file. The argument: how far
 *   and which way are one gesture and not two dials, because a leash has a length and a side and
 *   nothing else — and a leash left lying on the loop is the loop staying put, so whether it moves
 *   at all is the same gesture too.
 * @instead The other five readings of the same seam → the files beside this one. How a leash is
 *   read → `leashOf`, src/ui/sketch/sketchMove.ts. The file the consequence is drawn on →
 *   src/ui/sketch/move/SketchMoveFile.tsx.
 */
// One picture is one function: the geometry is read top to bottom and every corner of it names
// itself, so cutting it into helpers to satisfy a line count would scatter one drawing across five
// scopes. The same waiver every sketch on this bench carries, for the reason 0247 gives (0007).
// oxlint-disable max-lines-per-function
import { useCallback, useState } from "react";

import { SKETCH_VIEW as VIEW } from "@/ui/sketch/SketchFrame";
import { SketchSays, SketchStage, usePointOn } from "@/ui/sketch/SketchStage";
import { alongBox, MoveFile, type MoveBox } from "@/ui/sketch/move/SketchMoveFile";
import {
  leashOf,
  moveSaid,
  SKETCH_LEASH_AT,
  SKETCH_LEASH_SLACK,
  SKETCH_LOOP,
  SKETCH_MOVE_HELD,
  SKETCH_REACH_EDGES,
  type SketchMove,
} from "@/ui/sketch/sketchMove";

const FILE: MoveBox = { left: 0, wide: VIEW.wide, top: 22, high: 50 };

/** The leash runs along its own row under the file, pegged to the middle of the loop. */
const ROW = { y: 104, peg: alongBox(FILE, SKETCH_LOOP.at + SKETCH_LOOP.span / 2) };

/** Three picture units per sixteenth: at the file's own scale a leash to anywhere would run off
 *  the picture, and a leash that cannot be pulled to its own furthest word is not the control. */
const PER_SLOT = 3;
const FURTHEST = Math.floor((ROW.peg - 12) / PER_SLOT);

/** Where the leash changes its word, either side of the peg, so the bins are marked on the row. */
const EDGES = [SKETCH_LEASH_SLACK, SKETCH_REACH_EDGES.nudge, SKETCH_REACH_EDGES.bed];

export function SketchMoveLeash() {
  const [leash, setLeash] = useState<{ dx: number; move: SketchMove }>({
    dx: SKETCH_LEASH_AT,
    move: SKETCH_MOVE_HELD,
  });
  const pull = useCallback((x: number) => {
    const dx = Math.max(-FURTHEST, Math.min(FURTHEST, Math.round((x - ROW.peg) / PER_SLOT)));
    setLeash((had) => ({ dx, move: leashOf(dx, had.move) }));
  }, []);
  const drag = usePointOn(pull);
  const hand = ROW.peg + leash.dx * PER_SLOT;

  return (
    <SketchStage bench="move" reading="leash" label="The Leash" drag={drag}>
      <SketchSays x={4} y={14}>
        {moveSaid(leash.move)}
      </SketchSays>
      <MoveFile reading="leash" move={leash.move} box={FILE} />
      {/* The row the leash is pulled along, with the three edges where its word changes marked
          both ways from the peg and named — a bin a hand cannot see is a dial with no numbers. */}
      <line
        x1={12}
        y1={ROW.y}
        x2={VIEW.wide - 12}
        y2={ROW.y}
        className="stroke-border"
        strokeWidth={1}
      />
      {EDGES.flatMap((edge) =>
        [-1, 1].map((side) => (
          <line
            key={`${side}${edge}`}
            x1={ROW.peg + side * edge * PER_SLOT}
            y1={ROW.y - 5}
            x2={ROW.peg + side * edge * PER_SLOT}
            y2={ROW.y + 5}
            className="stroke-border"
            strokeWidth={1}
          />
        )),
      )}
      <SketchSays x={ROW.peg} y={ROW.y + 22} middle>
        stays
      </SketchSays>
      {/* Named once, over the peg: the nudge band is a few units each side, so two names on it
          would run into each other, and one name over both reads as the band it is. */}
      <SketchSays x={ROW.peg} y={ROW.y - 12} middle>
        a nudge
      </SketchSays>
      {[-1, 1].map((side) => (
        <g key={side}>
          <SketchSays x={ROW.peg + side * 75} y={ROW.y + 22} middle>
            a bed
          </SketchSays>
          <SketchSays x={ROW.peg + side * 180} y={ROW.y + 22} middle>
            anywhere
          </SketchSays>
        </g>
      ))}
      <SketchSays x={12} y={ROW.y - 12}>
        back
      </SketchSays>
      <SketchSays x={VIEW.wide - 12} y={ROW.y - 12} end>
        on
      </SketchSays>
      {/* The leash itself: the peg on the loop, the line out to the hand, and the hand. */}
      <line
        x1={ROW.peg}
        y1={ROW.y}
        x2={hand}
        y2={ROW.y}
        className="stroke-primary"
        strokeWidth={3}
      />
      <circle cx={ROW.peg} cy={ROW.y} r={4} className="fill-foreground" />
      <circle
        cx={hand}
        cy={ROW.y}
        r={8}
        className="fill-primary stroke-foreground"
        strokeWidth={2}
      />
      <SketchSays x={4} y={VIEW.high - 4}>
        a leash has a side, never either way, and no say in size
      </SketchSays>
    </SketchStage>
  );
}
