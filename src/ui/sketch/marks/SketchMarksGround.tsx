/**
 * @role Marks sketch 01 — a cell's read pushed toward the ends of its ramp before it is cut into marks, so most of a field is a sparse mark and a band of it is dense. The argument: the plan's own fifth step, that the lattice reads denser than the reference because the wrap makes the middle of the ramp the dense marks and a bloom stands mostly there (0346).
 * @instead The other seven → the files beside this one. The field itself and its dial →
 *   src/ui/sketch/marks/sketchMarks.ts. Where it would land → `markAt` in src/lib/moireGlyph.ts, as one more dial beside `glyph.phase`.
 */
import { SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { GROUND_DIAL, groundField } from "@/ui/sketch/marks/sketchMarks";

/** What the dial stands at, in the picture's own words. */
const said = (push: number): string =>
  push <= 0 ? "the scene's own read" : `pushed ${push.toFixed(2)}× harder toward the ends`;

export function SketchMarksGround() {
  return (
    <SketchDriftStage
      reading="ground"
      label="The Ground"
      field={groundField}
      dial={GROUND_DIAL}
      said={said}
      dialLabel="How hard a cell's read is pushed toward the ends of its ramp"
    />
  );
}
