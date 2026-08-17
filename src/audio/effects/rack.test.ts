// The rewiring matrix is one flat list of cases against one fake context; splitting the file
// would separate a case from the fake it is asserted on (0007).
// oxlint-disable max-lines
import { describe, expect, it } from "vitest";

import { effectParamDefaults } from "@/audio/params";
import { PARAM_RAMP_SECS } from "@/audio/ramp";
import { mixGains } from "@/lib/crossfade";
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

/** Every AudioParam the two biquad plugins bind, on one fake node. */
type FakeBiquad = FakeNode & {
  frequency: AudioParam & FakeParam;
  gain: AudioParam & FakeParam;
  Q: AudioParam & FakeParam;
  type: BiquadFilterType;
};

// One fake context, over the cap by the two nodes the delay's mix derives from: splitting it
// would separate a factory from the list it pushes to (0007).
// oxlint-disable-next-line max-lines-per-function
function fakeContext() {
  const gains: (FakeNode & { gain: AudioParam & FakeParam })[] = [];
  const delays: (FakeNode & { delayTime: AudioParam & FakeParam })[] = [];
  const filters: FakeBiquad[] = [];
  const constants: (FakeNode & { offset: AudioParam & FakeParam; started: boolean })[] = [];
  const shapers: (FakeNode & { curve: Float32Array | null })[] = [];

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
    // The delay's mix is one AudioParam both of its crossfade gains derive from, so the fake
    // carries the DC source and the two shapers that derivation is made of (0049).
    createConstantSource: () => {
      const constant = Object.assign(node(`constant-${constants.length}`), {
        offset: fakeParam(),
        started: false,
        start: () => {
          constant.started = true;
        },
        stop: () => {},
      });
      constants.push(constant);
      return constant;
    },
    createWaveShaper: () => {
      const curve: Float32Array | null = null;
      const shaper = Object.assign(node(`shaper-${shapers.length}`), { curve });
      shapers.push(shaper);
      return shaper;
    },
    createBiquadFilter: () => {
      const type: BiquadFilterType = "lowpass";
      const filter = Object.assign(node(`filter-${filters.length}`), {
        frequency: fakeParam(),
        gain: fakeParam(),
        Q: fakeParam(),
        type,
      });
      filters.push(filter);
      return filter;
    },
  };

  return {
    // oxlint-disable-next-line no-unsafe-type-assertion -- the plugins use only the factories above
    context: context as unknown as BaseAudioContext,
    gains,
    delays,
    filters,
    constants,
    shapers,
    node,
  };
}

/** One shaping curve read at a mix value — the WaveShaper's own [-1, 1] domain, indexed. */
function at(curve: Float32Array | null, mix: number): number {
  if (curve === null) throw new Error("shaper has no curve");
  const sample = curve[Math.round(((mix + 1) / 2) * (curve.length - 1))];
  if (sample === undefined) throw new Error("curve is shorter than its own length");
  return sample;
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

    rack.add("d1", "delay", effectParamDefaults("delay"));
    rack.add("f1", "filter", effectParamDefaults("filter"));

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
    rack.add("f1", "filter", effectParamDefaults("filter"));

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
    rack.add("d1", "delay", effectParamDefaults("delay"));

    rack.setParam("d1", "delay.time", 0.75, 3);

    expect(required(delays, 0).delayTime.ramps).toEqual([[0.75, 3 + PARAM_RAMP_SECS]]);
  });
});

describe("the delay in the rack", () => {
  it("hands out one AudioParam per parameter, mix included", () => {
    const { context, delays, gains, constants, shapers, node } = fakeContext();
    const rack = createEffectRack(context, node("destination"));
    rack.add("d1", "delay", { "delay.time": 0.4, "delay.feedback": 0.6, "delay.mix": 0.75 });

    const delay = required(delays, 0);
    const constant = required(constants, 0);
    expect([delay.delayTime.value, constant.offset.value]).toEqual([0.4, 0.75]);
    expect(constant.started).toBe(true);
    // Both crossfade gains are modulation and nothing else, so their intrinsic value is 0 rather
    // than the 1 a gain node is built at — dry is gain 2 and wet gain 4 of the delay's six (0049).
    expect([required(gains, 2).gain.value, required(gains, 4).gain.value]).toEqual([0, 0]);
    const [dryShape, wetShape] = [required(shapers, 0), required(shapers, 1)];
    expect([...constant.connections]).toEqual([dryShape, wetShape]);
    // Which shaper drives which gain, because nothing downstream can tell: a render with the two
    // swapped is a delay whose mix knob runs backwards, and it differs from a cleared one either
    // way. The law's own properties are delay.test.ts's; what is asserted here is that these
    // curves are that law rather than another equal-power one.
    expect([...dryShape.connections]).toEqual([required(gains, 2).gain]);
    expect([...wetShape.connections]).toEqual([required(gains, 4).gain]);
    for (const mix of [0, 0.25, 0.5, 0.75, 1]) {
      expect(at(dryShape.curve, mix)).toBeCloseTo(mixGains(mix).dry);
      expect(at(wetShape.curve, mix)).toBeCloseTo(mixGains(mix).wet);
    }

    // The one AudioParam a mix lane is scheduled onto is the one setParam moves.
    expect(rack.automationTarget("d1", "delay.time")).toBe(delay.delayTime);
    expect(rack.automationTarget("d1", "delay.feedback")).toBe(required(gains, 3).gain);
    expect(rack.automationTarget("d1", "delay.mix")).toBe(constant.offset);
    rack.setParam("d1", "delay.mix", 0.1, 3);
    expect(constant.offset.ramps).toEqual([[0.1, 3 + PARAM_RAMP_SECS]]);
  });
});

describe("the parametric EQ in the rack", () => {
  it("builds as one native peaking biquad bound to all three of its parameters", () => {
    const { context, filters, node } = fakeContext();
    const rack = createEffectRack(context, node("destination"));
    rack.add("e1", "eq", { "eq.frequency": 2_500, "eq.gain": -9, "eq.q": 4 });

    const eq = required(filters, 0);
    expect(eq.type).toBe("peaking");
    expect([eq.frequency.value, eq.gain.value, eq.Q.value]).toEqual([2_500, -9, 4]);
    // Frequency and gain opted into automation independently, and each hands out its own bound
    // AudioParam — the same one setParam moves.
    expect(rack.automationTarget("e1", "eq.frequency")).toBe(eq.frequency);
    expect(rack.automationTarget("e1", "eq.gain")).toBe(eq.gain);
    rack.setParam("e1", "eq.q", 12, 3);
    expect(eq.Q.ramps).toEqual([[12, 3 + PARAM_RAMP_SECS]]);
  });
});

// The rewiring matrix of 0023, asserted on the edges the fake context records.
// oxlint-disable-next-line max-lines-per-function
describe("effect rack performance operations", () => {
  it("routes around a bypassed effect while keeping its instance parameterised", () => {
    const { context, gains, delays, filters, node } = fakeContext();
    const destination = node("destination");
    const rack = createEffectRack(context, destination);
    rack.add("d1", "delay", effectParamDefaults("delay"));
    rack.add("f1", "filter", effectParamDefaults("filter"));

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
    rack.add("d1", "delay", effectParamDefaults("delay"));
    rack.add("f1", "filter", effectParamDefaults("filter"));

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
    rack.add("d1", "delay", effectParamDefaults("delay"));
    rack.add("f1", "filter", effectParamDefaults("filter"));

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
    rack.add("d1", "delay", effectParamDefaults("delay"));
    rack.add("f1", "filter", effectParamDefaults("filter"));
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
    rack.add("d1", "delay", effectParamDefaults("delay"));
    rack.add("f1", "filter", effectParamDefaults("filter"));
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
    rack.add("f1", "filter", effectParamDefaults("filter"));

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

    rack.add("first", "delay", effectParamDefaults("delay"));
    rack.add("second", "delay", effectParamDefaults("delay"));

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
    rack.add("first", "delay", effectParamDefaults("delay"));
    rack.add("second", "delay", effectParamDefaults("delay"));

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
