import { describe, expect, it } from "vitest";

import {
  BLEND_CORNERS,
  BLEND_MIDDLE,
  BLEND_RING,
  blendCorner,
  blendNormalise,
  weighBlend,
} from "@/lib/playerBlend";
import { PLAYER_CHARACTERS } from "@/lib/playerCast";

/** Which of the six a blend is standing in, as the pad's own names would show them. */
const carrying = (weights: readonly number[]) =>
  PLAYER_CHARACTERS.filter((_, index) => (weights[index] ?? 0) > 0.001);

describe("a place in the cast is six weights over one", () => {
  it("refuses a cast weighed at nothing rather than answering six NaNs", () => {
    expect(() => blendNormalise([0, 0, 0, 0, 0, 0])).toThrow(/nowhere/u);
    expect(blendNormalise([1, 3])).toEqual([0.25, 0.75]);
  });

  it("names its corners after the module's own cast, in the module's own order", () => {
    expect(BLEND_CORNERS.map((corner) => corner.name)).toEqual([...PLAYER_CHARACTERS]);
  });

  it("weighs every corner, heaviest at the one it stands on", () => {
    const weights = weighBlend({ x: BLEND_MIDDLE, y: BLEND_MIDDLE - BLEND_RING });
    expect(weights.reduce((sum, one) => sum + one, 0)).toBeCloseTo(1, 10);
    expect(carrying(weights)).toEqual([...PLAYER_CHARACTERS]);
    expect(Math.max(...weights)).toBe(weights[0]);
  });

  it("stands on an even six in the middle, which is what the softening is for", () => {
    const weights = weighBlend({ x: BLEND_MIDDLE, y: BLEND_MIDDLE });
    for (const weight of weights) expect(weight).toBeCloseTo(1 / PLAYER_CHARACTERS.length, 10);
  });

  it("weighs the corner it stands on heaviest, whichever one that is", () => {
    for (const [index, corner] of BLEND_CORNERS.entries()) {
      const weights = weighBlend({ x: corner.x, y: corner.y });
      expect(Math.max(...weights)).toBe(weights[index]);
    }
  });

  /**
   * A name is the whole of its corner and not the place its corner is drawn at: the softening that
   * keeps the middle an even six leaves a puck sitting exactly on a corner carrying a fifth of
   * everything else, which is not what a hand pressing a name asked for.
   */
  it("carries the whole of one corner when a name is asked for, and nothing of the rest", () => {
    for (const [index, corner] of BLEND_CORNERS.entries()) {
      const weights = blendCorner(index);
      expect(carrying(weights)).toEqual([corner.name]);
      expect(weights[index]).toBe(1);
      expect(Math.max(...weighBlend({ x: corner.x, y: corner.y }))).toBeLessThan(1);
    }
    expect(() => blendCorner(BLEND_CORNERS.length)).toThrow(/no corner/u);
  });
});
