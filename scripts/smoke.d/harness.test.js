import { describe, expect, it } from "vitest";

import { fail, isHostedTimeout, SmokeFailure } from "./harness.js";

/** Shaped as Playwright raises one: the name is the only thing that identifies it. */
const timeout = () =>
  Object.assign(new Error("Timeout 15000ms exceeded."), {
    name: "TimeoutError",
  });
/** What a scenario's own `fail()` throws — caught, so the throw and not a constructor is tested. */
let assertion;
try {
  fail("the chain lane read 3, wanted 2", { got: 3 });
} catch (error) {
  assertion = error;
}

const hosted = { CI: "true" };
const local = {};

describe("isHostedTimeout", () => {
  it("excuses a Playwright wait that expired on a hosted runner", () => {
    expect(isHostedTimeout(timeout(), hosted)).toBe(true);
  });

  it("holds the same wait to its word on a developer's machine", () => {
    expect(isHostedTimeout(timeout(), local)).toBe(false);
  });

  it("never excuses an assertion that read the page and disagreed with it", () => {
    expect(assertion).toBeInstanceOf(SmokeFailure);
    expect(isHostedTimeout(assertion, hosted)).toBe(false);
  });

  it("never excuses a plain failure, however it reached the lane", () => {
    expect(isHostedTimeout(new Error("Timeout 15000ms exceeded."), hosted)).toBe(false);
    expect(isHostedTimeout(new TypeError("probe is not a function"), hosted)).toBe(false);
    expect(isHostedTimeout(undefined, hosted)).toBe(false);
  });
});
