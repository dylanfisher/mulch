/**
 * @role The reading of a yard's name into the picture it stands in: the plant names the scene, the
 *   air names the light, the adjective names the wind, and the place names both how close the
 *   frame stands and what stands in the field (0335). A table per bank and never a hash of the
 *   string, so a hand can predict what "Windy Reed past the Water Butt in Falling Dusk" will look
 *   like before it is added — and nothing is stored, because a reading of a name that is already
 *   durable is not a second fact that can disagree with the first (0145, 0329).
 * @instead The banks themselves — each grouped under the reading it stands for, so this file names
 *   no yard word of its own — and the draw that joins them → src/lib/copyYard.ts. What a scene,
 *   a light, a wind, a reach and a stand *are* → src/lib/moireScene.ts. The shade a stand casts →
 *   src/lib/moireStand.ts. The grounds they name →
 *   src/ui/scene/. The tile they are written into → src/ui/moireScreen.ts.
 */
import {
  type SceneLight,
  type SceneName,
  type SceneReach,
  type SceneSpecks,
  type SceneSpread,
  type SceneStand,
  type SceneWind,
  SCENE_LIGHTS,
  SCENE_NAMES,
  SCENE_REACHES,
  SCENE_SPECKS,
  SCENE_SPREADS,
  SCENE_STANDS,
  SCENE_WINDS,
} from "./moireScene.ts";
import {
  YARD_ADJECTIVES_BY_WIND,
  YARD_AIR_NOUNS_BY_LIGHT,
  YARD_AIR_WORDS_BY_SPREAD,
  YARD_DETAILS_BY_SPECKS,
  YARD_PLACE_NOUNS_BY_STAND,
  YARD_PLACE_WORDS_BY_REACH,
  YARD_PLANTS_BY_SCENE,
} from "./copyYard.ts";

/**
 * What a yard's name says its picture is: one scene, under one light, in one wind, seen from one
 * reach with one thing standing in it.
 */
export type YardScene = {
  readonly scene: SceneName;
  readonly light: SceneLight;
  readonly wind: SceneWind;
  readonly reach: SceneReach;
  readonly stand: SceneStand;
  readonly spread: SceneSpread;
  readonly specks: SceneSpecks;
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
const REACH_OF_WORD = readingOf(SCENE_REACHES, YARD_PLACE_WORDS_BY_REACH);
const STAND_OF_NOUN = readingOf(SCENE_STANDS, YARD_PLACE_NOUNS_BY_STAND);
const SPREAD_OF_WORD = readingOf(SCENE_SPREADS, YARD_AIR_WORDS_BY_SPREAD);
const SPECKS_OF_DETAIL = readingOf(SCENE_SPECKS, YARD_DETAILS_BY_SPECKS);

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
  // The reach that scales nothing, and the plainest of the four shadows: every name the mint draws
  // carries a place (`mintYardName`), so this is what text the banks cannot read is drawn as.
  reach: SCENE_REACHES[1],
  stand: SCENE_STANDS[0],
  // The wash, which is what a light of no token spreads either way, and the scene's own bright
  // points: a name that says no air and no detail is the field as its own file draws it.
  spread: SCENE_SPREADS[0],
  specks: SCENE_SPECKS[0],
};

/**
 * Which air the name carries, as the joined phrase the mint actually wrote (0324): the light its
 * noun names and the spread its joining word does, read together off the one phrase because that
 * is how the mint drew it — a word matched apart from a noun would read "through" out of a name
 * whose air is a wash and whose plant happens to be past a gate.
 */
function airOf(name: string): { light: SceneLight; spread: SceneSpread } {
  for (const [word, spread] of SPREAD_OF_WORD) {
    for (const light of SCENE_LIGHTS) {
      for (const noun of YARD_AIR_NOUNS_BY_LIGHT[light]) {
        if (name.includes(`${word} ${noun}`)) return { light, spread };
      }
    }
  }
  return { light: YARD_SCENE_REST.light, spread: YARD_SCENE_REST.spread };
}

/**
 * What the name's detail makes of the field's bright points, as the whole phrase the mint wrote:
 * a detail is several words, so it is read off the name for the reason a place noun is, and the
 * earliest one wins because the mint draws exactly one.
 */
function specksOf(name: string): SceneSpecks {
  let found: SceneSpecks | undefined;
  let at = name.length;
  for (const [detail, specks] of SPECKS_OF_DETAIL) {
    const said = name.indexOf(detail);
    if (said >= 0 && said < at) {
      at = said;
      found = specks;
    }
  }
  return found ?? YARD_SCENE_REST.specks;
}

/**
 * Which thing the name stands by, as the joined phrase the mint wrote (0324): a noun is several
 * words, so it is read off the name rather than off its words, and the earliest one in the name
 * wins for the reason the first match does below — the mint draws exactly one place.
 */
function standOf(name: string): SceneStand {
  let found: SceneStand | undefined;
  let at = name.length;
  for (const [noun, stand] of STAND_OF_NOUN) {
    const said = name.indexOf(noun);
    if (said >= 0 && said < at) {
      at = said;
      found = stand;
    }
  }
  return found ?? YARD_SCENE_REST.stand;
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
  let reach: SceneReach | undefined;
  for (const word of name.split(" ")) {
    scene ??= SCENE_OF_PLANT.get(word);
    wind ??= WIND_OF_ADJECTIVE.get(word);
    reach ??= REACH_OF_WORD.get(word);
    if (scene !== undefined && wind !== undefined && reach !== undefined) break;
  }
  const air = airOf(name);
  return {
    scene: scene ?? YARD_SCENE_REST.scene,
    light: air.light,
    wind: wind ?? YARD_SCENE_REST.wind,
    reach: reach ?? YARD_SCENE_REST.reach,
    stand: standOf(name),
    spread: air.spread,
    specks: specksOf(name),
  };
}
