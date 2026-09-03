/**
 * @role Structure sketch 07 — the escape count cut into flat contours with every riser lit, so the
 *   structure is a map's height lines and not fringes the weave beats against. The argument: an
 *   escape count is banded by nature, and a band drawn as an edge reads at a glance where a band
 *   drawn as a cosine reads as texture.
 * @instead The other six → the files beside this one. The field itself →
 *   src/ui/sketch/structure/sketchStructure.ts. Where it would land → a wave in
 *   src/lib/moireProfiles.ts that the two fractal rows are cut to.
 */
import { SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { CONTOUR_DIAL, contourField } from "@/ui/sketch/structure/sketchStructure";

/** What the dial stands at, in the picture's own words. */
const said = (steps: number): string => `${Math.round(steps)} contours a pass`;

export function SketchStructureContour() {
  return (
    <SketchDriftStage
      reading="contour"
      label="The Contour"
      field={contourField}
      dial={CONTOUR_DIAL}
      said={said}
      dialLabel="How many contours one pass of the count is cut into"
    />
  );
}
