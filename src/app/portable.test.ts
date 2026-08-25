/**
 * @role Contract tests for a portable session: the archive a facade exports, what it refuses to
 *   import, and the live state an import leaves alone when it fails.
 * @instead The async blob, hydration and autosave seams → src/app/persistence.test.ts.
 */
import { describe, expect, it } from "vitest";

import { createSessionArchive } from "@/lib/sessionArchive";
import { sessionSnapshot } from "@/state/session";
import {
  activateDeck,
  addDeck,
  createSessionStore,
  deckIdsOf,
  fromDecks,
  patchDeck,
} from "@/state/store";
import { manualClock } from "./clock";
import { sessionExportName } from "./exportAudio";
import { createInstrument } from "./facade";
import { engineDouble, repositoryDouble, turns } from "./persistenceDouble";

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
    source.send({ t: "deck.add", deck: "b", emoji: "🌴", name: "North Willow" });
    source.send({ t: "deck.activate", deck: "b" });
    await turns();
    const expected = sessionSnapshot(source.state.getState());
    const file = await source.exportSession(sessionExportName(source.state.getState(), new Date()));

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
    addDeck(importedStore, "b", "🌴", "North Willow");
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
    addDeck(importedStore, "b", "🌴", "North Willow");
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
            durations: fromDecks(deckIdsOf(session.deckList), () => 3),
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
