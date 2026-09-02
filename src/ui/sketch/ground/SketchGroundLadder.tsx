/**
 * @role Ground sketch 04 — a ladder of laps, one rung each, with the ground stepping across a rung
 *   every Nth. The argument: the period is a rhythm before it is a number, and a hand reading eight
 *   rungs can see the rhythm without reading the dial at all.
 * @instead The other seven readings of the same seam → the files beside this one. The arithmetic
 *   → src/ui/sketch/sketchGround.ts. The dial this replaces → src/lib/playerBed.ts.
 */
import { SKETCH_VIEW as VIEW } from "@/ui/sketch/SketchFrame";
import { SketchSays, SketchStage } from "@/ui/sketch/SketchStage";
import {
  acrossFile,
  bedSaid,
  groundAfter,
  SKETCH_COUNTED_SAID,
  SKETCH_EVERY_SAID,
  SKETCH_GROUND_CLOCK,
  SKETCH_PER,
} from "@/ui/sketch/sketchGround";
import { fixtureAt, SKETCH_GROUND } from "@/ui/sketch/sketchWalk";

/** How many rungs the picture holds, and where they are drawn. Two whole periods and the lap being
 *  walked now, so a hand sees the step happen twice rather than once — one is an event, two is a
 *  rhythm, and the rhythm is the thing this reading claims a dial cannot say. */
const RUNGS = SKETCH_GROUND.every * 2 + 1;
const LADDER = { left: 14, wide: 240, top: 30, step: 12 };

/**
 * The last rungs of the run, newest at the bottom: which lap, which ground was under it, and
 * whether the ground moved on to that rung. All read back off the one crawl, so a rung that stepped
 * where no move fell would be this picture disagreeing with the other seven.
 */
const CLIMB = Array.from({ length: RUNGS }, (_, index) => {
  // The foot of the ladder is the lap being walked now, which is the one the clock and the count
  // both call `gone + 1` — a ladder whose newest rung was the last *completed* lap would be this
  // bench disagreeing with itself about which lap "now" is.
  const lap = SKETCH_GROUND_CLOCK.gone + 2 - RUNGS + index;
  if (lap < 0) {
    throw new Error(`The ladder climbs to lap ${lap}, which is before the run started.`);
  }
  const ground = groundAfter(lap);
  return {
    lap,
    ground,
    moved: ground !== groundAfter(lap - 1),
    standing: lap === SKETCH_GROUND_CLOCK.gone + 1,
    y: LADDER.top + index * LADDER.step,
    x: LADDER.left + acrossFile(ground) * LADDER.wide,
  };
});

/** The rung being walked now — indexed rather than defaulted: a ladder with no last rung is a
 *  picture drawn of nothing (principle 5). */
const NOW = fixtureAt(CLIMB, RUNGS - 1, "rung");

export function SketchGroundLadder() {
  return (
    <SketchStage reading="ladder" label="The Ladder">
      <SketchSays x={4} y={16}>
        {SKETCH_EVERY_SAID}
      </SketchSays>
      {CLIMB.map((rung) => (
        <g key={rung.lap}>
          <line
            x1={LADDER.left}
            y1={rung.y}
            x2={LADDER.left + LADDER.wide}
            y2={rung.y}
            className={rung.moved ? "stroke-foreground/40" : "stroke-border"}
          />
          {/* The ground on that rung, at its own place in the file: a step sideways is a move, and
              two rungs at the same place are the period doing nothing, which is most of them. */}
          <rect
            {...(rung.standing ? { "data-standing": "ladder" } : {})}
            x={rung.x}
            y={rung.y - 5}
            width={22}
            height={10}
            rx={2}
            className={
              rung.standing ? "fill-primary/40 stroke-foreground" : "fill-primary/20 stroke-border"
            }
          />
          {rung.moved ? (
            <SketchSays x={LADDER.left + LADDER.wide + 8} y={rung.y + 4}>
              {`${bedSaid(rung.ground)} on ${SKETCH_PER} ${rung.lap}`}
            </SketchSays>
          ) : null}
        </g>
      ))}
      <SketchSays x={LADDER.left + LADDER.wide + 8} y={NOW.y + 4}>
        {`${bedSaid(SKETCH_GROUND.standing)} now`}
      </SketchSays>
      <SketchSays x={4} y={VIEW.high - 4}>
        {`${SKETCH_COUNTED_SAID} counted, next step in ${SKETCH_GROUND_CLOCK.until}`}
      </SketchSays>
    </SketchStage>
  );
}
