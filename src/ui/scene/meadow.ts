/**
 * @role The meadow: fine tall strokes leaning as one, clumped into tufts, which is the field a
 *   yard named for a grass, a fern or a thistle stands in. The scene every other one is measured
 *   against — its strokes swing about the middle stop of its own ramp, which is the token the
 *   surface resolves its own ink from, so a meadow is very nearly the picture the instrument drew
 *   before it had scenes (0130, 0329, 0332).
 * @instead The other three grounds → the files beside this one, and the registry that refuses a
 *   name none of them holds → src/ui/scene/scenes.ts. What a scene is → src/lib/moireScene.ts.
 *   Which names read as this one → src/lib/yardScene.ts. The tile this is written into, and the
 *   film of gratings, blobs and band over it → src/ui/moireScreenTile.ts.
 */
import { type Scene, sceneAxis, sceneRepeat, sceneSlope } from "@/lib/moireScene";
import { tunable } from "@/lib/moireTuning";

/** How far apart the strokes stand, in device pixels: near the film's own pitch, and under it. */
const STROKE_PX = tunable("meadow.stroke", 3, { min: 1.5, max: 8, step: 0.1 });

/** And how far apart the tufts they clump into stand — several strokes to a tuft, or it is a comb. */
const TUFT_PX = tunable("meadow.tuft", 19, { min: 6, max: 60, step: 1 });

/**
 * How far the strokes lean off vertical at the wildest wind, as a share of the tile's own height.
 * Baked into the ground and not a term on the transform: a lean the whole tile carried would slide
 * the film with it, and what leans in a meadow is the grass and not the light on it.
 */
const SLANT = tunable("meadow.slant", 0.35, { min: 0, max: 1.5, step: 0.05 });

/** How much of the ground the tufts are, against the strokes inside them. */
const TUFT_SHARE = 0.35;

/** And how far the tufts themselves slide down the tile, so they are not a column of one shape. */
const TUFT_SLIDE = 0.25;

export const meadow: Scene = {
  ramp: ["--drift-cool", "--screen-green", "--primary", "--screen-red", "--drift-hot"],
  ground: (x, y, terms) => {
    // Both repeats and both leans snapped onto the tile, or the strokes step half a turn sideways
    // at every tile join and the meadow is a ruled grid (`sceneRepeat`).
    const stroke = sceneRepeat(terms.width, STROKE_PX.value);
    const tuft = sceneRepeat(terms.width, TUFT_PX.value);
    const leaning = sceneSlope(terms.height, stroke, terms.lean * SLANT.value);
    const sliding = sceneSlope(terms.height, tuft, TUFT_SLIDE);
    return (
      TUFT_SHARE * sceneAxis((x + sliding * y) / tuft) +
      (1 - TUFT_SHARE) * sceneAxis((x + leaning * y) / stroke)
    );
  },
};
