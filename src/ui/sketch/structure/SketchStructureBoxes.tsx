/**
 * @role Structure sketch 03 — the folded plane folded about a centre of its own, with each level
 *   turned inside the last. The argument: the nested coordinate borrows the escape field's centre
 *   today, and an offset that large flattens half of all racks to vertical stripes.
 * @instead The other six → the files beside this one. The field itself →
 *   src/ui/sketch/structure/sketchStructure.ts. Where it would land → `nestedTurns` and
 *   `fractalSeedInto` in src/lib/moireFractal.ts, with a centre band of the fold's own.
 */
import { SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { BOXES_DIAL, boxesField } from "@/ui/sketch/structure/sketchStructure";

/** What the dial stands at, in the picture's own words. */
const said = (turn: number): string =>
  turn === 0 ? "squares in squares" : `each level turned ${Math.round(turn * 360)}°`;

export function SketchStructureBoxes() {
  return (
    <SketchDriftStage
      reading="boxes"
      label="The Boxes"
      field={boxesField}
      dial={BOXES_DIAL}
      said={said}
      dialLabel="How far each fold turns the plane"
    />
  );
}
