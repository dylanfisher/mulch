/** @role Command-level contracts for bounded, grouped, branching, and blob-backed history. */
// oxlint-disable import/max-dependencies
import { describe, expect, it, vi } from "vitest";

import type { BeatAnalysis } from "@/lib/analysis";
import type { BlobId } from "@/lib/source";
import { createSessionArchive } from "@/lib/sessionArchive";
import type { SessionRepository } from "@/state/repository";
import type { Session } from "@/state/session";
import { sessionSnapshot } from "@/state/session";
import type { DeckId, SessionStore } from "@/state/store";
import { createSessionStore, deckIdsOf, deckIn, fromDecks, patchDeck } from "@/state/store";
import type { GroupedEditCommand } from "./commands";
import { manualClock } from "./clock";
import type { Emit, Engine } from "./engine";
import { silentEngine } from "./engineDouble";
import { createInstrument, type Instrument } from "./facade";
import { GESTURE_IDLE_MS, HISTORY_CAP, SessionHistory } from "./history";

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

/**
 * What a store-wired `measure()` writes. Analysis is re-derived rather than stored, so it is
 * absent from every snapshot the history restores — which makes it the marker that proves the
 * order: the real host runs `measure()` after `replaceSession` (0029), and a host that ran it
 * before would have this overwritten by the restored decks.
 */
const MEASURED: BeatAnalysis = { bpm: 120, onsets: [0.5] };

/** The restored decks the double measures into, or nothing when it was handed no store. */
const measureInto = (store: SessionStore | null, session: Session) => (): void => {
  if (store === null) return;
  for (const { id: deck } of session.deckList) patchDeck(store, deck, { analysis: MEASURED });
};

const engineDouble = (
  loadBlob: Engine["loadBlob"] = (_deck, _blobId, _blob, current) =>
    Promise.resolve(current() ? 3 : null),
  restores: Array<{ source: unknown; blobs: string[] }> = [],
  store: SessionStore | null = null,
): Engine =>
  silentEngine({
    loadBlob,
    setLoop: (_deck, from, to) => (to > from ? { in: from, out: to } : null),
    prepareRestore: (session, blobs) => {
      restores.push({ source: session.decks.a!.source, blobs: [...blobs.keys()] });
      return Promise.resolve({
        durations: fromDecks(deckIdsOf(session.deckList), (deck) =>
          deckIn(session.decks, deck).source === null ? 0 : 3,
        ),
        commit: () => {},
        measure: measureInto(store, session),
        discard: () => {},
      });
    },
  });

/**
 * A graph double with a transport: it plays, it holds a playhead a seek moves, and — like the
 * real host — committing a prepared restore disposes every voice it had. Nothing survives that
 * commit, so a deck still playing on the other side of one is a deck the facade restarted.
 */
const transportEngine = (
  store: SessionStore,
  emit: Emit,
  seeks: Array<{ deck: DeckId; at: number }>,
): Engine => {
  const at = new Map<DeckId, number>();
  const playing = new Set<DeckId>();
  return silentEngine({
    play: (deck) => {
      playing.add(deck);
      patchDeck(store, deck, { playing: true, paused: null });
      emit({ t: "deck.started", deck, offset: at.get(deck) ?? 0 }, 0);
    },
    planned: (deck) => playing.has(deck),
    seek: (deck, position) => {
      at.set(deck, position);
      seeks.push({ deck, at: position });
    },
    peek: (deck, out) => {
      out.position = at.get(deck) ?? 0;
    },
    prepareRestore: (session) =>
      Promise.resolve({
        durations: fromDecks(deckIdsOf(session.deckList), (deck) =>
          deckIn(session.decks, deck).source === null ? 0 : 3,
        ),
        // What the real commit does: every voice is disposed, and the stop half of that teardown
        // is reported for every deck except the ones the caller is restarting behind it (0052).
        commit: (restarting = new Set<DeckId>()) => {
          for (const deck of playing) {
            if (restarting.has(deck)) continue;
            patchDeck(store, deck, { playing: false, paused: at.get(deck) ?? 0 });
            emit({ t: "deck.stopped", deck, reason: "command" }, 0);
          }
          playing.clear();
          at.clear();
        },
        measure: () => {},
        discard: () => {},
      }),
  });
};

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

  it("refuses a malformed groupable command identically at both doors", async () => {
    // The wire validation of a groupable command has one home (wire.ts), and this is the pairing
    // that keeps it there: a check added to one path and not the other is a command refused
    // inside history.group and accepted arriving alone, or the reverse.
    // The untyped JSON boundary is the behavior under test.
    // oxlint-disable-next-line no-unsafe-type-assertion
    const malformed = [
      { t: "deck.add", deck: "", emoji: "🌴", name: "North Willow" },
      // The emoji and the name are as required as the id: a command without one would otherwise
      // store undefined and only surface as a discarded session one reload later (0057).
      { t: "deck.add", deck: "b", name: "North Willow" },
      { t: "deck.add", deck: "b", emoji: "🌴" },
      { t: "deck.load", deck: "a", source: { blobId: "" } },
      { t: "deck.loop", deck: "a", in: 0, out: "1" },
      { t: "deck.crop", deck: "a", id: "" },
      { t: "param.set", deck: "a", param: "nope", value: 1 },
      { t: "param.set", deck: "a", param: "deck.gain", value: "loud" },
      { t: "automation.set", deck: "a", param: "deck.gain", points: "none" },
      { t: "effect.add", deck: "a", id: "one", effect: "nope" },
      { t: "effect.bypass", deck: "a", instance: "one", bypassed: "yes" },
      { t: "effect.remove", deck: "a", instance: "" },
      { t: "effect.reorder", deck: "a", instance: "one", index: 0.5 },
    ] as GroupedEditCommand[];

    for (const command of malformed) {
      const instrument = createInstrument(manualClock());
      let alone = "";
      try {
        instrument.send(command);
      } catch (error) {
        alone = error instanceof Error ? error.message : String(error);
      }
      expect(alone, `${command.t} sent alone`).not.toBe("");

      instrument.send({ t: "history.group", commands: [command] });
      // The group door refuses asynchronously, on the log rather than at the call.
      // oxlint-disable-next-line no-await-in-loop
      await turns();
      // The group door reports on the log rather than at the call, naming the group it was in.
      expect(instrument.ring().at(-1), `${command.t} sent in a group`).toMatchObject({
        t: "error",
        detail: `history.group: TypeError: ${alone}`,
      });
      expect(instrument.history.getState().canUndo).toBe(false);
    }
  });

  it("rolls back a failing group and publishes none of its earlier command facts", async () => {
    const repository = repositoryDouble(new Map());
    let rollbackCommits = 0;
    let rollbackDiscards = 0;
    const instrument = createInstrument(
      manualClock(),
      (store) => {
        const engine = engineDouble();
        engine.prepareRestore = (session) =>
          Promise.resolve({
            durations: fromDecks(deckIdsOf(session.deckList), (deck) =>
              deckIn(session.decks, deck).source === null ? 0 : 3,
            ),
            commit: () => {
              rollbackCommits++;
            },
            measure: measureInto(store, session),
            discard: () => {
              rollbackDiscards++;
            },
          });
        return engine;
      },
      repository,
    );
    await instrument.ready;
    instrument.send({ t: "effect.add", deck: "a", id: "flt", effect: "filter" });
    const afterSetup = instrument.ring().at(-1)?.seq ?? -1;

    instrument.send({
      t: "history.group",
      commands: [
        { t: "param.set", deck: "a", param: "deck.gain", value: 0.5 },
        { t: "effect.add", deck: "a", id: "flt", effect: "filter" },
      ],
    });
    await turns();

    expect(instrument.probe().decks.a!.params["deck.gain"]).toBe(1);
    expect({ rollbackCommits, rollbackDiscards }).toEqual({
      rollbackCommits: 1,
      rollbackDiscards: 0,
    });
    // Same ordering on the rollback path: the rolled-back decks were measured into, after the
    // store held them again, rather than into a store still showing the failed group.
    expect(instrument.probe().decks.a!.analysis).toEqual(MEASURED);
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
      (store) =>
        engineDouble(
          (_deck, blobId, _blob, current) =>
            new Promise<number | null>((resolve) => {
              if (blobId === "late-id") {
                finish = (duration) => {
                  resolve(current() ? duration : null);
                };
              } else {
                resolve(current() ? 3 : null);
              }
            }),
          restores,
          store,
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
    // Measurement survived the undo, so it ran after the restored session went into the store.
    expect(instrument.probe().decks.a!.analysis).toEqual(MEASURED);

    instrument.send({ t: "history.redo" });
    await turns();
    expect(instrument.probe().decks.a!.source).toEqual({ blobId: "old-id" });
    expect(instrument.probe().decks.a!.analysis).toEqual(MEASURED);
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
              durations: fromDecks(deckIdsOf(session.deckList), () => 0),
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
            durations: fromDecks(deckIdsOf(session.deckList), (deck) =>
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

  /**
   * A drag commits a checkpoint per pointer event, and each commit is compared against the
   * unchanged `#current` and the unchanged gesture start. Both of those already have a JSON, so
   * only the arriving checkpoint is serialised: one whole session per commit, not four.
   */
  it("serialises only the arriving checkpoint on each commit of a drag", () => {
    const store = createSessionStore();
    const history = new SessionHistory(sessionSnapshot(store.getState()));
    const real = JSON.stringify.bind(JSON);
    let sessions = 0;
    const moves = 20;
    const spy = vi.spyOn(JSON, "stringify").mockImplementation((value: unknown) => {
      const out = real(value);
      if (out.includes('"spentDeckIds"')) sessions += 1;
      return out;
    });
    try {
      for (let index = 1; index <= moves; index++) {
        patchDeck(store, "a", (deck) => ({
          params: { ...deck.params, "deck.gain": index / moves },
        }));
        history.record(sessionSnapshot(store.getState()), "a gain");
      }
    } finally {
      spy.mockRestore();
    }
    expect(sessions).toBe(moves);
  });

  it("opens a new entry once an open gesture has gone quiet", () => {
    const store = createSessionStore();
    let wall = 0;
    const history = new SessionHistory(sessionSnapshot(store.getState()), () => wall);
    const drag = (value: number): void => {
      patchDeck(store, "a", (deck) => ({ params: { ...deck.params, "deck.gain": value } }));
      history.record(sessionSnapshot(store.getState()), "a gain");
    };
    drag(0.9);
    wall += GESTURE_IDLE_MS;
    drag(0.8);
    wall += GESTURE_IDLE_MS + 1;
    drag(0.7);

    history.commitUndo(sessionSnapshot(store.getState()));
    expect(history.undoTarget()?.decks.a!.params["deck.gain"]).toBe(1);
    expect(history.redoTarget()?.decks.a!.params["deck.gain"]).toBe(0.7);
  });
});

const gainOf = (instrument: Instrument): number => instrument.probe().decks.a!.params["deck.gain"];

/**
 * A knob drag arrives as a stream of `param.set`, so what history has to take back is the whole
 * movement and what has to survive it is the sound. Every case here is the instrument, driven
 * through send() the way a knob drives it (P39).
 */
describe("undo undoes a gesture", () => {
  it("takes back one whole drag as one entry, and a second knob as its own", async () => {
    const instrument = createInstrument(manualClock());
    for (const value of [0.9, 0.8, 0.7, 0.6, 0.5])
      instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value });
    instrument.send({ t: "param.set", deck: "a", param: "deck.pan", value: -0.5 });
    await turns();
    expect(gainOf(instrument)).toBe(0.5);

    instrument.send({ t: "history.undo" });
    await turns();
    expect(instrument.probe().decks.a!.params).toMatchObject({ "deck.gain": 0.5, "deck.pan": 0 });

    instrument.send({ t: "history.undo" });
    await turns();
    expect(gainOf(instrument)).toBe(1);
    expect(instrument.history.getState().canUndo).toBe(false);

    // And back again: the whole drag is one redo too, not five.
    instrument.send({ t: "history.redo" });
    await turns();
    expect(gainOf(instrument)).toBe(0.5);
    expect(instrument.history.getState().canRedo).toBe(true);
  });

  it("separates two drags of one knob by the hand that let go between them", async () => {
    const instrument = createInstrument(manualClock());
    // What ParameterKnob sends: values while the pointer is down, then the release.
    for (const value of [0.9, 0.8])
      instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value });
    instrument.send({ t: "gesture.end" });
    for (const value of [0.7, 0.6])
      instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value });
    instrument.send({ t: "gesture.end" });
    await turns();

    instrument.send({ t: "history.undo" });
    await turns();
    expect(gainOf(instrument)).toBe(0.8);
    instrument.send({ t: "history.undo" });
    await turns();
    expect(gainOf(instrument)).toBe(1);
  });

  it("leaves nothing to undo when a drag comes back to where it started", async () => {
    const instrument = createInstrument(manualClock());
    for (const value of [0.5, 0.2, 1])
      instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value });
    instrument.send({ t: "gesture.end" });
    await turns();
    // The value on screen is the value the hand found: a press that changes nothing is not an
    // entry, however far the drag went in between.
    expect(gainOf(instrument)).toBe(1);
    expect(instrument.history.getState().canUndo).toBe(false);
  });

  it("leaves a playing yard playing, reading from where the undo found it", async () => {
    const seeks: Array<{ deck: DeckId; at: number }> = [];
    const instrument = createInstrument(manualClock(), (store, emit) =>
      transportEngine(store, emit, seeks),
    );
    instrument.send({ t: "deck.load", deck: "a", source: { gen: "sine", secs: 3 } });
    instrument.send({ t: "deck.seek", deck: "a", position: 1.25 });
    instrument.send({ t: "deck.play", deck: "a" });
    instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value: 0.5 });
    await turns();
    expect(instrument.probe().decks.a!.playing).toBe(true);
    seeks.length = 0;
    const before = instrument.ring().at(-1)?.seq ?? -1;

    instrument.send({ t: "history.undo" });
    await turns();
    // The commit disposed every voice the host had, so a deck that is playing here is one the
    // restore restarted — and it restarted at the playhead, not at the top of the buffer.
    expect(seeks).toEqual([{ deck: "a", at: 1.25 }]);
    expect(instrument.probe().decks.a!.playing).toBe(true);
    expect(gainOf(instrument)).toBe(1);
    // And the log says so too: a restart is not a stop, so nothing on it may read as one (0052).
    const since = instrument.ring().filter((event) => event.seq > before);
    expect(since.map((event) => event.t)).not.toContain("deck.stopped");
    expect(since.map((event) => event.t)).toContain("deck.started");
  });

  it("does not carry a playhead onto a source the checkpoint changed", async () => {
    const seeks: Array<{ deck: DeckId; at: number }> = [];
    const instrument = createInstrument(manualClock(), (store, emit) =>
      transportEngine(store, emit, seeks),
    );
    instrument.send({ t: "deck.load", deck: "a", source: { gen: "sine", secs: 3 } });
    await turns();
    instrument.send({ t: "deck.load", deck: "a", source: { gen: "noise", secs: 3 } });
    await turns();
    instrument.send({ t: "deck.seek", deck: "a", position: 2.75 });
    instrument.send({ t: "deck.play", deck: "a" });
    await turns();
    seeks.length = 0;

    // Undoing back to the first source: the playhead belonged to the second one, and 2.75s into
    // audio nobody is playing any more is not where this deck is.
    instrument.send({ t: "history.undo" });
    await turns();
    expect(instrument.probe().decks.a!.source).toEqual({ gen: "sine", secs: 3 });
    expect(seeks).toEqual([]);
  });

  it("puts the lane back when the drag that replaced it is undone", async () => {
    const instrument = createInstrument(manualClock());
    instrument.send({
      t: "automation.set",
      deck: "a",
      param: "deck.gain",
      points: [
        { at: 0, value: 0.2 },
        { at: 1, value: 0.8 },
      ],
    });
    await turns();
    // Exactly what ParameterKnob sends when a hand moves an automated knob: the lane cleared and
    // the value that replaced it in one transaction, then the rest of the drag.
    instrument.send({
      t: "history.group",
      commands: [
        { t: "automation.set", deck: "a", param: "deck.gain", points: [] },
        { t: "param.set", deck: "a", param: "deck.gain", value: 0.6 },
      ],
    });
    instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value: 0.4 });
    instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value: 0.3 });
    await turns();
    expect(instrument.probe().decks.a!.automation["deck.gain"]).toBeUndefined();

    instrument.send({ t: "history.undo" });
    await turns();
    expect(instrument.probe().decks.a!.automation["deck.gain"]).toEqual([
      { at: 0, value: 0.2 },
      { at: 1, value: 0.8 },
    ]);
    expect(gainOf(instrument)).toBe(1);
  });

  it("removes the yard an undone deck.add put there", async () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "deck.add", deck: "b", emoji: "🌾", name: "Long Meadow" });
    await turns();
    expect(instrument.probe().deckList.map((entry) => entry.id)).toEqual(["a", "b"]);

    instrument.send({ t: "history.undo" });
    await turns();
    expect(instrument.probe().deckList.map((entry) => entry.id)).toEqual(["a"]);
    expect(instrument.probe().decks.b).toBeUndefined();
    expect(() => instrument.peek("b")).toThrow(/no deck b/u);
  });
});
