/**
 * @role The box and the lettering every sketch on the bench shares: one picture in the bench's own
 *   `SKETCH_VIEW`, its eyebrow above it, and the one way a picture writes a word on itself. Eight
 *   drawings each opening their own `<svg>` would be eight chances for one of them to be drawn at
 *   a different scale from the rest, which is a bench comparing boxes instead of arguments.
 * @instead The pictures themselves → src/ui/sketch/ground/. The arithmetic they are drawn off →
 *   src/ui/sketch/sketchGround.ts. The frame around the whole entry → src/ui/sketch/SketchFrame.tsx.
 */
import type { ReactNode } from "react";

import { SKETCH_PICTURE, SKETCH_VIEW as VIEW, SketchLabel } from "@/ui/sketch/SketchFrame";

/**
 * One sketch's stage. The `data-ground` attribute is on the box rather than the picture so a case
 * can slice from it to the picture's own `</svg>` and no neighbour can answer for it (0252).
 */
export function SketchStage({
  reading,
  label,
  under,
  children,
}: {
  reading: string;
  label: string;
  /** Anything a hand works below the picture — a slider, a row of presses, a sentence. */
  under?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div data-ground={reading} className="flex flex-col gap-2">
      <SketchLabel>{label}</SketchLabel>
      <svg viewBox={`0 0 ${VIEW.wide} ${VIEW.high}`} className={`${SKETCH_PICTURE} touch-none`}>
        {children}
      </svg>
      {under}
    </div>
  );
}

/**
 * A word inside a picture, in the readout type every other sketch on the bench labels a corner in.
 * Written once because every picture names its corners and a name set in a ninth way reads as a
 * different kind of thing (0252).
 */
export function SketchSays({
  x,
  y,
  middle = false,
  children,
}: {
  x: number;
  y: number;
  middle?: boolean;
  children: ReactNode;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={middle ? "middle" : "start"}
      className="fill-current type-readout"
    >
      {children}
    </text>
  );
}
