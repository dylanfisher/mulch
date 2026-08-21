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
  it("pins the hold by hand even where the browser offers cancelAndHoldAtTime", () => {
    // The one schedule, on both browsers. `when` is a clock the audio thread has already passed,
    // and Chrome cancel-and-holding at a past time mid-ramp answers the next block with 0 —
    // under the parameter's declared minimum, which is a NaN in any divisor (0102).
    const { calls, param } = fakeParam(true);
    rampTo(param, 1.25, 2);
    expect(calls).toEqual([
      ["cancelScheduledValues", 2],
      ["setValueAtTime", 0.5, 2],
      ["linearRampToValueAtTime", 1.25, 2 + PARAM_RAMP_SECS],
    ]);
    expect(calls.map(([method]) => method)).not.toContain("cancelAndHoldAtTime");
  });

  it("schedules the same calls where the method is missing (Firefox)", () => {
    const { calls, param } = fakeParam(false);
    rampTo(param, 1.25, 2);
    expect(calls).toEqual([
      ["cancelScheduledValues", 2],
      ["setValueAtTime", 0.5, 2],
      ["linearRampToValueAtTime", 1.25, 2 + PARAM_RAMP_SECS],
    ]);
  });
});

// One schedule matrix keeps the pass origin, a late first point, the empty release, a second
// pass and both holds visible against the same call-level AudioParam seam.
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
      0,
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
    scheduleAutomation(late.param, [{ at: 1, value: 0.25 }], 1, 2, 0);
    expect(late.calls).toEqual([
      ["cancelScheduledValues", 2],
      ["setValueAtTime", 0.5, 2],
      ["linearRampToValueAtTime", 1, 2 + LANE_SEAM_SECS],
      ["setValueAtTime", 0.25, 3],
    ]);

    const empty = fakeParam(false);
    scheduleAutomation(empty.param, [], 1, 2, 0);
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
    scheduleAutomation(first.param, lane, 1, 2, 0);
    const second = fakeParam(false);
    scheduleAutomation(second.param, lane, 1, 5, 0);
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
    scheduleAutomation(param, [{ at: 1, value: 0.25 }], 0.75, 2, 0);
    expect(calls).toEqual([
      ["cancelScheduledValues", 2],
      ["setValueAtTime", 0.5, 2],
      ["linearRampToValueAtTime", 0.75, 2 + LANE_SEAM_SECS],
      ["setValueAtTime", 0.25, 3],
    ]);
  });

  it("holds a cycle still to come with the method and one already under way by hand", () => {
    // A lane arms the cycle the clock is inside before the ones across the horizon, so a past
    // origin is every release rather than an edge — and that is the hold Chrome answers with 0.
    // A future origin has to keep the method: `target.value` is today's value, and stamping it on
    // a seam the cycles between here and there have yet to reach would flatten the lane (0102).
    const ahead = fakeParam(true);
    scheduleAutomation(ahead.param, [{ at: 0, value: 0.25 }], 1, 4, 2);
    expect(ahead.calls[0]).toEqual(["cancelAndHoldAtTime", 4]);

    const passed = fakeParam(true);
    scheduleAutomation(passed.param, [{ at: 0, value: 0.25 }], 1, 2, 4);
    expect(passed.calls.slice(0, 2)).toEqual([
      ["cancelScheduledValues", 2],
      ["setValueAtTime", 0.5, 2],
    ]);
    expect(passed.calls.map(([method]) => method)).not.toContain("cancelAndHoldAtTime");

    // The origin the clock is standing exactly on is one the audio thread has already passed.
    const now = fakeParam(true);
    scheduleAutomation(now.param, [{ at: 0, value: 0.25 }], 1, 2, 2);
    expect(now.calls[0]).toEqual(["cancelScheduledValues", 2]);
  });
});

// One case per cadence a gesture can arrive at, and the length is how many of them there are.
// See 0007.
// oxlint-disable-next-line max-lines-per-function
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
      // The pin is the hold, on every browser: `[method, value, when]`, so the time is [2] (0102).
      holds: calls.filter(([method]) => method === "setValueAtTime"),
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
      expect(ramps[index - 1]?.[2]).toBeCloseTo(holds[index]?.[2] ?? Number.NaN, 9);
    }
  });

  it("joins a cadence faster than the ramp itself, over the gap and not over the ramp", () => {
    // Every current trackpad reports quicker than 100Hz, so the ordinary gesture on this
    // instrument arrives in gaps shorter than PARAM_RAMP_SECS. Handed the immediate ramp, each
    // one is cancelled and re-pinned mid-flight and the parameter never arrives — the staircase
    // 0065 exists to remove, on the wide log parameters a listener can hear it on. Joined over
    // its own 5ms, every ramp lands exactly where the move after it takes over.
    const FAST = 0.005;
    expect(FAST).toBeLessThan(PARAM_RAMP_SECS);
    const { holds, ramps } = drag(FAST, 4);
    expect(ramps).toHaveLength(4);
    for (let index = 2; index < ramps.length; index++) {
      expect(ramps[index - 1]?.[2]).toBeCloseTo(holds[index]?.[2] ?? Number.NaN, 9);
    }
  });

  it("keeps the immediate ramp for a move stamped at the instant of the one before it", () => {
    // Two events read off one clock tick have no gap to ramp over, and a ramp of zero length is
    // a jump with a schedule around it. They keep the immediate ramp, like any lone move.
    const { ramps } = ride(2, 2);
    expect(ramps[1]?.[2]).toBeCloseTo(2 + PARAM_RAMP_SECS, 9);
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
