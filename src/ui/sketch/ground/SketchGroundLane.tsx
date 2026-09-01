/**
 * @role Ground sketch 06 — a lane of laps drawn over the walk's own strip, where a mark in the lane
 *   is a move. The argument: the ground's clock belongs on the picture the walk is already drawn on,
 *   because the one question a hand asks is how the two line up.
 * @instead The other seven readings of the same seam → the files beside this one. The arithmetic
 *   → src/ui/sketch/sketchGround.ts. The strip as the card draws it → src/ui/PlayerScope.tsx.
 */
// One picture is one function: the geometry is read top to bottom and every corner of it names
// itself, so cutting it into helpers to satisfy a line count would scatter one drawing across five
// scopes. The same waiver every sketch on this bench carries, for the reason 0247 gives (0007).
// oxlint-disable max-lines-per-function
import { SKETCH_VIEW as VIEW } from "@/ui/sketch/SketchFrame";
import { GroundSays, GroundStage } from "@/ui/sketch/ground/SketchGroundStage";
import {
  bedSaid,
  SKETCH_COUNTED_SAID,
  SKETCH_EVERY_SAID,
  SKETCH_GROUND_CLOCK,
  SKETCH_GROUND_HOME,
  SKETCH_GROUND_MOVES,
  SKETCH_PER,
  SKETCH_SEQUENCE,
} from "@/ui/sketch/sketchGround";
import { characterInk, fixtureAt, SKETCH_WALK } from "@/ui/sketch/sketchWalk";

const LANE = { left: 12, wide: VIEW.wide - 24, top: 40, high: 22 };
const STRIP = { top: 96, high: 34 };

/** How many laps the lane holds: every one that has gone, and the one being walked now. */
const LAPS = SKETCH_GROUND_CLOCK.gone + 1;
const alongLane = (lap: number): number => LANE.left + (lap / LAPS) * LANE.wide;

/**
 * The lane as the run of grounds it is: one stretch per ground held, opening where the move that
 * chose it fell and closing where the next one does. Read off the one crawl, so the stretch under
 * the playhead is the ground the rest of the bench lights and not a second opinion about it.
 */
const STRETCHES = SKETCH_GROUND_MOVES.map((move, index) => {
  // The last stretch has no move closing it: it runs to the lap being walked now, which is what
  // makes it the standing one. Written out rather than defaulted, because the two cases are
  // different facts and not a missing value (principle 5).
  const next = SKETCH_GROUND_MOVES[index + 1];
  return {
    ground: move.to,
    from: move.after,
    to: next === undefined ? LAPS : next.after,
    standing: next === undefined,
  };
});

/** The ground the song opened on, before any move fell — the stretch the crawl started in. */
const OPENED = {
  ground: SKETCH_GROUND_HOME,
  from: 0,
  to: fixtureAt(SKETCH_GROUND_MOVES, 0, "move").after,
  standing: false,
};

/** Where in the loop the landing being struck opens — the same landing the whole bench lights. */
const STANDS_AT =
  LANE.left + fixtureAt(SKETCH_WALK, SKETCH_GROUND_CLOCK.into, "landing").at * LANE.wide;

export function SketchGroundLane() {
  return (
    <GroundStage reading="lane" label="The Lane">
      <GroundSays x={4} y={16}>
        {SKETCH_EVERY_SAID}
      </GroundSays>
      {[OPENED, ...STRETCHES].map((stretch) => (
        <g key={stretch.from}>
          <rect
            {...(stretch.standing ? { "data-standing": "lane" } : {})}
            x={alongLane(stretch.from)}
            y={LANE.top}
            width={alongLane(stretch.to) - alongLane(stretch.from)}
            height={LANE.high}
            rx={2}
            className={
              stretch.standing
                ? "fill-primary/35 stroke-foreground"
                : "fill-primary/15 stroke-border"
            }
          />
          <GroundSays
            x={(alongLane(stretch.from) + alongLane(stretch.to)) / 2}
            y={LANE.top + 15}
            middle
          >
            {bedSaid(stretch.ground)}
          </GroundSays>
        </g>
      ))}
      {/* A mark is the move: at the lap the period came up on, and nowhere else. */}
      {SKETCH_GROUND_MOVES.map((move) => (
        <g key={move.nth}>
          <line
            x1={alongLane(move.after)}
            y1={LANE.top - 10}
            x2={alongLane(move.after)}
            y2={LANE.top + LANE.high + 8}
            className="stroke-foreground"
            strokeWidth={2}
          />
          <GroundSays x={alongLane(move.after)} y={LANE.top - 14} middle>
            {`${SKETCH_PER} ${move.after}`}
          </GroundSays>
        </g>
      ))}
      {/* The strip below is one lap of the lane blown up to the whole width — two scales on one
          picture, so the funnel says which slice of the lane the strip is, rather than leaving a
          hand to read the playhead's place as a place in the lane. */}
      <path
        d={`M ${alongLane(SKETCH_GROUND_CLOCK.gone)} ${LANE.top + LANE.high} L ${alongLane(LAPS)} ${LANE.top + LANE.high} L ${LANE.left + LANE.wide} ${STRIP.top - 4} L ${LANE.left} ${STRIP.top - 4} Z`}
        className="fill-foreground/5"
      />
      {/* The walk's own strip: sixteen landings of the lap under way, and the one being struck as
          the lane is read. */}
      {SKETCH_WALK.map((landing, index) => (
        <rect
          key={landing.at}
          x={LANE.left + landing.at * LANE.wide}
          y={STRIP.top}
          width={Math.max(landing.span * LANE.wide, 3)}
          height={STRIP.high * landing.level}
          className="fill-primary"
          opacity={index === SKETCH_GROUND_CLOCK.into ? 1 : characterInk(landing.character) * 0.6}
        />
      ))}
      <line
        x1={STANDS_AT}
        y1={STRIP.top - 8}
        x2={STANDS_AT}
        y2={STRIP.top + STRIP.high + 4}
        className="stroke-foreground"
        strokeWidth={2}
      />
      <GroundSays x={LANE.left} y={STRIP.top - 12}>
        {`that ${SKETCH_PER} as the walk, landing ${SKETCH_GROUND_CLOCK.into + 1} of ${SKETCH_SEQUENCE}`}
      </GroundSays>
      <GroundSays x={LANE.left} y={VIEW.high - 4}>
        {`${SKETCH_COUNTED_SAID} ${SKETCH_PER}s since the last mark`}
      </GroundSays>
    </GroundStage>
  );
}
