/**
 * @role Pure contract tests for facade persistence: async blob commands, hydration, manual save,
 *   and durable-projection autosave behavior without IndexedDB or an AudioContext.
 */
// One test per persistence contract; keeping them together makes cross-command races visible.
// The archive cases add their pure container and store fixtures to the same seam-level matrix.
// oxlint-disable max-lines, import/max-dependencies
import { afterEach, describe, expect, it, vi } from "vitest";

import { PARAM_DEFAULTS, type ParamId } from "@/audio/params";
import type { BlobId } from "@/lib/source";
import { createSessionArchive } from "@/lib/sessionArchive";
import type { SessionRepository } from "@/state/repository";
import type { Session } from "@/state/session";
import { sessionSnapshot } from "@/state/session";
import { activateDeck, createSessionStore, patchDeck, type SessionStore } from "@/state/store";
import { manualClock } from "./clock";
import type { Engine } from "./engine";
import type { Event } from "./events";
import { AUTOSAVE_DELAY_MS, createInstrument } from "./facade";

type RepositoryDouble = SessionRepository & {
  saves: Session[];
  ingests: File[];
  blobMap: Map<BlobId, Blob>;
};

function repositoryDouble(stored?: unknown): RepositoryDouble {
  const blobs = new Map<BlobId, Blob>();
  const saves: Session[] = [];
  const ingests: File[] = [];
  return {
    saves,
    ingests,
    blobMap: blobs,
    load: () => Promise.resolve(stored),
    save: (session) => {
      saves.push(session);
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
): Engine => ({
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
  setParam: (deck, param: ParamId) => {
    calls.push(`param:${deck}:${param}`);
  },
  setAutomation: (deck, param) => {
    calls.push(`automation:${deck}:${param}`);
  },
  addEffect: (deck, effect) => {
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
  prepareRestore: (session) =>
    Promise.resolve({
      durations: {
        a: session.decks.a.source === null ? 0 : 3,
        b: session.decks.b.source === null ? 0 : 3,
      },
      commit: () => {},
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
    expect(instrument.probe().decks.a).toMatchObject({
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
    expect(instrument.probe().decks.a.source).toBeNull();
    release?.(new Blob([new Uint8Array([1, 2, 3])]));
    await turns();

    expect(instrument.probe().decks.a).toMatchObject({ source: { blobId: "kept" }, duration: 3 });
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

    expect(instrument.probe().decks.a).toMatchObject({
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

    expect(instrument.probe().decks.a).toMatchObject({ source: { blobId: "new" }, duration: 5 });
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
    expect(repository.saves[0]?.decks.a.source).toEqual({ blobId: "loading" });
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
    expect(missingInstrument.probe().decks.a.source).toBeNull();
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
    expect(decodeInstrument.probe().decks.a.source).toBeNull();
    expect(decodeEvents.at(-1)).toMatchObject({ t: "error", detail: /decode failed/u });
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
      effects: ["filter"],
      automation: { "deck.gain": [{ at: 1, value: 0.25 }] },
      loop: { in: 0.5, out: 1.5 },
    });
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

    expect(instrument.probe().decks.a).toMatchObject({
      source: { blobId: "saved" },
      duration: 4,
      playing: false,
      effects: ["filter"],
      loop: { in: 0.5, out: 1.5 },
    });
    expect(instrument.probe().activeDeck).toBe("b");
    expect(calls.indexOf("loadBlob:a")).toBeLessThan(calls.indexOf("param:a:deck.gain"));
    expect(calls.indexOf("param:b:delay.mix")).toBeLessThan(calls.indexOf("effect:a:filter"));
    expect(calls.indexOf("effect:a:filter")).toBeLessThan(calls.indexOf("automation:a:deck.gain"));
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
      decks: { ...stale.decks, a: { ...stale.decks.a, params: { "deck.gain": 0.4 } } },
    });
    const instrument = createInstrument(manualClock(), () => engineDouble(), repository);

    await instrument.ready;

    expect(instrument.ring().at(-1)).toMatchObject({
      t: "session.discarded",
      detail: /has keys/u,
    });
    expect(instrument.ring().some((event) => event.t === "session.restored")).toBe(false);
    expect(instrument.probe().decks.a.params["deck.gain"]).toBe(PARAM_DEFAULTS["deck.gain"]);
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
    instrument.send({ t: "deck.activate", deck: "b" });
    if (store === undefined) throw new Error("engine factory did not receive the store");
    patchDeck(store, "a", { duration: 123, playing: true });
    instrument.peek("a");
    await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS - 1);
    expect(repository.saves).toEqual([]);
    await vi.advanceTimersByTimeAsync(1);
    await turns();

    expect(repository.saves).toHaveLength(1);
    expect(repository.saves[0]?.decks.a.params).toMatchObject({
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
    source.send({ t: "effect.add", deck: "a", effect: "filter" });
    source.send({ t: "deck.activate", deck: "b" });
    await turns();
    const expected = sessionSnapshot(source.state.getState());
    const file = await source.exportSession();

    const freshRepository = repositoryDouble();
    const fresh = createInstrument(manualClock(), () => engineDouble(), freshRepository);
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
        engine.prepareRestore = () =>
          Promise.resolve({
            durations: { a: 3, b: 0 },
            commit: () => {
              committed = true;
            },
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
