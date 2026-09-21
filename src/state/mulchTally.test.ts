/**
 * What the header's readout counts, asked of the store directly: the four numbers, the string
 * that stands for them, and the word that grades the depth.
 */
import { describe, expect, it } from "vitest";

import { MULCH_GRADES } from "@/lib/copyMulch";
import type { SessionEffect } from "./session";
import { addDeck, createSessionStore, patchDeck, patchRack, removeDeck } from "./store";
import { mulchGrade, mulchKey, mulchOfKey, tallyMulch } from "./mulchTally";

/** One rack instance, with as many moving parameters as the caller asks for. */
const instance = (id: string, moving: string[] = []): SessionEffect => ({
  id,
  effect: "delay",
  bypassed: false,
  params: {},
  automation: Object.fromEntries(moving.map((param) => [param, [{ at: 0, value: 0.5 }]])),
  drawn: {},
  laneBounds: {},
  bounds: {},
});

// One `it` per number the readout draws, plus the string it is carried on: a second file would
// stand up a second store to ask the other half. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("tallying the mulch", () => {
  it("counts every rack's instances, the master's with the yards'", () => {
    const store = createSessionStore();
    addDeck(store, "b", "🌴", "yard b");
    patchRack(store, "a", [instance("one"), instance("two")]);
    patchRack(store, "b", [instance("three")]);
    patchRack(store, null, [instance("bus")]);

    const tally = tallyMulch(store.getState());
    expect(tally.yards).toBe(2);
    expect(tally.effects).toBe(4);
    // A's two and the master's one behind them is the longest chain the sound crosses.
    expect(tally.deepest).toBe(3);
  });

  it("grades a session holding no yards by the master's own rack", () => {
    const store = createSessionStore();
    patchRack(store, null, [instance("bus"), instance("bus2")]);
    removeDeck(store, "a");
    // Nothing stands in front of the master, but what it holds is still what the sound crosses:
    // a readout saying two effects and "untouched" together would be saying two things at once.
    expect(tallyMulch(store.getState())).toMatchObject({ yards: 0, effects: 2, deepest: 2 });
  });

  it("counts a moving parameter on a rack instance and on the yard's own", () => {
    const store = createSessionStore();
    patchRack(store, "a", [instance("one", ["delay.time", "delay.feedback"])]);
    patchRack(store, null, [instance("bus", ["delay.mix"])]);
    patchDeck(store, "a", { automation: { "deck.gain": [{ at: 0, value: 1 }] } });
    expect(tallyMulch(store.getState()).moving).toBe(4);

    // A lane cleared takes its key with it (src/app/execute.ts), which is what makes the keys
    // the count.
    patchDeck(store, "a", { automation: {} });
    expect(tallyMulch(store.getState()).moving).toBe(3);
  });

  it("follows a yard added and a yard removed", () => {
    const store = createSessionStore();
    patchRack(store, "a", [instance("one")]);
    expect(tallyMulch(store.getState())).toMatchObject({ yards: 1, effects: 1 });

    addDeck(store, "b", "🌴", "yard b");
    expect(tallyMulch(store.getState())).toMatchObject({ yards: 2, effects: 1 });

    removeDeck(store, "a");
    expect(tallyMulch(store.getState())).toMatchObject({ yards: 1, effects: 0, deepest: 0 });
  });

  it("refuses a list entry with no yard behind it rather than counting past it", () => {
    const store = createSessionStore();
    // The list is the registry of yards (0029): an entry the `decks` record does not answer is a
    // broken session, and a tally that skipped it would report one yard fewer and say nothing.
    store.setState((state) => ({
      deckList: [...state.deckList, { id: "ghost", emoji: "👻", name: "yard ghost" }],
    }));
    expect(() => tallyMulch(store.getState())).toThrow();
  });

  it("reads a tally back out of the string that stands for it", () => {
    const store = createSessionStore();
    patchRack(store, "a", [instance("one", ["delay.time"])]);
    const tally = tallyMulch(store.getState());
    expect(mulchOfKey(mulchKey(tally))).toEqual(tally);
  });

  it("refuses a string it did not write", () => {
    expect(() => mulchOfKey("1/2/3")).toThrow(TypeError);
    expect(() => mulchOfKey("1/2/3/x")).toThrow(TypeError);
    expect(() => mulchOfKey("1/2/3/-1")).toThrow(TypeError);
    expect(() => mulchOfKey("1/2/3/1.5")).toThrow(TypeError);
  });

  it("grades the depth, and stops at the last word however deep it goes", () => {
    expect(mulchGrade({ yards: 1, effects: 0, moving: 0, deepest: 0 })).toBe(MULCH_GRADES[0]);
    expect(mulchGrade({ yards: 1, effects: 2, moving: 0, deepest: 2 })).toBe(MULCH_GRADES[2]);
    expect(mulchGrade({ yards: 1, effects: 40, moving: 0, deepest: 40 })).toBe(MULCH_GRADES.at(-1));
  });
});
