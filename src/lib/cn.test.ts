import { describe, expect, it } from "vitest";

import { cn } from "./cn";

describe("cn", () => {
  it("lets a later utility override an earlier one in the same group", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("drops falsy values", () => {
    expect(cn("p-2", false, undefined, "gap-1")).toBe("p-2 gap-1");
  });
});
