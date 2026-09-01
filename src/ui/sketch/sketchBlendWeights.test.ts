import { describe, expect, it } from "vitest";

import { MIDDLE, normalise, PAD } from "@/ui/sketch/sketchBlendPad";
import {
  MOUNTED,
  SPARE,
  TRIANGLE,
  weighHexagon,
  weighTriangle,
  weighWheel,
} from "@/ui/sketch/sketchBlendWeights";
import { SKETCH_CAST } from "@/ui/sketch/sketchWalk";

/** Which of the six a blend is standing in, as the readout under the row would show them. */
const carrying = (weights: readonly number[]) =>
  SKETCH_CAST.filter((_, index) => (weights[index] ?? 0) > 0.001);

describe("a blend is six weights over one", () => {
  it("refuses a cast weighed at nothing rather than answering six NaNs", () => {
    expect(() => normalise([0, 0, 0, 0, 0, 0])).toThrow(/nowhere/u);
    expect(normalise([1, 3])).toEqual([0.25, 0.75]);
  });

  it("weighs every corner of the hexagon, heaviest at the one it stands on", () => {
    const weights = weighHexagon({ x: MIDDLE, y: MIDDLE - 72 });
    expect(weights.reduce((sum, one) => sum + one, 0)).toBeCloseTo(1, 10);
    expect(carrying(weights)).toEqual([...SKETCH_CAST]);
    expect(Math.max(...weights)).toBe(weights[0]);
  });
});

describe("the triangle's mounts", () => {
  const at = { x: MIDDLE, y: MIDDLE + 6 };

  it("is barycentric in the three it mounts and nought in the three it does not", () => {
    const weights = weighTriangle(MOUNTED)(at);
    expect(carrying(weights)).toEqual(["plain", "riff", "breathe"]);
    for (const [corner, index] of MOUNTED.entries()) {
      const alone = weighTriangle(MOUNTED)(TRIANGLE[corner] ?? at);
      expect(alone[index]).toBeCloseTo(1, 10);
    }
  });

  /**
   * The swap moves the weight onto three different characters at the same place, which is why
   * `BlendTriangle` writes the readout when it swaps: a readout left holding the pre-swap six
   * would be stating a place no picture on the row is standing in.
   */
  it("carries the weight to three other characters when the other three are mounted", () => {
    expect(carrying(weighTriangle(SPARE)(at))).toEqual(["stutter", "scatter", "slide"]);
    expect(weighTriangle(SPARE)(at)).not.toEqual(weighTriangle(MOUNTED)(at));
  });
});

describe("the wheel's sweep", () => {
  it("touches a neighbourhood at the rim and the whole cast in the middle", () => {
    const rim = weighWheel({ x: MIDDLE, y: MIDDLE - 72 }).weights;
    const middle = weighWheel({ x: MIDDLE, y: MIDDLE }).weights;
    expect(carrying(rim).length).toBeLessThan(carrying(middle).length);
    expect(carrying(middle)).toEqual([...SKETCH_CAST]);
  });

  /** At its widest the sweep is still an arc: two coincident ends draw no arc at all. */
  it("never opens to a whole turn, at any distance from the middle", () => {
    for (const at of [
      { x: MIDDLE, y: MIDDLE },
      { x: MIDDLE + 1, y: MIDDLE },
      { x: PAD, y: 0 },
    ]) {
      expect(weighWheel(at).spread).toBeLessThan(Math.PI);
    }
  });
});
