/**
 * @role Drift sketch 11 — rippled dark water: a dense lattice of short glints over near-black,
 *   swell bands across it, and sparse blades with a broken reflection under each. The argument: the
 *   glint is a second fine lattice beating against the first, so the dial is a phase and the picture
 *   flickers without a clock (0126, 0331).
 * @instead The other twelve directions → the files beside this one. The field itself →
 *   src/ui/sketch/sketchStillField.ts, and the stops and the dial it is drawn under →
 *   src/ui/sketch/sketchStill.ts. The ground it pushes past → src/ui/scene/water.ts.
 */
import { SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { STILL_DIALS, STILL_STOPS } from "@/ui/sketch/sketchStill";
import { glintField } from "@/ui/sketch/sketchStillField";

/** What the dial stands at, in the picture's own words. Hoisted so the stage is handed one function. */
const said = (phase: number): string => `crests lit at ${Math.round(phase * 100)}% of the beat`;

export function SketchDriftGlint() {
  return (
    <SketchDriftStage
      reading="glint"
      label="The Glint"
      inking={STILL_STOPS.glint}
      field={glintField}
      dial={STILL_DIALS.glint}
      said={said}
      dialLabel="Where the glint lattice stands against the ripple"
    />
  );
}
