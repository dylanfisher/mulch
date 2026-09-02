/**
 * @role Ground sketch 01 — the walk's own sequence drawn as the clock face, with the shift falling
 *   on every Nth time round. The argument: the period a hand reasons in is a lap of the walk, so
 *   the thing that counts it should be the walk, and the dial's number is how many laps.
 * @instead The other seven readings of the same seam → the files beside this one. The arithmetic
 *   → src/ui/sketch/sketchGround.ts. The three units the card actually counts the period in →
 *   src/lib/playerBed.ts.
 */
// One picture is one function: the geometry is read top to bottom and every corner of it names
// itself, so cutting it into helpers to satisfy a line count would scatter one drawing across five
// scopes. The same waiver every sketch on this bench carries, for the reason 0247 gives (0007).
// oxlint-disable max-lines-per-function
import { atTurn } from "@/ui/sketch/SketchFrame";
import { characterInk, fixtureAt, SKETCH_GROUND, SKETCH_WALK } from "@/ui/sketch/sketchWalk";
import { GroundSays, GroundStage } from "@/ui/sketch/ground/SketchGroundStage";
import {
  bedSaid,
  SKETCH_COUNTED_SAID,
  SKETCH_EVERY_SAID,
  SKETCH_GROUND_CLOCK,
  SKETCH_PER,
  SKETCH_SEQUENCE,
} from "@/ui/sketch/sketchGround";

/** The face, and the rim the count of laps is drawn on outside it. */
const DIAL = { x: 84, y: 80, r: 42 };
const RIM = DIAL.r + 12;

/** The sixteen landings around the face, each at its own place in the loop. */
const HOURS = SKETCH_WALK.map((landing, index) => ({
  index,
  ink: characterInk(landing.character),
  ...atTurn(DIAL.x, DIAL.y, DIAL.r, landing.at),
}));

/** Where the walk is standing, read off the same landing the rest of the bench lights. */
const HAND = atTurn(
  DIAL.x,
  DIAL.y,
  DIAL.r,
  fixtureAt(SKETCH_WALK, SKETCH_GROUND_CLOCK.into, "landing").at,
);

/** The laps counted so far, as a sweep of the rim from the shift mark at the top. */
const COUNTED = ((): string => {
  const share = SKETCH_GROUND_CLOCK.since / SKETCH_GROUND.every;
  const from = atTurn(DIAL.x, DIAL.y, RIM, 0);
  const to = atTurn(DIAL.x, DIAL.y, RIM, share);
  return `M ${from.x} ${from.y} A ${RIM} ${RIM} 0 ${share > 0.5 ? 1 : 0} 1 ${to.x} ${to.y}`;
})();

export function SketchGroundClock() {
  return (
    <GroundStage reading="clock" label="The Lap">
      <circle cx={DIAL.x} cy={DIAL.y} r={RIM} className="fill-none stroke-border" strokeWidth={5} />
      <path d={COUNTED} className="fill-none stroke-primary" strokeWidth={5} />
      <circle cx={DIAL.x} cy={DIAL.y} r={DIAL.r} className="fill-none stroke-border" />
      {HOURS.map((hour) => (
        <circle
          key={hour.index}
          cx={hour.x}
          cy={hour.y}
          r={hour.index === SKETCH_GROUND_CLOCK.into ? 4 : 2.5}
          className="fill-primary"
          opacity={hour.ink}
        />
      ))}
      {/* The hand, started clear of the middle so the ground written there stays readable. */}
      <line
        x1={DIAL.x + (HAND.x - DIAL.x) * 0.68}
        y1={DIAL.y + (HAND.y - DIAL.y) * 0.68}
        x2={HAND.x}
        y2={HAND.y}
        className="stroke-foreground"
        strokeWidth={2}
      />
      {/* The ground the loop is standing on, in the middle of the thing that will move it. */}
      <circle
        data-standing="clock"
        cx={DIAL.x}
        cy={DIAL.y}
        r={26}
        className="fill-primary/20 stroke-foreground"
      />
      <GroundSays x={DIAL.x} y={DIAL.y + 4} middle>
        {bedSaid(SKETCH_GROUND.standing)}
      </GroundSays>
      {/* The mark the lap counts up to: at the top, where the sweep starts and ends. */}
      <line
        x1={DIAL.x}
        y1={DIAL.y - RIM - 8}
        x2={DIAL.x}
        y2={DIAL.y - RIM + 8}
        className="stroke-foreground"
        strokeWidth={2}
      />
      <GroundSays x={DIAL.x} y={DIAL.y - RIM - 12} middle>
        shift
      </GroundSays>
      <GroundSays x={180} y={40}>
        {SKETCH_EVERY_SAID}
      </GroundSays>
      <GroundSays x={180} y={62}>
        {`${SKETCH_PER} ${SKETCH_GROUND_CLOCK.gone + 1}, landing ${SKETCH_GROUND_CLOCK.into + 1} of ${SKETCH_SEQUENCE}`}
      </GroundSays>
      <GroundSays x={180} y={84}>
        {`${SKETCH_COUNTED_SAID} counted`}
      </GroundSays>
      <GroundSays x={180} y={106}>
        {`shift in ${SKETCH_GROUND_CLOCK.until}`}
      </GroundSays>
      <GroundSays x={180} y={128}>
        {`then ${bedSaid(SKETCH_GROUND.standing + SKETCH_GROUND.distance)} at furthest`}
      </GroundSays>
    </GroundStage>
  );
}
