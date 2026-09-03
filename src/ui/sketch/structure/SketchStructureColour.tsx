/**
 * @role Structure sketch 06 — the structure read through the ramp of five inks while every
 *   straight row stays in the one ink. The argument: the eye finds colour before it finds a fringe,
 *   so a structure that is the only coloured thing on the page is apparent at any depth.
 * @instead The other six → the files beside this one. The field itself →
 *   src/ui/sketch/structure/sketchStructure.ts. Where it would land → `build` in
 *   src/ui/moireScreen.ts, reading the fractal tile's own value through the ramp the drift bench's
 *   ramp sketch already names.
 */
import { SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { COLOUR_DIAL, colourField } from "@/ui/sketch/structure/sketchStructure";

/** What the dial stands at, in the picture's own words. */
const said = (reach: number): string => `${Math.round(reach * 100)}% of the ramp`;

export function SketchStructureColour() {
  return (
    <SketchDriftStage
      reading="colour"
      label="The Colour"
      inking="ramp"
      field={colourField}
      dial={COLOUR_DIAL}
      said={said}
      dialLabel="How far along the ramp the structure reaches"
    />
  );
}
