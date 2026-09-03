/**
 * @role Structure sketch 04 — the whole finished field folded into mirrored sectors, weave and all.
 *   The argument: today only a curved row's coordinate is folded, so the mirror is a bend in two
 *   faint rows under an unmirrored weave, and a mirror nobody can see the seam of is not a mirror.
 * @instead The other six → the files beside this one. The field itself →
 *   src/ui/sketch/structure/sketchStructure.ts. Where it would land → beside the lens's slices in
 *   src/ui/moireCanvasField.ts, as one clipped `drawImage` per sector of the finished field.
 */
import { SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { KALEIDO_DIAL, kaleidoField } from "@/ui/sketch/structure/sketchStructure";

/** What the dial stands at, in the picture's own words: automators standing, and images of it. */
const said = (folds: number): string => {
  const whole = Math.round(folds);
  if (whole === 0) return "no automator, no fold";
  return `${whole} standing — ${2 ** whole} images`;
};

export function SketchStructureKaleido() {
  return (
    <SketchDriftStage
      reading="kaleido"
      label="The Kaleidoscope"
      field={kaleidoField}
      dial={KALEIDO_DIAL}
      said={said}
      dialLabel="How many automators are standing, one fold each"
    />
  );
}
