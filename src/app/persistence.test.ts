/**
 * @role Pure contract tests for facade persistence: async blob commands, hydration, manual save,
 *   and durable-projection autosave behavior without IndexedDB or an AudioContext.
 */
// One test per persistence contract; keeping them together makes cross-command races visible.
// The archive cases add their pure container and store fixtures to the same seam-level matrix.
// oxlint-disable max-lines, import/max-dependencies
import { afterEach, describe, expect, it, vi } from "vitest";

import { DECK_PARAM_DEFAULTS, effectParamDefaults, type ParamId } from "@/audio/params";
import type { BlobId } from "@/lib/source";
import { createSessionArchive } from "@/lib/sessionArchive";
import type { SessionRepository } from "@/state/repository";
import type { Session } from "@/state/session";
import { sessionBlobIds, sessionSnapshot } from "@/state/session";
import {
  activateDeck,
  addDeck,
  createSessionStore,
  deckIn,
  fromDecks,
  patchDeck,
  type SessionStore,
} from "@/state/store";
import { manualClock } from "./clock";
import type { Engine } from "./engine";
import type { Event } from "./events";
import { AUTOSAVE_DELAY_MS, createInstrument } from "./facade";

type RepositoryDouble = SessionRepository & {
  saves: Session[];
  /** The reachable set each save was told to keep — everything else is what GC collects. */
  kept: Set<BlobId>[];
  ingests: File[];
  blobMap: Map<BlobId, Blob>;
};

function repositoryDouble(stored?: unknown): RepositoryDouble {
  const blobs = new Map<BlobId, Blob>();
  const saves: Session[] = [];
  const kept: Set<BlobId>[] = [];
  const ingests: File[] = [];
  return {
    saves,
    kept,
    ingests,
    blobMap: blobs,
    load: () => Promise.resolve(stored),
    save: (session, retained = new Set()) => {
      saves.push(session);
      kept.push(new Set(retained));
      return Promise.resolve();
    },
    ingest: (file) => {
      ingests.push(file);
      const id = `blob-${ingests.length}`;
      blobs.set(id, file);
      return Promise.resolve(id);
    },
    blob: (id) => Promise.resolve(blobs.get(id) ?? null),
    blobs: async (ids) =>
      new Map(
        await Promise.all(
          [...ids].map(async (id) => {
            const blob = blobs.get(id);
            if (blob === undefined) throw new Error(`missing blob: ${id}`);
            return [id, new Uint8Array(await blob.arrayBuffer())] as const;
          }),
        ),
      ),
    replace: (session, imported) => {
      saves.push(session);
      blobs.clear();
      for (const [id, bytes] of imported) blobs.set(id, new Blob([bytes]));
      return Promise.resolve();
    },
  };
}

// A flat stub per Engine method, so the length tracks the size of the interface rather than any
// logic in the double (0007).
// oxlint-disable-next-line max-lines-per-function
const engineDouble = (
  loadBlob: Engine["loadBlob"] = () => Promise.resolve(3),
  calls: string[] = [],
  /**
   * The store a prepared restore measures into, or null for a double that does not. The real
   * host's `measure()` writes every restored deck, which is why it runs after the session has
   * been replaced rather than inside `commit()` — a restore may add decks the live one never
   * held, and `patchDeck` refuses those (0029). Passing the store is what makes that ordering
   * observable here instead of only in the browser smoke.
   */
  store: SessionStore | null = null,
): Engine => ({
  addDeck: (deck) => {
    calls.push(`addDeck:${deck}`);
  },
  removeDeck: (deck) => {
    calls.push(`removeDeck:${deck}`);
  },
  load: (deck, source) => {
    calls.push(`load:${deck}`);
    return source.secs;
  },
  loadBlob: (deck, blob, current) => {
    calls.push(`loadBlob:${deck}`);
    return loadBlob(deck, blob, current).then((duration) => (current() ? duration : null));
  },
  play: () => {},
  playTogether: () => {},
  stop: () => {},
  planned: () => false,
  setLoop: (deck, from, to) => {
    calls.push(`loop:${deck}`);
    return { in: from, out: to };
  },
  setParam: (deck, _instance, param: ParamId) => {
    calls.push(`param:${deck}:${param}`);
  },
  setAutomation: (deck, _instance, param) => {
    calls.push(`automation:${deck}:${param}`);
  },
  addEffect: (deck, _instance, effect) => {
    calls.push(`effect:${deck}:${effect}`);
    return 0;
  },
  setEffectBypass: (deck, effect, bypassed) => {
    calls.push(`bypass:${deck}:${effect}:${String(bypassed)}`);
  },
  removeEffect: (deck, effect) => {
    calls.push(`remove:${deck}:${effect}`);
  },
  reorderEffects: (deck, order) => {
    calls.push(`reorder:${deck}:${order.join("|")}`);
  },
  peek: () => {},
  peaks: () => null,
  contextState: () => "running",
  analyzing: () => 0,
  prepareRestore: (session) =>
    Promise.resolve({
      durations: fromDecks(session.deckIds, (deck) =>
        deckIn(session.decks, deck).source === null ? 0 : 3,
      ),
      commit: () => {},
      measure: () => {
        if (store === null) return;
        for (const deck of session.deckIds) patchDeck(store, deck, { analysis: null });
      },
      discard: () => {},
    }),
});

const turns = async (): Promise<void> => {
  for (let remaining = 8; remaining > 0; remaining--) {
    // Promise chains in the facade deliberately serialize decode, snapshot, repository commit,
    // and event emission. Drain that finite microtask chain without advancing fake time.
    // oxlint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
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
        engineDouble(async (_deck, blob) => {
          const id = await blob.text();
          return new Promise<number>((resolve) => {
            decoders.set(id, resolve);
          });
        }),
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
    expect(instrument.probe().deckIds).toEqual([]);
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
    expect(saved.deckIds).toEqual([]);
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
    addDeck(sourceStore, "b");
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
    instrument.send({ t: "deck.add", deck: "b" });
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

// One linear source/fresh-repository setup proves the complete public round trip. Splitting it
// would hide which state and byte assertions belong to which side. See 0007.
// oxlint-disable-next-line max-lines-per-function
describe("portable sessions", () => {
  it("exports exact reachable bytes and imports the durable session into a fresh repository", async () => {
    const sourceRepository = repositoryDouble();
    const source = createInstrument(manualClock(), () => engineDouble(), sourceRepository);
    await source.ready;
    const bytes = Uint8Array.of(0, 1, 2, 255);
    const blobId = await source.ingest(new File([bytes], "source.wav"));
    source.send({ t: "deck.load", deck: "a", source: { blobId } });
    source.send({ t: "param.set", deck: "a", param: "deck.gain", value: 0.4 });
    source.send({
      t: "automation.set",
      deck: "a",
      param: "deck.gain",
      points: [
        { at: 0, value: 0.2 },
        { at: 1, value: 0.8 },
      ],
    });
    source.send({ t: "effect.add", deck: "a", id: "flt", effect: "filter" });
    source.send({ t: "deck.add", deck: "b" });
    source.send({ t: "deck.activate", deck: "b" });
    await turns();
    const expected = sessionSnapshot(source.state.getState());
    const file = await source.exportSession();

    const freshRepository = repositoryDouble();
    // The fresh session boots with deck a alone, so the imported one adds a deck this store has
    // never held — and the double measures into it, which only works once the session is in.
    const fresh = createInstrument(
      manualClock(),
      (store) => engineDouble(undefined, [], store),
      freshRepository,
    );
    await fresh.ready;
    const handle = await fresh.ingestSession(file);
    expect(JSON.parse(JSON.stringify(handle))).toEqual(handle);
    fresh.send({ t: "session.import", archive: handle });
    await turns();

    expect(sessionSnapshot(fresh.state.getState())).toEqual(expected);
    expect(new Uint8Array(await freshRepository.blobMap.get(blobId)!.arrayBuffer())).toEqual(bytes);
    expect(freshRepository.blobMap.size).toBe(1);
    expect(fresh.ring().at(-1)).toMatchObject({ t: "session.imported" });
  });

  it("orders import after startup hydration so the later session cannot be overwritten", async () => {
    let finishHydration: ((stored: unknown) => void) | undefined;
    const repository = repositoryDouble();
    repository.load = () =>
      new Promise<unknown>((resolve) => {
        finishHydration = resolve;
      });
    const instrument = createInstrument(manualClock(), () => engineDouble(), repository);
    const importedStore = createSessionStore();
    addDeck(importedStore, "b");
    activateDeck(importedStore, "b");
    patchDeck(importedStore, "a", (deck) => ({
      params: { ...deck.params, "deck.gain": 0.4 },
    }));
    const archive = createSessionArchive(sessionSnapshot(importedStore.getState()), new Map());
    const handle = await instrument.ingestSession(new File([archive], "startup.mulch"));

    instrument.send({ t: "session.import", archive: handle });
    await turns();
    expect(repository.saves).toEqual([]);

    const stored = createSessionStore();
    patchDeck(stored, "a", (deck) => ({ params: { ...deck.params, "deck.gain": 0.2 } }));
    finishHydration?.(sessionSnapshot(stored.getState()));
    await instrument.ready;
    await turns();

    expect(sessionSnapshot(instrument.state.getState())).toEqual(
      sessionSnapshot(importedStore.getState()),
    );
    expect(repository.saves).toEqual([sessionSnapshot(importedStore.getState())]);
    expect(
      instrument
        .ring()
        .map((event) => event.t)
        .slice(-2),
    ).toEqual(["session.restored", "session.imported"]);
  });

  it("rejects a staged handle with extra capability-bearing fields", async () => {
    const repository = repositoryDouble();
    const instrument = createInstrument(manualClock(), () => engineDouble(), repository);
    await instrument.ready;
    const importedStore = createSessionStore();
    addDeck(importedStore, "b");
    activateDeck(importedStore, "b");
    const archive = createSessionArchive(sessionSnapshot(importedStore.getState()), new Map());
    const handle = await instrument.ingestSession(new File([archive], "strict.mulch"));

    // @ts-expect-error The untyped JSON/file boundary is the behavior under test.
    instrument.send({ t: "session.import", archive: { ...handle, file: new File([], "raw") } });
    await turns();

    expect(instrument.probe().activeDeck).toBe("a");
    expect(repository.saves).toEqual([]);
    expect(instrument.ring().at(-1)).toMatchObject({
      t: "error",
      detail: /session.import archive is not a valid handle/u,
    });
  });

  it("leaves live state and blob reachability unchanged when import preparation fails", async () => {
    const repository = repositoryDouble();
    repository.blobMap.set("old", new Blob([Uint8Array.of(7)]));
    const instrument = createInstrument(
      manualClock(),
      () => {
        const engine = engineDouble();
        engine.prepareRestore = () => Promise.reject(new DOMException("decode failed"));
        return engine;
      },
      repository,
    );
    await instrument.ready;
    instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value: 0.25 });
    const before = sessionSnapshot(instrument.state.getState());
    const importedStore = createSessionStore();
    patchDeck(importedStore, "a", { source: { blobId: "new" } });
    const archive = createSessionArchive(
      sessionSnapshot(importedStore.getState()),
      new Map([["new", Uint8Array.of(1, 2, 3)]]),
    );
    const handle = await instrument.ingestSession(new File([archive], "bad.mulch"));

    instrument.send({ t: "session.import", archive: handle });
    await turns();

    expect(sessionSnapshot(instrument.state.getState())).toEqual(before);
    expect([...repository.blobMap.keys()]).toEqual(["old"]);
    expect(instrument.ring().at(-1)).toMatchObject({ t: "error", detail: /decode failed/u });
  });

  it("discards a prepared graph when atomic repository replacement fails", async () => {
    const repository = repositoryDouble();
    repository.blobMap.set("old", new Blob([Uint8Array.of(7)]));
    repository.replace = () => Promise.reject(new Error("transaction aborted"));
    let committed = false;
    let discarded = false;
    const instrument = createInstrument(
      manualClock(),
      () => {
        const engine = engineDouble();
        engine.prepareRestore = (session) =>
          Promise.resolve({
            durations: fromDecks(session.deckIds, () => 3),
            commit: () => {
              committed = true;
            },
            measure: () => {},
            discard: () => {
              discarded = true;
            },
          });
        return engine;
      },
      repository,
    );
    await instrument.ready;
    instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value: 0.25 });
    const before = sessionSnapshot(instrument.state.getState());
    const importedStore = createSessionStore();
    patchDeck(importedStore, "a", { source: { blobId: "new" } });
    const archive = createSessionArchive(
      sessionSnapshot(importedStore.getState()),
      new Map([["new", Uint8Array.of(1, 2, 3)]]),
    );
    const handle = await instrument.ingestSession(new File([archive], "failed.mulch"));

    instrument.send({ t: "session.import", archive: handle });
    await turns();

    expect(sessionSnapshot(instrument.state.getState())).toEqual(before);
    expect([...repository.blobMap.keys()]).toEqual(["old"]);
    expect({ committed, discarded }).toEqual({ committed: false, discarded: true });
    expect(instrument.ring().at(-1)).toMatchObject({ t: "error", detail: /transaction aborted/u });
  });
});
