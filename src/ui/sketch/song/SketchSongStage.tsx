/**
 * @role The box and the lettering all eight playback sketches share: one picture in the bench's
 *   own `SKETCH_VIEW`, its eyebrow above it, and the one way a picture writes a word on itself.
 *   The ground bench's `GroundStage` said for the second bench rather than made general — the two
 *   carry different attributes and nothing else, and a stage taking the attribute as an argument
 *   would be one abstraction over two callers (principle 3).
 * @instead The eight pictures themselves → the files beside this one. The arithmetic they are all
 *   drawn off → src/ui/sketch/sketchSong.ts. The frame around the whole entry →
 *   src/ui/sketch/SketchFrame.tsx.
 */
import type { ReactNode } from "react";

import { clamp } from "@/lib/range";
import { SKETCH_PICTURE, SKETCH_VIEW as VIEW, SketchLabel } from "@/ui/sketch/SketchFrame";

/**
 * One playback sketch's stage. The `data-song` attribute is on the box rather than the picture so
 * a case can slice from it to the picture's own `</svg>` and no neighbour can answer for it (0252).
 */
export function SongStage({
  reading,
  label,
  children,
}: {
  reading: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div data-song={reading} className="flex flex-col gap-2">
      <SketchLabel>{label}</SketchLabel>
      <svg viewBox={`0 0 ${VIEW.wide} ${VIEW.high}`} className={SKETCH_PICTURE}>
        {children}
      </svg>
    </div>
  );
}

/**
 * How wide one character of the readout type is, near enough to hold a word inside the box: the
 * type is mono at `--text-xs` (src/ui/tokens.css), so a count of characters is a width.
 */
const SAYS_CHARACTER = 7.2;

/**
 * Where a word centred on `x` may actually be centred, so it stays inside the picture. The trap
 * `SKETCH_PICTURE`'s own comment records, said in arithmetic rather than paid for again: a name
 * centred over the last stretch of a 480-wide box runs off the right-hand edge, and a clipped
 * label reads as a shorter word — which is legible and wrong.
 */
export function heldMiddle(x: number, said: string): number {
  const half = (said.length * SAYS_CHARACTER) / 2 + 2;
  return clamp(x, half, VIEW.wide - half);
}

/**
 * A word inside a picture, in the readout type every other sketch on the bench labels a corner in.
 * Written once because eight pictures name their corners and a name set in a ninth way reads as a
 * different kind of thing (0252).
 */
export function SongSays({
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
