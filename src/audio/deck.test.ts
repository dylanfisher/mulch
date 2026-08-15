/**
 * @role The transport's own contract: arming automation lanes against the passes it plays, and
 *   the rate arithmetic a speed or pitch change re-anchors those passes with.
 */
// Two describes over one fake graph — the graph is the shared fixture, and splitting them would
// mean two copies of it. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { describe, expect, it } from "vitest";

import {
  CENTS_PER_SEMITONE,
  cycleTimeAt,
  cyclesAt,
  playheadAt,
  type PlayPlan,
} from "@/lib/timeline";
import { createDeckVoice } from "./deck";
import { PARAM_RAMP_SECS } from "./ramp";
import { AUTOMATION_HORIZON_SECS, LOOKAHEAD_SECS, RENDER_QUANTUM } from "./transport";

type Call = [method: string, ...args: number[]];

/** Only what the chain schedules through — the point is the call schedule, not a graph. */
function fakeParam(calls: Call[]): AudioParam {
  const param = {
    value: 0,
    cancelScheduledValues: (when: number) => calls.push(["cancelScheduledValues", when]),
    cancelAndHoldAtTime: (when: number) => calls.push(["cancelAndHoldAtTime", when]),
    setValueAtTime: (value: number, when: number) => calls.push(["setValueAtTime", value, when]),
    linearRampToValueAtTime: (value: number, when: number) =>
      calls.push(["linearRampToValueAtTime", value, when]),
  };
  // oxlint-disable-next-line no-unsafe-type-assertion -- only the scheduling surface is faked
  return param as unknown as AudioParam;
}

const fakeNode = () => ({
  connect: (destination: unknown) => destination,
  disconnect: () => {},
});

/** A destination for the chain's output; nothing is ever read back off it. */
// oxlint-disable-next-line no-unsafe-type-assertion -- only ever connected to
const destination = (): AudioNode => fakeNode() as unknown as AudioNode;

/** A context with only what buildDeckChain and the transport ask of one. */
// One fake graph: every factory the chain reaches for is part of the same object. See 0007.
// oxlint-disable-next-line max-lines-per-function
function fakeContext() {
  /** The deck fader is the first gain the chain builds, and where the gain lane lands. */
  const gainCalls: Call[] = [];
  let gains = 0;
  /** Every buffer source the transport built, newest last — where speed and pitch land (0031). */
  const sources: { playbackRate: AudioParam; detune: AudioParam; started: number[] }[] = [];

  const context = {
    currentTime: 0,
    sampleRate: 48_000,
    createGain: () =>
      Object.assign(fakeNode(), { gain: fakeParam(gains++ === 0 ? gainCalls : []) }),
    createStereoPanner: () => Object.assign(fakeNode(), { pan: fakeParam([]) }),
    createAnalyser: () =>
      Object.assign(fakeNode(), { fftSize: 0, getFloatTimeDomainData: () => {} }),
    createBufferSource: () => {
      const started: number[] = [];
      const node = Object.assign(fakeNode(), {
        buffer: null,
        loop: false,
        loopStart: 0,
        loopEnd: 0,
        playbackRate: fakeParam([]),
        detune: fakeParam([]),
        addEventListener: () => {},
        start: (when: number) => started.push(when),
        stop: () => {},
      });
      sources.push({ playbackRate: node.playbackRate, detune: node.detune, started });
      return node;
    },
  };

  /** The clock, writable: `BaseAudioContext.currentTime` is read-only, and a test moves time. */
  const now = (at: number): void => {
    context.currentTime = at;
  };
  // oxlint-disable-next-line no-unsafe-type-assertion -- the chain uses only the factories above
  return { context: context as unknown as BaseAudioContext, gainCalls, now, sources };
}

/** One deck voice on a fake graph, plus the port the worklet would report over. */
function deck() {
  const { context, gainCalls, now, sources } = fakeContext();
  let listener: ((event: MessageEvent<unknown>) => void) | null = null;
  /** Every plan the transport posted, in order — `null` for a stop (src/audio/deck.ts). */
  const plans: unknown[] = [];
  const reporter = {
    port: {
      addEventListener: (_type: string, next: (event: MessageEvent<unknown>) => void) => {
        listener = next;
      },
      removeEventListener: () => {},
      start: () => {},
      postMessage: (message: unknown) => plans.push(message),
      close: () => {},
    },
    disconnect: () => {},
  };
  const report = (message: unknown): void => {
    // oxlint-disable-next-line no-unsafe-type-assertion -- the handler reads only `data`
    listener?.({ data: message } as MessageEvent<unknown>);
  };
  const voice = createDeckVoice(
    context,
    destination(),
    // oxlint-disable-next-line no-unsafe-type-assertion -- only the port and disconnect are used
    reporter as unknown as AudioWorkletNode,
    { started: () => {}, looped: () => {}, stopped: () => {}, xrun: () => {} },
  );
  // oxlint-disable-next-line no-unsafe-type-assertion -- the fake never reads a buffer's samples
  voice.load({ duration: 4 } as AudioBuffer);
  return { gainCalls, now, voice, report, plans, sources };
}

/** The pass origins a schedule was laid against: one cancel-and-replace per armed pass. */
const passOrigins = (calls: readonly Call[]): number[] =>
  calls.filter(([method]) => method === "cancelScheduledValues").map(([, when]) => when ?? 0);

/** How many passes of `period` fit in the horizon, counting the one the play itself starts. */
const armedPasses = (period: number): number => Math.floor(AUTOMATION_HORIZON_SECS / period) + 1;

// The transport's whole automation contract: nothing while stopped, one copy of the gesture per
// pass while playing, and back to the manual value when it ends (0028).
// oxlint-disable-next-line max-lines-per-function
describe("deck automation", () => {
  const lane = [
    { at: 0, value: 0.25 },
    { at: 0.5, value: 1.25 },
  ];

  it("schedules a lane recorded while stopped on the next play", () => {
    const { gainCalls, now, voice } = deck();
    now(3);

    voice.setAutomation(null, "deck.gain", lane, 1);
    // A stopped deck has no pass to play the gesture against, so nothing is scheduled — the old
    // behaviour scheduled it at `currentTime`, which is the past by the time play arrives (0028).
    expect(gainCalls).toEqual([]);

    voice.play();
    const origin = 3 + LOOKAHEAD_SECS;
    expect(gainCalls).toEqual([
      ["cancelScheduledValues", origin],
      ["setValueAtTime", 0.25, origin],
      ["linearRampToValueAtTime", 1.25, origin + 0.5],
    ]);
  });

  it("replays the lane from its own zero on every pass it schedules ahead", () => {
    const { gainCalls, voice } = deck();
    voice.setLoop(0, 2);
    voice.setAutomation(null, "deck.gain", lane, 1);
    voice.play();

    const origin = LOOKAHEAD_SECS;
    expect(passOrigins(gainCalls)).toHaveLength(armedPasses(2));
    expect(passOrigins(gainCalls).slice(0, 3)).toEqual([origin, origin + 2, origin + 4]);
    // The second pass is the identical gesture one period later, not a continuation of the first.
    expect(gainCalls.slice(3, 6)).toEqual([
      ["cancelScheduledValues", origin + 2],
      ["setValueAtTime", 0.25, origin + 2],
      ["linearRampToValueAtTime", 1.25, origin + 2.5],
    ]);
  });

  it("arms a lane released mid-pass from the pass the clock is already inside", () => {
    const { gainCalls, now, voice } = deck();
    voice.setLoop(0, 2);
    voice.play();
    gainCalls.length = 0;

    // Releasing the knob a quarter of the way into the second pass: the lane is heard from that
    // pass's own start rather than waiting for the next time round (0028).
    now(2.5 + LOOKAHEAD_SECS);
    voice.setAutomation(null, "deck.gain", lane, 1);
    expect(passOrigins(gainCalls)[0]).toBe(LOOKAHEAD_SECS + 2);
  });

  it("moves the horizon forward at each boundary the reporter announces", () => {
    const { gainCalls, now, voice, report } = deck();
    voice.setLoop(0, 2);
    voice.setAutomation(null, "deck.gain", lane, 1);
    voice.play();
    const armed = passOrigins(gainCalls).length;
    gainCalls.length = 0;

    // The first pass has gone round. `id` is 1: one play, so one plan has been posted, and the
    // transport drops the echoes of any other.
    now(2 + LOOKAHEAD_SECS);
    report({ t: "looped", id: 1, at: 2 + LOOKAHEAD_SECS, cycle: 1 });

    // One pass further out, so the lane keeps being armed for as long as the loop keeps going.
    expect(passOrigins(gainCalls)).toEqual([LOOKAHEAD_SECS + armed * 2]);
  });

  it("arms the same gesture identically wherever on the clock the pass began", () => {
    const early = deck();
    early.voice.setLoop(0, 2);
    early.voice.setAutomation(null, "deck.gain", lane, 1);
    early.voice.play();

    const late = deck();
    late.now(37.5);
    late.voice.setLoop(0, 2);
    late.voice.setAutomation(null, "deck.gain", lane, 1);
    late.voice.play();

    // The same calls, moved by the distance between the two plays and by nothing else: a lane
    // captured at one playhead sounds the same as the same lane captured at another (0028).
    expect(late.gainCalls).toEqual(
      early.gainCalls.map(([method, ...args]) =>
        method === "cancelScheduledValues"
          ? [method, (args[0] ?? 0) + 37.5]
          : [method, args[0] ?? 0, (args[1] ?? 0) + 37.5],
      ),
    );
  });

  it("cancels back to the parameter's manual value when the transport stops", () => {
    const { gainCalls, now, voice } = deck();
    voice.setAutomation(null, "deck.gain", lane, 0.4);
    voice.play();
    gainCalls.length = 0;

    now(1);
    voice.stop();
    expect(gainCalls).toEqual([
      ["cancelAndHoldAtTime", 1],
      ["linearRampToValueAtTime", 0.4, 1 + PARAM_RAMP_SECS],
    ]);
  });

  it("gives a cleared lane back to the manual value and arms it no further", () => {
    const { gainCalls, now, voice } = deck();
    voice.setLoop(0, 2);
    voice.setAutomation(null, "deck.gain", lane, 1);
    voice.play();

    now(0.5);
    gainCalls.length = 0;
    voice.setAutomation(null, "deck.gain", [], 0.8);
    expect(gainCalls).toEqual([
      ["cancelAndHoldAtTime", 0.5],
      ["linearRampToValueAtTime", 0.8, 0.5 + PARAM_RAMP_SECS],
    ]);
  });
});

/** The plan the transport last handed the reporter, which is the one both sides compute from. */
const lastPlan = (plans: readonly unknown[]): PlayPlan & { base: number; resume: boolean } => {
  const kept = plans.filter((plan) => plan !== null);
  const posted: unknown = kept.at(-1);
  if (posted === undefined) throw new Error("no plan was posted");
  // oxlint-disable-next-line no-unsafe-type-assertion -- the fake port carries exactly this shape
  return posted as PlayPlan & { base: number; resume: boolean };
};

// The rate half of the transport: what speed and pitch do to the source node, and what a change
// of either while playing does to the arithmetic both sides of the worklet seam read (0031).
// oxlint-disable-next-line max-lines-per-function
describe("deck rate", () => {
  it("writes speed and pitch onto each source the transport builds", () => {
    const { voice, sources, plans } = deck();
    voice.setParam(null, "deck.speed", 2);
    voice.setParam(null, "deck.pitch", 12);
    voice.play();

    const source = sources.at(-1);
    expect(source?.playbackRate.value).toBe(2);
    // Semitones on the registry, cents on the node — the one conversion, in src/audio/chain.ts.
    expect(source?.detune.value).toBe(12 * CENTS_PER_SEMITONE);
    // Both compose into the one number every piece of position arithmetic reads.
    expect(lastPlan(plans).rate).toBe(4);
  });

  it("re-anchors the plan at the playhead instead of restarting the source", () => {
    const { voice, now, plans, sources } = deck();
    voice.setLoop(0, 2);
    voice.play();
    const before = lastPlan(plans);
    const built = sources.length;

    now(1.2 + LOOKAHEAD_SECS);
    voice.setParam(null, "deck.speed", 2);
    const after = lastPlan(plans);

    // No second source: the native loop keeps looping and only the arithmetic is told (0031).
    expect(sources).toHaveLength(built);
    expect(after.resume).toBe(true);
    expect(after.rate).toBe(2);
    // And the position is continuous across the change, to the sample.
    expect(playheadAt(1.2 + LOOKAHEAD_SECS, after, 4)).toBeCloseTo(
      playheadAt(1.2 + LOOKAHEAD_SECS, before, 4),
      9,
    );
  });

  it("anchors a change made inside the lookahead to when the source actually starts", () => {
    const { voice, now, plans, sources } = deck();
    voice.setLoop(0, 2);
    voice.play();
    const when = sources.at(-1)?.started[0] ?? 0;
    expect(when).toBeCloseTo(LOOKAHEAD_SECS, 9);

    // Half a lookahead in: the source is scheduled and has not begun. Re-anchoring at the clock
    // here would claim it started early and leave the playhead ahead of the sound for good.
    now(LOOKAHEAD_SECS / 2);
    voice.setParam(null, "deck.speed", 2);
    const after = lastPlan(plans);

    expect(after.startTime).toBeCloseTo(when, 9);
    expect(playheadAt(when, after, 4)).toBeCloseTo(0, 9);
  });

  it("carries the cycle count forward so a boundary is never numbered twice", () => {
    const { voice, now, plans } = deck();
    voice.setLoop(0, 2);
    voice.play();

    // Two whole passes have gone by at 1×, then the deck is doubled a quarter into the third.
    now(4.5 + LOOKAHEAD_SECS);
    voice.setParam(null, "deck.speed", 2);
    const after = lastPlan(plans);
    expect(after.base).toBe(2);
    expect(after.phase).toBeCloseTo(0.5, 9);
    // The next boundary is the third, and it arrives 0.75s later rather than 1.5s.
    expect(cyclesAt(4.5 + LOOKAHEAD_SECS, after) + after.base).toBe(2);
    expect(cycleTimeAt(1, after)).toBeCloseTo(4.5 + LOOKAHEAD_SECS + 0.75, 9);
  });

  it("floors a loop against wall time, so a faster deck needs a longer one", () => {
    const quantum = RENDER_QUANTUM / 48_000;
    const slow = deck();
    expect(slow.voice.setLoop(0, quantum)).toEqual({ in: 0, out: quantum });

    const fast = deck();
    fast.voice.setParam(null, "deck.speed", 4);
    // The same loop lasts a quarter of a render quantum at 4×, which cannot be reported once
    // per cycle — so it is no loop, exactly as a sub-quantum one is at 1×.
    expect(fast.voice.setLoop(0, quantum)).toBeNull();
    expect(fast.voice.setLoop(0, quantum * 4)).toEqual({ in: 0, out: quantum * 4 });
  });

  it("leaves the plan alone for a parameter that is not the rate", () => {
    const { voice, now, plans } = deck();
    voice.setLoop(0, 2);
    voice.play();
    const posted = plans.length;

    now(1);
    voice.setParam(null, "deck.gain", 0.5);
    expect(plans).toHaveLength(posted);
  });
});
