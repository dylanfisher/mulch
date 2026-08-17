import { describe, expect, it } from "vitest";
import { fromIds } from "@/lib/records";

describe("fromIds", () => {
  it("gives every id in the registry a value from the builder", () => {
    expect(fromIds(["a", "b", "c"], (id) => id.toUpperCase())).toEqual({ a: "A", b: "B", c: "C" });
  });

  it("keys the result in the order the registry lists, not sorted", () => {
    expect(Object.keys(fromIds(["pan", "gain", "pitch"], () => 0))).toEqual([
      "pan",
      "gain",
      "pitch",
    ]);
  });

  it("builds an empty record from an empty registry", () => {
    expect(fromIds([], () => 0)).toEqual({});
  });

  it("calls the builder once per id, in registry order", () => {
    const seen: string[] = [];
    fromIds(["pan", "gain"], (id) => seen.push(id));
    expect(seen).toEqual(["pan", "gain"]);
  });
});
