/** @role Pure contracts for automation normalization and interpolation. */
import { describe, expect, it } from "vitest";
import { automationValueAt, normalizeAutomationLane } from "./automation";

// Normalization and interpolation are one timeline contract; keeping their edge matrix together
// makes disagreement between stored points and scheduled values visible.
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

  it("holds the base before the lane, interpolates linearly, and holds the tail", () => {
    const lane = [
      { at: 1, value: 0.25 },
      { at: 3, value: 1.25 },
    ];
    expect(automationValueAt(lane, 0.5, 1)).toBe(1);
    expect(automationValueAt(lane, 2, 1)).toBe(0.75);
    expect(automationValueAt(lane, 4, 1)).toBe(1.25);
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
