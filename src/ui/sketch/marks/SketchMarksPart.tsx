/**
 * @role Marks sketch 06 — the alphabet swapped whole with the part: every cell keeps its mark and is written in the alphabet its landing's character names — the shipped marks, rings, or strokes. The argument: the song's sections are the one structure a picture could read as a different picture, and an alphabet is the one thing that can change without moving a cell (0346).
 * @instead The one other → the file beside this one. The field itself and its dial →
 *   src/ui/sketch/marks/sketchMarks.ts. Where it would land → `MARKS` in src/lib/moireGlyph.ts, as three alphabets chosen off the player's part in the bake key.
 */
import { SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { PART_DIAL, partAlphabet, partField } from "@/ui/sketch/marks/sketchMarks";
import { fixtureAt, SKETCH_WALK } from "@/ui/sketch/sketchWalk";

/** What the dial stands at, in the picture's own words. */
const said = (landing: number): string =>
  `landing ${Math.round(landing) + 1}, ${fixtureAt(SKETCH_WALK, Math.round(landing), "landing").character}: the ${partAlphabet(landing)}`;

export function SketchMarksPart() {
  return (
    <SketchDriftStage
      reading="part"
      label="The Part"
      field={partField}
      dial={PART_DIAL}
      said={said}
      dialLabel="Which landing of the walk is standing"
    />
  );
}
