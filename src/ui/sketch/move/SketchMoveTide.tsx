/**
 * @role Move sketch 06 — the loop's own boundary as a tide: the next windows stacked under the
 *   file like tide lines, each wider or narrower than the last, and one slider for whether it
 *   comes in, holds or goes out. The argument: whether the loop grows or shrinks is the one fact
 *   the fold has no word for, and it is felt as a tide — a thing that swells where it lies — so
 *   it wants a picture of its own before it is a dial on someone else's row.
 * @instead The other five readings of the same seam → the files beside this one. Where each tide
 *   line lands → `windowsAhead`, src/ui/sketch/sketchMove.ts. The file the standing window is
 *   drawn on → src/ui/sketch/move/SketchMoveFile.tsx.
 */
import { useCallback, useState } from "react";

import { Slider } from "@/ui/components/slider";
import { acrossFile } from "@/ui/sketch/sketchGround";
import { SKETCH_VIEW as VIEW } from "@/ui/sketch/SketchFrame";
import { SketchSays, SketchStage } from "@/ui/sketch/SketchStage";
import { alongBox, MOVE_AHEAD, MoveFile, type MoveBox } from "@/ui/sketch/move/SketchMoveFile";
import {
  moveSaid,
  SKETCH_BREATHS,
  SKETCH_MOVE,
  type SketchBreath,
  type SketchMove,
  windowsAhead,
} from "@/ui/sketch/sketchMove";
import { fixtureAt } from "@/ui/sketch/sketchWalk";

const FILE: MoveBox = { left: 0, wide: VIEW.wide, top: 22, high: 40 };
/** The tide lines, one per move ahead, each on a row of its own under the file. */
const LINES = { top: FILE.top + FILE.high + 12, high: 12, gap: 6 };

/** The slider runs shrinks, holds, grows — one notch per word, either side of holding. */
const NOTCH_OF = (breath: SketchBreath): number => SKETCH_BREATHS.indexOf(breath) - 1;

export function SketchMoveTide() {
  const [move, setMove] = useState<SketchMove>(SKETCH_MOVE);
  const onValueChange = useCallback((value: number | readonly number[]) => {
    // One thumb, so a list is the shape and not a case (src/ui/components/slider.tsx).
    const notch = typeof value === "number" ? value : value[0];
    if (notch === undefined) throw new Error("The tide slider handed back no notch.");
    setMove((had) => ({ ...had, breath: fixtureAt(SKETCH_BREATHS, notch + 1, "breath") }));
  }, []);
  const lines = windowsAhead(move, MOVE_AHEAD);

  return (
    <SketchStage
      bench="move"
      reading="tide"
      label="The Tide"
      under={
        <Slider
          value={NOTCH_OF(move.breath)}
          min={-1}
          max={1}
          step={1}
          aria-label="How the loop breathes"
          onValueChange={onValueChange}
        />
      }
    >
      <SketchSays x={4} y={14}>
        {moveSaid(move)}
      </SketchSays>
      <MoveFile reading="tide" move={move} box={FILE} />
      {lines.map((line, index) => (
        <g key={line.nth} opacity={0.8 - index * 0.2}>
          <rect
            x={alongBox(FILE, line.at)}
            y={LINES.top + index * (LINES.high + LINES.gap)}
            width={acrossFile(line.span) * FILE.wide}
            height={LINES.high}
            className="fill-primary stroke-none"
          />
          <SketchSays
            x={alongBox(FILE, line.at) + 4}
            y={LINES.top + index * (LINES.high + LINES.gap) + LINES.high - 3}
          >
            {`+${line.nth}`}
          </SketchSays>
        </g>
      ))}
      <SketchSays x={4} y={VIEW.high - 16}>
        a tide swells where it lies: its set is drawn, not chosen
      </SketchSays>
      {/* The slider's own three words, on the picture over it, at the notch each stands at. */}
      <SketchSays x={4} y={VIEW.high - 4}>
        {SKETCH_BREATHS[0]}
      </SketchSays>
      <SketchSays x={VIEW.wide / 2} y={VIEW.high - 4} middle>
        {SKETCH_BREATHS[1]}
      </SketchSays>
      <SketchSays x={VIEW.wide - 4} y={VIEW.high - 4} end>
        {SKETCH_BREATHS[2]}
      </SketchSays>
    </SketchStage>
  );
}
