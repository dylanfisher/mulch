import { describe, expect, it } from "vitest";
import { laneSpan, normalizeAutomationLane } from "@/lib/automation";
import {
  dealMotionSpan,
  drawMotionLane,
  MOTION_CHARACTER_REGIONS,
  MOTION_CHARACTERS,
  MOTION_KNOB_DIALS,
  MOTION_KNOBS,
  MOTION_SPAN_SECS,
  MOTION_STEP_GAP_SECS,
  type MotionCharacter,
} from "@/lib/motion";

const GAIN = { min: 0, max: 1.5 };
const CUTOFF = { min: 20, max: 20_000, curve: "log" as const };
const WHOLE = { min: 0, max: 10, step: 1 };
const SEEDS = [1, 7, 1234, 20_260_907];

describe("a drawn lane", () => {
  it("is the same lane twice from the same seed, and another from another seed or span", () => {
    expect(drawMotionLane("smooth", 7, GAIN, 0.5, 6)).toEqual(
      drawMotionLane("smooth", 7, GAIN, 0.5, 6),
    );
    expect(drawMotionLane("smooth", 7, GAIN, 0.5, 6)).not.toEqual(
      drawMotionLane("smooth", 8, GAIN, 0.5, 6),
    );
    expect(laneSpan(drawMotionLane("smooth", 7, GAIN, 0.5, 12))).toBe(12);
  });

  it("spans exactly what was asked, begins at the knob's value, and ends there too", () => {
    for (const character of MOTION_CHARACTERS) {
      for (const seed of SEEDS) {
        for (const span of [MOTION_SPAN_SECS.min, 9.5, MOTION_SPAN_SECS.max]) {
          const lane = drawMotionLane(character, seed, GAIN, 0.5, span);
          expect(lane[0]).toEqual({ at: 0, value: 0.5 });
          expect(lane.at(-1)).toEqual({ at: span, value: 0.5 });
        }
      }
    }
  });

  it("is already normalized, inside the range, at the step, and positive along a log curve", () => {
    for (const seed of SEEDS) {
      const hz = drawMotionLane("sporadic", seed, CUTOFF, 1000, 8);
      expect(hz).toEqual(normalizeAutomationLane(hz, CUTOFF));
      for (const point of hz) {
        expect(point.value).toBeGreaterThanOrEqual(CUTOFF.min);
        expect(point.value).toBeLessThanOrEqual(CUTOFF.max);
      }
      const whole = drawMotionLane("pulse", seed, WHOLE, 4, 8);
      for (const point of whole) expect(Number.isInteger(point.value)).toBe(true);
    }
  });

  it("moves — every character lays more than its two ends on the shortest dealt span, a gap apart at least", () => {
    for (const character of MOTION_CHARACTERS) {
      for (const seed of SEEDS) {
        const lane = drawMotionLane(character, seed, GAIN, 0.5, MOTION_SPAN_SECS.min);
        expect(lane.length).toBeGreaterThan(2);
        for (let at = 1; at < lane.length; at++) {
          expect(lane[at]!.at - lane[at - 1]!.at).toBeGreaterThanOrEqual(
            MOTION_STEP_GAP_SECS - 1e-9,
          );
        }
      }
    }
  });

  it("creeps a fraction of the range where sporadic crosses it", () => {
    const reach = (character: MotionCharacter) => {
      let low = 1;
      let high = 0;
      for (const seed of SEEDS) {
        for (const point of drawMotionLane(character, seed, { min: 0, max: 1 }, 0.5, 16)) {
          low = Math.min(low, point.value);
          high = Math.max(high, point.value);
        }
      }
      return high - low;
    };
    expect(reach("creep")).toBeLessThan(0.5);
    expect(reach("sporadic")).toBeGreaterThan(0.8);
  });

  it("wanders in glides and never a step, where pulse is nothing but steps", () => {
    const steps = (character: MotionCharacter) => {
      let laid = 0;
      for (const seed of SEEDS) {
        const lane = drawMotionLane(character, seed, GAIN, 0.5, 16);
        for (let at = 1; at < lane.length; at++) {
          // A step is a hold and then a ramp one gap long: two points that close together with
          // the value changing between them. A glide takes longer than that to arrive.
          const apart = lane[at]!.at - lane[at - 1]!.at;
          if (apart <= MOTION_STEP_GAP_SECS + 1e-9 && lane[at]!.value !== lane[at - 1]!.value) {
            laid++;
          }
        }
      }
      return laid;
    };
    expect(steps("wander")).toBe(0);
    expect(steps("pulse")).toBeGreaterThan(0);
  });

  it("waits by a hand's clock where smooth waits by a metronome, at every span", () => {
    // The spread of the gaps between a lane's points against their mean, so a character that
    // moves quickly is not counted as uneven for that alone. Read over a run of seeds and not
    // one: a smooth lane lays as few as six gaps, and six of anything is a coin.
    const spread = (character: MotionCharacter, seed: number, span: number) => {
      const lane = drawMotionLane(character, seed, GAIN, 0.5, span);
      const gaps = lane.slice(1).map((point, at) => point.at - lane[at]!.at);
      const mean = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
      const variance = gaps.reduce((sum, gap) => sum + (gap - mean) ** 2, 0) / gaps.length;
      return Math.sqrt(variance) / mean;
    };
    const unevenness = (character: MotionCharacter, span: number) => {
      let total = 0;
      for (let seed = 1; seed <= 64; seed++) total += spread(character, seed, span);
      return total / 64;
    };
    for (const span of [MOTION_SPAN_SECS.min, 9.5, MOTION_SPAN_SECS.max]) {
      expect(unevenness("wander", span)).toBeGreaterThan(2 * unevenness("smooth", span));
    }
  });

  it("refuses a span with no room for a move", () => {
    expect(() => drawMotionLane("pulse", 1, GAIN, 0, 0)).toThrow(RangeError);
    expect(() => drawMotionLane("pulse", 1, GAIN, 0, Number.NaN)).toThrow(RangeError);
  });
});

describe("the span a press deals", () => {
  it("is the same from the same seed, inside the dealt range, and not one value", () => {
    const spans = SEEDS.map((seed) => dealMotionSpan(seed));
    for (const [index, span] of spans.entries()) {
      expect(span).toBe(dealMotionSpan(SEEDS[index]!));
      expect(span).toBeGreaterThanOrEqual(MOTION_SPAN_SECS.min);
      expect(span).toBeLessThanOrEqual(MOTION_SPAN_SECS.max);
    }
    expect(new Set(spans).size).toBe(spans.length);
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

  // Where the unevenness of a wander lane comes from, said about the region rather than measured
  // through one: any wander is jittered at least as much as the most jittered smooth, and a name
  // that says "never a step" carries no flurry, because the flurry is read before the glide (0327).
  it("jitters wander past every smooth, and gives a character that never steps no flurry", () => {
    expect(MOTION_CHARACTER_REGIONS.wander.jitter[0]).toBeGreaterThanOrEqual(
      MOTION_CHARACTER_REGIONS.smooth.jitter[1],
    );
    expect(MOTION_CHARACTER_REGIONS.wander.flurry).toEqual([0, 0]);
    expect(MOTION_CHARACTER_REGIONS.wander.glide[0]).toBeGreaterThan(0);
  });
});
