import { afterEach, describe, expect, it, vi } from "vitest";

import {
  resetTuning,
  setTuning,
  subscribeTuning,
  tunable,
  tuningChanges,
  tuningSnapshot,
  tunings,
} from "./moireTuning.ts";

const range = { min: 0, max: 1, step: 0.1 };

describe("tunable", () => {
  afterEach(resetTuning);

  it("rests where it was declared and is listed in declaration order", () => {
    const a = tunable("test.first", 0.5, range);
    const b = tunable("test.second", 0.25, range);
    expect(a.value).toBe(0.5);
    const ids = tunings().map((handle) => handle.id);
    expect(ids.indexOf("test.first")).toBeLessThan(ids.indexOf("test.second"));
    expect(b.rest).toBe(0.25);
  });

  it("refuses a second declaration of one id, a rest outside its range and an id with no group", () => {
    tunable("test.twice", 0.5, range);
    expect(() => tunable("test.twice", 0.5, range)).toThrow(/declared twice/u);
    expect(() => tunable("test.outside", 2, range)).toThrow(/outside/u);
    expect(() => tunable("nogroup", 0.5, range)).toThrow(/group\.name/u);
    expect(() => tunable("test.flat", 0.5, { min: 1, max: 1, step: 0.1 })).toThrow(/no range/u);
  });

  it("moves through setTuning, held to the range, and tells a subscriber once per move", () => {
    const handle = tunable("test.moved", 0.5, range);
    const heard = vi.fn<() => void>();
    const off = subscribeTuning(heard);
    setTuning("test.moved", 0.7);
    expect(handle.value).toBe(0.7);
    setTuning("test.moved", 0.7);
    setTuning("test.moved", 5);
    expect(handle.value).toBe(1);
    expect(heard).toHaveBeenCalledTimes(2);
    off();
    setTuning("test.moved", 0.2);
    expect(heard).toHaveBeenCalledTimes(2);
    expect(() => {
      setTuning("test.nobody", 0);
    }).toThrow(/No drift tuning/u);
    expect(() => {
      setTuning("test.moved", Number.NaN);
    }).toThrow(/cannot be/u);
  });

  it("reports only what is off its rest, and reset puts everything back", () => {
    const handle = tunable("test.changed", 0.5, range);
    tunable("test.still", 0.5, range);
    expect(tuningChanges()).not.toHaveProperty("test.changed");
    setTuning("test.changed", 0.9);
    expect(tuningChanges()).toMatchObject({ "test.changed": 0.9 });
    expect(tuningChanges()).not.toHaveProperty("test.still");
    const before = tuningSnapshot();
    resetTuning();
    expect(handle.value).toBe(0.5);
    expect(tuningChanges()).not.toHaveProperty("test.changed");
    expect(tuningSnapshot()).not.toBe(before);
  });
});
