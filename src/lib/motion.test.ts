import { describe, expect, it } from "vitest";
import { automationValueAt, laneSpan, normalizeAutomationLane } from "@/lib/automation";
import {
  assertMotion,
  drawMotionStretch,
  MOTION_ANCHOR_STRETCHES,
  MOTION_CHARACTER_REGIONS,
  MOTION_CHARACTERS,
  MOTION_KNOB_DIALS,
  MOTION_KNOBS,
  MOTION_STEP_GAP_SECS,
  MOTION_STRETCH_SECS,
  motionCycle,
  motionPhase,
  motionValueAt,
  sameMotion,
  stretchEnd,
  type MotionSpec,
} from "@/lib/motion";

const GAIN = { min: 0, max: 1.5 };
const CUTOFF = { min: 20, max: 20_000, curve: "log" as const };
const WHOLE = { min: 0, max: 10, step: 1 };
const SEEDS = [1, 7, 1234, 20_260_907];

describe("a motion's stretch", () => {
  it("is the same lane twice from the same seed and index, and another from the next index", () => {
    const spec: MotionSpec = { character: "smooth", seed: 7 };
    expect(drawMotionStretch(spec, 3, GAIN, 0.5)).toEqual(drawMotionStretch(spec, 3, GAIN, 0.5));
    expect(drawMotionStretch(spec, 3, GAIN, 0.5)).not.toEqual(
      drawMotionStretch(spec, 4, GAIN, 0.5),
    );
    expect(drawMotionStretch(spec, 3, GAIN, 0.5)).not.toEqual(
      drawMotionStretch({ ...spec, seed: 8 }, 3, GAIN, 0.5),
    );
  });

  it("spans exactly one stretch, begins at the knob's value, and begins where the one before ended", () => {
    for (const character of MOTION_CHARACTERS) {
      for (const seed of SEEDS) {
        const spec: MotionSpec = { character, seed };
        const first = drawMotionStretch(spec, 0, GAIN, 0.75);
        expect(first[0]).toEqual({ at: 0, value: 0.75 });
        expect(laneSpan(first)).toBe(MOTION_STRETCH_SECS);
        for (let index = 0; index < MOTION_ANCHOR_STRETCHES * 2; index++) {
          const stretch = drawMotionStretch(spec, index, GAIN, 0.75);
          const next = drawMotionStretch(spec, index + 1, GAIN, 0.75);
          expect(laneSpan(stretch)).toBe(MOTION_STRETCH_SECS);
          expect(next[0]?.at).toBe(0);
          expect(next[0]?.value).toBeCloseTo(stretch.at(-1)!.value, 12);
        }
      }
    }
  });

  /** One stretch held against its range: normalized already, inside it, and whole where it counts. */
  const inside = (
    spec: MotionSpec,
    range: typeof GAIN | typeof CUTOFF | typeof WHOLE,
    base: number,
  ) => {
    const stretch = drawMotionStretch(spec, 2, range, base);
    expect(normalizeAutomationLane(stretch, range)).toEqual(stretch);
    for (const point of stretch) {
      expect(point.value).toBeGreaterThanOrEqual(range.min);
      expect(point.value).toBeLessThanOrEqual(range.max);
      if (range === WHOLE) expect(Number.isInteger(point.value)).toBe(true);
    }
  };

  it("is already normalized, inside the range, at the step, and positive along a log curve", () => {
    for (const character of MOTION_CHARACTERS) {
      for (const seed of SEEDS) {
        inside({ character, seed }, GAIN, 1);
        inside({ character, seed }, CUTOFF, 800);
        inside({ character, seed }, WHOLE, 4);
      }
    }
  });

  it("moves — every character lays more than its two ends over a few stretches, a gap apart at least", () => {
    for (const character of MOTION_CHARACTERS) {
      let points = 0;
      for (let index = 0; index < 4; index++) {
        const stretch = drawMotionStretch({ character, seed: 3 }, index, GAIN, 0.5);
        points += stretch.length;
        for (let at = 1; at < stretch.length; at++) {
          expect(stretch[at]!.at - stretch[at - 1]!.at).toBeGreaterThanOrEqual(
            MOTION_STEP_GAP_SECS - 1e-9,
          );
        }
      }
      // A creep may wait longer than one stretch; over four it has moved, and the ends alone are eight.
      expect(points).toBeGreaterThan(8);
    }
  });

  it("creeps a fraction of the range where sporadic crosses it", () => {
    const reach = (character: (typeof MOTION_CHARACTERS)[number]) => {
      let low = 1;
      let high = 0;
      for (const seed of SEEDS) {
        for (let index = 0; index < 4; index++) {
          for (const point of drawMotionStretch(
            { character, seed },
            index,
            { min: 0, max: 1 },
            0.5,
          )) {
            low = Math.min(low, point.value);
            high = Math.max(high, point.value);
          }
        }
      }
      return high - low;
    };
    expect(reach("creep")).toBeLessThan(0.5);
    expect(reach("sporadic")).toBeGreaterThan(0.8);
  });

  it("refuses a stretch that is not a whole non-negative index", () => {
    const spec: MotionSpec = { character: "pulse", seed: 1 };
    expect(() => drawMotionStretch(spec, -1, GAIN, 0)).toThrow(RangeError);
    expect(() => drawMotionStretch(spec, 1.5, GAIN, 0)).toThrow(RangeError);
  });
});

describe("the slow path a motion's ends ride", () => {
  it("is continuous across an anchor and stays inside the unit interval", () => {
    for (const seed of SEEDS) {
      const spec: MotionSpec = { character: "smooth", seed };
      for (let index = 0; index < MOTION_ANCHOR_STRETCHES * 3; index++) {
        const end = stretchEnd(spec, index);
        expect(end).toBeGreaterThanOrEqual(0);
        expect(end).toBeLessThanOrEqual(1);
        expect(Math.abs(stretchEnd(spec, index + 1) - end)).toBeLessThan(
          1 / MOTION_ANCHOR_STRETCHES + 1e-9,
        );
      }
    }
  });
});

describe("the one reading of a motion", () => {
  it("splits elapsed seconds into a stretch and a phase", () => {
    expect(motionCycle(0)).toBe(0);
    expect(motionCycle(MOTION_STRETCH_SECS * 2.5)).toBe(2);
    expect(motionPhase(MOTION_STRETCH_SECS * 2.5)).toBeCloseTo(MOTION_STRETCH_SECS / 2, 12);
  });

  it("reads what the stretch it is inside says, through automationValueAt", () => {
    const spec: MotionSpec = { character: "restless", seed: 9 };
    const elapsed = MOTION_STRETCH_SECS * 3 + 1.25;
    const stretch = drawMotionStretch(spec, 3, GAIN, 0.5);
    expect(motionValueAt(spec, GAIN, elapsed, 0.5)).toBe(automationValueAt(stretch, 1.25, 0.5));
  });
});

describe("what a character is", () => {
  it("names every dial, inside that dial's own range, low end first", () => {
    for (const character of MOTION_CHARACTERS) {
      for (const knob of MOTION_KNOBS) {
        const [low, high] = MOTION_CHARACTER_REGIONS[character][knob];
        const dial = MOTION_KNOB_DIALS[knob];
        expect(low).toBeGreaterThanOrEqual(dial.min);
        expect(high).toBeLessThanOrEqual(dial.max);
        expect(low).toBeLessThanOrEqual(high);
      }
    }
  });
});

describe("assertMotion", () => {
  it("passes exactly a character and a seed, and null", () => {
    expect(assertMotion(null, "m")).toBeNull();
    expect(assertMotion({ character: "creep", seed: 12 }, "m")).toEqual({
      character: "creep",
      seed: 12,
    });
  });

  it("refuses an unknown character, a fractional or negative seed, and any other key", () => {
    expect(() => assertMotion({ character: "wobble", seed: 1 }, "m")).toThrow(TypeError);
    expect(() => assertMotion({ character: "creep", seed: 1.5 }, "m")).toThrow(RangeError);
    expect(() => assertMotion({ character: "creep", seed: -1 }, "m")).toThrow(RangeError);
    expect(() => assertMotion({ character: "creep", seed: 1, amount: 1 }, "m")).toThrow(TypeError);
    expect(() => assertMotion("creep", "m")).toThrow(TypeError);
  });

  it("says two specs are one motion only when both fields agree", () => {
    expect(sameMotion({ character: "creep", seed: 1 }, { character: "creep", seed: 1 })).toBe(true);
    expect(sameMotion({ character: "creep", seed: 1 }, { character: "creep", seed: 2 })).toBe(
      false,
    );
    expect(sameMotion({ character: "creep", seed: 1 }, { character: "pulse", seed: 1 })).toBe(
      false,
    );
  });
});
