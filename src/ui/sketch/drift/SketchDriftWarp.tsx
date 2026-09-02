/**
 * @role Drift sketch 03 — the coordinate warped by itself before the gratings are cut along it. The swirl
 *   inside a reference cell is two sines of the point fed back into the point. The argument: the
 *   picture bends where the sound bends it, and the fringes go with the bend.
 * @instead The other seven directions → the files beside this one. The field itself →
 *   src/ui/sketch/sketchDrift.ts. Where it would land → a term before `geometryTurns` in
 *   src/lib/moireGeometry.ts, keyed off the wash on `stepped`.
 */
import { SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { WARP_DIAL, warpField } from "@/ui/sketch/sketchDrift";

/** What the dial stands at, in the picture's own words. Hoisted so the stage is handed one function. */
const said = (bend: number): string => `bent ${bend.toFixed(2)} of the height`;

export function SketchDriftWarp() {
  return (
    <SketchDriftStage
      reading="warp"
      label="The Warp"
      field={warpField}
      dial={WARP_DIAL}
      said={said}
      dialLabel="How far the coordinate is bent"
    />
  );
}
