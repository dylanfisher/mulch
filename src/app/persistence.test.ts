/**
 * @role Pure contract tests for facade persistence: async blob commands, hydration, manual save,
 *   and durable-projection autosave behavior without IndexedDB or an AudioContext.
 */
// One test per persistence contract; keeping them together makes cross-command races visible.
// oxlint-disable max-lines
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ParamId } from "@/audio/params";
import type { BlobId } from "@/lib/source";
import type { SessionRepository } from "@/state/repository";
import type { SessionV2 } from "@/state/session";
import { sessionV2 } from "@/state/session";
import { activateDeck, createSessionStore, patchDeck, type SessionStore } from "@/state/store";
import { manualClock } from "./clock";
import type { Engine } from "./engine";
import type { Event } from "./events";
import { AUTOSAVE_DELAY_MS, createInstrument } from "./facade";

type RepositoryDouble = SessionRepository & { saves: SessionV2[]; ingests: File[] };

function repositoryDouble(stored?: unknown): RepositoryDouble {
  const blobs = new Map<BlobId, Blob>();
  const saves: SessionV2[] = [];
  const ingests: File[] = [];
  return {
    saves,
    ingests,
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
  };
}

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
  addEffect: (deck, effect) => {
    calls.push(`effect:${deck}:${effect}`);
    return 0;
  },
  peek: () => {},
  peaks: () => null,
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
      loop: { in: 0.5, out: 1.5 },
    });
    activateDeck(sourceStore, "b");
    const repository = repositoryDouble(sessionV2(sourceStore.getState()));
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
    expect(calls.indexOf("effect:a:filter")).toBeLessThan(calls.indexOf("loop:a"));
    expect(repository.saves).toEqual([]);
    expect(instrument.ring().at(-1)).toMatchObject({ t: "session.restored", version: 2 });
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
