import { describe, expect, it } from "vitest";
import { mulberry32 } from "@/lib/random";

const take = (generator: () => number, count: number) =>
  Array.from({ length: count }, () => generator());

describe("mulberry32", () => {
  it("gives the same sequence twice from the same seed, which is what a render fingerprint rests on", () => {
    expect(take(mulberry32(20_260_821), 16)).toEqual(take(mulberry32(20_260_821), 16));
  });

  it("gives a different sequence from a different seed", () => {
    expect(take(mulberry32(1), 16)).not.toEqual(take(mulberry32(2), 16));
  });

  it("stays inside [0, 1)", () => {
    for (const value of take(mulberry32(7), 4096)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("advances rather than repeating one value", () => {
    const drawn = new Set(take(mulberry32(7), 256));
    expect(drawn.size).toBe(256);
  });
});
