/**
 * @role Marks sketch 03 — the delay's echoes written in marks: a cell's mark repeated along its row the cap's worth of times, each copy one mark lighter, and the delay's own spacing as the dial. The argument: the echoes look draws the field again behind itself (0294), and behind a lattice of marks is between them — a repeat that is a mark stands in the lattice.
 * @instead The other seven → the files beside this one. The field itself and its dial →
 *   src/ui/sketch/marks/sketchMarks.ts. Where it would land → `echoesLook` in src/lib/moireEchoes.ts, as a pass on the cell grid rather than on the field.
 */
import { SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { echoCells, ECHOES_DIAL, echoesField } from "@/ui/sketch/marks/sketchMarks";

/** What the dial stands at, in the picture's own words. */
const said = (spacing: number): string =>
  `the repeats ${echoCells(spacing)} cell${echoCells(spacing) === 1 ? "" : "s"} apart`;

export function SketchMarksEchoes() {
  return (
    <SketchDriftStage
      reading="echoes"
      label="The Echoes"
      field={echoesField}
      dial={ECHOES_DIAL}
      said={said}
      dialLabel="How far apart the delay's repeats stand, on its own spacing"
    />
  );
}
