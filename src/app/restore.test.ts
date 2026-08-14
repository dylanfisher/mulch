import { describe, expect, it } from "vitest";

import { createSessionStore, patchDeck } from "@/state/store";
import { sessionV1 } from "@/state/session";
import { restorationCommands } from "./restore";

describe("restoration command order", () => {
  it("loads all sources before parameters, effects, and loops", () => {
    const store = createSessionStore();
    patchDeck(store, "a", {
      source: { gen: "sine", secs: 2 },
      effects: ["delay", "filter"],
      loop: { in: 0.25, out: 1 },
    });
    patchDeck(store, "b", { source: { blobId: "b-audio" } });

    const commands = restorationCommands(sessionV1(store.getState()));
    const kinds = commands.map(({ t }) => t);
    const lastLoad = kinds.lastIndexOf("deck.load");
    const firstParam = kinds.indexOf("param.set");
    const lastParam = kinds.lastIndexOf("param.set");
    const firstEffect = kinds.indexOf("effect.add");
    const lastEffect = kinds.lastIndexOf("effect.add");
    const firstLoop = kinds.indexOf("deck.loop");

    expect(lastLoad).toBeLessThan(firstParam);
    expect(lastParam).toBeLessThan(firstEffect);
    expect(lastEffect).toBeLessThan(firstLoop);
    expect(commands.filter(({ t }) => t === "effect.add")).toMatchObject([
      { deck: "a", effect: "delay" },
      { deck: "a", effect: "filter" },
    ]);
  });
});
