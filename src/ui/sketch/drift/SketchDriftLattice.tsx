/**
 * @role Drift sketch 01 — the reference straight. The picture folded into square cells, every cell a
 *   rounded box holding its own lens of the field, the gutter and the rim lit. The argument: the
 *   visible unit should be the cell and not the fringe, which is what 0268 set out to buy.
 * @instead The other seven directions → the files beside this one. The field itself →
 *   src/ui/sketch/sketchDrift.ts. Where it would land → the cell fold before `escapeTurns` and
 *   `nestedTurns` in src/lib/moireFractal.ts.
 */
import { SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { LATTICE_DIAL, latticeField } from "@/ui/sketch/sketchDrift";

/** What the dial stands at, in the picture's own words. Hoisted so the stage is handed one function. */
const said = (per: number): string => `${per} cells in the height`;

export function SketchDriftLattice() {
  return (
    <SketchDriftStage
      reading="lattice"
      label="The Lattice"
      field={latticeField}
      dial={LATTICE_DIAL}
      said={said}
      dialLabel="How many cells stand in the height"
    />
  );
}
