/**
 * @role The box and the lettering all eight ground sketches share: one picture in the bench's own
 *   `SKETCH_VIEW`, its eyebrow above it, and the one way a picture writes a word on itself. Eight
 *   drawings each opening their own `<svg>` would be eight chances for one of them to be drawn at a
 *   different scale from the rest, which is a bench comparing boxes instead of arguments.
 * @instead The eight pictures themselves → the files beside this one. The arithmetic they are all
 *   drawn off → src/ui/sketch/sketchGround.ts. The frame around the whole entry →
 *   src/ui/sketch/SketchFrame.tsx.
 */
import type { ReactNode } from "react";

import { SKETCH_PICTURE, SKETCH_VIEW as VIEW, SketchLabel } from "@/ui/sketch/SketchFrame";

/**
 * One ground sketch's stage. The `data-ground` attribute is on the box rather than the picture so a
 * case can slice from it to the picture's own `</svg>` and no neighbour can answer for it (0252).
 */
export function GroundStage({
  reading,
  label,
  under,
  children,
}: {
  reading: string;
  label: string;
  /** Anything a hand works below the picture — the one gesture on this bench has a control. */
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
 * Written once because eight pictures name their corners and a name set in a ninth way reads as a
 * different kind of thing (0252).
 */
export function GroundSays({
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

/**
 * A point on a circle, with nought a turn at the top and a turn running clockwise — the way a clock
 * face is read and the way a ring of grounds advances. Shared by the two round pictures so they
 * cannot disagree about which way round the walk goes.
 */
export function atTurn(
  cx: number,
  cy: number,
  radius: number,
  turn: number,
): { x: number; y: number } {
  const angle = (turn - 0.25) * Math.PI * 2;
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
}
