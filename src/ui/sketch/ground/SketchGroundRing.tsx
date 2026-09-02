/**
 * @role Ground sketch 03 — the beds of the file as a ring the walk advances one notch on, once the
 *   period is up. The argument: a crawl that only ever steps to the next ground is a ratchet, and a
 *   ratchet has one number — how long a notch takes — so the Distance, the Lean and the Home dial
 *   all go.
 * @instead The other seven readings of the same seam → the files beside this one. The arithmetic
 *   → src/ui/sketch/sketchGround.ts. The three dials this reading argues away →
 *   src/lib/playerBed.ts.
 */
// One picture is one function: the geometry is read top to bottom and every corner of it names
// itself, so cutting it into helpers to satisfy a line count would scatter one drawing across five
// scopes. The same waiver every sketch on this bench carries, for the reason 0247 gives (0007).
// oxlint-disable max-lines-per-function
import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { atTurn, SKETCH_VIEW as VIEW } from "@/ui/sketch/SketchFrame";
import { SketchSays, SketchStage } from "@/ui/sketch/SketchStage";
import {
  bedNamed,
  bedOf,
  intoBed,
  SKETCH_COUNTED_SAID,
  SKETCH_EVERY_SAID,
  SKETCH_GROUND_CLOCK,
} from "@/ui/sketch/sketchGround";
import { SKETCH_GROUND, SKETCH_SOURCE_BEDS } from "@/ui/sketch/sketchWalk";

const RING = { x: 104, y: 76, r: 38 };

/** One notch per bed of the file, in the order the file holds them, starting at the top. */
const NOTCHES = Array.from({ length: SKETCH_SOURCE_BEDS }, (_, bed) => ({
  bed,
  name: bedNamed(bed),
  ...atTurn(RING.x, RING.y, RING.r, bed / SKETCH_SOURCE_BEDS),
  // Further out to the sides than to the top and foot: a name is wide and short, so the two
  // beside the ring need clearance the two above and below it do not — and a name written over
  // its own notch is the unlabelled corner the rule exists to stop (0252).
  said: atTurn(RING.x, RING.y, RING.r + (bed % 2 === 1 ? 40 : 24), bed / SKETCH_SOURCE_BEDS),
}));

const STANDING = bedOf(SKETCH_GROUND.standing);

/** The pawl: where the ring is held now, and the notch it will be pushed to when the count is up. */
const PAWL = atTurn(RING.x, RING.y, RING.r + 10, STANDING / SKETCH_SOURCE_BEDS);
const NEXT = atTurn(RING.x, RING.y, RING.r + 10, (STANDING + 1) / SKETCH_SOURCE_BEDS);

export function SketchGroundRing() {
  return (
    <SketchStage bench="ground" reading="ring" label="The Ratchet">
      <circle
        cx={RING.x}
        cy={RING.y}
        r={RING.r}
        className="fill-none stroke-border"
        strokeWidth={3}
      />
      {NOTCHES.map((notch) => (
        <g key={notch.bed}>
          <circle
            {...(notch.bed === STANDING ? { "data-standing": "ring" } : {})}
            cx={notch.x}
            cy={notch.y}
            r={notch.bed === STANDING ? 10 : 6}
            className={
              notch.bed === STANDING
                ? "fill-primary/30 stroke-foreground"
                : "fill-card stroke-border"
            }
          />
          <SketchSays x={notch.said.x} y={notch.said.y + 4} middle>
            {notch.name}
          </SketchSays>
        </g>
      ))}
      {/* One notch on, when the count is up: the whole of the move, drawn as the only thing it
          can be — the next ground along, never a distance and never a side. */}
      <path
        d={`M ${PAWL.x} ${PAWL.y} A ${RING.r + 10} ${RING.r + 10} 0 0 1 ${NEXT.x} ${NEXT.y}`}
        className="fill-none stroke-primary"
        strokeWidth={3}
      />
      <SketchSays x={230} y={44}>
        {SKETCH_EVERY_SAID}
      </SketchSays>
      <SketchSays x={230} y={66}>
        {`one notch on`}
      </SketchSays>
      <SketchSays x={230} y={94}>
        {`${SKETCH_COUNTED_SAID} counted`}
      </SketchSays>
      <SketchSays x={230} y={116}>
        {`next in ${SKETCH_GROUND_CLOCK.until}`}
      </SketchSays>
      {/* What the ratchet gives up, said on the picture: a notch is a whole bed, so the crawl that
          lands part-way into one has nowhere to be drawn here (src/lib/playerBed.ts). */}
      <SketchSays x={4} y={VIEW.high - 4}>
        {`a notch is a whole ${PLAYER_KNOB_LABELS.bed} — no ${PLAYER_KNOB_LABELS.bedDistance}, no ${PLAYER_KNOB_LABELS.bedBias}`}
      </SketchSays>
      <SketchSays x={230} y={138}>
        {`standing ${intoBed(SKETCH_GROUND.standing)} sixteenths into it`}
      </SketchSays>
    </SketchStage>
  );
}
