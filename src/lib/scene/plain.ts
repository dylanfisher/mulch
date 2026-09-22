/**
 * @role The screen: no field at all, one level of a neutral ramp under the film at its whole share,
 *   so what is drawn is the screen's own gratings, the beat they make and the rolling band, over the
 *   marks the yard's sound stamps — the one picture every yard shares while the drift is uniform,
 *   and a fifth field a hand may pick for one yard otherwise (0126, 0400). No specks and no shade
 *   from what a yard stands by, because a field that is not a place casts none.
 * @instead The four grounds a name reads → the files beside this one. What a scene is →
 *   src/lib/moireScene.ts. The film this spends the whole of → src/lib/moireScreenFilm.ts. Which
 *   look is drawn → src/ui/driftLook.ts.
 */
import { type Scene } from "@/lib/moireScene";
import { tunable } from "@/lib/moireTuning";

/** Where on its ramp the whole screen rests before the film shades it. */
const LEVEL = tunable("plain.level", 0.5, { min: 0, max: 1, step: 0.05 });

/**
 * How much of the picture the film spends here: nearly the whole of it, where every other field
 * rests at `film.share`'s 0.15. At 0.15 the scan lines, the column gaps and the band darken the
 * picture by two or three percent and nobody sees them; with no field under them they are the
 * picture (0400). **Topped at 0.8 and not at one**: with every grating knob at its wild end the
 * film at 0.9 leaves 0.58 of the screen's lightness, under `SCREEN_FLOOR`, and a screen that deep
 * is a grille and no longer a shade (0340). And not much under it either: the ramp is five inks cut
 * where a mark is chosen, so a film of a half or less moves no pixel a whole stop and is not drawn.
 */
const FILM = tunable("plain.film", 0.8, { min: 0, max: 0.8, step: 0.05 });

export const plain: Scene = {
  ramp: [
    "--scene-plain-black",
    "--scene-plain-deep",
    "--scene-plain-mid",
    "--scene-plain-lit",
    "--scene-plain-white",
  ],
  ground: () => LEVEL.value,
  specks: () => 0,
  film: FILM,
  stands: false,
  shared: true,
};
