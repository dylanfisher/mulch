// The rewiring matrix, against the fake context ./rackFake.ts holds. The fake became a module of
// its own when this file reached the hard cap: the per-entry graph cases went to
// ./rackPlugins.test.ts and the fake both of them are read against went with it (0045).
import { describe, expect, it } from "vitest";

import { effectParamDefaults } from "@/audio/params";
import { PARAM_RAMP_SECS } from "@/audio/ramp";
import { asFakeNode, fakeContext, required } from "./rackFake";
import { effectById } from "./registry";
import { createEffectRack } from "./rack";

describe("effect rack", () => {
  it("connects active effects in insertion order", () => {
    const { context, gains, filters, node } = fakeContext();
    const destination = node("destination");
    const rack = createEffectRack(context, destination);

    rack.add("d1", effectById("delay"), effectParamDefaults("delay", "d1"));
    rack.add("f1", effectById("filter"), effectParamDefaults("filter", "f1"));

    const rackInput = asFakeNode(rack.input);
    const delayInput = required(gains, 1);
    const delayOutput = required(gains, 5);
    const filter = required(filters, 0);
    expect([...rackInput.connections]).toEqual([delayInput]);
    expect([...delayOutput.connections]).toEqual([filter]);
    expect([...filter.connections]).toEqual([destination]);
  });

  it("hands out the bound AudioParam an active effect's lane is scheduled onto", () => {
    const { context, filters, node } = fakeContext();
    const rack = createEffectRack(context, node("destination"));
    rack.add("f1", effectById("filter"), effectParamDefaults("filter", "f1"));

    // The same binding setParam moves — one parameter, one AudioParam, two ways in (0024).
    expect(rack.automationTarget("f1", "filter.cutoff")).toBe(required(filters, 0).frequency);
    // A bypassed effect keeps its nodes, so its lane keeps a target to run against.
    rack.setBypass("f1", true);
    expect(rack.automationTarget("f1", "filter.cutoff")).toBe(required(filters, 0).frequency);

    rack.remove("f1");
    expect(() => rack.automationTarget("f1", "filter.cutoff")).toThrow(
      /effect instance is not held/u,
    );
  });

  it("routes parameter changes to an active effect", () => {
    const { context, delays, node } = fakeContext();
    const rack = createEffectRack(context, node("destination"));
    rack.add("d1", effectById("delay"), effectParamDefaults("delay", "d1"));

    rack.setParam("d1", "delay.time", 0.75, 3);

    expect(required(delays, 0).delayTime.ramps).toEqual([[0.75, 3 + PARAM_RAMP_SECS]]);
  });
});

// The rewiring matrix of 0023, asserted on the edges the fake context records.
// oxlint-disable-next-line max-lines-per-function
describe("effect rack performance operations", () => {
  it("routes around a bypassed effect while keeping its instance parameterised", () => {
    const { context, gains, delays, filters, node } = fakeContext();
    const destination = node("destination");
    const rack = createEffectRack(context, destination);
    rack.add("d1", effectById("delay"), effectParamDefaults("delay", "d1"));
    rack.add("f1", effectById("filter"), effectParamDefaults("filter", "f1"));

    rack.setBypass("d1", true);

    const filter = required(filters, 0);
    expect([...asFakeNode(rack.input).connections]).toEqual([filter]);
    expect([...filter.connections]).toEqual([destination]);

    // The instance is still there, so a knob moved while bypassed is the value it comes back at.
    rack.setParam("d1", "delay.time", 0.5, 1);
    expect(required(delays, 0).delayTime.ramps).toEqual([[0.5, 1 + PARAM_RAMP_SECS]]);

    rack.setBypass("d1", false);
    expect([...asFakeNode(rack.input).connections]).toEqual([required(gains, 1)]);
    expect([...required(gains, 5).connections]).toEqual([filter]);
  });

  it("rewires around a removed effect and leaves the rest in order", () => {
    const { context, gains, filters, node } = fakeContext();
    const destination = node("destination");
    const rack = createEffectRack(context, destination);
    rack.add("d1", effectById("delay"), effectParamDefaults("delay", "d1"));
    rack.add("f1", effectById("filter"), effectParamDefaults("filter", "f1"));

    rack.remove("d1");

    const filter = required(filters, 0);
    expect([...asFakeNode(rack.input).connections]).toEqual([filter]);
    expect([...filter.connections]).toEqual([destination]);
    expect([...required(gains, 5).connections]).toEqual([]);
  });

  it("connects a reordered rack in the requested signal order", () => {
    const { context, gains, filters, node } = fakeContext();
    const destination = node("destination");
    const rack = createEffectRack(context, destination);
    rack.add("d1", effectById("delay"), effectParamDefaults("delay", "d1"));
    rack.add("f1", effectById("filter"), effectParamDefaults("filter", "f1"));

    rack.reorder(["f1", "d1"]);

    const filter = required(filters, 0);
    expect([...asFakeNode(rack.input).connections]).toEqual([filter]);
    expect([...filter.connections]).toEqual([required(gains, 1)]);
    expect([...required(gains, 5).connections]).toEqual([destination]);
  });

  it("removes an effect from a rack that is holding another one bypassed", () => {
    const { context, gains, delays, filters, node } = fakeContext();
    const destination = node("destination");
    const rack = createEffectRack(context, destination);
    rack.add("d1", effectById("delay"), effectParamDefaults("delay", "d1"));
    rack.add("f1", effectById("filter"), effectParamDefaults("filter", "f1"));
    rack.setBypass("f1", true);

    rack.remove("d1");

    // Nothing is left in the path, but the bypassed filter is still built and still bound.
    expect([...asFakeNode(rack.input).connections]).toEqual([destination]);
    expect([...required(gains, 5).connections]).toEqual([]);
    rack.setParam("f1", "filter.cutoff", 400, 1);
    expect(required(filters, 0).frequency.ramps).toEqual([[400, 1 + PARAM_RAMP_SECS]]);
    expect(required(delays, 0).delayTime.ramps).toEqual([]);

    rack.setBypass("f1", false);
    expect([...asFakeNode(rack.input).connections]).toEqual([required(filters, 0)]);
    expect([...required(filters, 0).connections]).toEqual([destination]);
  });

  it("reorders a rack around an effect that is bypassed", () => {
    const { context, gains, filters, node } = fakeContext();
    const destination = node("destination");
    const rack = createEffectRack(context, destination);
    rack.add("d1", effectById("delay"), effectParamDefaults("delay", "d1"));
    rack.add("f1", effectById("filter"), effectParamDefaults("filter", "f1"));
    rack.setBypass("d1", true);

    rack.reorder(["f1", "d1"]);

    const filter = required(filters, 0);
    expect([...asFakeNode(rack.input).connections]).toEqual([filter]);
    expect([...filter.connections]).toEqual([destination]);

    // Unbypassing takes the place the reorder gave it, not the one it was added at.
    rack.setBypass("d1", false);
    expect([...asFakeNode(rack.input).connections]).toEqual([filter]);
    expect([...filter.connections]).toEqual([required(gains, 1)]);
    expect([...required(gains, 5).connections]).toEqual([destination]);
  });

  it("refuses to operate on an effect the rack does not hold", () => {
    const { context, node } = fakeContext();
    const rack = createEffectRack(context, node("destination"));
    rack.add("f1", effectById("filter"), effectParamDefaults("filter", "f1"));

    expect(() => {
      rack.setBypass("d1", true);
    }).toThrow(/effect instance is not held: d1/u);
    expect(() => {
      rack.remove("d1");
    }).toThrow(/effect instance is not held: d1/u);
    expect(() => {
      rack.reorder(["f1", "d1"]);
    }).toThrow(/not a permutation/u);
    expect(() => {
      rack.reorder(["f1", "f1"]);
    }).toThrow(/not a permutation/u);
  });
});

// P13's proof: identity is the instance, not the registry entry, so one rack holds two delays
// that route in series and bypass one at a time (0030).
// oxlint-disable-next-line max-lines-per-function
describe("two instances of one effect", () => {
  it("routes them in series and bypasses each independently", () => {
    const { context, gains, delays, node } = fakeContext();
    const destination = node("destination");
    const rack = createEffectRack(context, destination);

    rack.add("first", effectById("delay"), effectParamDefaults("delay", "first"));
    rack.add("second", effectById("delay"), effectParamDefaults("delay", "second"));

    // Two builds, so two delay nodes — the second is not the first found again by effect id.
    expect(delays).toHaveLength(2);
    const firstIn = required(gains, 1);
    const firstOut = required(gains, 5);
    const secondIn = required(gains, 6);
    const secondOut = required(gains, 10);
    expect([...asFakeNode(rack.input).connections]).toEqual([firstIn]);
    expect([...firstOut.connections]).toEqual([secondIn]);
    expect([...secondOut.connections]).toEqual([destination]);

    // Each instance holds its own value: moving one delay's time leaves the other's alone.
    rack.setParam("second", "delay.time", 0.5, 1);
    expect(required(delays, 0).delayTime.ramps).toEqual([]);
    expect(required(delays, 1).delayTime.ramps).toEqual([[0.5, 1 + PARAM_RAMP_SECS]]);

    rack.setBypass("first", true);
    expect([...asFakeNode(rack.input).connections]).toEqual([secondIn]);
    expect([...secondOut.connections]).toEqual([destination]);
    expect([...firstOut.connections]).toEqual([]);

    // The other one is untouched by that: bypass is a fact about an instance, not an effect.
    rack.setBypass("second", true);
    expect([...asFakeNode(rack.input).connections]).toEqual([destination]);
    rack.setBypass("first", false);
    expect([...asFakeNode(rack.input).connections]).toEqual([firstIn]);
    expect([...firstOut.connections]).toEqual([destination]);
  });

  it("removes one and leaves the other holding its own nodes", () => {
    const { context, gains, delays, node } = fakeContext();
    const destination = node("destination");
    const rack = createEffectRack(context, destination);
    rack.add("first", effectById("delay"), effectParamDefaults("delay", "first"));
    rack.add("second", effectById("delay"), effectParamDefaults("delay", "second"));

    rack.remove("first");

    expect([...asFakeNode(rack.input).connections]).toEqual([required(gains, 6)]);
    expect([...required(gains, 10).connections]).toEqual([destination]);
    rack.setParam("second", "delay.time", 0.25, 2);
    expect(required(delays, 1).delayTime.ramps).toEqual([[0.25, 2 + PARAM_RAMP_SECS]]);
    expect(() => {
      rack.setParam("first", "delay.time", 0.25, 2);
    }).toThrow(/effect instance is not held: first/u);
  });
});
