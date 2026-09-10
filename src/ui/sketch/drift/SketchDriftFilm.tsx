/**
 * @role Drift sketch 10 — the film over the scene, under the one dial that says how much of the
 *   picture it may spend (`film.share`). The argument: the scene is the body of the picture and
 *   the film is a shade over it, so what the four keep terms take is a share a hand has seen and
 *   chosen rather than the whole of the alpha (0339), and it is taken off the read and not out of
 *   the alpha at all (0340).
 * @instead The four terms themselves → src/ui/moireScreenTile.ts, which this reads and never
 *   restates. The field, its dial and the mean the readout says → src/ui/sketch/sketchDrift.ts.
 *   The scene under the film, drawn on its own → src/ui/scene/bloom.ts at entry 07.
 */
import { INKING_STOPS, type SketchStop, SketchDriftStage } from "@/ui/sketch/SketchDriftStage";
import { stopsOf } from "@/ui/sketch/drift/SketchDriftScenes";
import { FILM_DIAL, FILM_GROUND_STOP, filmField, filmStanding } from "@/ui/sketch/sketchDrift";

/**
 * The page's own ground under the bloom's five stops: the scene is read from a fifth of the way
 * along so that the share is spent inside its own ramp, the way the painter spends it, and the
 * stop underneath is the page the app's tile is composited over — drawn in the legend, never
 * reached by the picture, because an opaque tile never shows what is behind it (0340). Read from
 * the shared inking rather than named again, and running on through the shipped bloom's ramp. Held once at load, because the stage repaints when its
 * stop list changes identity (src/ui/sketch/SketchDriftStage.tsx).
 */
export const FILM_STOPS: readonly SketchStop[] = [
  ...INKING_STOPS.ink.slice(0, 1),
  ...stopsOf("bloom"),
];

// The field is read in these stops' coordinates, so the two cannot be allowed to drift: one stop
// of ground under five of the scene is what `FILM_GROUND_STOP` is, and a sixth chip added here
// without moving it would draw the legend one ink out of step with the picture (principle 5).
if (FILM_GROUND_STOP !== 1 / (FILM_STOPS.length - 1)) {
  throw new Error(`The film draws ${FILM_STOPS.length} stops and its field reads six.`);
}

/** What the dial stands at: not the share itself but what it leaves, which is what a hand judges. */
const said = (share: number): string =>
  `${Math.round(filmStanding(share) * 100)}% of the field's lightness stands`;

export function SketchDriftFilm() {
  return (
    <SketchDriftStage
      reading="film"
      label="The Film"
      inking={FILM_STOPS}
      field={filmField}
      dial={FILM_DIAL}
      said={said}
      dialLabel="How much of the picture the film may spend"
    />
  );
}
