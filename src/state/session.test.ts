import { describe, expect, it } from "vitest";

import { patchDeck, createSessionStore } from "./store";
import { migrateSession, sessionV1 } from "./session";

describe("SessionV1", () => {
  it("round-trips its JSON and excludes derived and transient fields", () => {
    const store = createSessionStore();
    patchDeck(store, "a", {
      source: { blobId: "audio-1" },
      duration: 12.5,
      playing: true,
      loop: { in: 1, out: 2 },
    });

    const durable = sessionV1(store.getState());
    expect(JSON.parse(JSON.stringify(durable))).toEqual(durable);
    expect(durable.decks.a).not.toHaveProperty("duration");
    expect(durable.decks.a).not.toHaveProperty("playing");
    expect(durable.decks.a.source).toEqual({ blobId: "audio-1" });
  });

  it("runs the v1 identity stage idempotently", () => {
    const durable = sessionV1(createSessionStore().getState());
    expect(migrateSession(durable)).toBe(durable);
    expect(migrateSession(migrateSession(durable))).toBe(durable);
  });

  it("rejects malformed and unsupported stored data loudly", () => {
    const durable = sessionV1(createSessionStore().getState());
    expect(() => migrateSession({ ...durable, version: 99 })).toThrow(
      /unsupported session version/u,
    );
    expect(() => migrateSession(null)).toThrow(/not an object/u);
    expect(() =>
      migrateSession({
        ...durable,
        decks: { ...durable.decks, a: { ...durable.decks.a, playing: true } },
      }),
    ).toThrow(/expected/u);
    expect(() =>
      migrateSession({
        ...durable,
        decks: {
          ...durable.decks,
          a: { ...durable.decks.a, params: { ...durable.decks.a.params, "deck.gain": "loud" } },
        },
      }),
    ).toThrow(/not a finite number/u);
  });
});
