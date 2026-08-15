import { describe, expect, it } from "vitest";

import { activateDeck, patchDeck, createSessionStore } from "./store";
import { migrateSession, sessionV4, type SessionV1, type SessionV2 } from "./session";

// The migration's expected shapes stay visible in one assertion sequence.
// oxlint-disable-next-line max-lines-per-function
describe("versioned session", () => {
  it("round-trips v4 and excludes derived and transient fields", () => {
    const store = createSessionStore();
    patchDeck(store, "a", {
      source: { blobId: "audio-1" },
      duration: 12.5,
      playing: true,
      loop: { in: 1, out: 2 },
    });

    activateDeck(store, "b");
    const durable = sessionV4(store.getState());
    expect(JSON.parse(JSON.stringify(durable))).toEqual(durable);
    expect(durable).toMatchObject({ version: 4, activeDeck: "b" });
    expect(durable.decks.a).not.toHaveProperty("duration");
    expect(durable.decks.a).not.toHaveProperty("playing");
    expect(durable.decks.a.source).toEqual({ blobId: "audio-1" });
  });

  it("migrates v1 and v2 to empty lanes and an empty rack bypass, validating v4 idempotently", () => {
    const current = sessionV4(createSessionStore().getState());
    const v1 = {
      version: 1,
      decks: {
        a: {
          params: current.decks.a.params,
          effects: current.decks.a.effects,
          source: current.decks.a.source,
          loop: current.decks.a.loop,
        },
        b: {
          params: current.decks.b.params,
          effects: current.decks.b.effects,
          source: current.decks.b.source,
          loop: current.decks.b.loop,
        },
      },
    } satisfies SessionV1;
    const v2 = { ...v1, version: 2, activeDeck: "a" } satisfies SessionV2;
    const migrated = migrateSession(v2);
    expect(migrated).toEqual({
      version: 4,
      activeDeck: "a",
      decks: {
        a: { ...v2.decks.a, automation: {}, bypassed: [] },
        b: { ...v2.decks.b, automation: {}, bypassed: [] },
      },
    });
    expect(migrateSession(v1)).toEqual(migrated);
    expect(migrateSession(migrated)).toBe(migrated);
  });

  it("carries a v3 session forward with an empty rack bypass", () => {
    const current = sessionV4(createSessionStore().getState());
    const deckV3 = (deck: "a" | "b") => {
      const { bypassed: _bypassed, ...rest } = current.decks[deck];
      return rest;
    };
    const v3 = {
      version: 3,
      activeDeck: "b",
      decks: { a: { ...deckV3("a"), effects: ["filter"] }, b: deckV3("b") },
    };

    expect(migrateSession(v3)).toEqual({
      ...v3,
      version: 4,
      decks: {
        a: { ...v3.decks.a, bypassed: [] },
        b: { ...v3.decks.b, bypassed: [] },
      },
    });
  });
});

/** One deck's stored rack, in whatever shape the refusal below is about. */
const withRack = (effects: unknown, bypassed: unknown) => {
  const durable = sessionV4(createSessionStore().getState());
  return {
    ...durable,
    decks: { ...durable.decks, a: { ...durable.decks.a, effects, bypassed } },
  };
};

// The bypass refusal matrix, beside the rack projection it hardens (0023).
describe("rack bypass session validation", () => {
  it("accepts a bypass list that is a rack-ordered subset of the effects", () => {
    const migrated = migrateSession(withRack(["filter", "delay"], ["filter", "delay"]));
    expect(migrated.decks.a.bypassed).toEqual(["filter", "delay"]);
  });

  it("rejects a bypass that is not an array of known, held, unique, ordered effects", () => {
    expect(() => migrateSession(withRack(["filter"], "filter"))).toThrow(/not an array/u);
    expect(() => migrateSession(withRack(["filter"], ["nope"]))).toThrow(/unknown effect/u);
    expect(() => migrateSession(withRack(["filter"], ["delay"]))).toThrow(
      /rack does not hold: delay/u,
    );
    expect(() => migrateSession(withRack(["filter"], ["filter", "filter"]))).toThrow(
      /repeats filter/u,
    );
    expect(() => migrateSession(withRack(["filter", "delay"], ["delay", "filter"]))).toThrow(
      /not in rack order/u,
    );
  });
});

describe("session validation", () => {
  it("rejects malformed and unsupported stored data loudly", () => {
    const durable = sessionV4(createSessionStore().getState());
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

// The refusal matrix stays beside the accepted current projection it hardens.
// oxlint-disable-next-line max-lines-per-function
describe("automation session validation", () => {
  it("rejects unsupported targets and non-normalized lanes", () => {
    const durable = sessionV4(createSessionStore().getState());
    expect(() =>
      migrateSession({
        ...durable,
        decks: {
          ...durable.decks,
          a: {
            ...durable.decks.a,
            automation: { "deck.pan": [{ at: 0, value: 0 }] },
          },
        },
      }),
    ).toThrow(/unsupported param/u);
    expect(() =>
      migrateSession({
        ...durable,
        decks: {
          ...durable.decks,
          a: {
            ...durable.decks.a,
            automation: {
              "deck.gain": [
                { at: 1, value: 1 },
                { at: 0, value: 0 },
              ],
            },
          },
        },
      }),
    ).toThrow(/not normalized/u);
  });

  it("rejects duplicate, non-finite, and non-canonical signed-zero points", () => {
    const durable = sessionV4(createSessionStore().getState());
    const withLane = (points: unknown) => ({
      ...durable,
      decks: {
        ...durable.decks,
        a: {
          ...durable.decks.a,
          automation: { "deck.gain": points },
        },
      },
    });

    expect(() =>
      migrateSession(
        withLane([
          { at: 1, value: 0.25 },
          { at: 1, value: 0.5 },
        ]),
      ),
    ).toThrow(/not normalized/u);
    expect(() => migrateSession(withLane([{ at: 1, value: Number.NaN }]))).toThrow(/finite/u);
    expect(() => migrateSession(withLane([{ at: Number.POSITIVE_INFINITY, value: 1 }]))).toThrow(
      /finite/u,
    );
    expect(() => migrateSession(withLane([{ at: -0, value: 0.5 }]))).toThrow(/not normalized/u);
  });
});
