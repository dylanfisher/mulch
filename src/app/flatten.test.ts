/**
 * @role Seam-level contract tests for `deck.flatten`: the spec the one render harness is handed
 *   for a single yard's single pass, the bytes it hands back stored under the id the command
 *   minted, the yard rewritten onto them with nothing left to play them through, and the two
 *   refusals — no loop, and no harness (0112).
 */
// One flat list of the command's success and refusal cases, beside the render, graph and
// repository doubles they are asserted against (0007).
// oxlint-disable max-lines-per-function
import { describe, expect, it } from "vitest";

import type { Fingerprint } from "@/lib/fingerprint";
import type { SessionRepository } from "@/state/repository";
import { manualClock } from "./clock";
import type { Command, Envelope } from "./commands";
import { silentEngine } from "./engineDouble";
import type { Event } from "./events";
import { createInstrument, type Instrument } from "./facade";
import type { RenderResult, RenderSpec } from "./render";

/** Stand-in for the rendered pass: the seam's business is where these bytes go, not what is in them. */
const RENDERED = Uint8Array.of(82, 73, 70, 70);

/** The quietest fingerprint the result type allows — nothing here reads one. */
const SILENT: Fingerprint = {
  sampleRate: 48_000,
  frames: 1,
  peakDb: [-120, -120],
  dcDb: [-120, -120],
  rmsDb: [-120],
  clicks: 0,
  silence: [],
};

/** A jump pattern that rests between its steps, so its own window is longer than one pass. */
const JUMPING: NonNullable<Extract<Command, { t: "deck.player" }>["player"]> = {
  seed: 9,
  bias: 0,
  stride: 0,
  home: 0,
  phrase: 0,
  phraseKeep: 4,
  phraseChance: 0,
  phraseReturn: 0,
  arrange: 0,
  arrangeKeep: 4,
  arrangeChance: 0,
  arrangeReturn: 0,
  distance: 3,
  repeats: 4,
  repeatsChance: 1,
  repeatsSpread: 0,
  repeatsHold: 0,
  ratchet: 0,
  gate: 0.5,
  drop: 0,
  burst: 1,
  vary: 0,
  varyChance: 1,
  rest: 1,
  restChance: 1,
  restSpread: 0,
  hold: 0,
  chance: 1,
  spread: 2,
  drift: 4,
  song: [],
};

type Fixture = {
  instrument: Instrument;
  calls: string[];
  events: Event[];
  blobs: Map<string, Blob>;
  specs: RenderSpec[];
};

const settle = async (): Promise<void> => {
  for (let remaining = 80; remaining > 0; remaining--) {
    // A flatten chains a snapshot, a render, a store, a prepared graph and a decode.
    // oxlint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
};

/** What a rendered command list looks like from the outside: its types, in order. */
const kinds = (envelopes: (Command | Envelope)[]): string[] =>
  envelopes.map((input) => ("cmd" in input ? input.cmd.t : input.t));

const fixture = (render: Partial<RenderResult> = {}): Fixture => {
  const calls: string[] = [];
  const blobs = new Map<string, Blob>();
  const specs: RenderSpec[] = [];
  const repository: SessionRepository = {
    load: () => Promise.resolve(),
    save: () => Promise.resolve(),
    ingest: (bytes, id = "minted") => {
      blobs.set(id, bytes);
      calls.push(`ingest:${id}`);
      return Promise.resolve(id);
    },
    blob: (id) => Promise.resolve(blobs.get(id) ?? null),
    blobs: (ids) => Promise.resolve(new Map([...ids].map((id) => [id, new Uint8Array(0)]))),
    replace: () => Promise.resolve(),
  };
  const instrument = createInstrument(
    manualClock(),
    () =>
      silentEngine({
        loadBlob: (deck, blobId) => {
          calls.push(`loadBlob:${deck}:${blobId}`);
          return Promise.resolve(2);
        },
        setLoop: (_deck, inSecs, outSecs) =>
          outSecs > inSecs ? { in: inSecs, out: outSecs } : null,
      }),
    repository,
    (spec) => {
      specs.push(spec);
      calls.push(`render:${spec.secs}`);
      return Promise.resolve({
        events: [],
        probes: [],
        fingerprint: SILENT,
        wav: RENDERED,
        ...render,
      });
    },
  );
  const events: Event[] = [];
  instrument.on((event) => {
    events.push(event);
  });
  blobs.set("imported", new Blob([Uint8Array.of(9, 9)]));
  return { instrument, calls, events, blobs, specs };
};

/**
 * Deck a as a performance: imported bytes read at double speed, a loop across their middle, and
 * a filter in the rack — the four things a flatten is supposed to put into the samples. One pass
 * of that loop is half a second, because the rate is what decides how long a pass takes.
 */
const performing = async (instrument: Instrument): Promise<void> => {
  instrument.send({ t: "deck.load", deck: "a", source: { blobId: "imported" } });
  await settle();
  instrument.send({ t: "deck.loop", deck: "a", in: 0.5, out: 1.5 });
  instrument.send({ t: "param.set", deck: "a", param: "deck.speed", value: 2 });
  instrument.send({ t: "effect.add", deck: "a", id: "flt", effect: "filter" });
  await settle();
};

describe("deck.flatten", () => {
  it("renders one pass of the loop at the rate the yard reads it at", async () => {
    const { instrument, specs } = fixture();
    await instrument.ready;
    await performing(instrument);

    instrument.send({ t: "deck.flatten", deck: "a", id: "flat-1" });
    await settle();

    expect(specs).toHaveLength(1);
    const spec = specs[0]!;
    // A one-second loop at 2× is half a second of playing, rendered twice: the lookahead and the
    // first pass are dropped, so what is kept is half a second of sound that was already running.
    expect(spec.secs).toBeCloseTo(1.05, 10);
    expect(spec.fromSecs).toBeCloseTo(0.55, 10);
    expect(spec.wav).toBe(true);
    // The yard's own restoration order, and this yard's alone, ending in the one play (0077).
    expect(kinds(spec.envelopes)).toEqual([
      "deck.remove",
      "deck.add",
      "deck.load",
      "param.set",
      "param.set",
      "param.set",
      "param.set",
      "param.set",
      "effect.add",
      "param.set",
      "effect.bypass",
      "deck.loop",
      "deck.activate",
      "deck.play",
    ]);
    expect(spec.envelopes.filter((input) => "t" in input && input.t === "deck.add")).toEqual([
      expect.objectContaining({ deck: "a" }),
    ]);
  });

  it("stores what came back and leaves the yard playing it with nothing in the way", async () => {
    const { instrument, calls, events, blobs } = fixture();
    await instrument.ready;
    await performing(instrument);
    calls.length = 0;

    instrument.send({ t: "deck.flatten", deck: "a", id: "flat-1" });
    await settle();

    // Rendered first, stored second, loaded third: nothing is written before the pass exists.
    expect(calls.slice(0, 3)).toEqual(["render:1.05", "ingest:flat-1", "loadBlob:a:flat-1"]);
    expect([...new Uint8Array(await blobs.get("flat-1")!.arrayBuffer())]).toEqual([...RENDERED]);

    const deck = instrument.probe().decks.a!;
    expect(deck.source).toEqual({ blobId: "flat-1" });
    // Everything that made the sound is in the sound: no rack, no lanes, no jumps, and every
    // deck parameter back at its default, so none of them is applied to it a second time.
    expect(deck.effects).toEqual([]);
    expect(deck.automation).toEqual({});
    expect(deck.player).toBeNull();
    expect(deck.params["deck.speed"]).toBe(1);
    expect(deck.params["deck.gain"]).toBe(1);
    // The loop the render was of: the whole of the new source.
    expect(deck.loop).toEqual({ in: 0, out: 0.5 });
    expect(events.filter((event) => event.t === "deck.flattened")).toEqual([
      expect.objectContaining({ t: "deck.flattened", deck: "a", blob: "flat-1", secs: 0.5 }),
    ]);
  });

  it("renders the loop without the jumps, and leaves the jumps on the yard", async () => {
    const { instrument, specs } = fixture();
    await instrument.ready;
    await performing(instrument);
    instrument.send({ t: "deck.player", deck: "a", player: JUMPING });
    await settle();

    instrument.send({ t: "deck.flatten", deck: "a", id: "flat-1" });
    await settle();

    // A pattern rests, repeats and holds a rate, so its own window is not one pass of the loop
    // (`windowOf`, src/audio/player.ts) and a render of one pass would stop in the middle of it.
    // The loop is what is rendered, and the pattern is left to go on jumping around it.
    expect(kinds(specs[0]!.envelopes)).not.toContain("deck.player");
    expect(specs[0]!.secs).toBeCloseTo(1.05, 10);
    expect(instrument.probe().decks.a!.player).toEqual(JUMPING);
  });

  it("refuses when the yard changed under the render, and stores nothing", async () => {
    const { instrument, calls, events, blobs } = fixture();
    await instrument.ready;
    await performing(instrument);
    calls.length = 0;

    // A load already in flight is not deferred behind the flatten's group — its decode commits
    // mid-render and clears the loop the render was of.
    instrument.send({ t: "deck.load", deck: "a", source: { blobId: "imported" } });
    instrument.send({ t: "deck.flatten", deck: "a", id: "flat-1" });
    await settle();

    expect(events.at(-1)).toMatchObject({
      t: "error",
      detail: "deck a changed while it was being flattened",
    });
    expect(calls).toEqual(["loadBlob:a:imported", "render:1.05"]);
    expect(blobs.has("flat-1")).toBe(false);
    expect(instrument.probe().decks.a!.loop).toBeNull();
  });

  it("undoes in one press, back to the performance it was taken from", async () => {
    const { instrument } = fixture();
    await instrument.ready;
    await performing(instrument);
    instrument.send({ t: "deck.flatten", deck: "a", id: "flat-1" });
    await settle();

    instrument.send({ t: "history.undo" });
    await settle();

    const deck = instrument.probe().decks.a!;
    expect(deck.source).toEqual({ blobId: "imported" });
    expect(deck.loop).toEqual({ in: 0.5, out: 1.5 });
    expect(deck.params["deck.speed"]).toBe(2);
    expect(deck.effects.map((entry) => entry.id)).toEqual(["flt"]);
  });

  it("refuses a yard with no loop, and renders and stores nothing", async () => {
    const { instrument, calls, events, blobs } = fixture();
    await instrument.ready;
    instrument.send({ t: "deck.load", deck: "a", source: { blobId: "imported" } });
    await settle();
    calls.length = 0;

    instrument.send({ t: "deck.flatten", deck: "a", id: "flat-1" });
    await settle();

    expect(events.at(-1)).toMatchObject({ t: "error", detail: "deck a has no loop to flatten" });
    expect(calls).toEqual([]);
    expect(blobs.has("flat-1")).toBe(false);
    expect(instrument.probe().decks.a!.source).toEqual({ blobId: "imported" });
  });

  it("refuses when the host has no render harness", async () => {
    const repository: SessionRepository = {
      load: () => Promise.resolve(),
      save: () => Promise.resolve(),
      ingest: (_bytes, id = "minted") => Promise.resolve(id),
      blob: () => Promise.resolve(new Blob([Uint8Array.of(9, 9)])),
      blobs: (ids) => Promise.resolve(new Map([...ids].map((id) => [id, new Uint8Array(0)]))),
      replace: () => Promise.resolve(),
    };
    const instrument = createInstrument(
      manualClock(),
      () => silentEngine({ setLoop: (_deck, inSecs, outSecs) => ({ in: inSecs, out: outSecs }) }),
      repository,
    );
    const events: Event[] = [];
    instrument.on((event) => {
      events.push(event);
    });
    await instrument.ready;
    instrument.send({ t: "deck.load", deck: "a", source: { gen: "sine", secs: 2, hz: 440 } });
    await settle();
    instrument.send({ t: "deck.loop", deck: "a", in: 0, out: 1 });

    instrument.send({ t: "deck.flatten", deck: "a", id: "flat-1" });
    await settle();

    expect(events.at(-1)).toMatchObject({
      t: "error",
      detail: "no render host: deck.flatten cannot render what it keeps",
    });
    expect(instrument.probe().decks.a!.source).toEqual({ gen: "sine", secs: 2, hz: 440 });
  });

  it("stores nothing when the render's own log holds a refusal", async () => {
    const { instrument, calls, events, blobs } = fixture({
      events: [{ seq: 0, at: 0, wall: 0, t: "error", detail: "deck a has nothing loaded" }],
    });
    await instrument.ready;
    await performing(instrument);
    calls.length = 0;

    instrument.send({ t: "deck.flatten", deck: "a", id: "flat-1" });
    await settle();

    expect(events.at(-1)).toMatchObject({
      t: "error",
      detail: "deck.flatten: the render refused a command: deck a has nothing loaded",
    });
    expect(calls).toEqual(["render:1.05"]);
    expect(blobs.has("flat-1")).toBe(false);
    expect(instrument.probe().decks.a!.source).toEqual({ blobId: "imported" });
  });
});
