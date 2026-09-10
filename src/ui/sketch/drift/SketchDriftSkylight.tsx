/**
 * @role Drift sketch 13 — a dense green canopy: leaf clumps at three scales, very dark, with specks
 *   of sky at the top stop breaking through the gaps in the upper half. The argument: a scene's
 *   ground may take most of the tile rather than a fifteenth of it, and the light it does not let
 *   past is the picture (0331).
 * @instead The other ten directions → the files beside this one. The field itself →
 *   src/ui/sketch/sketchStillField.ts, and the stops and the dial it is drawn under →
 *   src/ui/sketch/sketchStill.ts. The ground it pushes past → src/ui/scene/canopy.ts.
 */
import { SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { STILL_DIALS, STILL_STOPS } from "@/ui/sketch/sketchStill";
import { skylightField } from "@/ui/sketch/sketchStillField";

/** What the dial stands at, in the picture's own words. Hoisted so the stage is handed one function. */
const said = (gust: number): string => `the gust ${Math.round(gust * 100)}% through the boughs`;

export function SketchDriftSkylight() {
  return (
    <SketchDriftStage
      reading="skylight"
      label="The Canopy Light"
      inking={STILL_STOPS.skylight}
      field={skylightField}
      dial={STILL_DIALS.skylight}
      said={said}
      dialLabel="How far the gust has travelled through the boughs"
    />
  );
}
