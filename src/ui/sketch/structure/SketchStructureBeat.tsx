/**
 * @role Structure sketch 02 — two copies of the structure held a ratio apart in scale, so the
 *   structure beats against itself everywhere. The argument: the second copy today differs from the
 *   first only by breath phase, and sits on the same rung a fifth of the time, where it is the one
 *   tile drawn twice.
 * @instead The other six → the files beside this one. The field itself →
 *   src/ui/sketch/structure/sketchStructure.ts. Where it would land → `FRACTAL_BEAT` and
 *   `fractalZoom` in src/lib/moireFractal.ts, as a held scale on the second row rather than a period.
 */
import { SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { BEAT_DIAL, beatField } from "@/ui/sketch/structure/sketchStructure";

/** What the dial stands at, in the picture's own words. */
const said = (ratio: number): string =>
  ratio === 1 ? "the one tile twice" : `the copy ${ratio.toFixed(2)}× deeper`;

export function SketchStructureBeat() {
  return (
    <SketchDriftStage
      reading="beat"
      label="The Beat"
      field={beatField}
      dial={BEAT_DIAL}
      said={said}
      dialLabel="How far apart in scale the two copies of the structure stand"
    />
  );
}
