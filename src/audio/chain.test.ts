import { describe, expect, it } from "vitest";
import {
  bindParam,
  SAME_GESTURE_GAP_SECS,
  LANE_SEAM_SECS,
  PARAM_RAMP_SECS,
  rampTo,
  scheduleAutomation,
} from "./ramp";

type Call = [method: string, ...args: number[]];

/** Only what rampTo touches — the point is the schedule of calls, not a graph. */
const fakeParam = (hasCancelAndHold: boolean) => {
  const calls: Call[] = [];
  const param = {
    value: 0.5,
    cancelScheduledValues: (when: number) => calls.push(["cancelScheduledValues", when]),
    setValueAtTime: (value: number, when: number) => calls.push(["setValueAtTime", value, when]),
    linearRampToValueAtTime: (value: number, when: number) =>
      calls.push(["linearRampToValueAtTime", value, when]),
    // Firefox: the method is simply absent, not present-but-broken.
    ...(hasCancelAndHold
      ? { cancelAndHoldAtTime: (when: number) => calls.push(["cancelAndHoldAtTime", when]) }
      : {}),
  };
  // oxlint-disable-next-line no-unsafe-type-assertion -- a fake with only what rampTo touches
  return { calls, param: param as unknown as AudioParam };
};

describe("rampTo", () => {
  it("holds mid-ramp with cancelAndHoldAtTime where the browser has it", () => {
    const { calls, param } = fakeParam(true);
    rampTo(param, 1.25, 2);
    expect(calls).toEqual([
      ["cancelAndHoldAtTime", 2],
      ["linearRampToValueAtTime", 1.25, 2 + PARAM_RAMP_SECS],
    ]);
  });

  it("still ramps instead of throwing where it is missing (Firefox)", () => {
    const { calls, param } = fakeParam(false);
    rampTo(param, 1.25, 2);
    expect(calls).toEqual([
      ["cancelScheduledValues", 2],
      ["setValueAtTime", 0.5, 2],
      ["linearRampToValueAtTime", 1.25, 2 + PARAM_RAMP_SECS],
    ]);
  });
});

// One schedule matrix keeps the pass origin, a late first point, the empty release and a
// second pass visible against the same call-level AudioParam seam.
// oxlint-disable-next-line max-lines-per-function
describe("scheduleAutomation", () => {
  it("lays the gesture's own times out from the cycle origin, joined across the seam", () => {
    const { calls, param } = fakeParam(false);
    scheduleAutomation(
      param,
      [
        { at: 0, value: 0.25 },
        { at: 1, value: 1.25 },
        { at: 2, value: 0.75 },
      ],
      1,
      4,
    );
    // No cancelAndHoldAtTime on this fake, so the Firefox path: pin where the value is, then
    // ramp into the lane's first point rather than stepping onto it (0035).
    expect(calls).toEqual([
      ["cancelScheduledValues", 4],
      ["setValueAtTime", 0.5, 4],
      ["linearRampToValueAtTime", 0.25, 4 + LANE_SEAM_SECS],
      ["linearRampToValueAtTime", 1.25, 5],
      ["linearRampToValueAtTime", 0.75, 6],
    ]);
  });

  it("holds the base until a late first point and clears to it for an empty lane", () => {
    const late = fakeParam(false);
    scheduleAutomation(late.param, [{ at: 1, value: 0.25 }], 1, 2);
    expect(late.calls).toEqual([
      ["cancelScheduledValues", 2],
      ["setValueAtTime", 0.5, 2],
      ["linearRampToValueAtTime", 1, 2 + LANE_SEAM_SECS],
      ["setValueAtTime", 0.25, 3],
    ]);

    const empty = fakeParam(false);
    scheduleAutomation(empty.param, [], 1, 2);
    expect(empty.calls).toEqual([
      ["cancelScheduledValues", 2],
      ["setValueAtTime", 1, 2],
    ]);
  });

  it("schedules the identical lane one period later without touching the pass before it", () => {
    const lane = [
      { at: 0, value: 0.25 },
      { at: 0.5, value: 1.25 },
    ];
    const first = fakeParam(false);
    scheduleAutomation(first.param, lane, 1, 2);
    const second = fakeParam(false);
    scheduleAutomation(second.param, lane, 1, 5);
    // The same calls, three seconds apart: a cycle is the offset and nothing else (0035).
    expect(second.calls).toEqual(
      first.calls.map(([method, ...args]) =>
        method === "setValueAtTime" || method === "linearRampToValueAtTime"
          ? [method, args[0] ?? 0, (args[1] ?? 0) + 3]
          : [method, (args[0] ?? 0) + 3],
      ),
    );
  });

  it("uses the durable base while the lane's own start is still ahead of the origin", () => {
    const { calls, param } = fakeParam(false);
    scheduleAutomation(param, [{ at: 1, value: 0.25 }], 0.75, 2);
    expect(calls).toEqual([
      ["cancelScheduledValues", 2],
      ["setValueAtTime", 0.5, 2],
      ["linearRampToValueAtTime", 0.75, 2 + LANE_SEAM_SECS],
      ["setValueAtTime", 0.25, 3],
    ]);
  });
});

describe("a bound parameter under a live gesture", () => {
  /** One pointer event's worth of time, which is what a drag arrives at. */
  const CADENCE = 0.016;

  /** Ride a bound parameter the way a drag does, at each of the times it was moved at. */
  const ride = (...times: number[]) => {
    const { calls, param } = fakeParam(true);
    const binding = bindParam(param);
    times.forEach((when, index) => {
      binding.set(index, when);
    });
    return {
      holds: calls.filter(([method]) => method === "cancelAndHoldAtTime"),
      ramps: calls.filter(([method]) => method === "linearRampToValueAtTime"),
    };
  };
  const drag = (gap: number, moves: number) =>
    ride(...Array.from({ length: moves }, (_, index) => 2 + index * gap));

  it("joins each move to the next rather than ramping short and holding flat", () => {
    const { holds, ramps } = drag(CADENCE, 4);
    // The step a recorded cutoff clicks on is the flat stretch between one move's ramp ending
    // and the next move beginning. Playback has none — it ramps point to point — so a gesture
    // gets the same join: every ramp lands exactly where the move after it takes over.
    expect(ramps).toHaveLength(4);
    // From the second join on: the opening move has nothing before it to measure a cadence
    // against, and it is the one move a drag makes from a value the parameter is resting at.
    for (let index = 2; index < ramps.length; index++) {
      expect(ramps[index - 1]?.[2]).toBeCloseTo(holds[index]?.[1] ?? Number.NaN, 9);
    }
  });

  it("keeps the immediate ramp for every move that stands alone, not only the first", () => {
    // The binding outlives the gesture — it is built with the effect instance and lives until the
    // instance is removed — so "no cadence yet" cannot mean "never moved before". A move a whole
    // second after the last one has nothing left to join to: the previous ramp arrived long ago.
    // That covers a second drag, a keyboard nudge, a double-click reset, and a lane handing a
    // parameter back to the value the performer left it at.
    const { ramps } = ride(2, 3, 3 + CADENCE, 9);
    expect(ramps[0]?.[2]).toBeCloseTo(2 + PARAM_RAMP_SECS, 9);
    expect(ramps[1]?.[2]).toBeCloseTo(3 + PARAM_RAMP_SECS, 9);
    // Still inside the gesture that just started, so this one is joined over its own cadence.
    expect(ramps[2]?.[2]).toBeCloseTo(3 + CADENCE + CADENCE, 9);
    expect(ramps[3]?.[2]).toBeCloseTo(9 + PARAM_RAMP_SECS, 9);
    expect(CADENCE).toBeLessThan(SAME_GESTURE_GAP_SECS);
  });
});
