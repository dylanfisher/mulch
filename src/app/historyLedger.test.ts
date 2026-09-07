/**
 * @role The ledger on its own: the bound on its checkpoints, what a drag costs it and what it
 *   holds of one — beside src/app/history.test.ts, which drives the same ledger through the
 *   instrument and is at its cap.
 */
// Each case keeps its full commit timeline visible; splitting setup hides the ordering under test.
// oxlint-disable max-lines-per-function
import { describe, expect, it, vi } from "vitest";

import type { Session } from "@/state/session";
import { sessionSnapshot } from "@/state/session";
import { createSessionStore, patchDeck } from "@/state/store";
import { GESTURE_IDLE_MS, HISTORY_CAP, SessionHistory } from "./history";

describe("the central history bound", () => {
  it("keeps exactly HISTORY_CAP undo checkpoints", () => {
    const store = createSessionStore();
    const history = new SessionHistory(sessionSnapshot(store.getState()));
    for (let index = 0; index <= HISTORY_CAP; index++) {
      patchDeck(store, "a", (deck) => ({
        params: { ...deck.params, "deck.gain": index / HISTORY_CAP },
      }));
      history.record(() => sessionSnapshot(store.getState()));
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
    history.record(() => sessionSnapshot(store.getState()));
    const exposed = history.undoTarget();
    if (exposed === null) throw new Error("expected initial checkpoint");
    exposed.decks.a!.params["deck.gain"] = 0.8;
    expect(history.undoTarget()?.decks.a!.params["deck.gain"]).toBe(1);

    patchDeck(store, "a", { source: { blobId: "evicted" } });
    history.record(() => sessionSnapshot(store.getState()));
    patchDeck(store, "a", { source: { gen: "sine" } });
    history.record(() => sessionSnapshot(store.getState()));
    for (let index = 1; index <= HISTORY_CAP; index++) {
      patchDeck(store, "a", (deck) => ({
        params: { ...deck.params, "deck.pan": index / HISTORY_CAP },
      }));
      history.record(() => sessionSnapshot(store.getState()));
    }
    expect(history.blobIds()).not.toContain("evicted");
  });

  /**
   * A drag commits per pointer event, and the only checkpoint of it that matters is where it ends
   * (0067): its first commit opens the entry and every one after it is held as the call that would
   * take the snapshot, spent once when the hand lets go. Twenty moves are two snapshots and two
   * serialisations — the opening and the end — not twenty (0308).
   */
  it("takes one snapshot and one serialisation for the rest of a drag", () => {
    const store = createSessionStore();
    const history = new SessionHistory(sessionSnapshot(store.getState()));
    const real = JSON.stringify.bind(JSON);
    let sessions = 0;
    let snapshots = 0;
    const moves = 20;
    const spy = vi.spyOn(JSON, "stringify").mockImplementation((value: unknown) => {
      const out = real(value);
      if (out.includes('"spentDeckIds"')) sessions += 1;
      return out;
    });
    const take = (): Session => {
      snapshots += 1;
      return sessionSnapshot(store.getState());
    };
    try {
      for (let index = 1; index <= moves; index++) {
        patchDeck(store, "a", (deck) => ({
          params: { ...deck.params, "deck.gain": index / (moves + 1) },
        }));
        history.record(take, "a gain");
      }
      expect(snapshots).toBe(1);
      history.endGesture();
    } finally {
      spy.mockRestore();
    }
    expect(snapshots).toBe(2);
    expect(sessions).toBe(2);
    expect(history.undoTarget()?.decks.a!.params["deck.gain"]).toBe(1);
    history.commitUndo(sessionSnapshot(store.getState()));
    expect(history.redoTarget()?.decks.a!.params["deck.gain"]).toBe(moves / (moves + 1));
  });

  it("settles a drag before a commit under another key, in that order", () => {
    const store = createSessionStore();
    const history = new SessionHistory(sessionSnapshot(store.getState()));
    const order: string[] = [];
    // The facade's own order: the ledger is asked before the store is written, because a held
    // call reads the store when it is spent.
    const commit = (key: string, value: number) => {
      history.settleFor(key);
      patchDeck(store, "a", (deck) => ({ params: { ...deck.params, "deck.gain": value } }));
      history.record(() => {
        order.push(`${key} ${store.getState().decks.a!.params["deck.gain"]}`);
        return sessionSnapshot(store.getState());
      }, key);
    };
    commit("a gain", 0.9);
    commit("a gain", 0.8);
    commit("a pan", 0.7);
    expect(order).toEqual(["a gain 0.9", "a gain 0.8", "a pan 0.7"]);
    // Two entries: the drag, and the commit that closed it — and the drag ended where it reached.
    history.commitUndo(sessionSnapshot(store.getState()));
    expect(history.redoTarget()?.decks.a!.params["deck.gain"]).toBe(0.7);
    expect(history.undoTarget()?.decks.a!.params["deck.gain"]).toBe(1);
    // The facade restores the target into the store before it commits the undo (0021).
    patchDeck(store, "a", (deck) => ({ params: { ...deck.params, "deck.gain": 0.8 } }));
    history.commitUndo(sessionSnapshot(store.getState()));
    expect(history.redoTarget()?.decks.a!.params["deck.gain"]).toBe(0.8);
  });

  it("leaves nothing to undo when a held drag came back to where it started", () => {
    const store = createSessionStore();
    const history = new SessionHistory(sessionSnapshot(store.getState()));
    for (const value of [0.5, 0.2, 1]) {
      patchDeck(store, "a", (deck) => ({ params: { ...deck.params, "deck.gain": value } }));
      history.record(() => sessionSnapshot(store.getState()), "a gain");
    }
    history.endGesture();
    expect(history.getState().canUndo).toBe(false);
  });

  it("hands blobIds the drag's own blobs before the hand has let go", () => {
    const store = createSessionStore();
    const history = new SessionHistory(sessionSnapshot(store.getState()));
    patchDeck(store, "a", (deck) => ({ params: { ...deck.params, "deck.gain": 0.5 } }));
    history.record(() => sessionSnapshot(store.getState()), "a gain");
    patchDeck(store, "a", () => ({ source: { blobId: "import:held:one.wav" } }));
    history.record(() => sessionSnapshot(store.getState()), "a gain");
    expect(history.blobIds().has("import:held:one.wav")).toBe(true);
  });

  /**
   * The checkpoint a commit hands in is history's own from that line (0304): a drag of twenty
   * moves copies no session at all, where each move once cloned the whole of one.
   */
  it("copies nothing on any commit of a drag", () => {
    const store = createSessionStore();
    const history = new SessionHistory(sessionSnapshot(store.getState()));
    const moves = 20;
    const spy = vi.spyOn(globalThis, "structuredClone");
    try {
      for (let index = 1; index <= moves; index++) {
        patchDeck(store, "a", (deck) => ({
          params: { ...deck.params, "deck.gain": index / moves },
        }));
        history.record(() => sessionSnapshot(store.getState()), "a gain");
      }
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  /**
   * What holds 0021 without the copy is that nothing else holds the tree: `sessionSnapshot` is
   * built fresh for each call, so the store's later writes never reach it, and a drag's later
   * moves are trees of their own. Undo after a drag lands on the hand's starting value even when
   * every move's object is written through afterwards.
   */
  it("restores the value a drag started from whatever its moves' objects hold afterwards", () => {
    const store = createSessionStore();
    const history = new SessionHistory(sessionSnapshot(store.getState()));
    patchDeck(store, "a", (deck) => ({ params: { ...deck.params, "deck.gain": 0.5 } }));
    history.record(() => sessionSnapshot(store.getState()));
    const moves: Session[] = [];
    for (const value of [0.4, 0.3, 0.2]) {
      patchDeck(store, "a", (deck) => ({ params: { ...deck.params, "deck.gain": value } }));
      const move = sessionSnapshot(store.getState());
      moves.push(move);
      history.record(() => move, "a gain");
    }
    for (const move of moves) move.decks.a!.params["deck.gain"] = 0.9;
    store.getState().decks.a!.params["deck.gain"] = 0.1;

    expect(history.undoTarget()?.decks.a!.params["deck.gain"]).toBe(0.5);
    history.commitUndo(sessionSnapshot(store.getState()));
    expect(history.undoTarget()?.decks.a!.params["deck.gain"]).toBe(1);
  });

  it("opens a new entry once an open gesture has gone quiet", () => {
    const store = createSessionStore();
    let wall = 0;
    const history = new SessionHistory(sessionSnapshot(store.getState()), () => wall);
    const drag = (value: number): void => {
      history.settleFor("a gain");
      patchDeck(store, "a", (deck) => ({ params: { ...deck.params, "deck.gain": value } }));
      history.record(() => sessionSnapshot(store.getState()), "a gain");
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
