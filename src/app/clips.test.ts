/**
 * @role Seam-level contract tests for the clip rack: capture, rename, delete and apply as
 *   ordinary commands, the grouped atomic apply, and the refusal that happens before the deck or
 *   the graph moves (0027).
 */
// One flat list of the four clip commands' success and refusal cases, beside the graph double
// they are asserted against (0007).
// oxlint-disable max-lines, max-lines-per-function
import { describe, expect, it } from "vitest";

import type { Session } from "@/state/session";
import type { SessionRepository } from "@/state/repository";
import { deckIdsOf, fromDecks } from "@/state/store";
import { manualClock } from "./clock";
import type { Engine } from "./engine";
import { silentEngine } from "./engineDouble";
import type { Event } from "./events";
import { createInstrument, type Instrument } from "./facade";

/** Every graph call the clip work can make, in the order the host made it. */
type GraphCalls = string[];

const stubEngine = (
  calls: GraphCalls,
  prepareRestore: Engine["prepareRestore"] = (session) =>
    Promise.resolve({
      durations: fromDecks(deckIdsOf(session.deckList), () => 0),
      commit: () => {},
      measure: () => {},
      discard: () => {},
    }),
): Engine =>
  silentEngine({
    load: (deck, source) => {
      calls.push(`load:${deck}`);
      return source.secs;
    },
    loadBlob: (deck) => {
      calls.push(`loadBlob:${deck}`);
      return Promise.resolve(1);
    },
    setLoop: (deck, inSecs, outSecs) => {
      calls.push(`loop:${deck}`);
      return outSecs > inSecs ? { in: inSecs, out: outSecs } : null;
    },
    setParam: (deck, param) => {
      calls.push(`param:${deck}:${param}`);
    },
    setAutomation: (deck, param) => {
      calls.push(`automation:${deck}:${param}`);
    },
    addEffect: (deck, effect) => {
      calls.push(`add:${deck}:${effect}`);
      return 0;
    },
    setEffectBypass: (deck, instance) => {
      calls.push(`bypass:${deck}:${instance}`);
    },
    removeEffect: (deck, instance) => {
      calls.push(`remove:${deck}:${instance}`);
    },
    reorderEffects: (deck) => {
      calls.push(`reorder:${deck}`);
    },
    prepareRestore,
  });

const settle = async (): Promise<void> => {
  for (let remaining = 60; remaining > 0; remaining--) {
    // Apply chains a verification, a rollback preparation and one command per stage.
    // oxlint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
};

type Fixture = { instrument: Instrument; calls: GraphCalls; events: Event[] };

/** A prepared graph that refuses the moment the target deck holds the clip's rack. */
const refusesToPrepare: Engine["prepareRestore"] = (session: Session) =>
  session.decks.b!.effects.some((entry) => entry.effect === "filter")
    ? Promise.reject(new Error("corrupt source"))
    : Promise.resolve({
        durations: fromDecks(deckIdsOf(session.deckList), () => 0),
        commit: () => {},
        measure: () => {},
        discard: () => {},
      });

const fixture = (
  repository: SessionRepository | null = null,
  prepareRestore?: Engine["prepareRestore"],
): Fixture => {
  const calls: GraphCalls = [];
  const instrument = createInstrument(
    manualClock(),
    () => stubEngine(calls, prepareRestore),
    repository,
  );
  // The second deck a clip is applied to is one this session added; b is no longer there by
  // default, and every fixture that names it has to create it (0029).
  instrument.send({ t: "deck.add", deck: "b", emoji: "🌴", name: "North Willow" });
  const events: Event[] = [];
  instrument.on((event) => {
    events.push(event);
  });
  return { instrument, calls, events };
};

/** A deck worth capturing: a source, a rack with one effect bypassed, a lane, and a loop. */
const dressDeck = (instrument: Instrument): void => {
  instrument.send({ t: "deck.load", deck: "a", source: { gen: "sine", secs: 2, hz: 440 } });
  instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value: 0.5 });
  instrument.send({ t: "effect.add", deck: "a", id: "flt", effect: "filter" });
  instrument.send({ t: "effect.add", deck: "a", id: "dly", effect: "delay" });
  instrument.send({ t: "effect.bypass", deck: "a", instance: "dly", bypassed: true });
  instrument.send({
    t: "automation.set",
    deck: "a",
    instance: "flt",
    param: "filter.cutoff",
    points: [
      { at: 0, value: 400 },
      { at: 1, value: 900 },
    ],
  });
  instrument.send({ t: "deck.loop", deck: "a", in: 0.25, out: 1 });
};

/** The one element a clip assertion is about, or a failure that says the list was empty. */
const only = <T>(list: readonly T[]): T => {
  const [first] = list;
  if (first === undefined) throw new Error("expected exactly one clip");
  return first;
};

const detail = (events: Event[]): string[] =>
  events.filter((event) => event.t === "error").map((event) => event.detail);

describe("clip capture, rename and delete", () => {
  it("captures the whole deck preset and says so on the log", () => {
    const { instrument, events } = fixture();
    dressDeck(instrument);
    instrument.send({ t: "clip.capture", id: "clip-1", name: "intro", deck: "a" });

    const clips = instrument.probe().clips;
    expect(clips).toHaveLength(1);
    const captured = only(clips);
    expect(captured.id).toBe("clip-1");
    expect(captured.name).toBe("intro");
    expect(captured.deck).toEqual({
      params: instrument.probe().decks.a!.params,
      automation: {},
      // The rack travels as its instances, each carrying its own values, lanes and bypass (0030).
      effects: instrument.probe().decks.a!.effects,
      source: { gen: "sine", secs: 2, hz: 440 },
      loop: { in: 0.25, out: 1 },
      player: null,
    });
    expect(captured.deck.effects.map((entry) => [entry.id, entry.bypassed])).toEqual([
      ["flt", false],
      ["dly", true],
    ]);
    expect(captured.deck.effects[0]?.automation).toEqual({
      "filter.cutoff": [
        { at: 0, value: 400 },
        { at: 1, value: 900 },
      ],
    });
    // A clip is data: it carries none of the transient, graph-owned deck fields (0027).
    expect(captured.deck).not.toHaveProperty("playing");
    expect(captured.deck).not.toHaveProperty("duration");
    expect(captured.deck).not.toHaveProperty("analysis");
    expect(events.at(-1)).toMatchObject({
      t: "clip.captured",
      clip: "clip-1",
      name: "intro",
      deck: "a",
    });
  });

  it("refuses an empty deck and a duplicate id, changing nothing either time", () => {
    const { instrument, events } = fixture();
    instrument.send({ t: "clip.capture", id: "clip-1", name: "nothing", deck: "a" });
    expect(instrument.probe().clips).toEqual([]);

    dressDeck(instrument);
    instrument.send({ t: "clip.capture", id: "clip-1", name: "intro", deck: "a" });
    instrument.send({ t: "clip.capture", id: "clip-1", name: "again", deck: "a" });
    expect(instrument.probe().clips).toHaveLength(1);
    expect(only(instrument.probe().clips).name).toBe("intro");
    expect(detail(events)).toEqual([
      "clip.capture: deck a has nothing loaded",
      "clip.capture: clip already exists: clip-1",
    ]);
  });

  it("renames and deletes through ordinary durable commands", () => {
    const { instrument, events } = fixture();
    dressDeck(instrument);
    instrument.send({ t: "clip.capture", id: "clip-1", name: "intro", deck: "a" });
    instrument.send({ t: "clip.rename", id: "clip-1", name: "verse" });
    expect(only(instrument.probe().clips).name).toBe("verse");
    // Renaming to the name it already has is not a change, so it says nothing.
    instrument.send({ t: "clip.rename", id: "clip-1", name: "verse" });
    instrument.send({ t: "clip.delete", id: "clip-1" });
    expect(instrument.probe().clips).toEqual([]);

    expect(events.filter((event) => event.t.startsWith("clip.")).map((event) => event.t)).toEqual([
      "clip.captured",
      "clip.renamed",
      "clip.deleted",
    ]);
  });

  it("refuses every clip command that names a clip the session does not hold", () => {
    const { instrument, events } = fixture();
    instrument.send({ t: "clip.rename", id: "ghost", name: "x" });
    instrument.send({ t: "clip.delete", id: "ghost" });
    expect(detail(events)).toEqual(["clip.rename: no clip ghost", "clip.delete: no clip ghost"]);
    expect(instrument.probe().clips).toEqual([]);
  });

  it("refuses an id or a name that is not bounded durable text", () => {
    const { instrument } = fixture();
    dressDeck(instrument);
    expect(() => {
      instrument.send({ t: "clip.capture", id: "clip-1", name: "", deck: "a" });
    }).toThrow(/clip\.capture name is not a non-empty string/u);
    expect(() => {
      instrument.send({ t: "clip.capture", id: "clip-1", name: "x".repeat(65), deck: "a" });
    }).toThrow(/longer than 64/u);
    // An id is durable text too: the bound is the same one, not a second decision.
    expect(() => {
      instrument.send({ t: "clip.capture", id: "x".repeat(65), name: "intro", deck: "a" });
    }).toThrow(/clip\.capture id is longer than 64/u);
    expect(instrument.probe().clips).toEqual([]);
  });
});

describe("clip.apply", () => {
  it("rewrites the target deck in the restoration order, as one undoable edit", async () => {
    const { instrument, calls, events } = fixture();
    dressDeck(instrument);
    instrument.send({ t: "clip.capture", id: "clip-1", name: "intro", deck: "a" });
    calls.length = 0;

    instrument.send({ t: "clip.apply", id: "clip-1", deck: "b" });
    await settle();

    const applied = instrument.probe().decks.b!;
    const clip = only(instrument.probe().clips);
    expect(applied.effects).toEqual(clip.deck.effects);
    expect(applied.automation).toEqual(clip.deck.automation);
    expect(applied.source).toEqual(clip.deck.source);
    expect(applied.loop).toEqual(clip.deck.loop);
    expect(applied.params).toEqual(clip.deck.params);
    // The deck it was captured from is untouched: a clip is applied, never moved.
    expect(instrument.probe().decks.a!.effects.map((entry) => entry.effect)).toEqual([
      "filter",
      "delay",
    ]);

    const kinds = calls.filter((call) => call.includes(":b"));
    const index = (prefix: string) => kinds.findIndex((call) => call.startsWith(prefix));
    const last = (prefix: string) =>
      kinds.reduce((found, call, at) => (call.startsWith(prefix) ? at : found), -1);
    expect(last("load:")).toBeLessThan(index("param:"));
    // Deck parameters lead; an instance's own values follow its addition, because they are the
    // instance's and there is nothing to hold them before it exists (0030).
    expect(index("param:")).toBeLessThan(index("add:"));
    expect(last("add:")).toBeLessThan(last("param:"));
    expect(last("param:")).toBeLessThan(index("bypass:"));
    expect(index("bypass:")).toBeLessThan(index("automation:"));
    expect(index("automation:")).toBeLessThan(index("loop:"));

    // One grouped edit: one clip.applied, and one undo that puts deck b back the way it was.
    expect(events.filter((event) => event.t === "clip.applied")).toHaveLength(1);
    expect(instrument.history.getState().canUndo).toBe(true);
    instrument.send({ t: "history.undo" });
    await settle();
    expect(instrument.probe().decks.b!.effects).toEqual([]);
    expect(instrument.probe().decks.b!.source).toBeNull();
  });

  it("clears the effects and lanes the clip does not carry", async () => {
    const { instrument } = fixture();
    dressDeck(instrument);
    instrument.send({ t: "clip.capture", id: "clip-1", name: "intro", deck: "a" });

    instrument.send({ t: "deck.load", deck: "b", source: { gen: "noise", secs: 1 } });
    instrument.send({ t: "effect.add", deck: "b", id: "eq1", effect: "eq" });
    instrument.send({
      t: "automation.set",
      deck: "b",
      param: "deck.gain",
      points: [
        { at: 0, value: 0.2 },
        { at: 1, value: 0.9 },
      ],
    });

    instrument.send({ t: "clip.apply", id: "clip-1", deck: "b" });
    await settle();

    const applied = instrument.probe().decks.b!;
    expect(applied.effects.map((entry) => entry.effect)).toEqual(["filter", "delay"]);
    // The deck-level lane the clip does not carry is cleared, and the clip's own instance lane
    // arrives on the instance that holds it (0030).
    expect(applied.automation).toEqual({});
    expect(applied.effects.map((entry) => Object.keys(entry.automation))).toEqual([
      ["filter.cutoff"],
      [],
    ]);
  });

  it("refuses before the deck or the graph changes when the source cannot be restored", async () => {
    const blobs = new Map<string, Blob>();
    const repository: SessionRepository = {
      // Nothing stored: hydration finds no snapshot and the instrument boots empty.
      load: () => Promise.resolve(),
      save: () => Promise.resolve(),
      ingest: () => Promise.resolve("blob-1"),
      blob: (id) => Promise.resolve(blobs.get(id) ?? null),
      blobs: (ids) => {
        for (const id of ids) if (!blobs.has(id)) throw new Error(`missing blob: ${id}`);
        return Promise.resolve(new Map());
      },
      replace: () => Promise.resolve(),
    };
    blobs.set("blob-1", new Blob([Uint8Array.of(1, 2, 3)]));
    const { instrument, calls, events } = fixture(repository);
    await instrument.ready;

    instrument.send({ t: "deck.load", deck: "a", source: { blobId: "blob-1" } });
    await settle();
    instrument.send({ t: "clip.capture", id: "clip-1", name: "sample", deck: "a" });
    // The bytes go away underneath the clip, the way a garbage-collected blob does.
    blobs.delete("blob-1");

    instrument.send({ t: "deck.load", deck: "b", source: { gen: "noise", secs: 1 } });
    instrument.send({ t: "effect.add", deck: "b", id: "eq1", effect: "eq" });
    await settle();
    const before = instrument.probe().decks.b!;
    calls.length = 0;

    instrument.send({ t: "clip.apply", id: "clip-1", deck: "b" });
    await settle();

    expect(detail(events).at(-1)).toMatch(/clip\.apply: .*missing blob: blob-1/u);
    expect(events.some((event) => event.t === "clip.applied")).toBe(false);
    // Nothing was said and nothing was done: the refusal landed before the first command ran.
    expect(calls).toEqual([]);
    expect(instrument.probe().decks.b!).toEqual(before);
  });

  it("refuses a source the graph cannot decode, before anything moves", async () => {
    const { instrument, calls, events } = fixture(null, refusesToPrepare);
    dressDeck(instrument);
    instrument.send({ t: "clip.capture", id: "clip-1", name: "intro", deck: "a" });
    const before = instrument.probe().decks.b!;
    calls.length = 0;

    instrument.send({ t: "clip.apply", id: "clip-1", deck: "b" });
    await settle();

    expect(detail(events).at(-1)).toMatch(/clip\.apply: .*corrupt source/u);
    expect(calls).toEqual([]);
    expect(instrument.probe().decks.b!).toEqual(before);
  });

  it("refuses a clip the session does not hold", async () => {
    const { instrument, calls, events } = fixture();
    instrument.send({ t: "clip.apply", id: "ghost", deck: "b" });
    await settle();
    expect(detail(events)).toEqual(["clip.apply: no clip ghost"]);
    expect(calls).toEqual([]);
  });
});
