// The store's own answers, for the three writes the seams above it reach through but never ask
// about: which yard a remove hands the selection to, what a write to a yard nobody added does,
// and the one list that is never allowed to get shorter (0029, 0082).
import { describe, expect, it } from "vitest";
import {
  activateDeck,
  addDeck,
  createSessionStore,
  deckIdsOf,
  deckIn,
  INITIAL_DECK_ID,
  patchDeck,
  removeDeck,
  spendDeckIds,
} from "./store";

/** A session holding four yards, so a middle one has neighbours on both sides. */
const fourYards = () => {
  const store = createSessionStore();
  for (const id of ["b", "c", "d"]) addDeck(store, id, "🌴", `yard ${id}`);
  return store;
};

describe("removing a yard", () => {
  it("hands the selection to whoever takes its slot, and leaves another yard's alone", () => {
    const store = fourYards();
    activateDeck(store, "b");
    removeDeck(store, "b");

    // The list is the order, so the neighbour is the yard now standing where B stood — neither
    // the first yard nor the last, which is what a four-yard list can tell apart (0029).
    expect(deckIdsOf(store.getState().deckList)).toEqual(["a", "c", "d"]);
    expect(store.getState().activeDeck).toBe("c");
    expect(store.getState().decks.b).toBeUndefined();

    // Removing a yard nobody was pointed at moves the selection nowhere — D keeps it even though
    // the slot A left goes to C.
    activateDeck(store, "d");
    removeDeck(store, "a");
    expect(store.getState().activeDeck).toBe("d");
  });
});

describe("a yard the session does not hold", () => {
  it("is a loud failure rather than one the store invents", () => {
    const store = createSessionStore();
    // Either would otherwise key a yard by a name `deckList` never learns, which is a session
    // that cannot be projected and a selection that can never reach it.
    expect(() => {
      patchDeck(store, "z", { duration: 4 });
    }).toThrow(/no deck z/u);
    expect(() => deckIn(store.getState().decks, "z")).toThrow(/unknown deck: z/u);
    expect(Object.keys(store.getState().decks)).toEqual([INITIAL_DECK_ID]);
  });
});

describe("the letters a session has spent", () => {
  it("takes a stored list back without giving up one the store has already said", () => {
    const store = createSessionStore();
    addDeck(store, "b", "🌴", "North Willow");
    // The restore of a stored session that drew fewer letters than this store has: it respends
    // what it holds, and B stays spent — a letter said out loud is not unsaid (0082).
    spendDeckIds(store, ["a"]);
    expect(store.getState().spentDeckIds).toEqual(["a", "b"]);
  });
});
