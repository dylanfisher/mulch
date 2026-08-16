import { describe, expect, it } from "vitest";

import { assertChannels, cropChannels } from "./channels";

const ramp = (frames: number, offset = 0): Float32Array =>
  Float32Array.from({ length: frames }, (_, index) => index + offset);

describe("assertChannels", () => {
  it("returns the frame count every channel agrees on", () => {
    expect(assertChannels([ramp(4), ramp(4)], "a test")).toBe(4);
  });

  it("refuses a set with no channels and one whose channels differ in length", () => {
    expect(() => assertChannels([], "a test")).toThrow(/at least one channel/u);
    expect(() => assertChannels([ramp(4), ramp(3)], "a test")).toThrow(/differ in length/u);
  });
});

describe("cropChannels", () => {
  it("is exactly the frames the range names, in every channel", () => {
    const cropped = cropChannels([ramp(10), ramp(10, 100)], 10, 0.2, 0.7);
    expect([...cropped[0]!]).toEqual([2, 3, 4, 5, 6]);
    expect([...cropped[1]!]).toEqual([102, 103, 104, 105, 106]);
  });

  it("copies rather than views, so the crop outlives the buffer it was cut from", () => {
    const source = ramp(4);
    const cropped = cropChannels([source], 4, 0, 1);
    source[0] = 99;
    expect(cropped[0]![0]).toBe(0);
  });

  it("rounds each edge to the nearest frame", () => {
    // 1.4 rounds down to frame 1 and 3.6 rounds up to 4, which the end edge excludes.
    expect([...cropChannels([ramp(10)], 10, 0.14, 0.36)[0]!]).toEqual([1, 2, 3]);
  });

  it("clamps an edge past the end rather than reading past it", () => {
    expect([...cropChannels([ramp(4)], 4, -1, 99)[0]!]).toEqual([0, 1, 2, 3]);
  });

  it("refuses a range that holds no frames, and a rate that cannot place one", () => {
    expect(() => cropChannels([ramp(10)], 10, 0.5, 0.5)).toThrow(/holds no frames/u);
    expect(() => cropChannels([ramp(10)], 10, 0.7, 0.2)).toThrow(/holds no frames/u);
    expect(() => cropChannels([ramp(10)], 0, 0, 1)).toThrow(/positive/u);
    expect(() => cropChannels([ramp(10)], 10, Number.NaN, 1)).toThrow(/crop's in/u);
  });
});
