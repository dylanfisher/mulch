/**
 * @role Marks sketch 07 — a layer above the marks: one big mark per three-by-three cells wherever the field stands above a threshold of its own range, read without the wrap so the peak is a block, over the fine lattice. The argument: the wrap makes a peak a sparse mark, so the field's peaks are the one thing the lattice cannot say — a second, coarser lattice can.
 * @instead The other seven → the files beside this one. The field itself and its dial →
 *   src/ui/sketch/marks/sketchMarks.ts. Where it would land → `build` in src/ui/moireScreenTile.ts, as a second pass over three-by-three cells after the first; bake-side.
 */
import { SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { SCATTER_DIAL, scatterField } from "@/ui/sketch/marks/sketchMarks";

/** What the dial stands at, in the picture's own words. */
const said = (threshold: number): string =>
  threshold >= 1
    ? "nothing stands above it"
    : `big marks above ${Math.round(threshold * 100)}% of the field's range`;

export function SketchMarksScatter() {
  return (
    <SketchDriftStage
      reading="scatter"
      label="The Scatter"
      field={scatterField}
      dial={SCATTER_DIAL}
      said={said}
      dialLabel="How high in the field's own range a big mark starts"
    />
  );
}
