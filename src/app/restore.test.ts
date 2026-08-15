import { describe, expect, it } from "vitest";

import { sessionV4 } from "@/state/session";
import { activateDeck, createSessionStore, patchDeck } from "@/state/store";
import { restorationCommands } from "./restore";

describe("restoration command order", () => {
  it("loads all sources before parameters, effects, and loops", () => {
    const store = createSessionStore();
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

    const commands = restorationCommands(sessionV4(store.getState()));
    const kinds = commands.map(({ t }) => t);
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
});
