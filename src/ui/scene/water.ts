/**
 * @role The water: a fine rippled grating with a few sparse tall blades standing in it, which is
 *   the field a yard named for a reed, a rush or a sedge stands in. It rests below the middle stop
 *   of its own ramp, so still water is dark and cool before anything has claimed a colour (0329).
 * @instead The other three grounds → the files beside this one. What a scene is →
 *   src/lib/moireScene.ts. Which names read as this one → src/lib/yardScene.ts.
 */
import { type Scene, sceneAxis, sceneRepeat, sceneSharp, sceneSlope } from "@/lib/moireScene";
import { tunable } from "@/lib/moireTuning";

/** How far apart the ripples run down the tile, in device pixels. */
const RIPPLE_PX = tunable("water.ripple", 6, { min: 2, max: 24, step: 0.5 });

/** And how wide the slow swell that bends them across it is, in the same pixels. */
const WAVE_PX = tunable("water.wave", 41, { min: 10, max: 120, step: 1 });

/** How far that swell carries one ripple, in device pixels: a bend and never a second grating. */
const SWELL_PX = tunable("water.swell", 3, { min: 0, max: 12, step: 0.5 });

/** How far apart the blades standing in the water are. Sparse, or the water is a meadow. */
const BLADE_PX = tunable("water.blade", 37, { min: 8, max: 160, step: 1 });

/** How much of the tile's own ink the troughs take. */
const DEPTH = tunable("water.depth", 0.15, { min: 0, max: 0.4, step: 0.01 });

/** How narrow a blade is, as a whole power of its own axis, and how far it leans at the wildest wind. */
const BLADE_SHARP = 6;
const SLANT = 0.4;

/** How much of the ground the ripples are, before the blades are laid over them. */
const RIPPLE_SHARE = 0.7;

export const water: Scene = {
  ramp: ["--scene-water-deep", "--drift-cool", null, "--screen-blue", "--scene-water-lit"],
  rest: 0.3,
  depth: DEPTH,
  ground: (x, y, terms) => {
    // The ripples come round down the tile and the swell and the blades across it (`sceneRepeat`):
    // the swell bends a ripple without moving where it repeats, so only its own width is snapped.
    const down = sceneRepeat(terms.height, RIPPLE_PX.value);
    const wave = sceneRepeat(terms.width, WAVE_PX.value);
    const across = sceneRepeat(terms.width, BLADE_PX.value);
    const leaning = sceneSlope(terms.height, across, terms.lean * SLANT);
    const ripple = sceneAxis((y + SWELL_PX.value * sceneAxis(x / wave)) / down);
    const blade = sceneSharp(sceneAxis((x + leaning * y) / across), BLADE_SHARP);
    return Math.min(1, RIPPLE_SHARE * ripple + blade);
  },
};
