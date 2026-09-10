/**
 * @role What a yard's name was read as, said in words: one word per reading of the seven banks,
 *   and the one sentence they are joined into — "a breeze, poppies, close, by a grille, a wash of
 *   dusk, a flock". The picture is a reading of the name and nothing else (0329), so this is how a
 *   hand checks what was read against what was drawn. Beside src/lib/copy.ts rather than in it
 *   because that file is at the hard cap (0045), the way src/lib/copyYard.ts is.
 * @instead The banks the words a name is drawn from live in → src/lib/copyYard.ts. The reading of
 *   a name into these → src/lib/yardScene.ts, and what a scene, a light, a wind, a reach, a stand,
 *   a spread and a specks *are* → src/lib/moireScene.ts. The panel that says this sentence →
 *   src/ui/MoireTuning.tsx, and its other words → src/lib/copyDrift.ts.
 */
import type {
  SceneLight,
  SceneName,
  SceneReach,
  SceneSpecks,
  SceneSpread,
  SceneStand,
  SceneWind,
} from "./moireScene.ts";
import type { YardScene } from "./yardScene.ts";

/** The card the tuning panel says a reading under, and the sentence it is read by. */
export const SCENE_READING_TITLE = "Scene";
export const SCENE_READING_HINT =
  "What this yard's name was read as: the wind its adjective sets, the field its plant stands in, how close the frame stands, what stands in it, the air its light falls through, and what its bright points are. The name sets all of it; the field alone can be set aside for this tab, to see the others under this yard's own light.";

/**
 * The dropdown under the reading that sets the field aside, and its rest: the name's own field,
 * said with the field so a hand can see what it is leaving before it leaves it.
 */
export const SCENE_PICK_LABEL = "Field";
export const SCENE_PICK_HINT =
  "Which field this yard stands in, for this tab only: at rest the one its name reads as. Nothing is stored — a reload reads the name again.";
export const sceneAsNamed = (field: string): string => `as named — ${field}`;

/**
 * A field in the words the still it came from was drawn in, not the name of its file: a hand
 * reading "poppies" against the picture is checking the same thing the scene's own ground draws,
 * where "bloom" is only what the contract calls the entry (0329).
 */
export const SCENE_FIELD_WORDS: Readonly<Record<SceneName, string>> = {
  meadow: "seed heads",
  bloom: "poppies",
  water: "black water",
  canopy: "a canopy",
};

/**
 * Each wind as the thing in the air rather than as the adjective that named it, and each of them
 * an amount rather than an absence: the stillest yard still sways — `SCENE_WIND_TERMS.still` leans
 * nothing and sways 0.35, which src/ui/moireScreen.ts calls "all but stands" — so the smallest
 * word here is a breath and not "no wind".
 */
export const SCENE_WIND_WORDS: Readonly<Record<SceneWind, string>> = {
  still: "a breath",
  quiet: "a stir",
  breeze: "a breeze",
  windy: "a wind",
  wild: "a gale",
};

/** How close the frame stands, said as a distance and not as the scale it multiplies. */
export const SCENE_REACH_WORDS: Readonly<Record<SceneReach, string>> = {
  close: "close",
  middle: "a step back",
  far: "far off",
};

/**
 * The one large thing, said as the shape of the shade it casts. Four words and not twenty-four
 * nouns, because four shadows is what the picture draws of them (0335) — a hand that reads "by a
 * wall" against a yard named for a hedge is reading exactly what the tile holds.
 */
export const SCENE_STAND_WORDS: Readonly<Record<SceneStand, string>> = {
  wall: "by a wall",
  steps: "by steps",
  grille: "by a grille",
  mass: "by a mass",
};

/**
 * The air, as its two halves: the spread opens the phrase and the light closes it, so the two
 * readings the mint drew as one phrase are said back as one — "a wash of dusk", "a fall of frost".
 */
export const SCENE_SPREAD_WORDS: Readonly<Record<SceneSpread, string>> = {
  wash: "a wash of",
  fall: "a fall of",
};

export const SCENE_LIGHT_WORDS: Readonly<Record<SceneLight, string>> = {
  day: "daylight",
  dusk: "dusk",
  moon: "moonlight",
  frost: "frost",
  rain: "rain",
  sun: "low sun",
};

/** What the field's bright points are: its own, three times as many, or the one thing left in it. */
export const SCENE_SPECKS_WORDS: Readonly<Record<SceneSpecks, string>> = {
  own: "its own points",
  flock: "a flock",
  kept: "one kept thing",
};

/**
 * The whole reading as one sentence, in the order the mint writes the name: the wind its adjective
 * set, the field its plant stands in, the reach and the stand its place names, the air, and the
 * detail. Every reading is said, including the ones a name left to their rests — a picture drawn
 * at a rest is still drawn, and a sentence that dropped it would read as a picture with nothing
 * there (principle 5).
 */
export const sceneReading = (scene: YardScene): string =>
  [
    SCENE_WIND_WORDS[scene.wind],
    SCENE_FIELD_WORDS[scene.scene],
    SCENE_REACH_WORDS[scene.reach],
    SCENE_STAND_WORDS[scene.stand],
    `${SCENE_SPREAD_WORDS[scene.spread]} ${SCENE_LIGHT_WORDS[scene.light]}`,
    SCENE_SPECKS_WORDS[scene.specks],
  ].join(", ");
