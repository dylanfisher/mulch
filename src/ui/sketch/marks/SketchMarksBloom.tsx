/**
 * @role Marks sketch 04 — the reverb's bloom written in marks: a cell's mark spread into its neighbours, one lighter per cell of distance, so a dense mark grows a halo of lighter ones. The argument: the bloom look blurs the field and lays it back (0280), and a blur of a lattice is a smear between marks — a halo that is marks stands in the lattice.
 * @instead The other seven → the files beside this one. The field itself and its dial →
 *   src/ui/sketch/marks/sketchMarks.ts. Where it would land → `bloomPass` in src/lib/moireLook.ts, as a spread on the cell grid before the marks are cut.
 */
import { SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { BLOOM_DIAL, bloomField } from "@/ui/sketch/marks/sketchMarks";

/** What the dial stands at, in the picture's own words. */
const said = (reach: number): string =>
  reach <= 0 ? "no halo" : `a halo ${reach} cell${reach === 1 ? "" : "s"} wide`;

export function SketchMarksBloom() {
  return (
    <SketchDriftStage
      reading="bloom"
      label="The Bloom"
      field={bloomField}
      dial={BLOOM_DIAL}
      said={said}
      dialLabel="How many cells a mark's halo reaches"
    />
  );
}
