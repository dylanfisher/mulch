/**
 * @role The bloom: a lattice of soft warm blobs over a cool ground, which is the field a yard named
 *   for a flower stands in. It rests past the middle stop of its own ramp, so a bloom nobody has
 *   claimed a colour for is already warm — the one thing that tells a rack of yards apart before
 *   any of them has played a note (0329).
 * @instead The other three grounds → the files beside this one. What a scene is →
 *   src/lib/moireScene.ts. Which names read as this one → src/lib/yardScene.ts.
 */
import { type Scene, sceneAxis, sceneRepeat, sceneSharp, sceneSlope } from "@/lib/moireScene";
import { tunable } from "@/lib/moireTuning";

/** How far apart the blobs stand, in device pixels. Well over the film's own beat, or they hide in it. */
const BLOB_PX = tunable("bloom.blob", 23, { min: 8, max: 80, step: 1 });

/**
 * How far each blob is drawn in toward its own middle, as a whole power of the lattice. One is the
 * lattice itself and reads as a quilt; three is a scatter of small round heads over a ground that
 * is mostly ground, which is what a flowering field looks like from far enough away to be abstract.
 */
const ROUND = tunable("bloom.round", 2, { min: 1, max: 6, step: 1 });

/** How much of the tile's own ink the ground between the blobs takes. */
const DEPTH = tunable("bloom.depth", 0.16, { min: 0, max: 0.4, step: 0.01 });

/** How far the lattice is pushed over as it goes down the tile, at the wildest wind. */
const SLANT = 0.3;

export const bloom: Scene = {
  ramp: ["--drift-cool", "--scene-bloom-ground", null, "--scene-bloom-petal", "--drift-hot"],
  rest: 0.72,
  depth: DEPTH,
  ground: (x, y, terms) => {
    // One asked-for spacing, snapped onto each axis of the tile separately, so the lattice comes
    // round at both joins (`sceneRepeat`).
    const across = sceneRepeat(terms.width, BLOB_PX.value);
    const down = sceneRepeat(terms.height, BLOB_PX.value);
    const leaning = sceneSlope(terms.width, down, terms.lean * SLANT);
    return sceneSharp(
      sceneAxis(x / across) * sceneAxis((y + leaning * x) / down),
      Math.round(ROUND.value),
    );
  },
};
