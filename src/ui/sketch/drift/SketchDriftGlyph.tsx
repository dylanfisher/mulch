/**
 * @role Drift sketch 11 — the lattice of marks over the scene, under the one dial that says how far
 *   every mark's colour is pulled toward one ink (`glyph.flat`). The argument: the reference this
 *   lattice was drawn against is one flat ink on a pale page, and the scenes were argued in five
 *   stops each; which of the two the picture rests at is a thing a hand decides by looking, and
 *   this is where it looks (0345).
 * @instead The marks themselves and the wrap onto them → src/lib/moireGlyph.ts, which this reads
 *   and never restates. The field, its dial and the cell it is read by → src/ui/sketch/sketchDrift.ts.
 *   The film the lattice stands under, on its own → entry 10, src/ui/sketch/drift/SketchDriftFilm.tsx.
 *   The water on its own → entry 08, src/ui/scene/water.ts.
 */
import { INKING_STOPS, type SketchStop, SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { stopsOf } from "@/ui/sketch/drift/SketchDriftScenes";
import { FILM_GROUND_STOP, GLYPH_DIAL, glyphField } from "@/ui/sketch/sketchDrift";

/**
 * The page's own ground under the water's five stops, laid the way the film's palette is (entry
 * 10): a pixel a mark leaves uncovered is the page, and the field says so by standing at the
 * first stop. The water and not the film's bloom, because the bench reads every palette once and
 * because the reference is glints on black water in one ink.
 */
export const GLYPH_STOPS: readonly SketchStop[] = [
  ...INKING_STOPS.ink.slice(0, 1),
  ...stopsOf("water"),
];

if (FILM_GROUND_STOP !== 1 / (GLYPH_STOPS.length - 1)) {
  throw new Error(`The marks draw ${GLYPH_STOPS.length} stops and their field reads six.`);
}

/** What the dial stands at: how far along from the scene's five stops to one ink. */
const said = (flat: number): string =>
  flat <= 0
    ? "the scene's own five stops"
    : flat >= 1
      ? "one ink"
      : `${Math.round(flat * 100)}% of the way to one ink`;

export function SketchDriftGlyph() {
  return (
    <SketchDriftStage
      reading="glyph"
      label="The Marks"
      inking={GLYPH_STOPS}
      field={glyphField}
      dial={GLYPH_DIAL}
      said={said}
      dialLabel="How far every mark is pulled toward one ink"
    />
  );
}
