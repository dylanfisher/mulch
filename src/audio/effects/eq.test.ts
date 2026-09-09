// The EQ's fourth knob, which is the one thing about this entry that is not an AudioParam: what a
// shape writes onto the node, what a value that is not a whole number does, and what a lane on it
// is answered with (0322).
import { describe, expect, it } from "vitest";

import { EQ_SHAPES } from "@/lib/biquad";
import { eqEffect } from "./eq";
import { fakeContext, required } from "./rackFake";

/** The three the graph carries, at their own defaults — a case only ever moves the shape. */
const values = (shape: number) => ({
  "eq.frequency": 1_000,
  "eq.gain": 0,
  "eq.q": 1,
  "eq.shape": shape,
});

describe("the EQ's shape", () => {
  it("writes each of its four shapes straight onto the node's own type", () => {
    for (const [index, shape] of EQ_SHAPES.entries()) {
      const { context, filters } = fakeContext();
      eqEffect.build(context, values(index));
      expect(required(filters, 0).type).toBe(shape);
    }
    // And a shape moved after the build lands on the same node rather than on a second one.
    const { context, filters } = fakeContext();
    const instance = eqEffect.build(context, values(0));
    instance.setParam("eq.shape", 2, 0);
    expect(required(filters, 0).type).toBe("highpass");
    expect(filters).toHaveLength(1);
  });

  it("quantizes a shape to a whole number and refuses one that names no shape", () => {
    const { context, filters } = fakeContext();
    const instance = eqEffect.build(context, values(0));
    // A discrete choice is a number stepped by one, so a value between two shapes is one of them.
    instance.setParam("eq.shape", 0.6, 0);
    expect(required(filters, 0).type).toBe("lowpass");
    instance.setParam("eq.shape", 1.4, 0);
    expect(required(filters, 0).type).toBe("lowpass");
    // And a value outside the declared range is refused rather than clamped: everything reaching a
    // plugin has already been through the command join, which clamps (principle 5).
    expect(() => {
      instance.setParam("eq.shape", 4, 0);
    }).toThrow(/no such EQ shape/u);
    expect(() => {
      instance.setParam("eq.shape", -1, 0);
    }).toThrow(/no such EQ shape/u);
    expect(() => eqEffect.build(context, values(9))).toThrow(/no such EQ shape/u);
  });

  it("hands out no automation target for the shape, and one for each of the other three", () => {
    const { context } = fakeContext();
    const instance = eqEffect.build(context, values(0));
    for (const param of ["eq.frequency", "eq.gain", "eq.q"] as const) {
      expect(instance.automationTarget?.(param)).toBeDefined();
    }
    expect(() => instance.automationTarget?.("eq.shape")).toThrow(/no automation target/u);
    // Which is the declaration's own answer and not a second one: a shape declares no lane, so the
    // registry never offers it as a target in the first place (0024).
    const shape = eqEffect.params.find(({ id }) => id === "eq.shape");
    expect(shape).not.toHaveProperty("automation");
    expect(shape).toMatchObject({ step: 1 });
    // And it is held down by the presence, so an automator-grown EQ is always the peaking one: a
    // gain of nought is silence for that shape and for no other (0322).
    expect(eqEffect.presence).toMatchObject({ param: "eq.gain", held: ["eq.shape"] });
  });
});
