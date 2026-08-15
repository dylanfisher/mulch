import { describe, expect, it } from "vitest";

import { PARAM_DEFAULTS } from "@/audio/params";
import { PARAM_RAMP_SECS } from "@/audio/ramp";
import { createEffectRack } from "./rack";

type FakeParam = {
  value: number;
  ramps: [value: number, when: number][];
};

type FakeNode = {
  name: string;
  connections: Set<FakeNode>;
};

const asFakeNode = (node: AudioNode): FakeNode => {
  // oxlint-disable-next-line no-unsafe-type-assertion -- the context below creates every node
  return node as unknown as FakeNode;
};

function fakeParam(): AudioParam & FakeParam {
  const ramps: FakeParam["ramps"] = [];
  const param = {
    value: 0,
    ramps,
    cancelAndHoldAtTime: () => {},
    linearRampToValueAtTime: (value: number, when: number) => {
      ramps.push([value, when]);
      return param;
    },
  };
  // oxlint-disable-next-line no-unsafe-type-assertion -- only the plugin and ramp surface is faked
  return param as unknown as AudioParam & FakeParam;
}

function fakeContext() {
  const gains: (FakeNode & { gain: AudioParam & FakeParam })[] = [];
  const delays: (FakeNode & { delayTime: AudioParam & FakeParam })[] = [];
  const filters: (FakeNode & { frequency: AudioParam & FakeParam; type: BiquadFilterType })[] = [];

  const node = (name: string): FakeNode & AudioNode => {
    const connections = new Set<FakeNode>();
    const value = {
      name,
      connections,
      connect: (destination: AudioNode) => {
        connections.add(asFakeNode(destination));
        return destination;
      },
      disconnect: () => {
        connections.clear();
      },
    };
    // oxlint-disable-next-line no-unsafe-type-assertion -- only connect/disconnect are exercised
    return value as unknown as FakeNode & AudioNode;
  };

  const context = {
    createGain: () => {
      const gain = Object.assign(node(`gain-${gains.length}`), { gain: fakeParam() });
      gains.push(gain);
      return gain;
    },
    createDelay: () => {
      const delay = Object.assign(node(`delay-${delays.length}`), { delayTime: fakeParam() });
      delays.push(delay);
      return delay;
    },
    createBiquadFilter: () => {
      const type: BiquadFilterType = "lowpass";
      const filter = Object.assign(node(`filter-${filters.length}`), {
        frequency: fakeParam(),
        type,
      });
      filters.push(filter);
      return filter;
    },
  };

  // oxlint-disable-next-line no-unsafe-type-assertion -- the plugins use only the factories above
  return { context: context as unknown as BaseAudioContext, gains, delays, filters, node };
}

function required<T>(values: readonly T[], index: number): T {
  const value = values[index];
  if (value === undefined) throw new Error(`missing fake at index ${index}`);
  return value;
}

describe("effect rack", () => {
  it("connects active effects in insertion order", () => {
    const { context, gains, filters, node } = fakeContext();
    const destination = node("destination");
    const rack = createEffectRack(context, destination);

    rack.add("delay", PARAM_DEFAULTS);
    rack.add("filter", PARAM_DEFAULTS);

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
    rack.add("filter", PARAM_DEFAULTS);

    // The same binding setParam moves — one parameter, one AudioParam, two ways in (0024).
    expect(rack.automationTarget("filter.cutoff")).toBe(required(filters, 0).frequency);
    // A bypassed effect keeps its nodes, so its lane keeps a target to run against.
    rack.setBypass("filter", true);
    expect(rack.automationTarget("filter.cutoff")).toBe(required(filters, 0).frequency);

    rack.remove("filter");
    expect(() => rack.automationTarget("filter.cutoff")).toThrow(/effect is not active/u);
  });

  it("routes parameter changes to an active effect", () => {
    const { context, delays, node } = fakeContext();
    const rack = createEffectRack(context, node("destination"));
    rack.add("delay", PARAM_DEFAULTS);

    rack.setParam("delay.time", 0.75, 3);

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
    rack.add("delay", PARAM_DEFAULTS);
    rack.add("filter", PARAM_DEFAULTS);

    rack.setBypass("delay", true);

    const filter = required(filters, 0);
    expect([...asFakeNode(rack.input).connections]).toEqual([filter]);
    expect([...filter.connections]).toEqual([destination]);

    // The instance is still there, so a knob moved while bypassed is the value it comes back at.
    rack.setParam("delay.time", 0.5, 1);
    expect(required(delays, 0).delayTime.ramps).toEqual([[0.5, 1 + PARAM_RAMP_SECS]]);

    rack.setBypass("delay", false);
    expect([...asFakeNode(rack.input).connections]).toEqual([required(gains, 1)]);
    expect([...required(gains, 5).connections]).toEqual([filter]);
  });

  it("rewires around a removed effect and leaves the rest in order", () => {
    const { context, gains, filters, node } = fakeContext();
    const destination = node("destination");
    const rack = createEffectRack(context, destination);
    rack.add("delay", PARAM_DEFAULTS);
    rack.add("filter", PARAM_DEFAULTS);

    rack.remove("delay");

    const filter = required(filters, 0);
    expect([...asFakeNode(rack.input).connections]).toEqual([filter]);
    expect([...filter.connections]).toEqual([destination]);
    expect([...required(gains, 5).connections]).toEqual([]);
  });

  it("connects a reordered rack in the requested signal order", () => {
    const { context, gains, filters, node } = fakeContext();
    const destination = node("destination");
    const rack = createEffectRack(context, destination);
    rack.add("delay", PARAM_DEFAULTS);
    rack.add("filter", PARAM_DEFAULTS);

    rack.reorder(["filter", "delay"]);

    const filter = required(filters, 0);
    expect([...asFakeNode(rack.input).connections]).toEqual([filter]);
    expect([...filter.connections]).toEqual([required(gains, 1)]);
    expect([...required(gains, 5).connections]).toEqual([destination]);
  });

  it("removes an effect from a rack that is holding another one bypassed", () => {
    const { context, gains, delays, filters, node } = fakeContext();
    const destination = node("destination");
    const rack = createEffectRack(context, destination);
    rack.add("delay", PARAM_DEFAULTS);
    rack.add("filter", PARAM_DEFAULTS);
    rack.setBypass("filter", true);

    rack.remove("delay");

    // Nothing is left in the path, but the bypassed filter is still built and still bound.
    expect([...asFakeNode(rack.input).connections]).toEqual([destination]);
    expect([...required(gains, 5).connections]).toEqual([]);
    rack.setParam("filter.cutoff", 400, 1);
    expect(required(filters, 0).frequency.ramps).toEqual([[400, 1 + PARAM_RAMP_SECS]]);
    expect(required(delays, 0).delayTime.ramps).toEqual([]);

    rack.setBypass("filter", false);
    expect([...asFakeNode(rack.input).connections]).toEqual([required(filters, 0)]);
    expect([...required(filters, 0).connections]).toEqual([destination]);
  });

  it("reorders a rack around an effect that is bypassed", () => {
    const { context, gains, filters, node } = fakeContext();
    const destination = node("destination");
    const rack = createEffectRack(context, destination);
    rack.add("delay", PARAM_DEFAULTS);
    rack.add("filter", PARAM_DEFAULTS);
    rack.setBypass("delay", true);

    rack.reorder(["filter", "delay"]);

    const filter = required(filters, 0);
    expect([...asFakeNode(rack.input).connections]).toEqual([filter]);
    expect([...filter.connections]).toEqual([destination]);

    // Unbypassing takes the place the reorder gave it, not the one it was added at.
    rack.setBypass("delay", false);
    expect([...asFakeNode(rack.input).connections]).toEqual([filter]);
    expect([...filter.connections]).toEqual([required(gains, 1)]);
    expect([...required(gains, 5).connections]).toEqual([destination]);
  });

  it("refuses to operate on an effect the rack does not hold", () => {
    const { context, node } = fakeContext();
    const rack = createEffectRack(context, node("destination"));
    rack.add("filter", PARAM_DEFAULTS);

    expect(() => {
      rack.setBypass("delay", true);
    }).toThrow(/effect is not active: delay/u);
    expect(() => {
      rack.remove("delay");
    }).toThrow(/effect is not active: delay/u);
    expect(() => {
      rack.reorder(["filter", "delay"]);
    }).toThrow(/not a permutation/u);
    expect(() => {
      rack.reorder(["filter", "filter"]);
    }).toThrow(/not a permutation/u);
  });
});
