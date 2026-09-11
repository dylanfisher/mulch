/**
 * @role Marks sketch 02 — a second lattice of marks at a cell a held ratio larger, laid over the first in one ink, so grid beats against grid the way the two gratings under the screen beat (0131). The argument: the lattice stands still now (0346), and two still lattices a ratio apart are a beat that stands still too.
 * @instead The other seven → the files beside this one. The field itself and its dial →
 *   src/ui/sketch/marks/sketchMarks.ts. Where it would land → `build` in src/ui/moireScreenTile.ts, as a second pass of cells at another pitch over the same body.
 */
import { SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { BEAT_DIAL, beatField } from "@/ui/sketch/marks/sketchMarks";

/** What the dial stands at, in the picture's own words. */
const said = (ratio: number): string =>
  ratio === 1 ? "the one lattice twice" : `the second lattice ${ratio.toFixed(2)}× the cell`;

export function SketchMarksBeat() {
  return (
    <SketchDriftStage
      reading="beat"
      label="The Beat"
      field={beatField}
      dial={BEAT_DIAL}
      said={said}
      dialLabel="How much larger the second lattice's cell is than the first's"
    />
  );
}
