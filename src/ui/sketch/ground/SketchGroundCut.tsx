/**
 * @role Ground sketch 05 — the beds of the file as a deck, cut every Nth lap. The argument: the
 *   period is a gesture a hand already has a word for, and a deck says where the next ground comes
 *   from without a distance, a lean or a home ever being drawn.
 * @instead The other seven readings of the same seam → the files beside this one. The arithmetic
 *   → src/ui/sketch/sketchGround.ts. What a bed is → src/lib/playerBed.ts.
 */
// One picture is one function: the geometry is read top to bottom and every corner of it names
// itself, so cutting it into helpers to satisfy a line count would scatter one drawing across five
// scopes. The same waiver every sketch on this bench carries, for the reason 0247 gives (0007).
// oxlint-disable max-lines-per-function
import { SKETCH_VIEW as VIEW } from "@/ui/sketch/SketchFrame";
import { GroundSays, GroundStage } from "@/ui/sketch/ground/SketchGroundStage";
import {
  acrossFile,
  bedNamed,
  bedOf,
  SKETCH_COUNTED_SAID,
  SKETCH_EVERY_SAID,
  SKETCH_GROUND_CLOCK,
  SKETCH_PER,
} from "@/ui/sketch/sketchGround";
import { SKETCH_GROUND, SKETCH_SOURCE_BEDS } from "@/ui/sketch/sketchWalk";

/** One card per bed of the file, with the geometry derived from how many there are: a longer file
 *  redraws the deck rather than running its last card off the edge. */
const EDGE = 14;
const STEP = (VIEW.wide - EDGE * 2) / SKETCH_SOURCE_BEDS;
const CARD = { wide: STEP - 10, high: 62, top: 40 };

const DECK = Array.from({ length: SKETCH_SOURCE_BEDS }, (_, bed) => ({
  bed,
  name: bedNamed(bed),
  x: EDGE + bed * STEP,
}));

/** Where the cut falls: at the ground the loop is standing on, part-way into its card, because the
 *  crawl is counted in sixteenths and a deck cut in whole beds could never draw that. */
const CUT = EDGE + acrossFile(SKETCH_GROUND.standing) * (VIEW.wide - EDGE * 2);

export function SketchGroundCut() {
  return (
    <GroundStage reading="cut" label="The Cut">
      <GroundSays x={4} y={16}>
        {SKETCH_EVERY_SAID}
      </GroundSays>
      {DECK.map((card) => (
        <g key={card.bed}>
          <rect
            {...(card.bed === bedOf(SKETCH_GROUND.standing) ? { "data-standing": "cut" } : {})}
            x={card.x}
            y={CARD.top}
            width={CARD.wide}
            height={CARD.high}
            rx={4}
            className={
              card.bed === bedOf(SKETCH_GROUND.standing)
                ? "fill-primary/25 stroke-foreground"
                : "fill-card stroke-border"
            }
          />
          <GroundSays x={card.x + CARD.wide / 2} y={CARD.top + CARD.high / 2 + 4} middle>
            {card.name}
          </GroundSays>
        </g>
      ))}
      {/* The cut itself, and the count running up to it: what a hand is waiting through. */}
      <line
        x1={CUT}
        y1={CARD.top - 14}
        x2={CUT}
        y2={CARD.top + CARD.high + 14}
        className="stroke-foreground"
        strokeDasharray="5 3"
        strokeWidth={2}
      />
      <GroundSays x={CUT + 4} y={CARD.top - 18}>
        {`cut in ${SKETCH_GROUND_CLOCK.until}`}
      </GroundSays>
      {/* The count as a bar under the deck: how much of a period has been dealt out already. */}
      <rect
        x={EDGE}
        y={VIEW.high - 26}
        width={VIEW.wide - EDGE * 2}
        height={8}
        rx={4}
        className="fill-muted stroke-border"
      />
      <rect
        x={EDGE}
        y={VIEW.high - 26}
        width={((VIEW.wide - EDGE * 2) * SKETCH_GROUND_CLOCK.since) / SKETCH_GROUND.every}
        height={8}
        rx={4}
        className="fill-primary"
      />
      <GroundSays x={EDGE} y={VIEW.high - 4}>
        {`${SKETCH_COUNTED_SAID} ${SKETCH_PER}s dealt`}
      </GroundSays>
    </GroundStage>
  );
}
