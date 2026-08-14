import { describe, expect, it } from "vitest";

import { activateDeck, patchDeck, createSessionStore } from "./store";
import { migrateSession, sessionV2, type SessionV1 } from "./session";

describe("versioned session", () => {
  it("round-trips v2 and excludes derived and transient fields", () => {
    const store = createSessionStore();
    patchDeck(store, "a", {
      source: { blobId: "audio-1" },
      duration: 12.5,
      playing: true,
      loop: { in: 1, out: 2 },
    });

    activateDeck(store, "b");
    const durable = sessionV2(store.getState());
    expect(JSON.parse(JSON.stringify(durable))).toEqual(durable);
    expect(durable).toMatchObject({ version: 2, activeDeck: "b" });
    expect(durable.decks.a).not.toHaveProperty("duration");
    expect(durable.decks.a).not.toHaveProperty("playing");
    expect(durable.decks.a.source).toEqual({ blobId: "audio-1" });
  });

  it("migrates v1 to the registry's initial deck and validates v2 idempotently", () => {
    const current = sessionV2(createSessionStore().getState());
    const v1 = {
      version: 1,
      decks: { a: current.decks.a, b: current.decks.b },
    } satisfies SessionV1;
    const migrated = migrateSession(v1);
    expect(migrated).toEqual({ ...v1, version: 2, activeDeck: "a" });
    expect(migrateSession(migrated)).toBe(migrated);
  });
});

describe("session validation", () => {
  it("rejects malformed and unsupported stored data loudly", () => {
    const durable = sessionV2(createSessionStore().getState());
    expect(() => migrateSession({ ...durable, version: 99 })).toThrow(
      /unsupported session version/u,
    );
    expect(() => migrateSession(null)).toThrow(/not an object/u);
    expect(() => migrateSession({ ...durable, activeDeck: "z" })).toThrow(/registered deck/u);
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
