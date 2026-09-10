/**
 * @role The canopy: a dense dark mass with scattered light breaking through it, which is the field
 *   a yard named for a tree or a hedge stands in. It is read low on its own ramp for the water's
 *   reason and its breaks are read at the top of it: what a canopy is, is the light it does not let
 *   past (0329, 0332).
 * @instead The other three grounds → the files beside this one. What a scene is →
 *   src/lib/moireScene.ts. Which names read as this one → src/lib/yardScene.ts.
 */
import { type Scene, sceneAxis, sceneRepeat, sceneSharp, sceneSlope } from "@/lib/moireScene";
import { tunable } from "@/lib/moireTuning";

/** How far apart the gaps in the leaf mass stand, in device pixels. */
const GAP_PX = tunable("canopy.gap", 27, { min: 8, max: 100, step: 1 });

/**
 * How narrow each gap is, as a whole power of the lattice that makes it. One is an open lattice and
 * reads as a bloom; four is a mass with a handful of bright breaks in it, which is a canopy seen
 * from under it.
 */
const THROUGH = tunable("canopy.through", 4, { min: 1, max: 8, step: 1 });

/** How far the boughs lean at the wildest wind, and how much taller a gap is than it is wide. */
const SLANT = 0.5;
const TALL = 1.3;

export const canopy: Scene = {
  ramp: [
    "--scene-canopy-dark",
    "--drift-cool",
    "--primary",
    "--screen-green",
    "--scene-canopy-lit",
  ],
  ground: (x, y, terms) => {
    const across = sceneRepeat(terms.width, GAP_PX.value);
    const down = sceneRepeat(terms.height, GAP_PX.value * TALL);
    const leaning = sceneSlope(terms.width, down, terms.lean * SLANT);
    return sceneSharp(
      sceneAxis(x / across) * sceneAxis((y + leaning * x) / down),
      Math.round(THROUGH.value),
    );
  },
};
