/**
 * @role The audio host's own contract, driven by commands: what the graph's stop and start
 *   reports write on the session, and what a restart — a seek on a playing deck — deliberately
 *   does not write (0052).
 * @instead What a command does to the session without a graph → the seam tests built on
 *   src/app/engineDouble.ts. This file is the one place the real engine runs, against a fake
 *   context, because the reports under test come from the voice rather than from a double.
 */
// One fake graph plus the cases it exists for; the graph is the shared fixture and splitting the
// describes would mean two copies of it — which is also why the file is over the soft cap: a
// second file would carry a second copy of the context above, and the hard cap is far above it.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines-per-function, max-lines
// And two imports over the cap, both the shared ground's: the one case about it builds a pattern
// the way the module builds one and names the ground it is restoring (principle 1).
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { afterEach, describe, expect, it, vi } from "vitest";

import type { SessionRepository } from "@/state/repository";
import { patchDeck, type SessionStore } from "@/state/store";
import type { Analyzer } from "./analysis";
import { manualClock } from "./clock";
import { createAudioEngine, type AudioEngine } from "./engine";
import type { Event } from "./events";
import { createInstrument, type Instrument } from "./facade";
import { GEN_SECS } from "@/lib/waveform";
import { DECODE_CACHE_LIMIT } from "@/audio/decodeCache";
import { LOOKAHEAD_SECS } from "@/audio/transport";
import { partVoice } from "@/lib/player";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import { oneSong } from "@/lib/playerSongs";
import type { SessionGround } from "@/lib/sessionGround";

const SAMPLE_RATE = 48_000;

const fakeNode = () => ({ connect: (to: unknown) => to, disconnect: () => {} });

/**
 * Every gain this graph has built, newest last, each with the values it was ramped at in order.
 * A mute is a scale *left* at nought, so a graph the restore rebuilt is asked where its scales
 * ended rather than what passed over them on the way — a gain nothing ever ramped is not an
 * answer either way (0386).
 */
const gainAims: number[][] = [];

const fakeParam = (aims: number[] = []) => {
  const param = {
    value: 0,
    cancelScheduledValues: () => {},
    cancelAndHoldAtTime: () => {},
    // A step's seams are written as a curve, which is the one thing a jumping pass needs of a
    // parameter that the ordinary one does not.
    setValueCurveAtTime: () => {},
    setValueAtTime: () => {},
    // A ramp lands where it was aimed: the one reading of a parameter's own value the graph
    // makes is the lull's roll, which reads the chance off its lane's target.
    linearRampToValueAtTime: (value: number) => {
      param.value = value;
      aims.push(value);
    },
  };
  return param;
};

const fakeBuffer = (channels: number, length: number, sampleRate: number) => {
  const data = Array.from({ length: channels }, () => new Float32Array(length));
  return {
    duration: length / sampleRate,
    length,
    numberOfChannels: channels,
    sampleRate,
    getChannelData: (channel: number) => data[channel],
    copyToChannel: (source: Float32Array, channel: number) => data[channel]?.set(source),
  };
};

/**
 * Every source this graph has built, newest last. A jumping step reads its ground by where its
 * source loops, so the only way to see which ground a pass is standing on is to read the sources
 * it armed — the peek answers the step the clock is inside, and this context's clock never moves.
 */
const sources: { loopStart: number }[] = [];

/** Only the factories the master bus, a deck chain and the transport actually reach for. */
function fakeContext(): BaseAudioContext {
  const context = {
    currentTime: 0,
    sampleRate: SAMPLE_RATE,
    state: "running",
    destination: fakeNode(),
    createGain: () => {
      const aims: number[] = [];
      gainAims.push(aims);
      return Object.assign(fakeNode(), { gain: fakeParam(aims) });
    },
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
    createConstantSource: () => Object.assign(fakeNode(), { offset: fakeParam(), start: () => {} }),
    createBuffer: fakeBuffer,
    // What an import is decoded through. The bytes say how many frames come back, so a test can
    // hand the host the empty decode a truncated or headers-only file produces.
    decodeAudioData: (bytes: ArrayBuffer) =>
      Promise.resolve(fakeBuffer(1, bytes.byteLength, SAMPLE_RATE)),
    createBufferSource: () => {
      const source = Object.assign(fakeNode(), {
        buffer: null,
        loop: false,
        loopStart: 0,
        loopEnd: 0,
        playbackRate: fakeParam(),
        detune: fakeParam(),
        addEventListener: () => {},
        start: () => {},
        stop: () => {},
      });
      sources.push(source);
      return source;
    },
  };
  // oxlint-disable-next-line no-unsafe-type-assertion -- the graph uses only the members above
  return context as unknown as BaseAudioContext;
}

/** The worklet the transport reports over, stubbed as the global constructor the engine calls. */
type Reporter = {
  /** Each plan posted, and the instant a rest stops it at, where one does. */
  plans: { id: number; until?: number }[];
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
          postMessage: (message: { id: number; until?: number } | null) => {
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

type Fixture = {
  instrument: Instrument;
  events: Event[];
  confirmStart: () => void;
  /** The host itself, for the peaks cache no command reads back. */
  engine: AudioEngine;
  /** What the repository will hand back, by id — the bytes an import decodes. */
  blobs: Map<string, Blob>;
  /** Every id the repository was asked for, in order, by either of its reads. */
  reads: string[];
};

/** One deck, loaded, on the real engine over the fake graph — measured by `analyzer`, if given. */
function fixture(analyzer?: (store: SessionStore) => Analyzer): Fixture {
  stubReporter();
  const blobs = new Map<string, Blob>();
  const reads: string[] = [];
  const repository: SessionRepository = {
    load: () => Promise.resolve(),
    save: () => Promise.resolve(),
    ingest: () => Promise.reject(new Error("this fixture stores nothing")),
    blob: (id) => {
      reads.push(id);
      return Promise.resolve(blobs.get(id) ?? null);
    },
    blobs: async (ids) => {
      reads.push(...ids);
      return new Map(
        await Promise.all(
          [...ids].map(async (id) => {
            const blob = blobs.get(id);
            if (blob === undefined) throw new Error(`missing blob: ${id}`);
            return [id, new Uint8Array(await blob.arrayBuffer())] as const;
          }),
        ),
      );
    },
    replace: () => Promise.resolve(),
  };
  // Collected the way the reporters above are, rather than assigned to a captured `let`: the
  // array is read back without a claim about when the factory ran.
  const engines: AudioEngine[] = [];
  const instrument = createInstrument(
    manualClock(),
    (store, emit) => {
      const built = createAudioEngine(fakeContext(), store, emit, null, analyzer?.(store));
      engines.push(built);
      return built;
    },
    repository,
  );
  const engine = engines[0];
  if (engine === undefined) throw new Error("the instrument built no engine");
  const events: Event[] = [];
  instrument.on((event) => {
    events.push(event);
  });
  instrument.send({ t: "deck.load", deck: "a", source: { gen: "sine", hz: 440 } });
  const reporter = reporters[0];
  if (reporter === undefined) throw new Error("the engine built no reporter");
  /** What the audio thread says when the plan it was handed actually started sounding. */
  const confirmStart = (): void => {
    const plan = reporter.plans.at(-1);
    if (plan === undefined) throw new Error("no plan to confirm");
    reporter.deliver({ t: "started", id: plan.id, at: 0, offset: 0 });
  };
  return { instrument, events, confirmStart, engine, blobs, reads };
}

/** Enough microtask turns for a blob read, its decode and the event that follows them. */
const settle = async (): Promise<void> => {
  for (let remaining = 30; remaining > 0; remaining--) {
    // oxlint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
};

afterEach(() => {
  reporters.length = 0;
  sources.length = 0;
  gainAims.length = 0;
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
      command: { t: "deck.load", deck: "a", source: { gen: "noise" } } as const,
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

describe("an import that decodes to nothing", () => {
  it("leaves the deck holding what it had, and says what went wrong", async () => {
    const { instrument, events, engine, blobs } = fixture();
    await instrument.ready;
    const held = engine.peaks("a");
    events.length = 0;
    // Bytes a browser decodes into a buffer of no frames at all: a truncated import, or a file
    // that is only headers. Nothing about it is loadable.
    blobs.set("empty", new Blob([]));

    instrument.send({ t: "deck.load", deck: "a", source: { blobId: "empty" } });
    await settle();

    // The deck is where it was: same peaks object, same source, same duration — not half-loaded
    // with silence under a length of zero.
    expect(engine.peaks("a")).toBe(held);
    expect(instrument.probe().decks.a).toMatchObject({
      source: { gen: "sine", hz: 440 },
      duration: GEN_SECS,
    });
    expect(events.filter((event) => event.t === "deck.loaded")).toEqual([]);
    expect(events.flatMap((event) => (event.t === "error" ? [event.detail] : []))).toEqual([
      expect.stringContaining("no frames"),
    ]);
  });

  // The refusal is where a decoded source is made rather than at the deck's door, so a surface
  // that only wants to draw those bytes is told too, instead of drawing a length of zero.
  it("refuses the same bytes to a surface that only wants to draw them", async () => {
    const { engine } = fixture();

    await expect(
      engine.sourcePeaks({ blobId: "empty" }, () => Promise.resolve(new Blob([]))),
    ).rejects.toThrow("no frames");
  });
});

// The rack under all the yards resting them: one draw on the master's lull, every playing yard
// held on the same instant, and every one let go when the lull is switched off (0371).
describe("a lull on the master", () => {
  it("rests every playing yard on the same instant, and lets go of them when bypassed", () => {
    const { instrument, engine } = fixture();
    instrument.send({ t: "deck.add", deck: "b", emoji: "🌱", name: "Second Yard" });
    instrument.send({ t: "deck.load", deck: "b", source: { gen: "sine", hz: 220 } });
    // Both playing before the lull arrives: the master lays nothing while nothing plays, and
    // each knob below redraws the run and arms it at once.
    instrument.send({ t: "deck.play", deck: "a" });
    instrument.send({ t: "deck.play", deck: "b" });
    instrument.send({ t: "effect.add", deck: null, id: "l1", effect: "lull" });
    // At every chance, checked every five seconds and rested for five: a hold five in, and its
    // release at ten — past the horizon, so none is laid.
    for (const [param, value] of [
      ["lull.chance", 1],
      ["lull.rest", 5],
      ["lull.every", 5],
    ] as const) {
      instrument.send({ t: "param.set", deck: null, instance: "l1", param, value });
    }

    engine.armAutomation();
    // Both transports re-posted their plans carrying the one instant the master asked for.
    for (const reporter of reporters) {
      expect(reporter.plans.at(-1)).toMatchObject({ until: 5, resume: true });
    }

    // Switched off on the master, every yard is let go: a restart in place at the lookahead,
    // under a plan of its own with no rest on it, because a stop already scheduled on a source
    // cannot be taken back and only a new source plays past it.
    instrument.send({ t: "effect.bypass", deck: null, instance: "l1", bypassed: true });
    for (const reporter of reporters) {
      const last = reporter.plans.at(-1);
      expect(last).toMatchObject({ startTime: LOOKAHEAD_SECS, resume: false, until: undefined });
    }
  });
});

/**
 * The session's shared ground, on a yard standing on it, as a led ground with parts to count:
 * every part this yard opens is one boundary, and one boundary is one move.
 */
const LED_GROUND: SessionGround = {
  per: "part",
  leader: "a",
  every: 1,
  wanders: true,
  reach: "anywhere",
  way: "either",
};

/** A pattern on the session's ground, arranged as two short parts so the boundaries come fast. */
const TOGETHER_ON_PARTS = {
  ...PLAYER_DEFAULTS,
  seed: 9,
  bedTogether: true,
  songs: oneSong(
    ["one", "two"].map((id) => ({
      id,
      name: id,
      skip: false,
      voice: partVoice(PLAYER_DEFAULTS),
      length: 2,
      steps: [],
    })),
  ),
};

/** Whether the pass armed since the last read has carried the loop a whole bed or more through
 *  the source: a source looping past the end of a one-second loop is standing on a ground the walk
 *  moved to, and a ground that never moved cannot read this way at all (0185). */
const leftTheLoop = (from: number): boolean =>
  sources.slice(from).some((source) => source.loopStart >= 1);

// The ground a restored session comes back standing on, which is the host's only after the swap:
// the voices are prepared while the host still holds the ground going out, so the clock they are
// handed has to be about the one coming back (0313, 0382).
describe("the shared ground a restore hands over", () => {
  it("leads from the yard the restored ground names, not the one the host was holding", async () => {
    const { instrument } = fixture();
    // A second yard for the outgoing ground to name, holding nothing: what it is for is to be a
    // leader that is not this one.
    instrument.send({ t: "deck.add", deck: "b", emoji: "🌱", name: "Second Yard" });
    instrument.send({ t: "deck.loop", deck: "a", in: 0, out: 1 });
    instrument.send({ t: "deck.player", deck: "a", player: TOGETHER_ON_PARTS });
    instrument.send({ t: "session.ground", ground: LED_GROUND });
    // The positive control: on the ground as the command set it, the yard leads and the loop
    // moves through the source.
    const before = sources.length;
    instrument.send({ t: "deck.play", deck: "a" });
    expect(leftTheLoop(before)).toBe(true);
    instrument.send({ t: "deck.stop", deck: "a" });

    // A ground led by the other yard — which holds no pattern, so it crosses nothing and the
    // count stands still under it — and then the first one back through an undo, which rebuilds
    // every voice rather than replaying the command that set it. Led either way on purpose: the
    // count is reached by the same road under both grounds, so the only thing the restore can get
    // wrong here is *which yard reports*, which is the half of the clock this case is about.
    instrument.send({ t: "session.ground", ground: { ...LED_GROUND, leader: "b" } });
    instrument.send({ t: "history.undo" });
    await settle();
    expect(instrument.probe().ground).toEqual(LED_GROUND);

    const after = sources.length;
    instrument.send({ t: "deck.play", deck: "a" });
    expect(leftTheLoop(after)).toBe(true);
  });
});

// A yard's mute is a state the graph is in, so a graph the host rebuilds under an undo has to be
// put back into it — the way the sequence beside it is. Nothing replays the command on that road:
// the session is swapped whole onto voices prepared before the swap (0386).
/** How many of this graph's scales were ramped, and left, at nought. */
const silenced = (): number => gainAims.filter((aims) => aims.at(-1) === 0).length;

describe("a yard that comes back muted", () => {
  it("is silenced by the graph the restore builds, not only by the session it puts back", async () => {
    const { instrument } = fixture();
    // Hydrated first: a group runs the moment it is sent, and a history reset landing behind it
    // would take the entry this case undoes.
    await instrument.ready;
    // Sent as its own group, which closes the entry the moment it lands: an open gesture spent
    // after the restore has rewound the store is a ledger question and not this case's (0067).
    instrument.send({
      t: "history.group",
      commands: [{ t: "deck.mute", deck: "a", muted: true }],
    });

    // Undone: the yard is heard again. Whatever else a rebuilt graph leaves at nought it leaves
    // there on both roads, so the claim is the one scale between them and not a bare zero.
    gainAims.length = 0;
    instrument.send({ t: "history.undo" });
    await settle();
    expect(instrument.probe().decks.a?.muted).toBe(false);
    const heard = silenced();

    // Redone: the same road, and this time the graph it builds holds one more scale at nought.
    gainAims.length = 0;
    instrument.send({ t: "history.redo" });
    await settle();
    expect(instrument.probe().decks.a?.muted).toBe(true);
    expect(silenced()).toBe(heard + 1);
  });
});

/** An analyzer that knows every source at once: 120bpm, landed before the request returns. */
const measuresAtOnce = (store: SessionStore): Analyzer => ({
  request: (deck, _channels, _sampleRate, analyzed) => {
    patchDeck(store, deck, { analysis: { bpm: 120, onsets: [], crest: 1 } });
    analyzed?.();
  },
  forget: () => {},
  inFlight: () => 0,
});

// A restored voice is a new rack, and a rack counts its beat on nought until it is told one: the
// answer a restore's measurement lands has to reach it, the way a load's does (0371).
describe("a yard's beat after a restore", () => {
  it("is told to the rebuilt rack, so a lull on the grid still rests", async () => {
    const { instrument, engine } = fixture(measuresAtOnce);
    await instrument.ready;
    instrument.send({ t: "effect.add", deck: "a", id: "l1", effect: "lull" });
    for (const [param, value] of [
      ["lull.chance", 1],
      ["lull.rest", 1],
      ["lull.every", 1],
      ["lull.grid", 1],
    ] as const) {
      instrument.send({ t: "param.set", deck: "a", instance: "l1", param, value });
    }
    engine.endGesture();
    instrument.send({
      t: "history.group",
      commands: [{ t: "deck.mute", deck: "a", muted: true }],
    });
    instrument.send({ t: "history.undo" });
    await settle();

    instrument.send({ t: "deck.play", deck: "a" });
    engine.armAutomation();
    // A rest laid is a plan that stops somewhere; on a beat of nought the lull lays none.
    expect(reporters.at(-1)?.plans.some((plan) => plan.until !== undefined)).toBe(true);
  });
});

/** Stored bytes the fake context decodes into a buffer of that many frames. */
const stored = (frames: number): Blob => new Blob([new Uint8Array(frames)]);

// An undo swaps a whole prepared graph in, and what that graph plays is audio the host has almost
// always just been playing: the decode cache already holds it, so storage is asked only for what
// the cache does not.
describe("an undo over audio the host has decoded", () => {
  it("reads nothing from storage", async () => {
    const { instrument, blobs, reads } = fixture();
    await instrument.ready;
    blobs.set("held", stored(64));
    instrument.send({ t: "deck.load", deck: "a", source: { blobId: "held" } });
    await settle();
    instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value: 0.5 });
    reads.length = 0;

    instrument.send({ t: "history.undo" });
    await settle();
    expect(instrument.probe().decks.a).toMatchObject({
      source: { blobId: "held" },
      params: { "deck.gain": 1 },
    });
    expect(reads).toEqual([]);
  });

  it("reads the one source the cache has let go of, and no other", async () => {
    const { instrument, blobs, reads } = fixture();
    await instrument.ready;
    const ids = Array.from({ length: DECODE_CACHE_LIMIT + 1 }, (_, at) => `take-${at}`);
    for (const [at, id] of ids.entries()) {
      blobs.set(id, stored(64 + at));
      instrument.send({ t: "deck.load", deck: "a", source: { blobId: id } });
      // oxlint-disable-next-line no-await-in-loop
      await settle();
    }
    reads.length = 0;

    for (let remaining = DECODE_CACHE_LIMIT; remaining > 0; remaining--) {
      instrument.send({ t: "history.undo" });
      // oxlint-disable-next-line no-await-in-loop
      await settle();
    }
    expect(instrument.probe().decks.a?.source).toEqual({ blobId: ids[0] });
    expect(reads).toEqual([ids[0]]);
  });
});

// The first move of a drag over an automated knob is a group — the lane cleared and the value
// that replaced it — and a group that commits never needed a way back. Each voice is built with
// one reporter, so the reporters are the count of graphs this host has built.
describe("a grouped edit", () => {
  it("builds no graph when it commits", async () => {
    const { instrument } = fixture();
    await instrument.ready;
    const built = reporters.length;

    instrument.send({
      t: "history.group",
      commands: [
        { t: "automation.set", deck: "a", param: "deck.gain", points: [] },
        { t: "param.set", deck: "a", param: "deck.gain", value: 0.6 },
      ],
    });
    await settle();
    expect(instrument.probe().decks.a?.params["deck.gain"]).toBe(0.6);
    expect(reporters.length).toBe(built);
  });

  it("builds the graph it rolls back to only when it fails", async () => {
    const { instrument } = fixture();
    await instrument.ready;
    instrument.send({ t: "effect.add", deck: "a", id: "l1", effect: "lull" });
    const built = reporters.length;

    instrument.send({
      t: "history.group",
      commands: [
        { t: "param.set", deck: "a", param: "deck.gain", value: 0.5 },
        { t: "effect.add", deck: "a", id: "l1", effect: "lull" },
      ],
    });
    await settle();
    expect(instrument.probe().decks.a).toMatchObject({
      params: { "deck.gain": 1 },
      effects: [{ id: "l1", effect: "lull" }],
    });
    expect(reporters.length).toBe(built + 1);
  });
});
