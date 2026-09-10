/**
 * @role Tests the contract every scene declares itself into: that the names, the lights and the
 *   winds are each a set with no entry twice, that every one of them carries the terms the picture
 *   reads off it, and that the two marks a ground is cut with are the picture's own cosine (0329).
 * @instead That every name has a file, that an unknown one is refused at load, and that every token
 *   a scene names is in tokens.css → src/ui/scene/scenes.test.ts, which is where those can be
 *   asserted: `src/lib` may not import `src/ui` (docs/map.md).
 */
import { describe, expect, it } from "vitest";

import { cosTurn } from "@/lib/moire";
import {
  SCENE_LIGHTS,
  SCENE_LIGHT_TERMS,
  SCENE_NAMES,
  SCENE_RAMP_STOPS,
  SCENE_WINDS,
  SCENE_WIND_TERMS,
  sceneAxis,
  sceneSharp,
} from "@/lib/moireScene";

describe("the scene contract", () => {
  it("names every scene, light and wind exactly once", () => {
    for (const bank of [SCENE_NAMES, SCENE_LIGHTS, SCENE_WINDS]) {
      expect(new Set(bank).size).toBe(bank.length);
    }
    // Five stops, which is what the ramp the picture's ink was read along has held since 0301 —
    // and since 0332 every one of them is a token a scene names, none of them the caller's own ink.
    expect(SCENE_RAMP_STOPS).toBe(5);
  });

  it("gives every light one token and one share, and the day neither", () => {
    for (const light of SCENE_LIGHTS) {
      const terms = SCENE_LIGHT_TERMS[light];
      expect(terms.amount, light).toBeGreaterThanOrEqual(0);
      // Short of the whole of it: a light that replaced every stop would draw one colour whatever
      // field it was over, which is the picture 0141 exists to end.
      expect(terms.amount, light).toBeLessThan(1);
      expect(terms.token === null, light).toBe(light === "day");
    }
    expect(SCENE_LIGHT_TERMS.day.amount).toBe(0);
  });

  it("orders the winds from the stillest to the wildest, in both terms", () => {
    // The reading is a hand's: a yard called Hushed has to lean less than one called Wild, or the
    // adjective on the card says one thing and the picture another.
    const terms = SCENE_WINDS.map((wind) => SCENE_WIND_TERMS[wind]);
    for (const [at, term] of terms.entries()) {
      const next = terms[at + 1];
      if (next === undefined) continue;
      expect(term.lean, SCENE_WINDS[at]).toBeLessThan(next.lean);
      expect(term.sway, SCENE_WINDS[at]).toBeLessThan(next.sway);
    }
    expect(terms[0]?.lean).toBe(0);
    expect(terms.at(-1)?.lean).toBe(1);
  });

  it("cuts a mark with the picture's own cosine and never a second one", () => {
    // The one cosine in the app, and not a private copy of it (principle 1).
    for (const turn of [0, 0.1, 0.25, 0.5, 0.9]) {
      expect(sceneAxis(turn)).toBeCloseTo(0.5 + 0.5 * cosTurn(turn), 12);
    }
    expect(sceneAxis(0)).toBe(1);
    // And sharpening is a whole power of it: narrower every step, and one is the mark untouched.
    expect(sceneSharp(0.5, 1)).toBe(0.5);
    expect(sceneSharp(0.5, 3)).toBeCloseTo(0.125, 12);
    expect(sceneSharp(0.4, 4)).toBeLessThan(sceneSharp(0.4, 2));
    expect(sceneSharp(1, 6)).toBe(1);
  });
});
