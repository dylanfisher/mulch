// Each case keeps one whole restoration order visible, from the deck list through every stage;
// splitting it would hide which assertion belongs to which order (0007).
// oxlint-disable max-lines-per-function
import { describe, expect, it } from "vitest";

import { INITIAL_YARD_EMOJI, INITIAL_YARD_NAME } from "@/lib/copy";
import { effectParamDefaults } from "@/audio/params";
import { sessionSnapshot, type SessionEffect } from "@/state/session";
import { activateDeck, addDeck, createSessionStore, patchDeck, removeDeck } from "@/state/store";
import { clipRestorationCommands, restorationCommands, restoreInto } from "./restore";

/** One rack entry at its plugin's defaults — the fixture every case below dresses further. */
const instance = (
  id: string,
  effect: SessionEffect["effect"],
  rest: Partial<SessionEffect> = {},
): SessionEffect => ({
  id,
  effect,
  bypassed: false,
  params: effectParamDefaults(effect),
  automation: {},
  ...rest,
});

describe("restoration command order", () => {
  it("loads all sources before parameters, effects, and loops", () => {
    const store = createSessionStore();
    addDeck(store, "b", "🌴", "North Willow");
    patchDeck(store, "a", {
      source: { gen: "sine", secs: 2 },
      effects: [
        instance("dly", "delay"),
        instance("flt", "filter", {
          bypassed: true,
          automation: { "filter.cutoff": [{ at: 1, value: 400 }] },
        }),
      ],
      automation: { "deck.gain": [{ at: 1, value: 0.25 }] },
      loop: { in: 0.25, out: 1 },
    });
    patchDeck(store, "b", { source: { blobId: "b-audio" } });
    activateDeck(store, "b");

    const commands = restorationCommands(sessionSnapshot(store.getState()));
    const kinds = commands.map(({ t }) => t);
    // A fresh store holds one deck, so the session's own list is reached before any stage runs.
    expect(commands.slice(0, 3)).toEqual([
      { t: "deck.remove", deck: "a" },
      { t: "deck.add", deck: "a", emoji: INITIAL_YARD_EMOJI, name: INITIAL_YARD_NAME },
      { t: "deck.add", deck: "b", emoji: "🌴", name: "North Willow" },
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
    expect(firstParam).toBeLessThan(firstEffect);
    // Bypass names an instance the rack must already hold, so it follows every addition (0023),
    // and so do that instance's own values (0030).
    expect(lastEffect).toBeLessThan(lastParam);
    expect(lastParam).toBeLessThan(firstBypass);
    expect(firstBypass).toBeLessThan(firstAutomation);
    expect(firstAutomation).toBeLessThan(firstLoop);
    // An effect's lane is restored the same way and in the same stage as the deck's own (0024).
    expect(commands.filter(({ t }) => t === "automation.set")).toMatchObject([
      { deck: "a", param: "deck.gain" },
      { deck: "a", instance: "flt", param: "filter.cutoff" },
    ]);
    // Every instance states the flag it carries, in rack order: a preset says what its bypass is
    // rather than only which entries are off, and a flag already held is a no-op (0030).
    expect(commands.filter(({ t }) => t === "effect.bypass")).toEqual([
      { t: "effect.bypass", deck: "a", instance: "dly", bypassed: false },
      { t: "effect.bypass", deck: "a", instance: "flt", bypassed: true },
    ]);
    expect(commands.filter(({ t }) => t === "effect.add")).toMatchObject([
      { deck: "a", id: "dly", effect: "delay" },
      { deck: "a", id: "flt", effect: "filter" },
    ]);
    // A fresh deck receives its instances in order, so nothing is reordered on the way in.
    expect(kinds).not.toContain("effect.reorder");
    // Each instance's values are set after its addition, because they are the instance's (0030).
    expect(
      commands.filter((command) => command.t === "param.set" && "instance" in command),
    ).toMatchObject([
      { deck: "a", instance: "dly", param: "delay.time" },
      { deck: "a", instance: "dly", param: "delay.feedback" },
      { deck: "a", instance: "dly", param: "delay.mix" },
      { deck: "a", instance: "flt", param: "filter.cutoff" },
    ]);
    expect(commands.at(-1)).toEqual({ t: "deck.activate", deck: "b" });
  });

  it("reaches a deck list that shares nothing with boot, including an empty one", () => {
    const empty = restorationCommands({
      activeDeck: null,
      deckList: [],
      decks: {},
      spentDeckIds: ["a"],
      clips: [],
    });
    // A session that holds none is the booted deck's removal and nothing else: no add, and no
    // activation, because there is no deck to name (0029).
    expect(empty).toEqual([{ t: "deck.remove", deck: "a" }]);

    const store = createSessionStore();
    addDeck(store, "x", "🌴", "North Willow");
    addDeck(store, "y", "🌴", "Wild Bramble");
    removeDeck(store, "a");
    activateDeck(store, "y");
    const renamed = restorationCommands(sessionSnapshot(store.getState()));

    expect(renamed.slice(0, 3)).toEqual([
      { t: "deck.remove", deck: "a" },
      { t: "deck.add", deck: "x", emoji: "🌴", name: "North Willow" },
      { t: "deck.add", deck: "y", emoji: "🌴", name: "Wild Bramble" },
    ]);
    expect(renamed.at(-1)).toEqual({ t: "deck.activate", deck: "y" });
  });

  /**
   * 0082: replaying the adds respends only the ids the session still holds, so the letters it
   * drew and then removed reach the fresh store through the seed or not at all — and a boot
   * without it would hand one of them to the next yard added.
   */
  it("seeds the letters a stored session spent on decks it no longer holds", () => {
    const stored = createSessionStore();
    addDeck(stored, "b", "🌴", "North Willow");
    removeDeck(stored, "b");
    const session = sessionSnapshot(stored.getState());
    expect(session.spentDeckIds).toEqual(["a", "b"]);
    expect(session.deckList.map(({ id }) => id)).toEqual(["a"]);

    const booting = createSessionStore();
    const commands = restoreInto(booting, session);
    expect(booting.getState().spentDeckIds).toEqual(["a", "b"]);
    // And it is exactly the ordinary restoration beside it — the seed adds no command.
    expect(commands).toEqual(restorationCommands(session));
  });
});

describe("clip application command order", () => {
  it("clears what the preset does not carry, then runs the same stages", () => {
    const store = createSessionStore();
    addDeck(store, "b", "🌴", "North Willow");
    // The deck as it is: two effects and a lane the clip below does not carry.
    patchDeck(store, "b", {
      effects: [
        instance("eq1", "eq", { automation: { "eq.gain": [{ at: 0, value: 6 }] } }),
        instance("dly", "delay"),
        // Shared with the clip below by id: the same instance, which apply must not rebuild.
        instance("flt", "filter", { automation: { "filter.cutoff": [{ at: 0, value: 900 }] } }),
      ],
      automation: { "deck.gain": [{ at: 0, value: 0.5 }] },
    });
    patchDeck(store, "a", {
      source: { blobId: "clip-audio" },
      effects: [instance("flt", "filter", { bypassed: true }), instance("eq2", "eq")],
      automation: { "deck.gain": [{ at: 0, value: 0.25 }] },
      loop: { in: 0, out: 1 },
    });
    const session = sessionSnapshot(store.getState());

    const commands = clipRestorationCommands("b", session.decks.b!, session.decks.a!);
    const kinds = commands.map(({ t }) => t);

    // Only the instances the preset does not carry are removed: the shared `flt` stays in the
    // rack and is moved into place, because the rack no longer has to be emptied (0030).
    expect(commands.filter(({ t }) => t === "effect.remove")).toEqual([
      { t: "effect.remove", deck: "b", instance: "eq1" },
      { t: "effect.remove", deck: "b", instance: "dly" },
    ]);
    expect(kinds.lastIndexOf("effect.remove")).toBeLessThan(kinds.indexOf("deck.load"));
    expect(commands.filter(({ t }) => t === "effect.add")).toMatchObject([
      { deck: "b", id: "eq2", effect: "eq" },
    ]);
    // With a survivor in the rack, every preset entry is placed by index, front to back.
    expect(commands.filter(({ t }) => t === "effect.reorder")).toEqual([
      { t: "effect.reorder", deck: "b", instance: "flt", index: 0 },
      { t: "effect.reorder", deck: "b", instance: "eq2", index: 1 },
    ]);
    // Only lanes the clip does not carry are cleared — the deck's own is replaced by the
    // preset's, and the survivor's lane goes because the preset's copy of it has none.
    expect(
      commands.filter((command) => command.t === "automation.set" && command.points.length === 0),
    ).toEqual([
      { t: "automation.set", deck: "b", instance: "flt", param: "filter.cutoff", points: [] },
    ]);
    // The same stage order the session restores in, on the one deck being rewritten.
    expect(kinds.indexOf("deck.load")).toBeLessThan(kinds.indexOf("param.set"));
    expect(kinds.indexOf("param.set")).toBeLessThan(kinds.indexOf("effect.add"));
    expect(kinds.lastIndexOf("param.set")).toBeLessThan(kinds.indexOf("effect.bypass"));
    expect(kinds.indexOf("effect.bypass")).toBeLessThan(kinds.lastIndexOf("automation.set"));
    expect(kinds.lastIndexOf("automation.set")).toBeLessThan(kinds.indexOf("deck.loop"));
    // Every command names the target deck; nothing about the clip's origin travels with it.
    expect(commands.every((command) => command.deck === "b")).toBe(true);
  });

  // The half a rack that is emptied first never had: a kept instance arrives carrying its own
  // bypass, so the preset has to state the flag rather than only assert it (0030).
  it("un-bypasses a kept instance the preset does not carry bypassed", () => {
    const store = createSessionStore();
    addDeck(store, "b", "🌴", "North Willow");
    patchDeck(store, "b", { effects: [instance("flt", "filter", { bypassed: true })] });
    patchDeck(store, "a", {
      source: { blobId: "clip-audio" },
      effects: [instance("flt", "filter", { bypassed: false })],
    });
    const session = sessionSnapshot(store.getState());

    const commands = clipRestorationCommands("b", session.decks.b!, session.decks.a!);

    expect(commands.filter(({ t }) => t === "effect.bypass")).toEqual([
      { t: "effect.bypass", deck: "b", instance: "flt", bypassed: false },
    ]);
  });
});
