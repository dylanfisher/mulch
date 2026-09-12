// One case per registry entry, each against the fake context ./rackFake.ts holds: built at the
// values it was handed, wired the way its own graph says, moved through the rack, and disposed.
// Split off ./rack.test.ts, whose rewiring matrix is about the rack rather than about an entry
// (0045).
// oxlint-disable max-lines
import { describe, expect, it } from "vitest";

import { effectParamDefaults } from "@/audio/params";
import { PARAM_RAMP_SECS } from "@/audio/ramp";
import { CRUSH_BITS, SHIFT_PITCH } from "@/audio/worklet";
import { mixGains } from "@/lib/crossfade";
import { impulseResponse } from "@/lib/impulse";
import { compressorEffect } from "./compressor";
import {
  asFakeNode,
  at,
  type FakeNode,
  FAKE_SAMPLE_RATE,
  fakeContext,
  fakeParam,
  type FakeParam,
  required,
} from "./rackFake";
import type { HoldEdge } from "./contract";
import { effectById } from "./registry";
import { createEffectRack } from "./rack";

describe("the delay in the rack", () => {
  it("hands out one AudioParam per parameter, mix included", () => {
    const { context, delays, gains, constants, shapers, node } = fakeContext();
    const rack = createEffectRack(context, node("destination"));
    rack.add("d1", effectById("delay"), {
      "delay.time": 0.4,
      "delay.feedback": 0.6,
      "delay.mix": 0.75,
    });

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
    rack.add("e1", effectById("eq"), {
      "eq.frequency": 2_500,
      "eq.gain": -9,
      "eq.q": 4,
      "eq.shape": 0,
    });

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

// Six parameters and one meter, asserted on one build: splitting them would build the node twice
// and assert half of it each time (0007).
// oxlint-disable-next-line max-lines-per-function
describe("the compressor in the rack", () => {
  it("builds as one native compressor bound to all six of its parameters", () => {
    const { context, compressors, gains, node } = fakeContext();
    const destination = node("destination");
    const rack = createEffectRack(context, destination);
    rack.add("c1", effectById("compressor"), {
      "comp.threshold": -18,
      "comp.ratio": 6,
      "comp.attack": 0.01,
      "comp.release": 0.4,
      "comp.knee": 12,
      "comp.output": 1.5,
    });

    const compressor = required(compressors, 0);
    const makeup = required(gains, 1);
    expect([
      compressor.threshold.value,
      compressor.ratio.value,
      compressor.attack.value,
      compressor.release.value,
      compressor.knee.value,
      makeup.gain.value,
    ]).toEqual([-18, 6, 0.01, 0.4, 12, 1.5]);
    // Makeup is after the compressor, so what the threshold took off is put back downstream.
    expect([...compressor.connections]).toEqual([makeup]);
    expect([...makeup.connections]).toEqual([destination]);
    expect(rack.automationTarget("c1", "comp.threshold")).toBe(compressor.threshold);
    expect(rack.automationTarget("c1", "comp.output")).toBe(makeup.gain);
    // And exactly those the declarations opted into: the three that take no lane refuse a target
    // rather than handing out a live AudioParam nothing may schedule onto (0024).
    for (const param of ["comp.attack", "comp.release", "comp.knee"] as const) {
      expect(() => rack.automationTarget("c1", param)).toThrow(/no automation target/u);
    }
    rack.setParam("c1", "comp.knee", 3, 2);
    expect(compressor.knee.ramps).toEqual([[3, 2 + PARAM_RAMP_SECS]]);
  });

  it("reads its gain reduction as a meter and declares no parameter for it", () => {
    const { context, compressors } = fakeContext();
    const instance = compressorEffect.build(context, {
      "comp.threshold": -24,
      "comp.ratio": 4,
      "comp.attack": 0.003,
      "comp.release": 0.25,
      "comp.knee": 30,
      "comp.output": 1,
    });

    // The reading is the node's own, taken when it is asked for: it moves under the meter, and
    // no parameter, default or stored value carries it (P60).
    expect(instance.meter?.()).toBe(-6);
    required(compressors, 0).reduction = -11.5;
    expect(instance.meter?.()).toBe(-11.5);
    expect(compressorEffect.params.map(({ id }) => id)).not.toContain("comp.reduction");
    expect(Object.keys(effectParamDefaults("compressor", "c1"))).toHaveLength(
      compressorEffect.params.length,
    );
  });

  // P105: the reading has to reach the picture, and the way it does is the rack's own per-frame
  // read — one map, refilled in place beside the deck's lanes, keyed by instance id (0128 amended).
  it("reports that reading through the rack, per instance, into a map it refills", () => {
    const { context, compressors, node } = fakeContext();
    const rack = createEffectRack(context, node("destination"));
    rack.add("c1", effectById("compressor"), effectParamDefaults("compressor", "c1"));
    rack.add("c2", effectById("compressor"), effectParamDefaults("compressor", "c2"));
    // An entry that meters nothing is absent rather than zero: nothing is reading it, which is
    // not the same fact as a reading of nothing.
    rack.add("d1", effectById("delay"), effectParamDefaults("delay", "d1"));
    const meters = new Map<string, number>();
    required(compressors, 1).reduction = -18;
    rack.meters(meters);
    expect([...meters.keys()]).toEqual(["c1", "c2"]);
    expect(meters.get("c1")).toBe(-6);
    expect(meters.get("c2")).toBe(-18);
    // A bypassed instance is unwired, so its node is not processed and its reading is the last
    // one it took. It leaves the map while the switch is off — a frozen number is not what "how
    // hard it is working right now" means — and comes back live when the switch does (0139).
    rack.setBypass("c2", true);
    rack.meters(meters);
    expect([...meters.keys()]).toEqual(["c1"]);
    rack.setBypass("c2", false);
    rack.meters(meters);
    expect(meters.get("c2")).toBe(-18);
    // Refilled, never cleared — and an instance that leaves takes its key with it on the one
    // frame it departed on, the way a departed lane does (0070).
    required(compressors, 1).reduction = -2;
    rack.remove("c1");
    rack.meters(meters);
    expect([...meters.keys()]).toEqual(["c2"]);
    expect(meters.get("c2")).toBe(-2);
  });
});

// The rebuild cadence is the whole of what these cases are about, and each one is the same rack
// built the same way: splitting them would separate the cadence from the graph it is a fact about.
// oxlint-disable-next-line max-lines-per-function
describe("the reverb in the rack", () => {
  it("convolves the impulse its own parameters generate, unnormalized by the node", () => {
    const { context, convolvers, buffers, node } = fakeContext();
    const rack = createEffectRack(context, node("destination"));
    rack.add("r1", effectById("reverb"), {
      "reverb.decay": 0.5,
      "reverb.tone": 4_000,
      "reverb.predelay": 0.03,
      "reverb.wet": 0.4,
    });

    const convolver = required(convolvers, 0);
    expect(convolver.normalize).toBe(false);
    expect(buffers).toHaveLength(1);
    expect(convolver.buffer).toBe(required(buffers, 0));
    // The samples are the pure function's, at the context's own rate — no second generator.
    const expected = impulseResponse({
      decaySecs: 0.5,
      toneHz: 4_000,
      sampleRate: FAKE_SAMPLE_RATE,
    });
    for (const [channel, samples] of expected.entries()) {
      expect([...required(buffers, 0).channels[channel]!]).toEqual([...samples]);
    }
  });

  it("rebuilds the impulse when its parameters change, and only then", () => {
    const { context, buffers, delays, constants, node } = fakeContext();
    const rack = createEffectRack(context, node("destination"));
    rack.add("r1", effectById("reverb"), {
      "reverb.decay": 0.5,
      "reverb.tone": 4_000,
      "reverb.predelay": 0.03,
      "reverb.wet": 0.4,
    });
    expect(buffers).toHaveLength(1);

    // The knobs that are AudioParams never touch the buffer: they are ramps, per event, and a
    // response regenerated on each of them is the defect this asserts against (0087).
    rack.setParam("r1", "reverb.predelay", 0.1, 1);
    rack.setParam("r1", "reverb.wet", 0.8, 1);
    expect(required(delays, 0).delayTime.ramps).toEqual([[0.1, 1 + PARAM_RAMP_SECS]]);
    expect(required(constants, 0).offset.ramps).toEqual([[0.8, 1 + PARAM_RAMP_SECS]]);
    expect(buffers).toHaveLength(1);

    // The first move of a drag is heard where it is made: nothing before it was about this pair,
    // so it is not a continuation of anything and it is built (0090).
    rack.setParam("r1", "reverb.decay", 0.6, 2);
    expect(buffers).toHaveLength(2);

    // Every move after it is the same hand on the same knob, and the convolver keeps the response
    // it has rather than being handed a new buffer sixty times a second (P63).
    rack.setParam("r1", "reverb.decay", 0.8, 2);
    rack.setParam("r1", "reverb.decay", 1.5, 2);
    rack.setParam("r1", "reverb.decay", 1, 2);
    expect(buffers).toHaveLength(2);

    // The hand lets go: one rebuild, at the value the run ended on — a second's decay is a second
    // of samples, and the case above pins the samples themselves.
    rack.endGesture();
    expect(buffers).toHaveLength(3);
    expect(required(buffers, 2).channels[0]).toHaveLength(FAKE_SAMPLE_RATE);

    // A run that ends where it was already built is not a change, and neither is a gesture that
    // ended holding nothing: the grid is what makes a drag affordable at all (0087).
    rack.setParam("r1", "reverb.decay", 1.02, 3);
    rack.setParam("r1", "reverb.decay", 1.01, 3);
    rack.endGesture();
    rack.endGesture();
    expect(buffers).toHaveLength(3);

    // A move that continues nothing is applied where it arrives, whoever sent it: a restoration,
    // a clip or the wire never leaves a value sitting in a plugin waiting for a hand (0090).
    rack.setParam("r1", "reverb.tone", 900, 4);
    expect(buffers).toHaveLength(4);
  });

  it("hands out a lane's target for its two AudioParams and refuses one for the other two", () => {
    const { context, delays, constants, node } = fakeContext();
    const rack = createEffectRack(context, node("destination"));
    rack.add("r1", effectById("reverb"), effectParamDefaults("reverb", "r1"));

    expect(rack.automationTarget("r1", "reverb.predelay")).toBe(required(delays, 0).delayTime);
    expect(rack.automationTarget("r1", "reverb.wet")).toBe(required(constants, 0).offset);
    expect(() => rack.automationTarget("r1", "reverb.decay")).toThrow(/no automation target/u);
    expect(() => rack.automationTarget("r1", "reverb.tone")).toThrow(/no automation target/u);
  });
});

/**
 * The one entry in this file whose graph is a processor rather than native nodes. A worklet node is
 * constructed off a *global* rather than off the context (../effects/crush.ts), so the fake is
 * installed here rather than added to `fakeContext` above — and it is a fake of the seam and not of
 * the arithmetic, which ../worklets/crush.test.ts drives against the real file.
 */
type FakeWorkletNode = FakeNode & {
  processor: string;
  /** The AudioParams the plugin asked for by name, in the order it asked. */
  param(id: string): AudioParam & FakeParam;
  /** How many times the main thread told the processor to end itself (0086). */
  stops: number;
};

function fakeWorklets() {
  const built: FakeWorkletNode[] = [];
  class Fake {
    processor: string;
    connections = new Set<FakeNode>();
    stops = 0;
    params = new Map<string, AudioParam & FakeParam>();
    port = {
      postMessage: (message: { t?: string }) => {
        if (message.t === "stop") this.stops++;
      },
    };
    // A real node answers undefined for a name the processor never declared, which is what
    // `workletParam` throws on; this one answers for whatever the plugin asks, because what a
    // processor declares is pinned against the declaration in that processor's own test.
    parameters = {
      get: (id: string): AudioParam & FakeParam => {
        const held = this.params.get(id) ?? fakeParam();
        this.params.set(id, held);
        return held;
      },
    };
    constructor(_ctx: BaseAudioContext, processor: string) {
      this.processor = processor;
      // oxlint-disable-next-line no-unsafe-type-assertion -- only the surface below is exercised
      built.push(this as unknown as FakeWorkletNode);
    }
    param(id: string): AudioParam & FakeParam {
      return this.parameters.get(id);
    }
    connect(destination: AudioNode): AudioNode {
      this.connections.add(asFakeNode(destination));
      return destination;
    }
    disconnect(): void {
      this.connections.clear();
    }
  }
  Object.assign(globalThis, { AudioWorkletNode: Fake });
  return built;
}

describe("the crush in the rack", () => {
  it("builds as one processor bound to all three of its parameters, and ends it when it goes", () => {
    const worklets = fakeWorklets();
    const { context, node } = fakeContext();
    const destination = node("destination");
    const rack = createEffectRack(context, destination);

    rack.add("c1", effectById("crush"), {
      "crush.bits": 4,
      "crush.rate": 1_200,
      "crush.mix": 0.8,
    });

    // Built: one node, named the way the main thread spells the processor, holding every declared
    // value on an AudioParam of its own.
    const stage = required(worklets, 0);
    expect(worklets).toHaveLength(1);
    expect(stage.processor).toBe(CRUSH_BITS);
    expect([
      stage.param("crush.bits").value,
      stage.param("crush.rate").value,
      stage.param("crush.mix").value,
    ]).toEqual([4, 1_200, 0.8]);

    // Heard: one node is the whole graph, so the rack wires the chain through that same node.
    expect([...asFakeNode(rack.input).connections]).toEqual([stage]);
    expect([...stage.connections]).toEqual([destination]);

    // Moved: a knob and a lane are two ways into one AudioParam (0024).
    rack.setParam("c1", "crush.rate", 900, 3);
    expect(stage.param("crush.rate").ramps).toEqual([[900, 3 + PARAM_RAMP_SECS]]);
    expect(rack.automationTarget("c1", "crush.mix")).toBe(stage.param("crush.mix"));

    // Disposed: `disconnect` alone would leave an active source on the context's pull list, and an
    // offline context is never closed (0086).
    rack.remove("c1");
    expect(stage.stops).toBe(1);
    expect([...stage.connections]).toEqual([]);
    expect([...asFakeNode(rack.input).connections]).toEqual([destination]);
  });
});

// Two cases against one graph: the modulation path and the crossfade the entry shares with the
// delay. Over the cap by the second of them, which is here rather than beside the delay's because
// what it asserts is that *this* entry wired it (0007).
// oxlint-disable-next-line max-lines-per-function
describe("the sway in the rack", () => {
  it("carries an oscillator into a delay's own time, and ends it when it goes", () => {
    const { context, delays, gains, constants, oscillators, node } = fakeContext();
    const destination = node("destination");
    const rack = createEffectRack(context, destination);

    rack.add("s1", effectById("sway"), {
      "sway.rate": 2,
      "sway.depth": 0.5,
      "sway.feedback": 0.4,
      "sway.mix": 0.75,
    });

    // Built: the rack's gain is first, then the entry's — input, dry, feedback, wet, output, and
    // the two the wander passes through.
    const delay = required(delays, 0);
    const wander = required(oscillators, 0);
    const constant = required(constants, 0);
    const [feedback, depth, span] = [required(gains, 3), required(gains, 6), required(gains, 7)];
    const built = [wander.frequency.value, depth.gain.value, feedback.gain.value];
    expect([...built, constant.offset.value]).toEqual([2, 0.5, 0.4, 0.75]);
    // Started after the values it was built with, or it runs a block at 440Hz.
    expect([wander.started, wander.type]).toEqual([true, "sine"]);

    // Heard: the wander reaches the delay's own time through the depth and the span, and sums onto
    // the resting time rather than replacing it. The span is exactly that resting time, so a depth
    // of all of it reaches a delay of nothing and never a negative one — and the node holds both
    // together, so no part of the swing is clamped away.
    expect([...wander.connections]).toEqual([depth]);
    expect([...depth.connections]).toEqual([span]);
    expect([...span.connections]).toEqual([delay.delayTime]);
    expect(span.gain.value).toBe(delay.delayTime.value);
    expect(delay.maxDelayTime).toBe(delay.delayTime.value + span.gain.value);
    // And the delay reads itself, which turns a wandering copy into a comb with teeth.
    expect([...delay.connections]).toEqual([required(gains, 4), feedback]);
    expect([...feedback.connections]).toEqual([delay]);
    // Moved: a knob and a lane are two ways into one AudioParam (0024).
    rack.setParam("s1", "sway.rate", 5, 3);
    expect(wander.frequency.ramps).toEqual([[5, 3 + PARAM_RAMP_SECS]]);
    expect(rack.automationTarget("s1", "sway.depth")).toBe(depth.gain);
    expect(rack.automationTarget("s1", "sway.feedback")).toBe(feedback.gain);
    expect(rack.automationTarget("s1", "sway.mix")).toBe(constant.offset);

    // Disposed: the oscillator ends, or it stays on the context's pull list (0086).
    rack.remove("s1");
    expect(wander.stopped).toBe(true);
    expect([...wander.connections]).toEqual([]);
    expect([...asFakeNode(rack.input).connections]).toEqual([destination]);
  });

  it("crossfades against a dry path, off one started source", () => {
    const { context, gains, constants, delays, shapers, node } = fakeContext();
    const rack = createEffectRack(context, node("destination"));
    rack.add("s1", effectById("sway"), effectParamDefaults("sway", "s1"));

    // The crossfade is the delay's own and the case above pins its curves; what is asserted here
    // is that this entry wired it. Without the start the shapers read an unstarted source, and
    // both gains are modulation and nothing else, so the graph is whatever that leaves them
    // holding (0049).
    const [input, dry, wet, output] = [
      required(gains, 1),
      required(gains, 2),
      required(gains, 4),
      required(gains, 5),
    ];
    expect(required(constants, 0).started).toBe(true);
    expect([dry.gain.value, wet.gain.value]).toEqual([0, 0]);
    expect([...input.connections]).toEqual([dry, required(delays, 0)]);
    expect([[...dry.connections], [...wet.connections]]).toEqual([[output], [output]]);
    expect([...required(shapers, 0).connections]).toEqual([dry.gain]);
    expect([...required(shapers, 1).connections]).toEqual([wet.gain]);
  });
});

describe("the shift in the rack", () => {
  it("builds as one processor bound to all four of its parameters, and ends it when it goes", () => {
    const worklets = fakeWorklets();
    const { context, node } = fakeContext();
    const destination = node("destination");
    const rack = createEffectRack(context, destination);

    rack.add("p1", effectById("shift"), {
      "shift.interval": -5,
      "shift.detune": 30,
      "shift.window": 0.04,
      "shift.mix": 0.9,
    });

    // Built: one node, named the way the main thread spells the processor, holding every declared
    // value on an AudioParam of its own — the detune among them, which is the one parameter this
    // entry keeps out of the picture and still binds like any other (0122).
    const stage = required(worklets, 0);
    expect(worklets).toHaveLength(1);
    expect(stage.processor).toBe(SHIFT_PITCH);
    expect([
      stage.param("shift.interval").value,
      stage.param("shift.detune").value,
      stage.param("shift.window").value,
      stage.param("shift.mix").value,
    ]).toEqual([-5, 30, 0.04, 0.9]);

    // Heard: one node is the whole graph, so the rack wires the chain through that same node.
    expect([...asFakeNode(rack.input).connections]).toEqual([stage]);
    expect([...stage.connections]).toEqual([destination]);

    // Moved: a knob and a lane are two ways into one AudioParam (0024).
    rack.setParam("p1", "shift.interval", 7, 3);
    expect(stage.param("shift.interval").ramps).toEqual([[7, 3 + PARAM_RAMP_SECS]]);
    expect(rack.automationTarget("p1", "shift.mix")).toBe(stage.param("shift.mix"));

    // Disposed: `disconnect` alone would leave an active source on the context's pull list, and an
    // offline context is never closed (0086).
    rack.remove("p1");
    expect(stage.stops).toBe(1);
    expect([...stage.connections]).toEqual([]);
    expect([...asFakeNode(rack.input).connections]).toEqual([destination]);
  });
});

// The one entry that asks the transport for something rather than only processing what reaches
// it: built transparent, its knobs on parked constants, its asks gathered by the rack while it
// runs and not while it is bypassed (0371).
describe("the lull in the rack", () => {
  it("passes the audio through one gain, and asks the rack's transport for rests", () => {
    const { context, gains, constants, node } = fakeContext();
    const destination = node("destination");
    const rack = createEffectRack(context, destination);
    rack.add("l1", effectById("lull"), {
      ...effectParamDefaults("lull", "l1"),
      "lull.chance": 1,
      "lull.least": 1,
      "lull.most": 1,
      "lull.gapLeast": 2,
      "lull.gapMost": 2,
    });

    // Built: the audio passes through one gain at one; every knob is a parked constant source,
    // started, so the declaration road stays the ordinary one (0049).
    const through = required(gains, 1);
    expect(constants).toHaveLength(8);
    for (const constant of constants) expect(constant.started).toBe(true);
    expect([...asFakeNode(rack.input).connections]).toEqual([through]);
    expect([...through.connections]).toEqual([destination]);

    // Asked: at every chance and fixed lengths, a hold two seconds in and a release a second
    // after it, then the next pair — gathered up to the horizon and no further.
    expect(rack.holding()).toBe(true);
    expect(rack.pumping()).toBe(true);
    const asks: HoldEdge[] = [];
    expect(rack.holds(4, asks)).toBe(2);
    expect(asks[0]).toEqual({ t: "hold", at: 2 });
    expect(asks[1]).toEqual({ t: "release", at: 3, jump: 0 });
    expect(rack.holds(4, asks)).toBe(0);
    expect(rack.holds(5.5, asks)).toBe(1);
    expect(asks[0]).toEqual({ t: "hold", at: 5 });

    // Moved: a knob is the ordinary road onto its constant (0049), and the chance is read off the
    // knob at the next roll — nought here, so the next gap ends in another gap.
    rack.setParam("l1", "lull.chance", 0, 3);
    expect(required(constants, 1).offset.ramps).toEqual([[0, 3 + PARAM_RAMP_SECS]]);
    // The rest already standing still owes its release; after it, no roll hits.
    expect(rack.holds(60, asks)).toBe(1);
    expect(asks[0]?.t).toBe("release");
    expect(rack.holds(60, asks)).toBe(0);
    rack.setParam("l1", "lull.chance", 1, 3);

    // Bypassed: the switch means not running, so nothing is asked and nothing is holding. And
    // switched back on, the gap counts again from the clock as it stands, not from the birth.
    rack.setBypass("l1", true);
    expect(rack.holding()).toBe(false);
    expect(rack.holds(60, asks)).toBe(0);
    Object.assign(context, { currentTime: 10 });
    rack.setBypass("l1", false);
    expect(rack.holding()).toBe(true);
    expect(rack.holds(13, asks)).toBe(2);
    expect(asks[0]).toEqual({ t: "hold", at: 12 });
    expect(asks[1]).toEqual({ t: "release", at: 13, jump: 0 });

    // Redrawn by a knob that rebuilds — which the rack answers for — the run asks first for
    // everything it laid to be dropped, then lays again from now.
    expect(rack.setParam("l1", "lull.gapLeast", 1, 10)).toBe(true);
    expect(rack.setParam("l1", "lull.gapMost", 1, 10)).toBe(true);
    expect(rack.holds(12, asks)).toBe(3);
    expect(asks[0]).toEqual({ t: "clear" });
    expect(asks[1]).toEqual({ t: "hold", at: 11 });
    expect(asks[2]).toEqual({ t: "release", at: 12, jump: 0 });

    // Disposed: the gain leaves the graph and the chain closes over it.
    rack.remove("l1");
    expect([...through.connections]).toEqual([]);
    expect([...asFakeNode(rack.input).connections]).toEqual([destination]);
  });
});
