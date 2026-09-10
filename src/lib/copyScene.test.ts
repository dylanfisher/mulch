import { describe, expect, it } from "vitest";

import {
  SCENE_FIELD_WORDS,
  SCENE_LIGHT_WORDS,
  SCENE_REACH_WORDS,
  SCENE_SPECKS_WORDS,
  SCENE_SPREAD_WORDS,
  SCENE_STAND_WORDS,
  SCENE_WIND_WORDS,
  sceneReading,
} from "./copyScene.ts";
import {
  SCENE_LIGHTS,
  SCENE_NAMES,
  SCENE_REACHES,
  SCENE_SPECKS,
  SCENE_SPREADS,
  SCENE_STANDS,
  SCENE_WINDS,
} from "./moireScene.ts";
import { yardScene, YARD_SCENE_REST } from "./yardScene.ts";

/**
 * Every reading the contract declares, said through its own table: each bank is walked over the
 * contract's own list rather than over the table's keys, so a reading the table forgot is a
 * missing entry the type refuses and never a key nobody looked at (`readingOf`, yardScene.ts).
 */
const BANKS: readonly (readonly [readonly string[], readonly string[]])[] = [
  [SCENE_WINDS, SCENE_WINDS.map((wind) => SCENE_WIND_WORDS[wind])],
  [SCENE_NAMES, SCENE_NAMES.map((scene) => SCENE_FIELD_WORDS[scene])],
  [SCENE_REACHES, SCENE_REACHES.map((reach) => SCENE_REACH_WORDS[reach])],
  [SCENE_STANDS, SCENE_STANDS.map((stand) => SCENE_STAND_WORDS[stand])],
  [SCENE_SPREADS, SCENE_SPREADS.map((spread) => SCENE_SPREAD_WORDS[spread])],
  [SCENE_LIGHTS, SCENE_LIGHTS.map((light) => SCENE_LIGHT_WORDS[light])],
  [SCENE_SPECKS, SCENE_SPECKS.map((specks) => SCENE_SPECKS_WORDS[specks])],
];

describe("sceneReading", () => {
  it("has a word of its own for every reading in every contract list", () => {
    for (const [readings, words] of BANKS) {
      for (const [at, word] of words.entries()) expect(word, readings[at]).toBeTruthy();
      expect(new Set(words).size, words.join(", ")).toBe(readings.length);
    }
  });

  it("says all seven readings of a name, in the order the name is written", () => {
    const said = sceneReading(yardScene("Windy Foxglove by the Gate in Falling Dusk with Moths"));
    expect(said).toBe("a wind, poppies, close, by a grille, a wash of dusk, a flock");
  });

  it("says the rest a name it can read nothing of is drawn at", () => {
    const said = sceneReading(yardScene("Zzz"));
    expect(yardScene("Zzz")).toEqual(YARD_SCENE_REST);
    expect(said).toBe(
      "a stir, seed heads, a step back, by a wall, a wash of daylight, its own points",
    );
  });
});
