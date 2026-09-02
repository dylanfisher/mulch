/**
 * @role Ground sketch 08 — the count itself as the whole drawing: N pips, filling one per lap of
 *   the walk, and the ground named under them. The argument: the period is the only number in this
 *   fold a hand ever waits on, so draw the waiting and let the setting be the number of pips.
 * @instead The other seven readings of the same seam → the files beside this one. The arithmetic
 *   → src/ui/sketch/sketchGround.ts. The dial this is drawn instead of → src/lib/playerBed.ts.
 */
// One picture is one function: the geometry is read top to bottom and every corner of it names
// itself, so cutting it into helpers to satisfy a line count would scatter one drawing across five
// scopes. The same waiver every sketch on this bench carries, for the reason 0247 gives (0007).
// oxlint-disable max-lines-per-function
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { SKETCH_VIEW as VIEW } from "@/ui/sketch/SketchFrame";
import { SketchSays, SketchStage } from "@/ui/sketch/SketchStage";
import {
  bedSaid,
  SKETCH_COUNTED_SAID,
  SKETCH_EVERY_SAID,
  SKETCH_GROUND_CLOCK,
  SKETCH_PER,
  SKETCH_SEQUENCE,
} from "@/ui/sketch/sketchGround";
import { SKETCH_GROUND } from "@/ui/sketch/sketchWalk";

/** One pip per lap of the period, sized off how many there are so a period of sixteen is the same
 *  picture as a period of four rather than sixteen pips off the edge. */
const PIPS = { y: 74, from: 24, to: VIEW.wide - 24 };
const STEP = (PIPS.to - PIPS.from) / SKETCH_GROUND.every;
const PIP = Math.min(STEP / 2 - 4, 20);

const COUNT = Array.from({ length: SKETCH_GROUND.every }, (_, lap) => ({
  lap,
  x: PIPS.from + STEP * (lap + 0.5),
  /** Filled once that lap has gone; the one being walked now is the one filling. */
  full: lap < SKETCH_GROUND_CLOCK.since,
  filling: lap === SKETCH_GROUND_CLOCK.since,
}));

/** How far into the lap being walked now, as a share — the pip that is filling, filling. */
const INTO = SKETCH_GROUND_CLOCK.into / SKETCH_SEQUENCE;

export function SketchGroundPips() {
  return (
    <SketchStage bench="ground" reading="pips" label="The Count">
      <SketchSays x={4} y={16}>
        {SKETCH_EVERY_SAID}
      </SketchSays>
      {COUNT.map((pip) => (
        <g key={pip.lap}>
          <circle
            cx={pip.x}
            cy={PIPS.y}
            r={PIP}
            className={pip.full ? "fill-primary stroke-foreground" : "fill-muted stroke-border"}
            strokeWidth={pip.filling ? 2 : 1}
          />
          {/* The lap under way, drawn as the part of its own pip that has been walked: the pips
              are a count and this is the one place the walk's own progress is in them. */}
          {pip.filling ? (
            <rect
              x={pip.x - PIP}
              y={PIPS.y - PIP}
              width={PIP * 2 * INTO}
              height={PIP * 2}
              className="fill-primary/40"
            />
          ) : null}
          <SketchSays x={pip.x} y={PIPS.y + PIP + 16} middle>
            {`${SKETCH_PER} ${SKETCH_GROUND_CLOCK.gone - SKETCH_GROUND_CLOCK.since + pip.lap + 1}`}
          </SketchSays>
        </g>
      ))}
      <SketchSays x={PIPS.from} y={44}>
        {`${SKETCH_COUNTED_SAID}, then the ground moves`}
      </SketchSays>
      {/* The ground the count is running down on, named under the pips: without it the picture is
          a progress bar and not a fold of the card (0252). */}
      <rect
        data-standing="pips"
        x={PIPS.from}
        y={VIEW.high - 30}
        width={PIPS.to - PIPS.from}
        height={22}
        rx={3}
        className="fill-primary/15 stroke-foreground"
      />
      <SketchSays x={VIEW.wide / 2} y={VIEW.high - 15} middle>
        {`standing on ${bedSaid(SKETCH_GROUND.standing)}, ${PLAYER_KNOB_LABELS.bedDistance} ${SKETCH_GROUND.distance} to travel`}
      </SketchSays>
    </SketchStage>
  );
}
