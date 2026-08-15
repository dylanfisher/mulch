/**
 * @role The transport's own contract: arming automation lanes on their own cycles while it
 *   plays, and the rate arithmetic a speed or pitch change re-anchors its passes with.
 */
// Two describes over one fake graph — the graph is the shared fixture, and splitting them would
// mean two copies of it. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { describe, expect, it, vi } from "vitest";

import {
  CENTS_PER_SEMITONE,
  cycleTimeAt,
  cyclesAt,
  playheadAt,
  type PlayPlan,
} from "@/lib/timeline";
import { createDeckVoice } from "./deck";
import { paramKey } from "./params";
import { LANE_SEAM_SECS, PARAM_RAMP_SECS } from "./ramp";
import {
  AUTOMATION_HORIZON_SECS,
  AUTOMATION_REARM_SECS,
  LOOKAHEAD_SECS,
  MAX_AUTOMATION_CYCLES,
  RENDER_QUANTUM,
} from "./transport";

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

/** The cycle origins a schedule was laid against: one hold-and-join per armed cycle (0035). */
const cycleOrigins = (calls: readonly Call[]): number[] =>
  calls.filter(([method]) => method === "cancelAndHoldAtTime").map(([, when]) => when ?? 0);

/** How many cycles of `span` fit in the horizon, counting the one the arming starts inside. */
const armedCycles = (span: number): number =>
  Math.min(MAX_AUTOMATION_CYCLES, Math.floor(AUTOMATION_HORIZON_SECS / span) + 1);

// The transport's whole automation contract: nothing while stopped, a lane repeating on its own
// length while playing, and back to the manual value when it ends (0035).
// oxlint-disable-next-line max-lines-per-function
describe("deck automation", () => {
  const lane = [
    { at: 0, value: 0.25 },
    { at: 0.5, value: 1.25 },
  ];
  /** The lane's own period, which is its last point's time and nothing to do with a loop. */
  const SPAN = 0.5;

  it("holds a lane recorded while stopped, and counts its cycles from when it was recorded", () => {
    const { gainCalls, now, voice } = deck();
    now(3);

    voice.setAutomation(null, "deck.gain", lane, 1);
    // A stopped deck has no transport to lay the gesture against, so nothing is scheduled.
    expect(gainCalls).toEqual([]);

    voice.play();
    // The anchor is where the recording was, so the cycle the play lands inside is the one that
    // sounds — the lookahead does not restart the lane, it joins it (0035).
    expect(cycleOrigins(gainCalls).slice(0, 3)).toEqual([3, 3 + SPAN, 3 + 2 * SPAN]);
    expect(gainCalls.slice(0, 3)).toEqual([
      ["cancelAndHoldAtTime", 3],
      ["linearRampToValueAtTime", 0.25, 3 + LANE_SEAM_SECS],
      ["linearRampToValueAtTime", 1.25, 3.5],
    ]);
  });

  it("repeats on its own length rather than on the loop's", () => {
    const { gainCalls, voice } = deck();
    // A 2s loop and a 0.5s gesture: the lane goes round four times per pass, and would go round
    // at the same rate against a loop of any other length (0035).
    voice.setLoop(0, 2);
    voice.setAutomation(null, "deck.gain", lane, 1);
    voice.play();

    expect(cycleOrigins(gainCalls)).toHaveLength(armedCycles(SPAN));
    expect(cycleOrigins(gainCalls).slice(0, 3)).toEqual([0, SPAN, 2 * SPAN]);
    // The second cycle is the identical gesture one span later, not a continuation of the first.
    expect(gainCalls.slice(3, 6)).toEqual([
      ["cancelAndHoldAtTime", SPAN],
      ["linearRampToValueAtTime", 0.25, SPAN + LANE_SEAM_SECS],
      ["linearRampToValueAtTime", 1.25, SPAN + 0.5],
    ]);
  });

  it("caps how many cycles of a very short lane one arming schedules", () => {
    const { gainCalls, voice } = deck();
    // A horizon of 8s divided by 20ms is four hundred cycles of AudioParam events for a repeat
    // nobody can hear as one; the ceiling is what stops that.
    voice.setAutomation(
      null,
      "deck.gain",
      [
        { at: 0, value: 0.2 },
        { at: 0.02, value: 1 },
      ],
      1,
    );
    voice.play();
    expect(cycleOrigins(gainCalls)).toHaveLength(MAX_AUTOMATION_CYCLES);
  });

  it("starts a lane released mid-play from the instant it was released", () => {
    const { gainCalls, now, voice } = deck();
    voice.setLoop(0, 2);
    voice.play();
    gainCalls.length = 0;

    // Wherever the playhead is, the gesture begins where the performer let go of the knob: its
    // phase is its own, and the waveform's is the waveform's (0035).
    now(2.7 + LOOKAHEAD_SECS);
    voice.setAutomation(null, "deck.gain", lane, 1);
    expect(cycleOrigins(gainCalls)[0]).toBe(2.7 + LOOKAHEAD_SECS);
  });

  it("keeps arming ahead of the clock as it runs", () => {
    vi.useFakeTimers();
    try {
      const { gainCalls, now, voice } = deck();
      voice.setAutomation(null, "deck.gain", lane, 1);
      voice.play();
      const armed = cycleOrigins(gainCalls);
      gainCalls.length = 0;

      // No loop boundary announces a lane's cycle, so the transport keeps its own tick — half a
      // horizon, which leaves the other half as slack (0035).
      now(AUTOMATION_REARM_SECS);
      vi.advanceTimersByTime(AUTOMATION_REARM_SECS * 1000);

      // It continues where the first arming stopped rather than laying the same cycles again.
      expect(cycleOrigins(gainCalls)[0]).toBe((armed.at(-1) ?? 0) + SPAN);
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps a lane's phase when the same points come back on a new manual value", () => {
    const { gainCalls, now, voice } = deck();
    voice.setAutomation(null, "deck.gain", lane, 1);
    voice.play();
    gainCalls.length = 0;

    // What a param.set under a lane does: the same gesture, re-based. It is not a new recording,
    // so it goes on counting from where it was rather than starting its cycle again (0035).
    now(1.2);
    voice.setAutomation(null, "deck.gain", [...lane], 0.6);
    expect(cycleOrigins(gainCalls)[0]).toBe(1);

    // A different gesture is a new recording, and starts where the performer left it.
    gainCalls.length = 0;
    voice.setAutomation(
      null,
      "deck.gain",
      [
        { at: 0, value: 0.3 },
        { at: 0.5, value: 0.9 },
      ],
      0.6,
    );
    expect(cycleOrigins(gainCalls)[0]).toBe(1.2);
  });

  it("reports how far into its own cycle each lane is, for the surfaces that paint it", () => {
    const { now, voice } = deck();
    voice.setAutomation(null, "deck.gain", lane, 1);
    voice.play();

    const out = { position: 0, meter: 0, automation: new Map<string, number>() };
    now(1.3 + LOOKAHEAD_SECS);
    voice.peek(out);
    // 1.35s after the anchor, on a 0.5s lane: two whole cycles and 0.35 of the third.
    expect(out.automation.get(paramKey(null, "deck.gain"))).toBeCloseTo(0.35, 10);

    // A stopped deck has no phase to report, and the map it fills is the same one, emptied.
    voice.stop();
    voice.peek(out);
    expect(out.automation.size).toBe(0);
  });

  it("arms the same gesture identically wherever on the clock it was recorded", () => {
    const early = deck();
    early.voice.setLoop(0, 2);
    early.voice.setAutomation(null, "deck.gain", lane, 1);
    early.voice.play();

    const late = deck();
    late.now(37.5);
    late.voice.setLoop(0, 2);
    late.voice.setAutomation(null, "deck.gain", lane, 1);
    late.voice.play();

    // The same calls, moved by the distance between the two recordings and by nothing else: a
    // lane captured at one playhead sounds the same as the same lane captured at another (0028).
    expect(late.gainCalls).toEqual(
      early.gainCalls.map(([method, ...args]) =>
        method === "cancelAndHoldAtTime"
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
