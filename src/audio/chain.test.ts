import { describe, expect, it } from "vitest";
import { PARAM_RAMP_SECS, rampTo } from "./chain";

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
