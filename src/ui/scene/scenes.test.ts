/**
 * @role Tests the registry of scenes: that every name in the contract has a file and every file a
 *   name, that a scene declared wrong is refused rather than drawn, that every token a scene names
 *   is in tokens.css and registered as a colour there, and that every ground answers on nought to
 *   one wherever it is read (0329).
 * @instead The contract's own cases → src/lib/moireScene.test.ts. What a name reads as →
 *   src/lib/yardScene.test.ts. What the painter does with a scene →
 *   src/ui/moireCanvasScene.test.ts.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  type Scene,
  type SceneTerms,
  SCENE_NAMES,
  SCENE_LIGHTS,
  SCENE_LIGHT_TERMS,
  SCENE_RAMP_STOPS,
} from "@/lib/moireScene";
import { SCENES, refuseScene, sceneOf } from "@/ui/scene/scenes";

/** The one file that says what a colour is (0236), read as text: a token declared nowhere is a colour nobody has. */
const TOKENS = readFileSync("src/ui/tokens.css", "utf8");

/** The terms a ground is read against here: one tile of the film at two device pixels to the CSS one. */
const TERMS: SceneTerms = { width: 110, height: 210, lean: 0.5 };

// One flat list of the registry's cases, all read off the one set of terms above (0007).
// oxlint-disable-next-line max-lines-per-function
describe("the scene registry", () => {
  it("holds one file per name and one name per file", () => {
    expect(new Set(Object.keys(SCENES))).toEqual(new Set(SCENE_NAMES));
    expect(Object.keys(SCENES)).toHaveLength(SCENE_NAMES.length);
    for (const name of SCENE_NAMES) expect(sceneOf(name)).toBe(SCENES[name]);
  });

  it("refuses a name it does not hold", () => {
    // The type says this cannot happen and a cast is one edit away from saying otherwise, which is
    // the whole reason a registry checks itself rather than trusting its own keys (principle 5).
    // oxlint-disable-next-line no-unsafe-type-assertion
    expect(() => sceneOf("hedgerow" as (typeof SCENE_NAMES)[number])).toThrow(/No scene/u);
  });

  it("declares five stops per scene, every one of them a token", () => {
    for (const name of SCENE_NAMES) {
      const scene = SCENES[name];
      expect(scene.ramp, name).toHaveLength(SCENE_RAMP_STOPS);
      // None of them the caller's own ink: a ground read per pixel spends the whole ramp inside one
      // tile, so a stop that flipped with whatever a surface resolved would flip the middle of every
      // picture with it (0332).
      for (const stop of scene.ramp) expect(stop, `${name} stop`).toMatch(/^--[a-z-]+$/u);
    }
  });

  it("refuses a ramp holding a stop that is not a token, and a ramp that is not five", () => {
    // The refusals the registry runs at load, reached the only way a test can reach them: through
    // the same check, against a scene declared wrong. Until 0332 the middle stop was `null` for the
    // caller's own ink, so a scene left half-converted is the case this is for.
    const meadow = SCENES.meadow;
    // oxlint-disable-next-line no-unsafe-type-assertion
    const holed = {
      ...meadow,
      ramp: [...meadow.ramp.slice(0, 2), null, ...meadow.ramp.slice(3)],
    } as Scene;
    expect(() => {
      refuseScene("meadow", holed);
    }).toThrow(/is no token/u);
    expect(() => {
      refuseScene("meadow", { ...meadow, ramp: meadow.ramp.slice(0, 4) });
    }).toThrow(/reads 4 stops/u);
    expect(() => {
      refuseScene("meadow", meadow);
    }).not.toThrow();
  });

  it("names only tokens tokens.css declares and registers as a colour", () => {
    const named = [
      ...SCENE_NAMES.flatMap((name) => SCENES[name].ramp),
      ...SCENE_LIGHTS.map((light) => SCENE_LIGHT_TERMS[light].token),
    ].filter((token) => token !== null);
    expect(named.length).toBeGreaterThan(0);
    for (const token of named) {
      expect(TOKENS, token).toContain(`  ${token}: light-dark(`);
      // Registered, or the scheme arrives at the canvas as text and `fillStyle` drops it without a
      // word — the silent fallback principle 5 forbids, and the reason 0130 registers the channels.
      expect(TOKENS, token).toContain(`@property ${token} {`);
    }
  });

  it("answers on nought to one everywhere, at every lean", () => {
    // A ground that reached past one would multiply the tile's alpha up rather than down, and one
    // that went under nought would take more ink than there is.
    for (const name of SCENE_NAMES) {
      const { ground } = SCENES[name];
      for (const lean of [0, 0.5, 1]) {
        for (let y = 0; y < TERMS.height; y += 7) {
          for (let x = 0; x < TERMS.width; x += 3) {
            const at = ground(x, y, { ...TERMS, lean });
            expect(at, `${name} at ${x},${y}`).toBeGreaterThanOrEqual(0);
            expect(at, `${name} at ${x},${y}`).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it("keeps the water black under its glints, and lights a few of them outright", () => {
    // The whole of 0333 read off the ground: black water is where the picture rests, and a glint is
    // lit or it is not — a crest allowed to fade through the ramp would spend the middle stops on
    // its own edge, and the middle of this ramp is a reed (src/ui/scene/water.ts).
    const stop = 1 / (SCENE_RAMP_STOPS - 1);
    let below = 0;
    let read = 0;
    let top = 0;
    for (let y = 0; y < TERMS.height; y += 1) {
      for (let x = 0; x < TERMS.width; x += 1) {
        const at = SCENES.water.ground(x, y, TERMS);
        read += 1;
        if (at < stop) below += 1;
        if (at > top) top = at;
      }
    }
    expect(below / read, "the water is not black over most of the tile").toBeGreaterThan(0.5);
    expect(top, "no glint reaches the water's own top stop").toBeGreaterThan(1 - stop / 2);
  });

  it("comes round at both edges of the tile, at every lean", () => {
    // The tile is laid down as a repeating pattern (`createPattern`, src/ui/moireScreen.ts), so a
    // ground whose marks did not divide it would step by a fraction of a mark at every join — a
    // ruled grid across the whole picture, at full amplitude, once a tile. Every term is snapped
    // onto the tile's own size instead (`sceneRepeat`, `sceneSlope`), and this is what says so.
    for (const name of SCENE_NAMES) {
      const { ground } = SCENES[name];
      for (const lean of [0, 0.25, 0.5, 0.75, 1]) {
        const terms = { ...TERMS, lean };
        for (const [x = 0, y = 0] of [
          [0, 0],
          [3, 5],
          [37, 101],
          [TERMS.width - 2, TERMS.height - 7],
        ]) {
          const at = ground(x, y, terms);
          expect(ground(x + TERMS.width, y, terms), `${name} across ${x},${y}`).toBeCloseTo(at, 10);
          expect(ground(x, y + TERMS.height, terms), `${name} down ${x},${y}`).toBeCloseTo(at, 10);
        }
      }
    }
  });

  it("draws a different ground in every scene, and leans each of them", () => {
    const read = (name: (typeof SCENE_NAMES)[number], lean: number): string => {
      const { ground } = SCENES[name];
      const seen: number[] = [];
      for (let y = 0; y < TERMS.height; y += 5) {
        for (let x = 0; x < TERMS.width; x += 5) seen.push(ground(x, y, { ...TERMS, lean }));
      }
      return seen.map((at) => at.toFixed(4)).join(",");
    };
    const grounds = SCENE_NAMES.map((name) => read(name, 0.5));
    expect(new Set(grounds).size).toBe(SCENE_NAMES.length);
    // And the wind reaches every one of them: a scene the lean did nothing to would be a field
    // whose adjective said nothing.
    for (const name of SCENE_NAMES) expect(read(name, 0), name).not.toBe(read(name, 1));
  });
});
