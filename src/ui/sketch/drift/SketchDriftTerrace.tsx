/**
 * @role Drift sketch 06 — the smooth field cut into terraces with every riser lit, so the picture is
 *   contour lines rather than fringes. The argument: an escape count is banded by nature and the
 *   rest of the field is not, and a profile is where a shape like that already lives.
 * @instead The other seven directions → the files beside this one. The field itself →
 *   src/ui/sketch/sketchDrift.ts. Where it would land → a wave in src/lib/moireProfiles.ts, cut to by
 *   any row.
 */
import { SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { TERRACE_DIAL, terraceField } from "@/ui/sketch/sketchDrift";

/** What the dial stands at, in the picture's own words. Hoisted so the stage is handed one function. */
const said = (steps: number): string => `${Math.round(steps)} terraces`;

export function SketchDriftTerrace() {
  return (
    <SketchDriftStage
      reading="terrace"
      label="The Terrace"
      field={terraceField}
      dial={TERRACE_DIAL}
      said={said}
      dialLabel="How many terraces the field is cut into"
    />
  );
}
