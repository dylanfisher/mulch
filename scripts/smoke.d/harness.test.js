import { describe, expect, it } from "vitest";

import { fail, SmokeFailure } from "./harness.js";

describe("fail", () => {
  it("throws an assertion that read the page and disagreed with it, carrying its evidence", () => {
    let assertion;
    try {
      fail("the chain lane read 3, wanted 2", { got: 3 });
    } catch (error) {
      assertion = error;
    }
    expect(assertion).toBeInstanceOf(SmokeFailure);
    expect(assertion.message).toBe("the chain lane read 3, wanted 2");
    expect(assertion.evidence).toEqual({ got: 3 });
  });
});
