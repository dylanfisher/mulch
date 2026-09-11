/**
 * @role Marks sketch 08 — the sound's rows written as their own lattice of marks instead of cut out of the field: a second lattice on the same cells, read off the rows alone and without the wrap so a quiet row writes nothing. The argument: the cut is holes in a lattice of whole marks (0346), and a row that is marks instead is written in the same alphabet as the field it sounds over.
 * @instead The other seven → the files beside this one. The field itself and its dial →
 *   src/ui/sketch/marks/sketchMarks.ts. Where it would land → `cutGratings` in src/ui/moireCanvas.ts, as a lattice of marks laid over the field rather than a destination-out cut; frame-side today, bake-side as a second cell pass.
 */
import { SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { ROWS_DIAL, rowsField } from "@/ui/sketch/marks/sketchMarks";

/** What the dial stands at, in the picture's own words. */
const said = (depth: number): string =>
  depth <= 0 ? "the rows write nothing" : `the rows at ${Math.round(depth * 100)}% of their depth`;

export function SketchMarksRows() {
  return (
    <SketchDriftStage
      reading="rows"
      label="The Rows"
      field={rowsField}
      dial={ROWS_DIAL}
      said={said}
      dialLabel="How deep the sound's rows are written"
    />
  );
}
