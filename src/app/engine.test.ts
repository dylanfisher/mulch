/**
 * @role The audio host's own contract, driven by commands: what the graph's stop and start
 *   reports write on the session, and what a restart — a seek on a playing deck — deliberately
 *   does not write (0052).
 * @instead What a command does to the session without a graph → the seam tests built on
 *   src/app/engineDouble.ts. This file is the one place the real engine runs, against a fake
 *   context, because the reports under test come from the voice rather than from a double.
 */
// One fake graph plus the cases it exists for; the graph is the shared fixture and splitting the
// describes would mean two copies of it. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines-per-function
import { afterEach, describe, expect, it, vi } from "vitest";

import { manualClock } from "./clock";
import { createAudioEngine } from "./engine";
import type { Event } from "./events";
import { createInstrument, type Instrument } from "./facade";

const SAMPLE_RATE = 48_000;

const fakeNode = () => ({ connect: (to: unknown) => to, disconnect: () => {} });

const fakeParam = () => ({
  value: 0,
  cancelScheduledValues: () => {},
  cancelAndHoldAtTime: () => {},
  setValueAtTime: () => {},
  linearRampToValueAtTime: () => {},
});

/** Only the factories the master bus, a deck chain and the transport actually reach for. */
function fakeContext(): BaseAudioContext {
  const context = {
    currentTime: 0,
    sampleRate: SAMPLE_RATE,
    state: "running",
    destination: fakeNode(),
    createGain: () => Object.assign(fakeNode(), { gain: fakeParam() }),
    createStereoPanner: () => Object.assign(fakeNode(), { pan: fakeParam() }),
    createAnalyser: () =>
      Object.assign(fakeNode(), { fftSize: 0, getFloatTimeDomainData: () => {} }),
    createChannelSplitter: () => fakeNode(),
    createDynamicsCompressor: () =>
      Object.assign(fakeNode(), {
        threshold: fakeParam(),
        knee: fakeParam(),
        ratio: fakeParam(),
        attack: fakeParam(),
        release: fakeParam(),
      }),
    createWaveShaper: () => Object.assign(fakeNode(), { curve: null, oversample: "none" }),
    createBuffer: (channels: number, length: number, sampleRate: number) => {
      const data = Array.from({ length: channels }, () => new Float32Array(length));
      return {
        duration: length / sampleRate,
        length,
        numberOfChannels: channels,
        sampleRate,
        getChannelData: (channel: number) => data[channel],
        copyToChannel: (source: Float32Array, channel: number) => data[channel]?.set(source),
      };
    },
    createBufferSource: () =>
      Object.assign(fakeNode(), {
        buffer: null,
        loop: false,
        loopStart: 0,
        loopEnd: 0,
        playbackRate: fakeParam(),
        detune: fakeParam(),
        addEventListener: () => {},
        start: () => {},
        stop: () => {},
      }),
  };
  // oxlint-disable-next-line no-unsafe-type-assertion -- the graph uses only the members above
  return context as unknown as BaseAudioContext;
}

/** The worklet the transport reports over, stubbed as the global constructor the engine calls. */
type Reporter = {
  plans: { id: number }[];
  deliver: (message: unknown) => void;
};

const reporters: Reporter[] = [];

function stubReporter(): void {
  vi.stubGlobal(
    "AudioWorkletNode",
    class {
      port;
      constructor() {
        let listener: ((event: MessageEvent<unknown>) => void) | null = null;
        const reporter: Reporter = {
          plans: [],
          deliver: (message) => {
            // oxlint-disable-next-line no-unsafe-type-assertion -- the handler reads only `data`
            listener?.({ data: message } as MessageEvent<unknown>);
          },
        };
        reporters.push(reporter);
        this.port = {
          addEventListener: (_type: string, next: (event: MessageEvent<unknown>) => void) => {
            listener = next;
          },
          removeEventListener: () => {},
          start: () => {},
          postMessage: (message: { id: number } | null) => {
            if (message !== null) reporter.plans.push(message);
          },
          close: () => {},
        };
      }
      connect(to: unknown): unknown {
        return to;
      }
      disconnect(): void {}
    },
  );
}

type Fixture = { instrument: Instrument; events: Event[]; confirmStart: () => void };

/** One deck, loaded, on the real engine over the fake graph. */
function fixture(): Fixture {
  stubReporter();
  const instrument = createInstrument(manualClock(), (store, emit) =>
    createAudioEngine(fakeContext(), store, emit, null),
  );
  const events: Event[] = [];
  instrument.on((event) => {
    events.push(event);
  });
  instrument.send({ t: "deck.load", deck: "a", source: { gen: "sine", secs: 2, hz: 440 } });
  const reporter = reporters[0];
  if (reporter === undefined) throw new Error("the engine built no reporter");
  /** What the audio thread says when the plan it was handed actually started sounding. */
  const confirmStart = (): void => {
    const plan = reporter.plans.at(-1);
    if (plan === undefined) throw new Error("no plan to confirm");
    reporter.deliver({ t: "started", id: plan.id, at: 0, offset: 0 });
  };
  return { instrument, events, confirmStart };
}

afterEach(() => {
  reporters.length = 0;
  vi.unstubAllGlobals();
});

describe("a seek through the graph", () => {
  it("keeps a playing deck playing across the restart it schedules", () => {
    const { instrument, events, confirmStart } = fixture();
    instrument.send({ t: "deck.play", deck: "a" });
    confirmStart();
    expect(instrument.probe().decks.a?.playing).toBe(true);

    instrument.send({ t: "deck.seek", deck: "a", position: 1.25 });

    // Inside the new source's lookahead: the old source has been torn down and the replacement
    // has not reported yet, which is exactly the window the pause button used to flash in.
    expect(instrument.probe().decks.a?.playing).toBe(true);
    confirmStart();
    expect(instrument.probe().decks.a?.playing).toBe(true);
    expect(events.filter((event) => event.t === "deck.stopped")).toEqual([]);
  });

  it("still stops the deck when something actually stops it after a seek", () => {
    const { instrument, events, confirmStart } = fixture();
    instrument.send({ t: "deck.play", deck: "a" });
    confirmStart();
    instrument.send({ t: "deck.seek", deck: "a", position: 1.25 });
    confirmStart();

    instrument.send({ t: "deck.stop", deck: "a" });

    expect(instrument.probe().decks.a?.playing).toBe(false);
    expect(events.filter((event) => event.t === "deck.stopped")).toMatchObject([
      { deck: "a", reason: "command" },
    ]);
  });

  // The replacement source is silent for its whole lookahead, and every halt inside that window
  // is silent too — the transport only reports a stop for a start the reporter confirmed. So the
  // seek's own silence has to be closed by the command that halts, or the deck reads playing for
  // ever with nothing planned (0052).
  it.each([
    { name: "stopped", command: { t: "deck.stop", deck: "a" } as const },
    { name: "paused", command: { t: "deck.play.toggle", deck: "a" } as const },
    {
      name: "loaded over",
      command: { t: "deck.load", deck: "a", source: { gen: "noise", secs: 1 } } as const,
    },
  ])("stops reading as playing when it is $name inside the seek's lookahead", ({ command }) => {
    const { instrument, confirmStart } = fixture();
    instrument.send({ t: "deck.play", deck: "a" });
    confirmStart();
    instrument.send({ t: "deck.seek", deck: "a", position: 1.25 });

    instrument.send(command);

    expect(instrument.probe().decks.a?.playing).toBe(false);
  });

  it("holds the new position on a stopped deck, which stays stopped", () => {
    const { instrument, events } = fixture();

    instrument.send({ t: "deck.seek", deck: "a", position: 1.25 });

    expect(instrument.probe().decks.a).toMatchObject({ playing: false, paused: 1.25 });
    expect(events.filter((event) => event.t === "deck.stopped")).toEqual([]);
  });
});
