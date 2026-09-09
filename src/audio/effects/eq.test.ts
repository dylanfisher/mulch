// The EQ's fourth knob, which is the one thing about this entry that is not an AudioParam: what a
// shape writes onto the node, what a value that is not a whole number does, and what a lane on it
// is answered with (0322).
import { describe, expect, it } from "vitest";

import {
  biquadCoefficients,
  EQ_SHAPE_NAMES,
  EQ_SHAPES,
  eqShapeAt,
  magnitudeDbAt,
} from "@/lib/biquad";
import type { ParamDeclaration } from "./contract";
import { eqEffect } from "./eq";
import { fakeContext, required } from "./rackFake";

/** One of this entry's parameters, as it declares itself. */
const declaration = (id: string): ParamDeclaration =>
  required(
    eqEffect.params.filter((param) => param.id === id),
    0,
  );

/** What that parameter ships at — the number a fresh instance is built with. */
const declared = (id: string): number => declaration(id).default;

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
    instance.setParam("eq.shape", 0.6, 0);
    expect(required(filters, 0).type).toBe("lowpass");
    instance.setParam("eq.shape", 1.4, 0);
    expect(required(filters, 0).type).toBe("lowpass");
    // And a value outside the declared range is refused rather than clamped (principle 5).
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
    // Which is the declaration's own answer: a shape declares no lane, so the registry never
    // offers it as a target at all (0024).
    expect(declaration("eq.shape")).not.toHaveProperty("automation");
    expect(declaration("eq.shape")).toMatchObject({ step: 1 });
    // And it is held down by the presence, so an automator-grown EQ/Filter is always the low-pass
    // one: the silence below is a low-pass's edge standing above hearing and no other shape's
    // (0322, 0325).
    expect(eqEffect.presence).toMatchObject({ param: "eq.frequency", held: ["eq.shape"] });
  });
});

describe("the EQ/Filter's shape as a choice", () => {
  /**
   * The picker's own half: a shape is chosen by name, so the entry names every step it has, in the
   * order the shapes are listed, and it ships standing in the second of them (0325).
   */
  it("names all four of its shapes, in the shapes' own order, and ships as a low-pass", () => {
    const shape = declaration("eq.shape");
    expect(shape.choices).toEqual(EQ_SHAPE_NAMES);
    expect(shape.choices).toHaveLength(EQ_SHAPES.length);
    // The names stand for the shapes at their own indices: the picker sends a number and the node
    // is written from that same number, so a list out of order is a picker naming the wrong node.
    for (const [index, name] of EQ_SHAPE_NAMES.entries()) {
      expect(eqShapeAt(index)).toBe(EQ_SHAPES[index]);
      expect(name.toLowerCase().replace("-", "")).toBe(EQ_SHAPES[index]?.replace("ing", ""));
    }
    expect(eqShapeAt(shape.default)).toBe("lowpass");
  });
});

describe("the EQ/Filter at its own defaults", () => {
  /**
   * The presence that follows the shape it ships in: a low-pass is transparent with its edge
   * above hearing, so that is where this entry is silent, and it grows by closing (0325).
   */
  it("is silent at the top of its frequency and full below it", () => {
    const presence = eqEffect.presence;
    if (!("param" in presence)) throw new Error("the EQ/Filter declares no presence");
    expect(presence.param).toBe("eq.frequency");
    expect(presence.silent).toBe(20_000);
    expect(presence.full).toBeLessThan(presence.silent);
    expect(presence.held).toEqual(["eq.shape"]);
  });

  /**
   * What the defaults actually sound like, as the maths this entry's node is described by: a
   * fresh EQ/Filter passes what is under its corner and takes away what is over it. The entry
   * ships flat before this step, so the same reading of it was 0dB either side (0325).
   */
  it("passes a low frequency and cuts a high one at its own defaults", () => {
    const coefficients = biquadCoefficients(
      eqShapeAt(declared("eq.shape")),
      declared("eq.frequency"),
      declared("eq.gain"),
      declared("eq.q"),
      48_000,
    );
    expect(magnitudeDbAt(coefficients, 100, 48_000)).toBeGreaterThan(-1);
    expect(magnitudeDbAt(coefficients, 10_000, 48_000)).toBeLessThan(-30);
    // And the node a fresh instance actually builds is the shape that maths describes, rather
    // than the shape a case handed it.
    const { context, filters } = fakeContext();
    eqEffect.build(context, {
      "eq.frequency": declared("eq.frequency"),
      "eq.gain": declared("eq.gain"),
      "eq.q": declared("eq.q"),
      "eq.shape": declared("eq.shape"),
    });
    expect(required(filters, 0).type).toBe("lowpass");
  });
});
