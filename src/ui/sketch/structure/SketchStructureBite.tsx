/**
 * @role Structure sketch 01 — the escape field cut at a depth of its own, the way the lattice is,
 *   rather than at the share fourteen rows leave it. The argument: the structure is one grating in
 *   fourteen today, and a grating at a twelfth of the ink is the weave gently bent.
 * @instead The other six → the files beside this one. The field itself →
 *   src/ui/sketch/structure/sketchStructure.ts. Where it would land → beside `cutLattice` in
 *   src/ui/moireCanvas.ts, which already draws one row at its own depth.
 */
import { SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { BITE_DIAL, biteField, TODAY_BITE } from "@/ui/sketch/structure/sketchStructure";

/** What the dial stands at, against what the row is cut at today. */
const said = (depth: number): string =>
  `cut ${Math.round(depth * 100)}% deep — today ${Math.round(TODAY_BITE * 100)}%`;

export function SketchStructureBite() {
  return (
    <SketchDriftStage
      reading="bite"
      label="The Bite"
      field={biteField}
      dial={BITE_DIAL}
      said={said}
      dialLabel="How deep the structure cuts, as its own depth"
    />
  );
}
