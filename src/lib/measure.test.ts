import { afterEach, describe, expect, it } from "vitest";

import {
  cost,
  costEnd,
  costSpend,
  costStart,
  measureCosts,
  measureOpening,
  measuringCosts,
  readCosts,
} from "@/lib/measure";
import { tunable, tunings } from "@/lib/moireTuning";

/** Every case leaves the module off, which is how the app runs and what the next case reads. */
afterEach(() => {
  measureCosts(false);
});

describe("a measured cost", () => {
  it("fills only while something is measuring", () => {
    const held = cost("only-while-measuring");
    costSpend(held, 5);
    expect(held.calls).toBe(0);
    measureCosts(true);
    costSpend(held, 5);
    expect(held.calls).toBe(1);
    expect(held.totalMs).toBe(5);
  });

  it("keeps the worst span beside the mean, and empties both when measuring stops", () => {
    const held = cost("worst-beside-mean");
    measureCosts(true);
    costSpend(held, 2);
    costSpend(held, 8);
    costSpend(held, 4);
    expect(readCosts()["worst-beside-mean"]).toEqual({
      calls: 3,
      meanMs: 14 / 3,
      worstMs: 8,
    });
    measureCosts(false);
    expect(readCosts()["worst-beside-mean"]).toEqual({ calls: 0, meanMs: 0, worstMs: 0 });
  });

  it("reads no clock at all while nobody is measuring", () => {
    const held = cost("no-clock-when-off");
    // The whole contract of the pair: `costStart` answers nought rather than a time, so a caller
    // that pays for `performance.now()` twice a call is one somebody asked to.
    expect(costStart()).toBe(0);
    expect(costEnd(held, 0)).toBe(0);
    measureCosts(true);
    expect(costStart()).toBeGreaterThan(0);
  });

  it("says a span back to whoever timed it, so another realm's clock can be recorded here", () => {
    const held = cost("span-back-to-the-caller");
    measureCosts(true);
    const at = costStart();
    const spent = costEnd(held, at);
    expect(spent).toBeGreaterThanOrEqual(0);
    expect(held.totalMs).toBe(spent);
  });

  it("refuses a name already declared, because two accumulators under one name read as one", () => {
    cost("declared-once");
    expect(() => cost("declared-once")).toThrow(/declared twice/u);
  });
});

describe("the opening a harness reads", () => {
  it("moves a tunable in the registry this page's own modules read", () => {
    const dial = tunable("measure.opening", 1, { min: 0, max: 4, step: 0.5 });
    const opening = measureOpening();
    opening.tune("measure.opening", 2.5);
    expect(dial.value).toBe(2.5);
    expect(tunings().some((one) => one.id === "measure.opening")).toBe(true);
    expect(opening.ids()).toContain("measure.opening");
  });

  it("turns the accumulators on and hands their numbers back as plain values", () => {
    const held = cost("through-the-opening");
    const opening = measureOpening();
    opening.on(true);
    expect(measuringCosts()).toBe(true);
    costSpend(held, 3);
    expect(opening.read()["through-the-opening"]).toEqual({ calls: 1, meanMs: 3, worstMs: 3 });
    opening.on(false);
    expect(measuringCosts()).toBe(false);
  });
});
