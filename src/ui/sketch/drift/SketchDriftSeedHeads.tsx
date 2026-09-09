/**
 * @role Drift sketch 12 — backlit wild grass: feathery strokes amber at the tip and olive at the
 *   root, lying over as a gust travels across the picture. The argument: a lean is a function of
 *   where a stroke stands and of the phase, not one lean baked over a whole tile (0331).
 * @instead The other twelve directions → the files beside this one. The field itself →
 *   src/ui/sketch/sketchStillField.ts, and the stops and the dial it is drawn under →
 *   src/ui/sketch/sketchStill.ts. The ground it pushes past → src/ui/scene/meadow.ts.
 */
import { SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { STILL_DIALS, STILL_STOPS } from "@/ui/sketch/sketchStill";
import { seedheadsField } from "@/ui/sketch/sketchStillField";

/** What the dial stands at, in the picture's own words. Hoisted so the stage is handed one function. */
const said = (gust: number): string => `the gust ${Math.round(gust * 100)}% across the field`;

export function SketchDriftSeedHeads() {
  return (
    <SketchDriftStage
      reading="seedheads"
      label="The Seed Heads"
      inking={STILL_STOPS.seedheads}
      field={seedheadsField}
      dial={STILL_DIALS.seedheads}
      said={said}
      dialLabel="How far the gust has travelled across the field"
    />
  );
}
