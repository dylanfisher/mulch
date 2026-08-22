/**
 * @role Pure contract tests for facade persistence: async blob commands, hydration, manual save,
 *   and durable-projection autosave behavior without IndexedDB or an AudioContext.
 */
// One test per persistence contract; keeping them together makes cross-command races visible.
// oxlint-disable max-lines, import/max-dependencies
import { afterEach, describe, expect, it, vi } from "vitest";

import { DECK_PARAM_DEFAULTS, effectParamDefaults } from "@/audio/params";
import { INITIAL_YARD_EMOJI, INITIAL_YARD_NAME } from "@/lib/copy";
import { createSessionArchive } from "@/lib/sessionArchive";
import type { Session } from "@/state/session";
import { sessionBlobIds, sessionSnapshot } from "@/state/session";
import {
  activateDeck,
  addDeck,
  createSessionStore,
  patchDeck,
  type SessionStore,
} from "@/state/store";
import { manualClock } from "./clock";
import type { Event } from "./events";
import type { Command } from "./commands";
import { engineDouble, repositoryDouble, turns } from "./persistenceDouble";
import { AUTOSAVE_DELAY_MS, createInstrument } from "./facade";

/** The snapshot a fresh instrument saves after being sent these adds, and nothing else. */
const savedAfter = async (adds: readonly Command[]): Promise<Session | undefined> => {
  const repository = repositoryDouble();
  const instrument = createInstrument(manualClock(), () => engineDouble(), repository);
  await instrument.ready;
  for (const add of adds) instrument.send(add);
  instrument.send({ t: "session.save" });
  await turns();
  return repository.saves.at(-1);
};

afterEach(() => {
  vi.useRealTimers();
});

// One case per async command contract; the count tracks the contract rather than shared logic.
// oxlint-disable-next-line max-lines-per-function
describe("persistent commands", () => {
  it("keeps synthetic loading synchronous", () => {
    const instrument = createInstrument(manualClock(), () => engineDouble());
    instrument.send({ t: "deck.load", deck: "a", source: { gen: "sine", secs: 2 } });
    expect(instrument.probe().decks.a!).toMatchObject({
      source: { gen: "sine", secs: 2 },
      duration: 2,
    });
  });

  it("commits a blob source only after retrieval and decode complete", async () => {
    let release: ((blob: Blob | null) => void) | undefined;
    const repository = repositoryDouble();
    repository.blob = () =>
      new Promise<Blob | null>((resolve) => {
        release = resolve;
      });
    const instrument = createInstrument(manualClock(), () => engineDouble(), repository);
    await instrument.ready;
    const events: Event[] = [];
    instrument.on((event) => {
      events.push(event);
    });

    instrument.send({ t: "deck.load", deck: "a", source: { blobId: "kept" } });
    expect(instrument.probe().decks.a!.source).toBeNull();
    release?.(new Blob([new Uint8Array([1, 2, 3])]));
    await turns();

    expect(instrument.probe().decks.a!).toMatchObject({ source: { blobId: "kept" }, duration: 3 });
    expect(events).toMatchObject([{ t: "deck.loaded", deck: "a", duration: 3 }]);
  });

  it("says so on the log when a thumbnail's source is not in the repository, and draws nothing", async () => {
    const repository = repositoryDouble();
    repository.blob = () => Promise.resolve(null);
    const events: Event[] = [];
    const instrument = createInstrument(manualClock(), () => engineDouble(), repository);
    instrument.on((event) => {
      events.push(event);
    });
    await instrument.ready;

    // A clip whose bytes are gone is a blank row, not a crashed paint — and not a silent one.
    await expect(instrument.sourcePeaks({ blobId: "gone" })).resolves.toBeNull();
    expect(events.at(-1)).toMatchObject({
      t: "error",
      detail: /sourcePeaks: .*missing blob: gone/u,
    });
  });

  it("never lets an older blob decode overwrite a newer synthetic load", async () => {
    let finishDecode: ((duration: number) => void) | undefined;
    const repository = repositoryDouble();
    repository.blob = () => Promise.resolve(new Blob(["old"]));
    const instrument = createInstrument(
      manualClock(),
      () =>
        engineDouble(
          () =>
            new Promise<number>((resolve) => {
              finishDecode = resolve;
            }),
        ),
      repository,
    );
    await instrument.ready;

    instrument.send({ t: "deck.load", deck: "a", source: { blobId: "old" } });
    await turns();
    instrument.send({ t: "deck.load", deck: "a", source: { gen: "noise", secs: 2 } });
    finishDecode?.(9);
    await turns();

    expect(instrument.probe().decks.a!).toMatchObject({
      source: { gen: "noise", secs: 2 },
      duration: 2,
    });
  });

  it("keeps the newest blob when two decodes finish in reverse order", async () => {
    const decoders = new Map<string, (duration: number) => void>();
    const repository = repositoryDouble();
    repository.blob = (id) => Promise.resolve(new Blob([id]));
    const instrument = createInstrument(
      manualClock(),
      () =>
        engineDouble(
          (_deck, blobId) =>
            new Promise<number>((resolve) => {
              decoders.set(blobId, resolve);
            }),
        ),
      repository,
    );
    await instrument.ready;

    instrument.send({ t: "deck.load", deck: "a", source: { blobId: "old" } });
    await turns();
    instrument.send({ t: "deck.load", deck: "a", source: { blobId: "new" } });
    await turns();
    decoders.get("new")?.(5);
    await turns();
    decoders.get("old")?.(8);
    await turns();

    expect(instrument.probe().decks.a!).toMatchObject({ source: { blobId: "new" }, duration: 5 });
  });

  it("orders a save after an in-flight load so GC cannot orphan the committed source", async () => {
    let finishDecode: ((duration: number) => void) | undefined;
    const repository = repositoryDouble();
    repository.blob = () => Promise.resolve(new Blob(["audio"]));
    const instrument = createInstrument(
      manualClock(),
      () =>
        engineDouble(
          () =>
            new Promise<number>((resolve) => {
              finishDecode = resolve;
            }),
        ),
      repository,
    );
    await instrument.ready;

    instrument.send({ t: "deck.load", deck: "a", source: { blobId: "loading" } });
    await turns();
    instrument.send({ t: "session.save" });
    await turns();
    expect(repository.saves).toEqual([]);

    finishDecode?.(6);
    await turns();
    expect(repository.saves[0]?.decks.a!.source).toEqual({ blobId: "loading" });
  });

  it("drops a decode still in flight for a deck that has been removed", async () => {
    let finishDecode: ((duration: number) => void) | undefined;
    const repository = repositoryDouble();
    repository.blob = () => Promise.resolve(new Blob(["audio"]));
    const instrument = createInstrument(
      manualClock(),
      () =>
        engineDouble(
          () =>
            new Promise<number>((resolve) => {
              finishDecode = resolve;
            }),
        ),
      repository,
    );
    await instrument.ready;
    const events: Event[] = [];
    instrument.on((event) => {
      events.push(event);
    });

    instrument.send({ t: "deck.load", deck: "a", source: { blobId: "loading" } });
    await turns();
    instrument.send({ t: "deck.remove", deck: "a" });
    finishDecode?.(6);
    await turns();

    // The completion is about a deck nothing holds. It drops itself by identity rather than
    // writing to a row that is gone, so the log carries the removal and no failure (0029).
    expect(instrument.probe().deckList).toEqual([]);
    expect(events.filter((event) => event.t === "error")).toEqual([]);
    expect(events.at(-1)).toMatchObject({ t: "deck.removed", deck: "a" });
  });

  it("reports missing and undecodable blobs without partial state", async () => {
    const missing = repositoryDouble();
    const missingInstrument = createInstrument(manualClock(), () => engineDouble(), missing);
    await missingInstrument.ready;
    const missingEvents: Event[] = [];
    missingInstrument.on((event) => {
      missingEvents.push(event);
    });
    missingInstrument.send({ t: "deck.load", deck: "a", source: { blobId: "gone" } });
    await turns();
    expect(missingInstrument.probe().decks.a!.source).toBeNull();
    expect(missingEvents.at(-1)).toMatchObject({ t: "error", detail: /missing blob: gone/u });

    const undecodable = repositoryDouble();
    undecodable.blob = () => Promise.resolve(new Blob(["not audio"]));
    const decodeInstrument = createInstrument(
      manualClock(),
      () => engineDouble(() => Promise.reject(new DOMException("decode failed"))),
      undecodable,
    );
    await decodeInstrument.ready;
    const decodeEvents: Event[] = [];
    decodeInstrument.on((event) => {
      decodeEvents.push(event);
    });
    decodeInstrument.send({ t: "deck.load", deck: "a", source: { blobId: "bad" } });
    await turns();
    expect(decodeInstrument.probe().decks.a!.source).toBeNull();
    expect(decodeEvents.at(-1)).toMatchObject({ t: "error", detail: /decode failed/u });

    // Untouched means untouched, which is the half the case above cannot show: a deck already
    // holding something keeps it, and the failure is an error event and nothing else. 0043 makes
    // this a promise rather than an accident of where `patchDeck` sits.
    decodeInstrument.send({ t: "deck.load", deck: "a", source: { gen: "sine", secs: 1 } });
    await turns();
    decodeInstrument.send({ t: "deck.load", deck: "a", source: { blobId: "bad" } });
    await turns();
    expect(decodeInstrument.probe().decks.a!.source).toEqual({ gen: "sine", secs: 1 });
    expect(decodeEvents.at(-1)).toMatchObject({ t: "error", detail: /decode failed/u });
  });

  it("makes a removed deck's blob collectable, once nothing can undo back to it", async () => {
    const repository = repositoryDouble();
    const instrument = createInstrument(manualClock(), () => engineDouble(), repository);
    await instrument.ready;
    const blobId = await instrument.ingest(new File([Uint8Array.of(1, 2, 3)], "source.wav"));
    instrument.send({ t: "deck.load", deck: "a", source: { blobId } });
    await turns();

    instrument.send({ t: "deck.remove", deck: "a" });
    instrument.send({ t: "session.save" });
    await turns();

    // The one reachability projection GC, archives and history all share no longer names it:
    // no deck, no clip, nothing (0027, 0029).
    const saved = repository.saves.at(-1);
    if (saved === undefined) throw new Error("the removal was never saved");
    expect(saved.deckList).toEqual([]);
    expect([...sessionBlobIds(saved)]).toEqual([]);
    // It survives this save only because undo can still put the deck back — the existing rule,
    // and the reason removal deletes no bytes of its own.
    expect([...(repository.kept.at(-1) ?? [])]).toEqual([blobId]);

    // A fresh history root is the last referrer letting go; the next save collects the bytes.
    const archive = createSessionArchive(sessionSnapshot(instrument.state.getState()), new Map());
    instrument.send({
      t: "session.import",
      archive: await instrument.ingestSession(new File([archive], "empty.mulch")),
    });
    await turns();
    instrument.send({ t: "session.save" });
    await turns();
    expect([...(repository.kept.at(-1) ?? [])]).toEqual([]);
  });

  it("rejects ingest and reports save when persistence is absent", async () => {
    const instrument = createInstrument(manualClock());
    const events: Event[] = [];
    instrument.on((event) => {
      events.push(event);
    });
    await expect(instrument.ingest(new File(["x"], "x.wav"))).rejects.toThrow(/no persistence/u);
    instrument.send({ t: "session.save" });
    expect(events.at(-1)).toMatchObject({ t: "error", detail: /no persistence/u });
  });

  it("says on the log why a blob load did nothing when there is a graph but no storage", () => {
    // The configuration a render is: `renderOffline` builds an instrument with an engine and,
    // when it was handed no blobs, no repository at all. A `deck.load` of a stored blob there is
    // unanswerable rather than malformed, so it belongs on the log the render reads back (0009).
    const calls: string[] = [];
    const instrument = createInstrument(manualClock(), () => engineDouble(undefined, calls));
    const events: Event[] = [];
    instrument.on((event) => {
      events.push(event);
    });

    instrument.send({ t: "deck.load", deck: "a", source: { blobId: "imported" } });

    expect(calls).toEqual([]);
    expect(instrument.probe().decks.a?.source).toBeNull();
    expect(events).toMatchObject([
      { t: "error", detail: /no persistence: deck\.load cannot retrieve a blob/u },
    ]);
  });
});

// Hydration and timer contracts are one linear setup each; see 0007.
// oxlint-disable-next-line max-lines-per-function
describe("restoration and autosave", () => {
  it("awaits hydration through the graph and restores decks stopped with recomputed duration", async () => {
    const sourceStore = createSessionStore();
    patchDeck(sourceStore, "a", {
      source: { blobId: "saved" },
      duration: 99,
      playing: true,
      effects: [
        {
          id: "flt",
          effect: "filter",
          bypassed: false,
          params: effectParamDefaults("filter"),
          automation: {},
        },
      ],
      automation: { "deck.gain": [{ at: 1, value: 0.25 }] },
      loop: { in: 0.5, out: 1.5 },
    });
    addDeck(sourceStore, "b", "🌴", "North Willow");
    activateDeck(sourceStore, "b");
    const repository = repositoryDouble(sessionSnapshot(sourceStore.getState()));
    repository.blob = () => Promise.resolve(new Blob(["bytes"]));
    const calls: string[] = [];
    const instrument = createInstrument(
      manualClock(),
      () => engineDouble(() => Promise.resolve(4), calls),
      repository,
    );

    await instrument.ready;

    expect(instrument.probe().decks.a!).toMatchObject({
      source: { blobId: "saved" },
      duration: 4,
      playing: false,
      effects: [{ id: "flt", effect: "filter" }],
      loop: { in: 0.5, out: 1.5 },
    });
    expect(instrument.probe().activeDeck).toBe("b");
    expect(calls.indexOf("loadBlob:a")).toBeLessThan(calls.indexOf("param:a:deck.gain"));
    // An instance's own values follow its addition, and every lane follows both (0030).
    expect(calls.indexOf("param:b:deck.pan")).toBeLessThan(calls.indexOf("effect:a:filter"));
    expect(calls.indexOf("effect:a:filter")).toBeLessThan(calls.indexOf("param:a:filter.cutoff"));
    const lastValue = calls.indexOf("param:a:filter.cutoff");
    expect(lastValue).toBeLessThan(calls.indexOf("automation:a:deck.gain"));
    expect(calls.indexOf("automation:a:deck.gain")).toBeLessThan(calls.indexOf("loop:a"));
    expect(repository.saves).toEqual([]);
    expect(instrument.ring().at(-1)).toMatchObject({ t: "session.restored" });
    expect(instrument.history.getState()).toEqual({ canUndo: false, canRedo: false });
  });

  it("discards stored data that is not this build's shape and boots fresh", async () => {
    const stale = sessionSnapshot(createSessionStore().getState());
    // What a session written by an older build looks like once a parameter has been registered:
    // pre-release keeps no migration, so this is dropped rather than repaired (0026).
    const repository = repositoryDouble({
      ...stale,
      version: 4,
      decks: { ...stale.decks, a: { ...stale.decks.a!, params: { "deck.gain": 0.4 } } },
    });
    const instrument = createInstrument(manualClock(), () => engineDouble(), repository);

    await instrument.ready;

    expect(instrument.ring().at(-1)).toMatchObject({
      t: "session.discarded",
      detail: /has keys/u,
    });
    expect(instrument.ring().some((event) => event.t === "session.restored")).toBe(false);
    expect(instrument.probe().decks.a!.params["deck.gain"]).toBe(DECK_PARAM_DEFAULTS["deck.gain"]);
    // The unreadable snapshot is replaced immediately, so it cannot fail the next boot too.
    expect(repository.saves).toEqual([sessionSnapshot(createSessionStore().getState())]);
  });

  it("coalesces durable mutations, ignores transient writes, and labels autosaves", async () => {
    vi.useFakeTimers();
    const repository = repositoryDouble();
    let store: SessionStore | undefined;
    const instrument = createInstrument(
      manualClock(),
      (created) => {
        store = created;
        return engineDouble();
      },
      repository,
    );
    await instrument.ready;
    const events: Event[] = [];
    instrument.on((event) => {
      events.push(event);
    });

    instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value: 0.5 });
    instrument.send({ t: "param.set", deck: "a", param: "deck.pan", value: -0.25 });
    instrument.send({ t: "deck.add", deck: "b", emoji: "🌴", name: "North Willow" });
    instrument.send({ t: "deck.activate", deck: "b" });
    if (store === undefined) throw new Error("engine factory did not receive the store");
    patchDeck(store, "a", { duration: 123, playing: true });
    instrument.peek("a");
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS - 1);
    expect(repository.saves).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    await turns();

    expect(repository.saves).toHaveLength(1);
    expect(repository.saves[0]?.decks.a!.params).toMatchObject({
      "deck.gain": 0.5,
      "deck.pan": -0.25,
    });
    expect(repository.saves[0]?.activeDeck).toBe("b");
    expect(events.at(-1)).toMatchObject({ t: "session.saved", reason: "autosave" });
  });

  /**
   * 0057: a yard's emoji and name are durable shape, so they survive the save and come back
   * through restoration — which replays `deck.add` — rather than being redrawn on boot. They
   * belong to the yard added and not to the id: reusing a removed one's id takes a new draw.
   */
  it("round-trips each yard's emoji and name, and never resurrects a removed one's", async () => {
    const addB: Command = { t: "deck.add", deck: "b", emoji: "🌵", name: "Wild Bramble" };
    const grown = [
      { id: "a", emoji: INITIAL_YARD_EMOJI, name: INITIAL_YARD_NAME },
      { id: "b", emoji: "🌵", name: "Wild Bramble" },
    ];

    expect((await savedAfter([addB]))?.deckList).toEqual(grown);

    const restored = createInstrument(
      manualClock(),
      () => engineDouble(),
      repositoryDouble(await savedAfter([addB])),
    );
    await restored.ready;
    expect(restored.probe().deckList).toEqual(grown);

    const reused = await savedAfter([
      addB,
      { t: "deck.remove", deck: "b" },
      { t: "deck.add", deck: "b", emoji: "🐝", name: "Deep Moss" },
    ]);
    expect(reused?.deckList).toEqual([
      { id: "a", emoji: INITIAL_YARD_EMOJI, name: INITIAL_YARD_NAME },
      { id: "b", emoji: "🐝", name: "Deep Moss" },
    ]);
  });

  it("manual save flushes the current snapshot and replaces a pending autosave", async () => {
    vi.useFakeTimers();
    const repository = repositoryDouble();
    const instrument = createInstrument(manualClock(), undefined, repository);
    await instrument.ready;
    const events: Event[] = [];
    instrument.on((event) => {
      events.push(event);
    });

    instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value: 0.25 });
    instrument.send({ t: "session.save" });
    await turns();
    expect(repository.saves).toHaveLength(1);
    expect(events.at(-1)).toMatchObject({ t: "session.saved", reason: "manual" });

    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS);
    expect(repository.saves).toHaveLength(1);
  });
});
