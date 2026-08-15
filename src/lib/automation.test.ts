/** @role Pure contracts for automation lane normalization and for reading one. */
import { describe, expect, it } from "vitest";
import { automationValueAt, laneSpan, normalizeAutomationLane, sameLane } from "./automation";

// What a lane holds at a moment of its own cycle: the reading a knob paints from and the one the
// transport schedules, which have to be the same reading (0035).
describe("reading a lane", () => {
  const lane = [
    { at: 0, value: 0.25 },
    { at: 0.5, value: 1.25 },
    { at: 2, value: 0.75 },
  ];

  it("is its last point's time long", () => {
    expect(laneSpan(lane)).toBe(2);
    expect(laneSpan([])).toBe(0);
    expect(laneSpan([{ at: 0, value: 1 }])).toBe(0);
  });

  it("is the same gesture only when every point agrees", () => {
    expect(sameLane(lane, [...lane])).toBe(true);
    expect(sameLane(lane, lane.slice(0, 2))).toBe(false);
    expect(
      sameLane(lane, [
        { at: 0, value: 0.25 },
        { at: 0.5, value: 1.25 },
        { at: 2, value: 0.7 },
      ]),
    ).toBe(false);
    expect(sameLane([], [])).toBe(true);
  });

  it("interpolates straight lines between its points and holds the ends", () => {
    expect(automationValueAt(lane, 0, 1)).toBe(0.25);
    expect(automationValueAt(lane, 0.25, 1)).toBe(0.75);
    expect(automationValueAt(lane, 0.5, 1)).toBe(1.25);
    expect(automationValueAt(lane, 1.25, 1)).toBe(1);
    // Past its end it holds, which is what the parameter does until the next cycle arms.
    expect(automationValueAt(lane, 9, 1)).toBe(0.75);
  });

  it("holds the manual value until the lane's first point, as the schedule does", () => {
    const late = [
      { at: 1, value: 0.2 },
      { at: 2, value: 0.4 },
    ];
    expect(automationValueAt(late, 0.5, 0.9)).toBe(0.9);
    expect(automationValueAt(late, 1, 0.9)).toBe(0.2);
    expect(automationValueAt([], 1, 0.9)).toBe(0.9);
  });
});

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
