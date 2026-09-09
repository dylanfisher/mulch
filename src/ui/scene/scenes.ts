/**
 * @role The registry of scenes: every name the contract holds against the file that draws it,
 *   checked as this module loads — a name with no file, a file with no name, a ramp that is not
 *   five stops, or a ramp whose caller's-ink stop has moved are all refused here rather than drawn
 *   wrong (0329). The shape `LOOKS` takes in src/lib/moireLook.ts, one tier up because a scene
 *   names tokens and a token is the interface's (docs/boundaries.md).
 * @instead The grounds themselves → the four files beside this one. What a scene is, and the lights
 *   and winds a name puts one under → src/lib/moireScene.ts. The reading of a name →
 *   src/lib/yardScene.ts. The tile a scene is written into → src/ui/moireScreen.ts.
 */
import {
  type Scene,
  type SceneName,
  SCENE_NAMES,
  SCENE_RAMP_INK,
  SCENE_RAMP_STOPS,
} from "@/lib/moireScene";
import { bloom } from "@/ui/scene/bloom";
import { canopy } from "@/ui/scene/canopy";
import { meadow } from "@/ui/scene/meadow";
import { water } from "@/ui/scene/water";

/** Every scene, by the name a yard's plant reads as. One entry per file and one file per entry. */
export const SCENES: Readonly<Record<SceneName, Scene>> = { meadow, bloom, water, canopy };

/**
 * The registry as a lookup: the same four entries, reached by a string. A map and not the record
 * itself, because the record's own type says a name is always there and the whole point of the
 * refusals below is the two cases where it is not — a name with no file, and a file with no name.
 * A hand-written registry is one cast away from both, which is what the type cannot say
 * (principle 5).
 */
const held = new Map<string, Scene>(Object.entries(SCENES));

/**
 * The refusal, run once as this module loads: the same moment `defineEffect` refuses a look the
 * registry does not hold. A scene that arrives half-declared would draw a tile in whatever the ramp
 * happened to resolve to, and a picture is the one place a mistake looks deliberate (principle 5).
 */
for (const name of SCENE_NAMES) {
  const scene = held.get(name);
  if (scene === undefined) throw new Error(`Scene "${name}" has a name and no file.`);
  if (scene.ramp.length !== SCENE_RAMP_STOPS) {
    throw new Error(`Scene "${name}" reads ${scene.ramp.length} stops, not ${SCENE_RAMP_STOPS}.`);
  }
  // Where the caller's own ink is, and that there is exactly one of it: a ramp with a second
  // `null` would draw two stops in one colour and flatten a fifth of itself, which `findIndex`
  // alone cannot see.
  const own = scene.ramp.filter((stop) => stop === null);
  if (own.length !== 1 || scene.ramp[SCENE_RAMP_INK] !== null) {
    throw new Error(`Scene "${name}" holds ${own.length} stops of the caller's own ink.`);
  }
  if (scene.rest < 0 || scene.rest > 1) {
    throw new Error(`Scene "${name}" rests at ${scene.rest}, off its own ramp.`);
  }
}

// And a file whose name the contract does not hold, which the loop above cannot see: it walks the
// contract, so an extra entry is a scene nothing can ever be drawn in and nothing would look at.
if (held.size !== SCENE_NAMES.length) {
  throw new Error(`${held.size} scene files stand against ${SCENE_NAMES.length} names.`);
}

/** The scene a name stands for. A name the registry does not hold is a picture nobody declared. */
export function sceneOf(name: SceneName): Scene {
  const scene = held.get(name);
  if (scene === undefined) throw new Error(`No scene "${name}".`);
  return scene;
}
