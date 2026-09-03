/**
 * @role Structure sketch 05 — the field's slices thrown by the structure, so the picture is torn
 *   along the escape count's own cross-section. The argument: the shatter already slides sixty-four
 *   slices a frame off a rate, and a slide read off the structure instead puts the structure into
 *   every straight row without baking a thing.
 * @instead The other six → the files beside this one. The field itself →
 *   src/ui/sketch/structure/sketchStructure.ts. Where it would land → `shatterSlide` in
 *   src/lib/moireGeometry.ts, fed the count instead of a phase.
 */
import { SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { SHARDS_DIAL, shardsField } from "@/ui/sketch/structure/sketchStructure";

/** What the dial stands at, in the picture's own words. */
const said = (reach: number): string =>
  reach === 0 ? "nothing thrown" : `thrown ${Math.round(reach * 100)}% of the height`;

export function SketchStructureShards() {
  return (
    <SketchDriftStage
      reading="shards"
      label="The Shards"
      field={shardsField}
      dial={SHARDS_DIAL}
      said={said}
      dialLabel="How far a slice is thrown by the structure"
    />
  );
}
