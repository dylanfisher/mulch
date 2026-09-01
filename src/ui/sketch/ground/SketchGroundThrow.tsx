/**
 * @role Ground sketch 07 — the ground as a place a hand throws the loop to, with the throw landing
 *   at the next lap boundary rather than under the hand. The argument: the period stops being a
 *   number and becomes the lag a hand feels between asking and arriving, which is the one thing
 *   about it that can be judged by using it.
 * @instead The other seven readings of the same seam → the files beside this one. Where a throw
 *   lands and when → src/ui/sketch/sketchGround.ts, because a static render never throws. What the
 *   loop is actually reading → src/lib/playerBed.ts.
 */
// One picture is one function: the geometry is read top to bottom and every corner of it names
// itself, so cutting it into helpers to satisfy a line count would scatter one drawing across five
// scopes. The same waiver every sketch on this bench carries, for the reason 0247 gives (0007).
// oxlint-disable max-lines-per-function
import { useCallback, useState } from "react";

import { PLAYER_KNOB_LABELS } from "@/lib/copyKnobs";
import { PLAYER_SLOTS } from "@/lib/playerSlots";
import { Slider } from "@/ui/components/slider";
import { SKETCH_VIEW as VIEW } from "@/ui/sketch/SketchFrame";
import { GroundSays, GroundStage } from "@/ui/sketch/ground/SketchGroundStage";
import {
  acrossFile,
  bedNamed,
  bedSaid,
  intoBed,
  SKETCH_COUNTED_SAID,
  SKETCH_EVERY_SAID,
  thrownTo,
} from "@/ui/sketch/sketchGround";
import { SKETCH_GROUND, SKETCH_SOURCE_BEDS } from "@/ui/sketch/sketchWalk";

const FIELD = { top: 44, high: 52 };
const alongFile = (slots: number): number => acrossFile(slots) * VIEW.wide;

/** The beds of the file, drawn as the places there are to throw at. */
const PLACES = Array.from({ length: SKETCH_SOURCE_BEDS }, (_, bed) => ({
  bed,
  name: bedNamed(bed),
  x: alongFile(bed * PLAYER_SLOTS),
  wide: alongFile(PLAYER_SLOTS),
}));

const STANDS_AT = alongFile(SKETCH_GROUND.standing);

export function SketchGroundThrow() {
  // Somewhere other than where the loop already is, so the picture opens with a throw in the air
  // rather than an arc of no length.
  const [at, setAt] = useState(SKETCH_SOURCE_BEDS - 1);
  const throwAt = useCallback((value: number | readonly number[]) => {
    // One thumb, so a list is the shape and not a case (src/ui/components/slider.tsx).
    const next = typeof value === "number" ? value : value[0];
    if (next === undefined) throw new Error("The throw slider handed back no bed.");
    setAt(next);
  }, []);
  const thrown = thrownTo(at);
  const lands = alongFile(thrown.at) + alongFile(PLAYER_SLOTS) / 2;
  // The label is centred on where the throw lands, and held off both edges: a landing in the last
  // bed would centre it past the right-hand edge and clip it, and a clipped label reads as a
  // smaller number rather than as a missing one (0252).
  const said = Math.min(Math.max(lands, 90), VIEW.wide - 90);

  return (
    <GroundStage
      reading="throw"
      label="The Throw"
      under={
        <Slider
          value={at}
          min={0}
          max={SKETCH_SOURCE_BEDS - 1}
          step={1}
          aria-label={`Throw the loop at a ${PLAYER_KNOB_LABELS.bed}`}
          onValueChange={throwAt}
        />
      }
    >
      <GroundSays x={4} y={16}>
        {SKETCH_EVERY_SAID}
      </GroundSays>
      {PLACES.map((place) => (
        <g key={place.bed}>
          <rect
            x={place.x + 2}
            y={FIELD.top}
            width={place.wide - 4}
            height={FIELD.high}
            rx={4}
            className={
              place.bed === thrown.bed
                ? "fill-primary/20 stroke-primary"
                : "fill-card stroke-border"
            }
          />
          <GroundSays x={place.x + place.wide / 2} y={FIELD.top + 16} middle>
            {place.name}
          </GroundSays>
        </g>
      ))}
      {/* Where the loop is now: part-way into a bed, which is where a crawl leaves it and where a
          throw never does. */}
      <rect
        data-standing="throw"
        x={STANDS_AT}
        y={FIELD.top - 6}
        width={alongFile(PLAYER_SLOTS)}
        height={FIELD.high + 12}
        rx={2}
        className="fill-none stroke-foreground"
        strokeWidth={2}
      />
      <GroundSays x={STANDS_AT} y={FIELD.top - 10}>
        {`${bedSaid(SKETCH_GROUND.standing)}, ${intoBed(SKETCH_GROUND.standing)} in`}
      </GroundSays>
      {/* The throw in the air, arcing over the file to the bed a hand chose. */}
      <path
        d={`M ${STANDS_AT + alongFile(PLAYER_SLOTS) / 2} ${FIELD.top + FIELD.high} Q ${(STANDS_AT + lands) / 2} ${VIEW.high - 4} ${lands} ${FIELD.top + FIELD.high}`}
        className="fill-none stroke-primary"
        strokeDasharray="4 3"
        strokeWidth={2}
      />
      <GroundSays x={said} y={FIELD.top + FIELD.high + 20} middle>
        {`lands ${bedSaid(thrown.at)} in ${thrown.after}`}
      </GroundSays>
      <GroundSays x={4} y={VIEW.high - 4}>
        {`a throw lands on a whole ${PLAYER_KNOB_LABELS.bed}, ${SKETCH_COUNTED_SAID} counted`}
      </GroundSays>
    </GroundStage>
  );
}
