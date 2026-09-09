/**
 * @role Drift sketch 10 — a poppy field: scarlet heads over a saturated green ground, read along
 *   five stops of its own **per pixel**. The argument: a scene answers where on its ramp a point is
 *   read as well as how much ink stands there, so one tile holds two hues at full strength (0331).
 * @instead The other twelve directions → the files beside this one. The field itself →
 *   src/ui/sketch/sketchStillField.ts, and the stops and the dial it is drawn under →
 *   src/ui/sketch/sketchStill.ts. The ground it pushes past → src/ui/scene/bloom.ts.
 */
import { SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { STILL_DIALS, STILL_STOPS } from "@/ui/sketch/sketchStill";
import { poppiesField } from "@/ui/sketch/sketchStillField";

/** What the dial stands at, in the picture's own words. Hoisted so the stage is handed one function. */
const said = (bob: number): string => `heads ${Math.round(bob * 100)}% round their own bob`;

export function SketchDriftPoppies() {
  return (
    <SketchDriftStage
      reading="poppies"
      label="The Poppies"
      inking={STILL_STOPS.poppies}
      field={poppiesField}
      dial={STILL_DIALS.poppies}
      said={said}
      dialLabel="Where the heads stand in their own bob"
    />
  );
}
