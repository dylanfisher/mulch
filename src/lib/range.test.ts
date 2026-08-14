import { describe, expect, it } from "vitest";
import { clamp, denormalize, normalize, snapToStep } from "@/lib/range";

describe("clamp", () => {
  it("passes a value already inside the range through", () => {
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });

  it("pins values outside the range to the nearest bound", () => {
    expect(clamp(-3, 0, 1)).toBe(0);
    expect(clamp(9, 0, 1)).toBe(1);
  });
});

describe("normalize", () => {
  it("maps the range onto the unit interval", () => {
    expect(normalize(-6, -12, 12)).toBe(0.25);
  });

  it("clamps out-of-range input rather than extrapolating", () => {
    expect(normalize(40, 0, 20)).toBe(1);
  });

  it("returns 0 for a degenerate range instead of dividing by zero", () => {
    expect(normalize(5, 5, 5)).toBe(0);
  });

  it("maps logarithmic decades to equal travel", () => {
    expect(normalize(200, 20, 20_000, "log")).toBeCloseTo(1 / 3);
    expect(normalize(2_000, 20, 20_000, "log")).toBeCloseTo(2 / 3);
  });
});

describe("denormalize", () => {
  it("is the inverse of normalize", () => {
    expect(denormalize(normalize(90, 60, 180), 60, 180)).toBe(90);
  });

  it("is the inverse across a logarithmic range", () => {
    expect(denormalize(normalize(1_000, 20, 20_000, "log"), 20, 20_000, "log")).toBeCloseTo(1_000);
  });

  it("rejects a non-positive logarithmic range", () => {
    expect(() => normalize(1, 0, 10, "log")).toThrow(/must be positive/u);
    expect(() => denormalize(0.5, -1, 10, "log")).toThrow(/must be positive/u);
  });
});

describe("snapToStep", () => {
  it("quantizes to the nearest step counted from min", () => {
    expect(snapToStep(0.5334, 0, 1, 0.05)).toBe(0.55);
  });

  it("counts steps from min, not from zero", () => {
    expect(snapToStep(4, 1, 10, 3)).toBe(4);
  });

  it("does not leak float residue into the result", () => {
    expect(snapToStep(0.3, 0, 1, 0.1)).toBe(0.3);
    expect(snapToStep(2.9, -12, 12, 0.1)).toBe(2.9);
  });

  it("clamps after snapping so a step can never overshoot the range", () => {
    expect(snapToStep(0.9, 0, 0.9, 0.5)).toBe(0.9);
  });

  it("treats a non-positive step as continuous", () => {
    expect(snapToStep(0.1234, 0, 1, 0)).toBe(0.1234);
  });
});
