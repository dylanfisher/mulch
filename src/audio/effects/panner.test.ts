// The panner's three stages, which are the one thing in the rack that comes and goes inside a
// built instance: what each of them puts in the graph, what is left when it is switched off, and
// what the entry is when none of them is standing (0323).
import { describe, expect, it } from "vitest";

import { drawnParamIds } from "./automator";
import { asFakeNode, fakeContext, required } from "./rackFake";
import { isGrowable } from "./registry";
import { pannerEffect } from "./panner";

/** Every knob at its own default but the ones a case names. */
const values = (rest: Partial<Record<string, number>> = {}) => ({
  "panner.position": 0,
  "panner.spread": 0.5,
  "panner.rate": 1,
  "panner.band": 0,
  "panner.time": 0,
  "panner.slice": 0,
  ...rest,
});

describe("the panner's stages", () => {
  it("builds the nodes each toggle names, and takes them away again", () => {
    const context = fakeContext();
    const instance = pannerEffect.build(context.context, values());
    // Nothing but the plain pan and the two DC sources the stages read: no crossover, no delay
    // line, no splitter, and one stereo panner — the entry's own silence is a wire with a pan on it.
    expect([context.filters.length, context.delays.length, context.splitters.length]).toEqual([
      0, 0, 0,
    ]);
    expect(context.panners).toHaveLength(1);
    const staged = required(context.gains, 1);
    expect([...asFakeNode(instance.input).connections]).toEqual([staged]);

    // Band: three crossover filters and a panner for each of the outer two.
    instance.setParam("panner.band", 1, 0);
    expect(context.filters).toHaveLength(3);
    expect(context.panners).toHaveLength(3);
    const bandIn = required(context.gains, 3);
    const bandOut = required(context.gains, 4);
    expect([...asFakeNode(instance.input).connections]).toEqual([bandIn]);
    expect([...bandOut.connections]).toEqual([staged]);

    // Time: the two sides taken apart and put back together, with a delay on each.
    instance.setParam("panner.time", 1, 0);
    expect([context.splitters.length, context.mergers.length, context.delays.length]).toEqual([
      1, 1, 2,
    ]);
    // In the order the signal meets them: the band split first, then the time offset.
    expect([...bandOut.connections]).toEqual([required(context.gains, 7)]);
    expect([...required(context.mergers, 0).connections]).toEqual([staged]);

    // Slice: two more panners, gated in antiphase off the one shaper the instance keeps.
    instance.setParam("panner.slice", 1, 0);
    expect(context.panners).toHaveLength(5);
    expect(required(context.shapers, 0).connections.size).toBe(2);

    // And every one of them let go of again: the stage's own nodes stop feeding anything, the
    // shaper stops feeding the gates it drove, and the chain closes back up over the gap.
    for (const id of ["panner.band", "panner.time", "panner.slice"] as const) {
      instance.setParam(id, 0, 0);
    }
    expect([...asFakeNode(instance.input).connections]).toEqual([staged]);
    expect(bandOut.connections.size).toBe(0);
    expect(required(context.mergers, 0).connections.size).toBe(0);
    expect(required(context.shapers, 0).connections.size).toBe(0);
    // A toggle that lands on the value already standing builds nothing at all.
    instance.setParam("panner.band", 0, 0);
    expect(context.filters).toHaveLength(3);
  });

  it("passes the signal at the position asked for when no stage is standing", () => {
    const context = fakeContext();
    const instance = pannerEffect.build(context.context, values({ "panner.position": -0.75 }));
    const position = required(context.constants, 0);
    const pan = required(context.panners, 0);
    // The position is a DC source onto the panner's own AudioParam rather than a value written to
    // it: the panner rests at nought and the source is the only thing that moves it, so a bound
    // `pan.pan` and a fanned-out source would be the position counted twice.
    expect(position.offset.value).toBe(-0.75);
    expect(position.started).toBe(true);
    expect(pan.pan.value).toBe(0);
    expect([...position.connections]).toEqual([pan.pan]);
    expect(instance.automationTarget?.("panner.position")).toBe(position.offset);
    // And the signal reaches the output through that panner and nothing else.
    expect([...required(context.gains, 1).connections]).toEqual([pan]);
    expect([...pan.connections]).toEqual([asFakeNode(instance.output)]);
  });

  it("is silent at a spread of nothing over the plain pan it ships as", () => {
    // Silence means the input passed through unchanged (0202), which a stage standing is not: a
    // band split at no spread is three crossovers summed and a time stage is ten milliseconds of
    // everything. So the presence is the spread over a held position and three held stages, and a
    // run never draws one of them — the plain pan is what a fade arrives at and leaves from.
    expect(pannerEffect.presence).toEqual({
      param: "panner.spread",
      silent: 0,
      full: 1,
      held: ["panner.position", "panner.band", "panner.time", "panner.slice"],
    });
    expect(isGrowable(pannerEffect)).toBe(true);
    if (isGrowable(pannerEffect)) {
      expect(drawnParamIds(pannerEffect)).toEqual(["panner.spread", "panner.rate"]);
    }
    const context = fakeContext();
    const instance = pannerEffect.build(
      context.context,
      values({ "panner.spread": 0, "panner.band": 1, "panner.time": 1, "panner.slice": 1 }),
    );
    // Every stage is standing, and every one of them reads the same spread source — so one knob at
    // nought is all three of them at nothing.
    const spread = required(context.constants, 1);
    expect(spread.offset.value).toBe(0);
    expect(spread.connections.size).toBe(7);
    expect(instance.automationTarget?.("panner.spread")).toBe(spread.offset);
  });

  it("lets go of every stage before the sources they read, and stops those sources", () => {
    const context = fakeContext();
    // Every stage standing, which is the case that failed: each of them lets go of its own taps
    // from the spread source's side, and a source disconnected whole first would throw on the
    // first of them and leave the rest of the graph wired (0323).
    const instance = pannerEffect.build(
      context.context,
      values({ "panner.band": 1, "panner.time": 1, "panner.slice": 1 }),
    );
    instance.dispose();
    expect(required(context.oscillators, 0).stopped).toBe(true);
    expect(required(context.constants, 0).connections.size).toBe(0);
    expect(required(context.constants, 1).connections.size).toBe(0);
    for (const filter of context.filters) expect(filter.connections.size).toBe(0);
    expect(asFakeNode(instance.output).connections.size).toBe(0);
  });
});
