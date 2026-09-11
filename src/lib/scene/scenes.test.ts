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
  SCENE_REACHES,
  SCENE_REACH_TERMS,
} from "@/lib/moireScene";
import { standSpeck } from "@/lib/moireStand";
import { SCENES, refuseScene, sceneOf } from "@/lib/scene/scenes";

/** The one file that says what a colour is (0236), read as text: a token declared nowhere is a colour nobody has. */
const TOKENS = readFileSync("src/ui/tokens.css", "utf8");

/** The terms a ground is read against here: one tile of the film at two device pixels to the CSS one. */
const TERMS: SceneTerms = {
  width: 110,
  height: 210,
  // The whole tile shown, which is the yard's own drift window rather than the rack strip: a
  // stand's field is the tile when the surface is as tall as one (`standDown`, 0335).
  seen: 210,
  lean: 0.5,
  // The reach that scales nothing and a stand no ground reads: a shadow is spent over a scene
  // rather than inside one (`standShade`, src/lib/moireStand.ts), so every case here reads the
  // ground the yard's plant names and nothing its place does (0335).
  reach: SCENE_REACH_TERMS.middle,
  stand: "wall",
};

/**
 * Every lean this file reads a ground at, against every reach a place word says (0335): a ground
 * has to hold on nought to one and come round at the tile's edges at all of them, the reach being
 * one multiply on the period each of them snaps.
 */
const LEANS_AND_REACHES: readonly (readonly [number, number])[] = [0, 0.25, 0.5, 0.75, 1].flatMap(
  (lean) => SCENE_REACHES.map((reach) => [lean, SCENE_REACH_TERMS[reach]] as const),
);

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

  it("declares specks of its own in every scene, and refuses a scene that declares none", () => {
    // What a yard's detail reads into (0335's step after it): a flock is the scene's own bright
    // points at three times their count, so every scene has to say where one of its own stands —
    // and a scene that said nothing would draw "with Sparrows" as a yard named nothing, in silence.
    for (const name of SCENE_NAMES) {
      expect(typeof SCENES[name].specks, name).toBe("function");
    }
    // oxlint-disable-next-line no-unsafe-type-assertion
    const mute = { ...SCENES.meadow, specks: undefined } as unknown as Scene;
    expect(() => {
      refuseScene("meadow", mute);
    }).toThrow(/declares no specks/u);
  });

  it("stands a flock on more of a tile than one kept thing and on less than the field", () => {
    // The two readings the detail has that the ground does not carry: a flock is a scattering of
    // the scene's own points over the whole tile, and a kept thing is one object at the foot of
    // whatever the yard stands by. Both are read at the top of the ramp, so what says they are
    // different pictures is how much of the tile each stands on.
    for (const name of SCENE_NAMES) {
      const { specks } = SCENES[name];
      let flock = 0;
      let kept = 0;
      for (let y = 0; y < TERMS.height; y += 1) {
        for (let x = 0; x < TERMS.width; x += 1) {
          const at = specks(x, y, TERMS);
          expect(at, `${name} specks at ${x},${y}`).toBeGreaterThanOrEqual(0);
          expect(at, `${name} specks at ${x},${y}`).toBeLessThanOrEqual(1);
          if (at > 0.5) flock += 1;
          if (standSpeck(x, y, TERMS) > 0.5) kept += 1;
        }
      }
      const tile = TERMS.width * TERMS.height;
      expect(kept, "one kept thing stands nowhere").toBeGreaterThan(0);
      expect(flock, `${name} has no flock`).toBeGreaterThan(kept);
      // And a flock is points in a field rather than a field of its own: a tenth of the tile is
      // already a great many birds, and a half of it is a bright sheet.
      expect(flock / tile, `${name} lights the whole tile`).toBeLessThan(0.1);
    }
  });

  it("answers on nought to one everywhere, at every lean and every reach", () => {
    // A ground that reached past one would multiply the tile's alpha up rather than down, and one
    // that went under nought would take more ink than there is. At every reach as well as every
    // lean since 0335: a reading that only ever holds at the middle is two thirds untested, and
    // the reach multiplies a mark's period inside all four of these.
    for (const name of SCENE_NAMES) {
      const { ground } = SCENES[name];
      for (const [lean, reach] of LEANS_AND_REACHES) {
        for (let y = 0; y < TERMS.height; y += 7) {
          for (let x = 0; x < TERMS.width; x += 3) {
            const at = ground(x, y, { ...TERMS, lean, reach });
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
    // its own edge, and the middle of this ramp is a reed (src/lib/scene/water.ts).
    // At every reach, because a far water's two pitches are its tightest: the ripple rests at 2.7
    // device pixels and a far reading takes it under two, which is the one place a mark can stop
    // being a mark at all — so the picture is asserted where it is thinnest and not only at rest.
    const stop = 1 / (SCENE_RAMP_STOPS - 1);
    for (const reach of SCENE_REACHES) {
      const terms = { ...TERMS, reach: SCENE_REACH_TERMS[reach] };
      let below = 0;
      let read = 0;
      let top = 0;
      for (let y = 0; y < TERMS.height; y += 1) {
        for (let x = 0; x < TERMS.width; x += 1) {
          const at = SCENES.water.ground(x, y, terms);
          read += 1;
          if (at < stop) below += 1;
          if (at > top) top = at;
        }
      }
      expect(
        below / read,
        `the water is not black over most of the tile at ${reach}`,
      ).toBeGreaterThan(0.5);
      expect(top, `no glint reaches the water's own top stop at ${reach}`).toBeGreaterThan(
        1 - stop / 2,
      );
    }
  });

  /** Every read of one scene's whole tile, sorted, so a case can ask for its median. */
  function medianOf(name: (typeof SCENE_NAMES)[number]): number {
    const { ground } = SCENES[name];
    const read: number[] = [];
    for (let y = 0; y < TERMS.height; y += 1) {
      for (let x = 0; x < TERMS.width; x += 1) read.push(ground(x, y, TERMS));
    }
    read.sort((one, two) => one - two);
    return read[Math.floor(read.length / 2)] ?? 0;
  }

  it("rests the meadow's mass on the tan it names and the canopy's on the shade it names", () => {
    // The two stills that landed as scenes (0334), each read as the median of a whole tile: a mean
    // is carried by the sparks and the specks of sky, and what is being said here is what the mass
    // between them is. **A mass rests on a stop, and the stop is the one the ramp names for it.**
    // The meadow's tan was a mix of the ember stop and the straw stop until this landed, and every
    // value on the way down came out scarlet; the canopy's floor was the darkest *lit* leaf ink
    // there was. Both are tokens of their own now, so the claim is where the mass sits **and**
    // which ink is there — either half alone passes on a ramp that was never rewritten.
    const stop = 1 / (SCENE_RAMP_STOPS - 1);
    expect(SCENES.meadow.ramp[2], "the meadow names no tan of its own").toBe("--scene-meadow-tan");
    const meadow = medianOf("meadow");
    expect(meadow, "the meadow's mass is under its own tan").toBeGreaterThan(1.5 * stop);
    expect(meadow, "the meadow's mass is over its own straw").toBeLessThan(2.5 * stop);
    // And the canopy sits under the stop the leaf dark used to be its floor at, which is what a
    // wall of leaf seen from under one is.
    expect(SCENES.canopy.ramp[0], "the canopy names no shade under its dark").toBe(
      "--scene-canopy-shade",
    );
    expect(SCENES.canopy.ramp[1], "the canopy's dark is not its second stop").toBe(
      "--scene-canopy-dark",
    );
    expect(medianOf("canopy"), "the canopy is not read at its lowest two stops").toBeLessThan(stop);
  });

  /** How many samples of a whole tile jump by more than `bar` from the column a hair to their left. */
  function breaksOf(name: (typeof SCENE_NAMES)[number], lean: number, bar: number): number {
    const { ground } = SCENES[name];
    const terms = { ...TERMS, lean };
    let broken = 0;
    for (let x = 1; x < TERMS.width; x += 0.01) {
      for (let y = 0; y < TERMS.height; y += 7) {
        if (Math.abs(ground(x, y, terms) - ground(x - 0.01, y, terms)) > bar) broken += 1;
      }
    }
    return broken;
  }

  it("cuts no vertical break through the field the wind leans", () => {
    // **The wind may not put an edge in the picture.** A lean is snapped to a whole number of the
    // mark's own repeats over the tile's depth (`sceneSlope`), which is a **step function** of what
    // it is handed — so a lean that varied across the picture, as a gust standing in it does, tips
    // that rounding column by column and cuts a hard vertical break at every column where it tips:
    // the ruled grid the snapping exists to prevent, moved off the tile join into the middle of the
    // picture, standing in the same place in every tile (0334). The meadow's gust is a smooth
    // offset on x instead, and its lean is one number for the whole tile.
    //
    // Counted against the same field with the wind out of it, and not against a bar of its own,
    // because the marks a picture is *made* of are allowed to be sharp — a seed read at the top
    // stop is a break by design. What is refused is a break the wind brought. Scanned every
    // hundredth of a pixel across, because the tipping columns are that narrow and a coarser walk
    // steps straight over them.
    const still = breaksOf("meadow", 0, 0.2);
    expect(breaksOf("meadow", 1, 0.2), "the meadow breaks where the wind leans it").toBeLessThan(
      still + 7,
    );
  });

  it("comes round at both edges of the tile, at every lean", () => {
    // The tile is laid down as a repeating pattern (`createPattern`, src/ui/moireScreen.ts), so a
    // ground whose marks did not divide it would step by a fraction of a mark at every join — a
    // ruled grid across the whole picture, at full amplitude, once a tile. Every term is snapped
    // onto the tile's own size instead (`sceneRepeat`, `sceneSlope`), and this is what says so.
    for (const name of SCENE_NAMES) {
      const { ground } = SCENES[name];
      for (const [lean, reach] of LEANS_AND_REACHES) {
        const terms = { ...TERMS, lean, reach };
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
