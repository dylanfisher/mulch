/** @role The transport's own contract for arming automation lanes against the passes it plays. */
import { describe, expect, it } from "vitest";

import { createDeckVoice } from "./deck";
import { PARAM_RAMP_SECS } from "./ramp";
import { AUTOMATION_HORIZON_SECS, LOOKAHEAD_SECS } from "./transport";

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

  const context = {
    currentTime: 0,
    sampleRate: 48_000,
    createGain: () =>
      Object.assign(fakeNode(), { gain: fakeParam(gains++ === 0 ? gainCalls : []) }),
    createStereoPanner: () => Object.assign(fakeNode(), { pan: fakeParam([]) }),
    createAnalyser: () =>
      Object.assign(fakeNode(), { fftSize: 0, getFloatTimeDomainData: () => {} }),
    createBufferSource: () =>
      Object.assign(fakeNode(), {
        buffer: null,
        loop: false,
        loopStart: 0,
        loopEnd: 0,
        addEventListener: () => {},
        start: () => {},
        stop: () => {},
      }),
  };

  /** The clock, writable: `BaseAudioContext.currentTime` is read-only, and a test moves time. */
  const now = (at: number): void => {
    context.currentTime = at;
  };
  // oxlint-disable-next-line no-unsafe-type-assertion -- the chain uses only the factories above
  return { context: context as unknown as BaseAudioContext, gainCalls, now };
}

/** One deck voice on a fake graph, plus the port the worklet would report over. */
function deck() {
  const { context, gainCalls, now } = fakeContext();
  let listener: ((event: MessageEvent<unknown>) => void) | null = null;
  const reporter = {
    port: {
      addEventListener: (_type: string, next: (event: MessageEvent<unknown>) => void) => {
        listener = next;
      },
      removeEventListener: () => {},
      start: () => {},
      postMessage: () => {},
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
  return { gainCalls, now, voice, report };
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
