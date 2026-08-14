import { describe, expect, it } from "vitest";
import { PARAM_RAMP_SECS, rampTo, scheduleAutomation } from "./ramp";

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

// One schedule matrix keeps before, within, exact, after, replacement, and clearing semantics
// visible against the same call-level AudioParam seam.
// oxlint-disable-next-line max-lines-per-function
describe("scheduleAutomation", () => {
  it("starts at the interpolated present value and schedules only future ramps", () => {
    const { calls, param } = fakeParam(false);
    scheduleAutomation(
      param,
      [
        { at: 1, value: 0.25 },
        { at: 3, value: 1.25 },
        { at: 4, value: 0.75 },
      ],
      1,
      2,
    );
    expect(calls).toEqual([
      ["cancelScheduledValues", 2],
      ["setValueAtTime", 0.75, 2],
      ["linearRampToValueAtTime", 1.25, 3],
      ["linearRampToValueAtTime", 0.75, 4],
    ]);
  });

  it("holds the base until the first point and clears to the base for an empty lane", () => {
    const future = fakeParam(false);
    scheduleAutomation(future.param, [{ at: 3, value: 0.25 }], 1, 2);
    expect(future.calls).toEqual([
      ["cancelScheduledValues", 2],
      ["setValueAtTime", 1, 2],
      ["setValueAtTime", 0.25, 3],
    ]);

    const empty = fakeParam(false);
    scheduleAutomation(empty.param, [], 1, 2);
    expect(empty.calls).toEqual([
      ["cancelScheduledValues", 2],
      ["setValueAtTime", 1, 2],
    ]);
  });

  it("owns exact-point and held-tail edges without replaying elapsed ramps", () => {
    const exact = fakeParam(false);
    scheduleAutomation(
      exact.param,
      [
        { at: 1, value: 0.25 },
        { at: 3, value: 1.25 },
      ],
      1,
      1,
    );
    expect(exact.calls).toEqual([
      ["cancelScheduledValues", 1],
      ["setValueAtTime", 0.25, 1],
      ["linearRampToValueAtTime", 1.25, 3],
    ]);

    const tail = fakeParam(false);
    scheduleAutomation(tail.param, [{ at: 1, value: 0.25 }], 1, 4);
    expect(tail.calls).toEqual([
      ["cancelScheduledValues", 4],
      ["setValueAtTime", 0.25, 4],
    ]);
  });

  it("uses a replacement durable base while the first point is still future", () => {
    const { calls, param } = fakeParam(false);
    scheduleAutomation(param, [{ at: 3, value: 0.25 }], 0.75, 2);
    expect(calls).toEqual([
      ["cancelScheduledValues", 2],
      ["setValueAtTime", 0.75, 2],
      ["setValueAtTime", 0.25, 3],
    ]);
  });
});
