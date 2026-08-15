/** @role Pure contracts for automation lane normalization. */
import { describe, expect, it } from "vitest";
import { normalizeAutomationLane } from "./automation";

// One timeline contract; keeping its edge matrix together makes disagreement between what a
// gesture recorded and what a session stores visible.
// oxlint-disable-next-line max-lines-per-function
describe("automation timeline", () => {
  it("sorts seconds, keeps the last duplicate, and clamps values", () => {
    expect(
      normalizeAutomationLane(
        [
          { at: 2, value: 2 },
          { at: 1, value: 0.25 },
          { at: 2, value: 0.75 },
        ],
        { min: 0, max: 1.5 },
      ),
    ).toEqual([
      { at: 1, value: 0.25 },
      { at: 2, value: 0.75 },
    ]);
  });

  it("shares parameter quantization and canonicalizes signed zero", () => {
    const lane = normalizeAutomationLane(
      [
        { at: -0, value: -0 },
        { at: 0.3, value: 0.1 + 0.2 },
      ],
      { min: -1, max: 1, step: 0.1 },
    );
    expect(lane).toEqual([
      { at: 0, value: 0 },
      { at: 0.3, value: 0.3 },
    ]);
    expect(Object.is(lane[0]?.at, -0)).toBe(false);
    expect(Object.is(lane[0]?.value, -0)).toBe(false);
  });

  it("rejects malformed times before they reach a session or graph", () => {
    expect(() => normalizeAutomationLane([{ at: -1, value: 1 }], { min: 0, max: 1.5 })).toThrow(
      /negative/u,
    );
    expect(() =>
      normalizeAutomationLane([{ at: Number.NaN, value: 1 }], { min: 0, max: 1.5 }),
    ).toThrow(/finite/u);
    expect(() =>
      normalizeAutomationLane([{ at: Number.POSITIVE_INFINITY, value: 1 }], {
        min: 0,
        max: 1.5,
      }),
    ).toThrow(/finite/u);
    expect(() =>
      normalizeAutomationLane([{ at: 0, value: Number.NEGATIVE_INFINITY }], {
        min: 0,
        max: 1.5,
      }),
    ).toThrow(/finite/u);
  });
});
