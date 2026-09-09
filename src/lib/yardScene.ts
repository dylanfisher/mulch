/**
 * @role The reading of a yard's name into the picture it stands in: the plant names the scene, the
 *   air names the light, and the adjective names the wind. A table per bank and never a hash of the
 *   string, so a hand can predict what "Windy Reed past the Water Butt in Falling Dusk" will look
 *   like before it is added — and nothing is stored, because a reading of a name that is already
 *   durable is not a second fact that can disagree with the first (0145, 0329).
 * @instead The banks themselves — each grouped under the reading it stands for, so this file names
 *   no yard word of its own — and the draw that joins them → src/lib/copyYard.ts. What a scene,
 *   a light and a wind *are* → src/lib/moireScene.ts. The grounds they name →
 *   src/ui/scene/. The tile they are written into → src/ui/moireScreen.ts.
 */
import {
  type SceneLight,
  type SceneName,
  type SceneWind,
  SCENE_LIGHTS,
  SCENE_NAMES,
  SCENE_WINDS,
} from "./moireScene.ts";
import {
  YARD_ADJECTIVES_BY_WIND,
  YARD_AIR_NOUNS_BY_LIGHT,
  YARD_AIR_WORDS,
  YARD_PLANTS_BY_SCENE,
} from "./copyYard.ts";

/** What a yard's name says its picture is: one scene, under one light, in one wind. */
export type YardScene = {
  readonly scene: SceneName;
  readonly light: SceneLight;
  readonly wind: SceneWind;
};

/**
 * One bank's grouping turned round: the word a name carries, to the reading it stands for. Walked
 * over the contract's own list of readings rather than over the table's keys, so a reading the
 * table forgot is a missing group the type refuses and never a key nobody looked at.
 */
function readingOf<T extends string>(
  readings: readonly T[],
  grouped: Readonly<Record<T, readonly string[]>>,
): Map<string, T> {
  const read = new Map<string, T>();
  for (const key of readings) {
    for (const word of grouped[key]) {
      if (read.has(word)) throw new Error(`"${word}" is read two ways.`);
      read.set(word, key);
    }
  }
  return read;
}

const SCENE_OF_PLANT = readingOf(SCENE_NAMES, YARD_PLANTS_BY_SCENE);
const WIND_OF_ADJECTIVE = readingOf(SCENE_WINDS, YARD_ADJECTIVES_BY_WIND);

/**
 * The picture a name says nothing this file can read stands in. A name is durable text and a
 * session may hold any (0026), so the reading answers for every string there is; a rest is what it
 * answers with, and it is a named rest rather than a silent fallback — the first scene, no air, and
 * the wind a name that says nothing about its own is drawn in.
 */
export const YARD_SCENE_REST: YardScene = {
  scene: SCENE_NAMES[0],
  light: SCENE_LIGHTS[0],
  wind: SCENE_WINDS[1],
};

/** Which air the name carries, as the joined phrase the mint actually wrote (0324), or the day. */
function lightOf(name: string): SceneLight {
  for (const word of YARD_AIR_WORDS) {
    for (const light of SCENE_LIGHTS) {
      for (const noun of YARD_AIR_NOUNS_BY_LIGHT[light]) {
        if (name.includes(`${word} ${noun}`)) return light;
      }
    }
  }
  return YARD_SCENE_REST.light;
}

/**
 * What `name` says its picture is. Read off the words the mint drew and never off the whole string:
 * the plant is whichever word of the name the plant bank holds, the adjective whichever the
 * adjective bank does.
 *
 * **The first match wins, and that is the mint's own order rather than a preference**: a name opens
 * with its adjective and its plant (`mintYardName`), and the banks after them are not disjoint from
 * those two — "beside the Old Wall" carries an adjective and "by the Ivy Arch" a plant. Taking the
 * last match would let a place noun rename the field a yard stands in.
 */
export function yardScene(name: string): YardScene {
  let scene: SceneName | undefined;
  let wind: SceneWind | undefined;
  for (const word of name.split(" ")) {
    scene ??= SCENE_OF_PLANT.get(word);
    wind ??= WIND_OF_ADJECTIVE.get(word);
    if (scene !== undefined && wind !== undefined) break;
  }
  return {
    scene: scene ?? YARD_SCENE_REST.scene,
    light: lightOf(name),
    wind: wind ?? YARD_SCENE_REST.wind,
  };
}
