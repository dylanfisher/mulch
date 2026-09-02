/**
 * @role Drift sketch 08 — the lattice with every cell lit by its own band of the spectrum the picture
 *   already reads. The argument: a cell is a slice, a slice is free per frame, and twelve cells
 *   each hearing a band is the picture hearing the sound rather than reading a number off it.
 * @instead The other seven directions → the files beside this one. The field itself →
 *   src/ui/sketch/sketchDrift.ts. Where it would land → beside the shatter's slices in
 *   src/ui/moireCanvasField.ts, one `drawImage` per cell per frame.
 */
import { SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { BANDS_DIAL, bandsField } from "@/ui/sketch/sketchDrift";

/** What the dial stands at, in the picture's own words. Hoisted so the stage is handed one function. */
const said = (loud: number): string => `spectrum at ${Math.round(loud * 100)}%`;

export function SketchDriftBands() {
  return (
    <SketchDriftStage
      reading="bands"
      label="The Cells Hear"
      field={bandsField}
      dial={BANDS_DIAL}
      said={said}
      dialLabel="How loud the spectrum the cells hear is"
    />
  );
}
