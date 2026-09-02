/**
 * @role Drift sketch 07 — rows as distances merged with a smooth minimum, with one grating cut along the
 *   merged distance so the fringes wrap the union. The argument: the product of gratings is one way
 *   to combine rows and the union of shapes is another, and the second reads as one thing.
 * @instead The other seven directions → the files beside this one. The field itself →
 *   src/ui/sketch/sketchDrift.ts. Where it would land → a sibling of the product in
 *   src/lib/moireGrating.ts, merging coordinates before one grating is cut.
 */
import { SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { BLOBS_DIAL, blobsField } from "@/ui/sketch/sketchDrift";

/** What the dial stands at, in the picture's own words. Hoisted so the stage is handed one function. */
const said = (k: number): string => `joined over ${k.toFixed(3)}`;

export function SketchDriftBlobs() {
  return (
    <SketchDriftStage
      reading="blobs"
      label="The Blobs"
      field={blobsField}
      dial={BLOBS_DIAL}
      said={said}
      dialLabel="How far the join between shapes is rounded"
    />
  );
}
