/** @role The lane mirror, held to the schedule it mirrors: cycles replace from their origin, a knob
 * move is a cycle of none, and a value is read at an instant and never off the clock. */
import { describe, expect, it } from "vitest";
import { createLaneReader } from "./laneReader.ts";

const ramp = [
  { at: 0, value: 0 },
  { at: 1, value: 1 },
];

describe("a lane reader", () => {
  it("answers the value it was built at until a cycle is laid, then the cycle's own", () => {
    const reader = createLaneReader(0.5);
    expect(reader.at(3)).toBe(0.5);
    reader.lay(ramp, 0.5, 2, 0);
    expect(reader.at(1)).toBe(0.5);
    expect(reader.at(2.25)).toBe(0.25);
    // Past the last point the last value holds, until the next cycle begins.
    expect(reader.at(3.5)).toBe(1);
    reader.lay(ramp, 0.5, 4, 0);
    expect(reader.at(3.5)).toBe(1);
    expect(reader.at(4.5)).toBe(0.5);
  });

  it("replaces every cycle from a new origin on, as the param's schedule is replaced", () => {
    const reader = createLaneReader(0);
    reader.lay(ramp, 0, 2, 0);
    reader.lay(ramp, 0, 4, 0);
    reader.lay([{ at: 0, value: 9 }], 0, 3, 0);
    expect(reader.at(2.5)).toBe(0.5);
    expect(reader.at(4.5)).toBe(9);
  });

  it("reads a knob move as the value from then on, and a lane cleared as its base", () => {
    const reader = createLaneReader(0);
    reader.lay(ramp, 0, 0, 0);
    expect(reader.at(0.25)).toBe(0.25);
    reader.set(7, 0.5);
    expect(reader.at(0.75)).toBe(7);
    reader.lay([], 3, 1, 1);
    expect(reader.at(2)).toBe(3);
  });

  it("forgets a cycle once the one after it has begun, and keeps the standing one", () => {
    const reader = createLaneReader(0);
    for (let origin = 0; origin < 100; origin++) reader.lay(ramp, 0, origin, 50);
    expect(reader.at(50.5)).toBe(0.5);
    expect(reader.at(99.5)).toBe(0.5);
    // Read at now and after, never before: the standing cycle is the earliest kept.
    expect(reader.at(49.5)).toBe(0);
  });

  it("refuses a cycle laid nowhere", () => {
    expect(() => {
      createLaneReader(0).lay(ramp, 0, Number.NaN, 0);
    }).toThrow(RangeError);
  });
});
