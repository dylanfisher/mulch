/**
 * @role Ground sketch 02 — the source itself, with the next few grounds queued ahead of the
 *   playhead and each carrying how many laps of the walk until it arrives. The argument: a period
 *   is only ever felt as "what comes next and when", so draw that and let the dial be a
 *   consequence.
 * @instead The other seven readings of the same seam → the files beside this one. The arithmetic
 *   → src/ui/sketch/sketchGround.ts. The planted grounds it queues → src/ui/sketch/sketchWalk.ts.
 */
// One picture is one function: the geometry is read top to bottom and every corner of it names
// itself, so cutting it into helpers to satisfy a line count would scatter one drawing across five
// scopes. The same waiver every sketch on this bench carries, for the reason 0247 gives (0007).
// oxlint-disable max-lines-per-function
import { PLAYER_SLOTS } from "@/lib/playerSlots";
import { SKETCH_VIEW as VIEW } from "@/ui/sketch/SketchFrame";
import { GroundSays, GroundStage } from "@/ui/sketch/ground/SketchGroundStage";
import {
  acrossFile,
  aheadIn,
  bedSaid,
  SKETCH_COUNTED_SAID,
  SKETCH_EVERY_SAID,
} from "@/ui/sketch/sketchGround";
import { SKETCH_BEDS, SKETCH_GROUND, SKETCH_SOURCE } from "@/ui/sketch/sketchWalk";

/** The file across the top, and the queue of grounds waiting under it. */
const FILE = { top: 30, foot: 78, mid: 54 };
const QUEUE_TOP = 100;

/** The source as one run of loudness read up and down its own middle — the shape a hand knows a
 *  sample by, drawn once across the whole file so a queued ground can be pointed at on it. */
const WAVE = ((): string => {
  const step = VIEW.wide / (SKETCH_SOURCE.length - 1);
  const reach = (FILE.foot - FILE.top) / 2;
  const up = SKETCH_SOURCE.map((much, at) => `${at * step} ${FILE.mid - much * reach}`);
  return `M ${up.join(" L ")}`;
})();

const STANDS_AT = acrossFile(SKETCH_GROUND.standing) * VIEW.wide;
const WINDOW = acrossFile(PLAYER_SLOTS) * VIEW.wide;

/**
 * The queue: the planted grounds in the order a hand put them, each one arriving a whole period
 * after the one before it. The count is the same one every other picture here draws, so a queue
 * that said "in 3" while the clock said "in 2" could not both be of this bench.
 */
const QUEUED = SKETCH_BEDS.map((bed, index) => ({
  name: bed.name,
  in: aheadIn(index + 1),
  x: bed.at * VIEW.wide,
  wide: Math.max(bed.span * VIEW.wide, 44),
}));

export function SketchGroundQueue() {
  return (
    <GroundStage reading="queue" label="The Queue">
      <path d={WAVE} className="fill-none stroke-foreground/40" />
      {/* Where the loop is reading now — one bed of the file wide, part-way into a bed. */}
      <rect
        data-standing="queue"
        x={STANDS_AT}
        y={FILE.top}
        width={WINDOW}
        height={FILE.foot - FILE.top}
        rx={2}
        className="fill-primary/15 stroke-foreground"
        strokeWidth={2}
      />
      <GroundSays x={STANDS_AT + WINDOW / 2} y={FILE.top - 6} middle>
        {bedSaid(SKETCH_GROUND.standing)}
      </GroundSays>
      {QUEUED.map((ground) => (
        <g key={ground.name}>
          {/* The line from where it sits in the file down to its place in the queue: a queued
              ground is a place *and* a time, and either alone is half the answer. */}
          <line
            x1={ground.x + ground.wide / 2}
            y1={FILE.foot}
            x2={ground.x + ground.wide / 2}
            y2={QUEUE_TOP}
            className="stroke-border"
            strokeDasharray="3 3"
          />
          <rect
            x={ground.x}
            y={QUEUE_TOP}
            width={ground.wide}
            height={20}
            rx={3}
            className="fill-card stroke-border"
          />
          <GroundSays x={ground.x + ground.wide / 2} y={QUEUE_TOP + 14} middle>
            {ground.name}
          </GroundSays>
          <GroundSays x={ground.x + ground.wide / 2} y={QUEUE_TOP + 34} middle>
            {`in ${ground.in}`}
          </GroundSays>
        </g>
      ))}
      <GroundSays x={4} y={16}>
        {SKETCH_EVERY_SAID}
      </GroundSays>
      <GroundSays x={4} y={VIEW.high - 4}>
        {`${SKETCH_COUNTED_SAID} counted, then the queue moves on`}
      </GroundSays>
    </GroundStage>
  );
}
