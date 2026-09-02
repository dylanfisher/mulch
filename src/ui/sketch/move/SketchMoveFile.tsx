/**
 * @role The file every move sketch draws its consequence on: the source's own wave, the window
 *   the loop is reading lit, and the windows the next moves reach drawn ahead as ghosts, each
 *   numbered inside itself. One drawing and not six, because what the six argue about is the
 *   control and never the consequence — six files drawn six ways would be six pictures of one
 *   future looking like six futures.
 * @instead The arithmetic the ghosts are placed by → src/ui/sketch/sketchMove.ts. The six controls
 *   drawn over or under this → the files beside this one. The file as the ground bench draws it,
 *   with the planted grounds queued on it → src/ui/sketch/ground/SketchGroundQueue.tsx.
 */
import { SketchSays } from "@/ui/sketch/SketchStage";
import { acrossFile } from "@/ui/sketch/sketchGround";
import { SKETCH_LOOP, type SketchMove, windowsAhead } from "@/ui/sketch/sketchMove";
import { fixtureAt, SKETCH_SOURCE } from "@/ui/sketch/sketchWalk";

/** How many moves ahead every picture draws: enough to see a direction and a breath, and few
 *  enough that the numbers inside the ghosts still fit down one window. */
export const MOVE_AHEAD = 3;

/** The box on the stage the file is drawn in, in the picture's own units. */
export type MoveBox = { left: number; wide: number; top: number; high: number };

/** Where a count of sixteenths falls across a box, in the picture's own units. */
export const alongBox = (box: MoveBox, slots: number): number =>
  box.left + acrossFile(slots) * box.wide;

/** The source as one run of loudness read up and down the box's middle — the shape a hand knows a
 *  sample by, so a window is seen to be on the break or the tail and not on a grey bar. */
function wavePath(box: MoveBox): string {
  const step = box.wide / (SKETCH_SOURCE.length - 1);
  const mid = box.top + box.high / 2;
  const reach = box.high / 2 - 2;
  const last = SKETCH_SOURCE.length - 1;
  const up = SKETCH_SOURCE.map((much, at) => `${box.left + at * step} ${mid - much * reach}`);
  // The way back along the foot, read from the far end so the outline closes on itself.
  const down = SKETCH_SOURCE.map((_, index) => {
    const at = last - index;
    return `${box.left + at * step} ${mid + fixtureAt(SKETCH_SOURCE, at, "sample") * reach}`;
  });
  return `M ${up.join(" L ")} L ${down.join(" L ")} Z`;
}

/**
 * The file with the loop on it and its next windows ahead. `reading` is the picture's own id, so
 * its lit window answers for it alone when a test slices the page (0252).
 */
export function MoveFile({
  reading,
  move,
  box,
}: {
  reading: string;
  move: SketchMove;
  box: MoveBox;
}) {
  const ahead = windowsAhead(move, MOVE_AHEAD);
  return (
    <g>
      <path d={wavePath(box)} className="fill-border stroke-none" />
      <rect
        data-standing={reading}
        x={alongBox(box, SKETCH_LOOP.at)}
        y={box.top}
        width={acrossFile(SKETCH_LOOP.span) * box.wide}
        height={box.high}
        className="fill-primary/15 stroke-primary"
        strokeWidth={2}
      />
      <SketchSays x={alongBox(box, SKETCH_LOOP.at) + 4} y={box.top + box.high - 5}>
        now
      </SketchSays>
      {ahead.map((window, index) => (
        <g key={window.nth} opacity={0.7 - index * 0.18}>
          <rect
            x={alongBox(box, window.at)}
            y={box.top + 2 + index * 2}
            width={acrossFile(window.span) * box.wide}
            height={box.high - 4 - index * 4}
            className="fill-none stroke-primary"
            strokeDasharray="4 3"
            strokeWidth={1.5}
          />
          {/* Numbered inside its own window, one line down per move: the ghosts of a loop that
              stays lie on top of one another, and three names on one line would read as one. */}
          <SketchSays x={alongBox(box, window.at) + 4} y={box.top + 13 + index * 11}>
            {`+${window.nth}`}
          </SketchSays>
        </g>
      ))}
    </g>
  );
}
