// Each case keeps one whole restoration order visible, from the deck list through every stage;
// splitting it would hide which assertion belongs to which order (0007).
// oxlint-disable max-lines-per-function
import { describe, expect, it } from "vitest";

import { sessionSnapshot } from "@/state/session";
import { activateDeck, addDeck, createSessionStore, patchDeck, removeDeck } from "@/state/store";
import { clipRestorationCommands, restorationCommands } from "./restore";

describe("restoration command order", () => {
  it("loads all sources before parameters, effects, and loops", () => {
    const store = createSessionStore();
    addDeck(store, "b");
    patchDeck(store, "a", {
      source: { gen: "sine", secs: 2 },
      effects: ["delay", "filter"],
      bypassed: ["filter"],
      automation: {
        "deck.gain": [{ at: 1, value: 0.25 }],
        "filter.cutoff": [{ at: 1, value: 400 }],
      },
      loop: { in: 0.25, out: 1 },
    });
    patchDeck(store, "b", { source: { blobId: "b-audio" } });
    activateDeck(store, "b");

    const commands = restorationCommands(sessionSnapshot(store.getState()));
    const kinds = commands.map(({ t }) => t);
    // A fresh store holds one deck, so the session's own list is reached before any stage runs.
    expect(commands.slice(0, 3)).toEqual([
      { t: "deck.remove", deck: "a" },
      { t: "deck.add", deck: "a" },
      { t: "deck.add", deck: "b" },
    ]);
    expect(kinds.lastIndexOf("deck.add")).toBeLessThan(kinds.indexOf("deck.load"));
    const lastLoad = kinds.lastIndexOf("deck.load");
    const firstParam = kinds.indexOf("param.set");
    const lastParam = kinds.lastIndexOf("param.set");
    const firstEffect = kinds.indexOf("effect.add");
    const lastEffect = kinds.lastIndexOf("effect.add");
    const firstAutomation = kinds.indexOf("automation.set");
    const firstBypass = kinds.indexOf("effect.bypass");
    const firstLoop = kinds.indexOf("deck.loop");

    expect(lastLoad).toBeLessThan(firstParam);
    expect(lastParam).toBeLessThan(firstEffect);
    // Bypass names an effect the rack must already hold, so it follows every addition (0023).
    expect(lastEffect).toBeLessThan(firstBypass);
    expect(firstBypass).toBeLessThan(firstAutomation);
    expect(firstAutomation).toBeLessThan(firstLoop);
    // An effect's lane is restored the same way and in the same stage as the deck's own (0024).
    expect(commands.filter(({ t }) => t === "automation.set")).toMatchObject([
      { deck: "a", param: "deck.gain" },
      { deck: "a", param: "filter.cutoff" },
    ]);
    expect(commands.filter(({ t }) => t === "effect.bypass")).toEqual([
      { t: "effect.bypass", deck: "a", effect: "filter", bypassed: true },
    ]);
    expect(commands.filter(({ t }) => t === "effect.add")).toMatchObject([
      { deck: "a", effect: "delay" },
      { deck: "a", effect: "filter" },
    ]);
    expect(commands.at(-1)).toEqual({ t: "deck.activate", deck: "b" });
  });

  it("reaches a deck list that shares nothing with boot, including an empty one", () => {
    const empty = restorationCommands({ activeDeck: null, deckIds: [], decks: {}, clips: [] });
    // A session that holds none is the booted deck's removal and nothing else: no add, and no
    // activation, because there is no deck to name (0029).
    expect(empty).toEqual([{ t: "deck.remove", deck: "a" }]);

    const store = createSessionStore();
    addDeck(store, "x");
    addDeck(store, "y");
    removeDeck(store, "a");
    activateDeck(store, "y");
    const renamed = restorationCommands(sessionSnapshot(store.getState()));

    expect(renamed.slice(0, 3)).toEqual([
      { t: "deck.remove", deck: "a" },
      { t: "deck.add", deck: "x" },
      { t: "deck.add", deck: "y" },
    ]);
    expect(renamed.at(-1)).toEqual({ t: "deck.activate", deck: "y" });
  });
});

describe("clip application command order", () => {
  it("clears what the preset does not carry, then runs the same stages", () => {
    const store = createSessionStore();
    addDeck(store, "b");
    // The deck as it is: two effects and a lane the clip below does not carry.
    patchDeck(store, "b", {
      effects: ["eq", "delay"],
      automation: {
        "deck.gain": [{ at: 0, value: 0.5 }],
        "eq.gain": [{ at: 0, value: 6 }],
      },
    });
    patchDeck(store, "a", {
      source: { blobId: "clip-audio" },
      effects: ["filter"],
      bypassed: ["filter"],
      automation: { "deck.gain": [{ at: 0, value: 0.25 }] },
      loop: { in: 0, out: 1 },
    });
    const session = sessionSnapshot(store.getState());

    const commands = clipRestorationCommands("b", session.decks.b!, session.decks.a!);
    const kinds = commands.map(({ t }) => t);

    // Every held effect is removed before the first addition, so the preset's order is final.
    expect(commands.filter(({ t }) => t === "effect.remove")).toEqual([
      { t: "effect.remove", deck: "b", effect: "eq" },
      { t: "effect.remove", deck: "b", effect: "delay" },
    ]);
    expect(kinds.lastIndexOf("effect.remove")).toBeLessThan(kinds.indexOf("deck.load"));
    // Only the lane the clip does not carry is cleared; deck.gain is replaced by the preset's.
    expect(
      commands.filter((command) => command.t === "automation.set" && command.points.length === 0),
    ).toEqual([{ t: "automation.set", deck: "b", param: "eq.gain", points: [] }]);
    // The same stage order the session restores in, on the one deck being rewritten.
    expect(kinds.indexOf("deck.load")).toBeLessThan(kinds.indexOf("param.set"));
    expect(kinds.lastIndexOf("param.set")).toBeLessThan(kinds.indexOf("effect.add"));
    expect(kinds.indexOf("effect.add")).toBeLessThan(kinds.indexOf("effect.bypass"));
    expect(kinds.indexOf("effect.bypass")).toBeLessThan(kinds.lastIndexOf("automation.set"));
    expect(kinds.lastIndexOf("automation.set")).toBeLessThan(kinds.indexOf("deck.loop"));
    // Every command names the target deck; nothing about the clip's origin travels with it.
    expect(commands.every((command) => command.deck === "b")).toBe(true);
  });
});
