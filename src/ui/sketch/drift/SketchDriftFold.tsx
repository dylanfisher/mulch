/**
 * @role Drift sketch 04 — the plane folded into mirrored sectors about the middle, so one row's structure is
 *   a rosette. The argument: symmetry is the cheapest structure there is — a modulo and an absolute
 *   value — and the count of sectors is a number the rack already has.
 * @instead The other seven directions → the files beside this one. The field itself →
 *   src/ui/sketch/sketchDrift.ts. Where it would land → a geometry beside `radial` and `spiral` in
 *   src/lib/moireGeometry.ts.
 */
import { SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { FOLD_DIAL, foldField } from "@/ui/sketch/sketchDrift";

/** What the dial stands at, in the picture's own words. Hoisted so the stage is handed one function. */
const said = (sectors: number): string => `${Math.round(sectors)} sectors`;

export function SketchDriftFold() {
  return (
    <SketchDriftStage
      reading="fold"
      label="The Fold"
      field={foldField}
      dial={FOLD_DIAL}
      said={said}
      dialLabel="How many sectors the plane is folded into"
    />
  );
}
