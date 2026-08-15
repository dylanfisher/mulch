/** @role Command-level contracts for bounded, grouped, branching, and blob-backed history. */
import { describe, expect, it } from "vitest";

import type { BlobId } from "@/lib/source";
import { createSessionArchive } from "@/lib/sessionArchive";
import type { SessionRepository } from "@/state/repository";
import { sessionSnapshot } from "@/state/session";
import { createSessionStore, deckIn, fromDecks, patchDeck } from "@/state/store";
import { manualClock } from "./clock";
import type { Engine } from "./engine";
import { createInstrument } from "./facade";
import { HISTORY_CAP, SessionHistory } from "./history";

// Each case keeps its full command timeline visible; splitting setup hides the ordering under test.
// oxlint-disable max-lines, max-lines-per-function

const turns = async (): Promise<void> => {
  for (let remaining = 12; remaining > 0; remaining--) {
    // Facade history serializes graph preparation behind repository work.
    // oxlint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
};

type RepositoryDouble = SessionRepository & { retained: Set<BlobId>[] };

const repositoryDouble = (blobs: Map<BlobId, Blob>): RepositoryDouble => ({
  retained: [],
  load: () => Promise.resolve(),
  save(_session, retained = new Set()) {
    this.retained.push(new Set(retained));
    return Promise.resolve();
  },
  ingest: () => Promise.reject(new Error("unused")),
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
  replace: () => Promise.resolve(),
});

const engineDouble = (
  loadBlob: Engine["loadBlob"] = (_deck, _blob, current) => Promise.resolve(current() ? 3 : null),
  restores: Array<{ source: unknown; blobs: string[] }> = [],
): Engine => ({
  addDeck: () => {},
  removeDeck: () => {},
  load: (_deck, source) => source.secs,
  loadBlob,
  play: () => {},
  playTogether: () => {},
  stop: () => {},
  planned: () => false,
  setLoop: (_deck, from, to) => (to > from ? { in: from, out: to } : null),
  setParam: () => {},
  setAutomation: () => {},
  addEffect: () => 0,
  setEffectBypass: () => {},
  removeEffect: () => {},
  reorderEffects: () => {},
  peek: () => {},
  peaks: () => null,
  contextState: () => "running",
  analyzing: () => 0,
  prepareRestore: (session, blobs) => {
    restores.push({ source: session.decks.a!.source, blobs: [...blobs.keys()] });
    return Promise.resolve({
      durations: fromDecks(session.deckIds, (deck) =>
        deckIn(session.decks, deck).source === null ? 0 : 3,
      ),
      commit: () => {},
      measure: () => {},
      discard: () => {},
    });
  },
});

describe("history commands", () => {
  it("reports empty history and treats an ordered group as one transaction", async () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "history.undo" });
    await turns();
    expect(instrument.ring().at(-1)).toMatchObject({ t: "error", detail: /history is empty/u });

    instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value: 0.5 });
    instrument.send({
      t: "history.group",
      commands: [
        { t: "param.set", deck: "a", param: "deck.gain", value: 0.75 },
        { t: "param.set", deck: "a", param: "deck.pan", value: -0.25 },
      ],
    });
    await turns();

    instrument.send({ t: "history.undo" });
    await turns();
    expect(instrument.probe().decks.a!.params).toMatchObject({
      "deck.gain": 0.5,
      "deck.pan": 0,
    });
    instrument.send({ t: "history.undo" });
    await turns();
    expect(instrument.probe().decks.a!.params["deck.gain"]).toBe(1);
  });

  it("truncates redo after a divergent durable edit", async () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value: 0.5 });
    instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value: 0.75 });
    instrument.send({ t: "history.undo" });
    await turns();
    expect(instrument.history.getState().canRedo).toBe(true);

    instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value: 0.25 });
    expect(instrument.history.getState().canRedo).toBe(false);
    instrument.send({ t: "history.redo" });
    await turns();
    expect(instrument.probe().decks.a!.params["deck.gain"]).toBe(0.25);
    expect(instrument.ring().at(-1)).toMatchObject({ t: "error", detail: /history is empty/u });
  });

  it("accepts empty and unchanged groups without creating an undo entry", async () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "history.group", commands: [] });
    instrument.send({
      t: "history.group",
      commands: [{ t: "param.set", deck: "a", param: "deck.gain", value: 1 }],
    });
    await turns();

    expect(instrument.history.getState()).toEqual({ canUndo: false, canRedo: false });
    instrument.send({ t: "history.undo" });
    await turns();
    expect(instrument.ring().at(-1)).toMatchObject({ t: "error", detail: /history is empty/u });
  });

  it("prevalidates every grouped command before any edit and rejects import as a reset boundary", async () => {
    const instrument = createInstrument(manualClock());
    const missingValue: unknown = {
      t: "history.group",
      commands: [
        { t: "param.set", deck: "a", param: "deck.gain", value: 0.5 },
        { t: "param.set", deck: "a", param: "deck.pan" },
      ],
    };
    // The untyped JSON boundary is the behavior under test.
    // oxlint-disable-next-line no-unsafe-type-assertion
    instrument.send(missingValue as Parameters<typeof instrument.send>[0]);
    await turns();
    expect(instrument.probe().decks.a!.params["deck.gain"]).toBe(1);
    expect(instrument.history.getState().canUndo).toBe(false);

    const nestedImport: unknown = {
      t: "history.group",
      commands: [{ t: "session.import", archive: { archiveId: "staged" } }],
    };
    // The untyped JSON boundary is the behavior under test.
    // oxlint-disable-next-line no-unsafe-type-assertion
    instrument.send(nestedImport as Parameters<typeof instrument.send>[0]);
    await turns();
    expect(instrument.ring().at(-1)).toMatchObject({
      t: "error",
      detail: /non-groupable command: session.import/u,
    });
  });

  it("rolls back a failing group and publishes none of its earlier command facts", async () => {
    const repository = repositoryDouble(new Map());
    let rollbackCommits = 0;
    let rollbackDiscards = 0;
    const instrument = createInstrument(
      manualClock(),
      () => {
        const engine = engineDouble();
        engine.prepareRestore = (session) =>
          Promise.resolve({
            durations: fromDecks(session.deckIds, (deck) =>
              deckIn(session.decks, deck).source === null ? 0 : 3,
            ),
            commit: () => {
              rollbackCommits++;
            },
            measure: () => {},
            discard: () => {
              rollbackDiscards++;
            },
          });
        return engine;
      },
      repository,
    );
    await instrument.ready;
    instrument.send({ t: "effect.add", deck: "a", effect: "filter" });
    const afterSetup = instrument.ring().at(-1)?.seq ?? -1;

    instrument.send({
      t: "history.group",
      commands: [
        { t: "param.set", deck: "a", param: "deck.gain", value: 0.5 },
        { t: "effect.add", deck: "a", effect: "filter" },
      ],
    });
    await turns();

    expect(instrument.probe().decks.a!.params["deck.gain"]).toBe(1);
    expect({ rollbackCommits, rollbackDiscards }).toEqual({
      rollbackCommits: 1,
      rollbackDiscards: 0,
    });
    expect(instrument.ring().filter((event) => event.seq > afterSetup)).toMatchObject([
      { t: "error", detail: /effect already active/u },
    ]);
    instrument.send({ t: "history.undo" });
    await turns();
    expect(instrument.probe().decks.a!.effects).toEqual([]);
  });

  it("invalidates a pending blob load, then restores the prior blob by its unchanged ID", async () => {
    let finish: ((duration: number) => void) | undefined;
    const blobs = new Map<BlobId, Blob>([
      ["old-id", new Blob(["old"])],
      ["late-id", new Blob(["late"])],
    ]);
    const restores: Array<{ source: unknown; blobs: string[] }> = [];
    const instrument = createInstrument(
      manualClock(),
      () =>
        engineDouble(
          (_deck, blob, current) =>
            blob.text().then(
              (name) =>
                new Promise<number | null>((resolve) => {
                  if (name === "late") {
                    finish = (duration) => {
                      resolve(current() ? duration : null);
                    };
                  } else {
                    resolve(current() ? 3 : null);
                  }
                }),
            ),
          restores,
        ),
      repositoryDouble(blobs),
    );
    await instrument.ready;
    instrument.send({ t: "deck.load", deck: "a", source: { blobId: "old-id" } });
    await turns();
    instrument.send({ t: "deck.load", deck: "a", source: { blobId: "late-id" } });
    await turns();
    instrument.send({ t: "history.undo" });
    await turns();
    finish?.(9);
    await turns();
    expect(instrument.probe().decks.a!.source).toBeNull();

    instrument.send({ t: "history.redo" });
    await turns();
    expect(instrument.probe().decks.a!.source).toEqual({ blobId: "old-id" });
    expect(restores.at(-1)).toEqual({ source: { blobId: "old-id" }, blobs: ["old-id"] });
  });

  it("discards an undo prepared before a newer durable edit", async () => {
    let release: (() => void) | undefined;
    let commits = 0;
    let discards = 0;
    const instrument = createInstrument(manualClock(), () => {
      const engine = engineDouble();
      engine.prepareRestore = (session) =>
        new Promise((resolve) => {
          release = () => {
            resolve({
              durations: fromDecks(session.deckIds, () => 0),
              commit: () => {
                commits++;
              },
              measure: () => {},
              discard: () => {
                discards++;
              },
            });
          };
          expect(session.decks.a!.params["deck.gain"]).toBe(1);
        });
      return engine;
    });
    instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value: 0.5 });
    instrument.send({ t: "history.undo" });
    await turns();
    instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value: 0.25 });
    release?.();
    await turns();

    expect(instrument.probe().decks.a!.params["deck.gain"]).toBe(0.25);
    expect({ commits, discards }).toEqual({ commits: 0, discards: 1 });
    expect(instrument.ring().some((event) => event.t === "history.undone")).toBe(false);
  });

  it("keeps blobs reachable from bounded checkpoints during current-session garbage collection", async () => {
    const blobs = new Map<BlobId, Blob>([["history-id", new Blob(["old"])]]);
    const repository = repositoryDouble(blobs);
    const instrument = createInstrument(manualClock(), () => engineDouble(), repository);
    await instrument.ready;
    instrument.send({ t: "deck.load", deck: "a", source: { blobId: "history-id" } });
    await turns();
    instrument.send({ t: "deck.load", deck: "a", source: { gen: "sine", secs: 1 } });
    instrument.send({ t: "session.save" });
    await turns();

    expect(instrument.probe().decks.a!.source).toEqual({ gen: "sine", secs: 1 });
    expect(repository.retained.at(-1)).toContain("history-id");
  });

  it("clears local history when an archive import establishes a new root", async () => {
    const repository = repositoryDouble(new Map());
    const instrument = createInstrument(manualClock(), () => engineDouble(), repository);
    await instrument.ready;
    instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value: 0.5 });
    expect(instrument.history.getState().canUndo).toBe(true);

    const fresh = createSessionStore();
    const archive = createSessionArchive(sessionSnapshot(fresh.getState()), new Map());
    const handle = await instrument.ingestSession(new File([archive], "fresh.mulch"));
    instrument.send({ t: "session.import", archive: handle });
    await turns();

    expect(instrument.probe().decks.a!.params["deck.gain"]).toBe(1);
    expect(instrument.history.getState()).toEqual({ canUndo: false, canRedo: false });
  });

  it("discards an importing graph when a newer edit wins before repository commit", async () => {
    const repository = repositoryDouble(new Map());
    let finishReplace: (() => void) | undefined;
    repository.replace = (_session, _blobs, _retained, current = () => true) =>
      new Promise<void>((resolve, reject) => {
        finishReplace = () => {
          if (current()) resolve();
          else reject(new Error("stale replacement"));
        };
      });
    let commits = 0;
    let discards = 0;
    const instrument = createInstrument(
      manualClock(),
      () => {
        const engine = engineDouble();
        engine.prepareRestore = (session) =>
          Promise.resolve({
            durations: fromDecks(session.deckIds, (deck) =>
              deckIn(session.decks, deck).source === null ? 0 : 3,
            ),
            commit: () => {
              commits++;
            },
            measure: () => {},
            discard: () => {
              discards++;
            },
          });
        return engine;
      },
      repository,
    );
    await instrument.ready;
    instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value: 0.5 });
    const archive = createSessionArchive(
      sessionSnapshot(createSessionStore().getState()),
      new Map(),
    );
    const handle = await instrument.ingestSession(new File([archive], "stale.mulch"));
    instrument.send({ t: "session.import", archive: handle });
    await turns();
    instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value: 0.25 });
    finishReplace?.();
    await turns();

    expect(instrument.probe().decks.a!.params["deck.gain"]).toBe(0.25);
    expect({ commits, discards }).toEqual({ commits: 0, discards: 1 });
    expect(instrument.history.getState().canUndo).toBe(true);
    expect(instrument.ring().some((event) => event.t === "session.imported")).toBe(false);
  });
});

describe("the central history bound", () => {
  it("keeps exactly HISTORY_CAP undo checkpoints", () => {
    const store = createSessionStore();
    const history = new SessionHistory(sessionSnapshot(store.getState()));
    for (let index = 0; index <= HISTORY_CAP; index++) {
      patchDeck(store, "a", (deck) => ({
        params: { ...deck.params, "deck.gain": index / HISTORY_CAP },
      }));
      history.record(sessionSnapshot(store.getState()));
    }
    for (let count = 0; count < HISTORY_CAP; count++) {
      const target = history.undoTarget();
      expect(target).not.toBeNull();
      history.commitUndo(sessionSnapshot(store.getState()));
    }
    expect(history.undoTarget()).toBeNull();
  });

  it("owns its snapshots and releases blob reachability after bound eviction", () => {
    const store = createSessionStore();
    const initial = sessionSnapshot(store.getState());
    const history = new SessionHistory(initial);
    initial.decks.a!.params["deck.gain"] = 0.2;
    patchDeck(store, "a", (deck) => ({
      params: { ...deck.params, "deck.gain": 0.5 },
    }));
    history.record(sessionSnapshot(store.getState()));
    const exposed = history.undoTarget();
    if (exposed === null) throw new Error("expected initial checkpoint");
    exposed.decks.a!.params["deck.gain"] = 0.8;
    expect(history.undoTarget()?.decks.a!.params["deck.gain"]).toBe(1);

    patchDeck(store, "a", { source: { blobId: "evicted" } });
    history.record(sessionSnapshot(store.getState()));
    patchDeck(store, "a", { source: { gen: "sine", secs: 1 } });
    history.record(sessionSnapshot(store.getState()));
    for (let index = 1; index <= HISTORY_CAP; index++) {
      patchDeck(store, "a", (deck) => ({
        params: { ...deck.params, "deck.pan": index / HISTORY_CAP },
      }));
      history.record(sessionSnapshot(store.getState()));
    }
    expect(history.blobIds()).not.toContain("evicted");
  });
});
