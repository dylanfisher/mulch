/**
 * @role Drift sketch 02 — the picture read through a ramp of five inks. The reference's black-blue-cyan-
 *   green-yellow-red is one scalar through a palette, and this instrument's field is already one
 *   scalar. The argument: colour is the ramp's, and hue and disperse are where on it the rest sits.
 * @instead The other seven directions → the files beside this one. The field itself →
 *   src/ui/sketch/sketchDrift.ts. Where it would land → `bands` in src/lib/moireScreenField.ts, where every pixel
 *   is multiplied by one row ink today.
 */
import { SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { RAMP_DIAL, rampField } from "@/ui/sketch/sketchDrift";

/** What the dial stands at, in the picture's own words. Hoisted so the stage is handed one function. */
const said = (reach: number): string => `reach ${Math.round(reach * 100)}% of the ramp`;

export function SketchDriftRamp() {
  return (
    <SketchDriftStage
      reading="ramp"
      label="The Ramp"
      inking="ramp"
      field={rampField}
      dial={RAMP_DIAL}
      said={said}
      dialLabel="How far across the ramp the picture reaches"
    />
  );
}
