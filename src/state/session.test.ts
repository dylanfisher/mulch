import { describe, expect, it } from "vitest";

import { activateDeck, patchDeck, createSessionStore } from "./store";
import { validateSession, sessionSnapshot } from "./session";

describe("durable session", () => {
  it("round-trips the projection and excludes derived and transient fields", () => {
    const store = createSessionStore();
    patchDeck(store, "a", {
      source: { blobId: "audio-1" },
      duration: 12.5,
      playing: true,
      loop: { in: 1, out: 2 },
    });

    activateDeck(store, "b");
    const durable = sessionSnapshot(store.getState());
    expect(JSON.parse(JSON.stringify(durable))).toEqual(durable);
    expect(durable.activeDeck).toBe("b");
    expect(durable.decks.a).not.toHaveProperty("duration");
    expect(durable.decks.a).not.toHaveProperty("playing");
    expect(durable.decks.a.source).toEqual({ blobId: "audio-1" });
    // The projection is the shape, so the validator takes it back unchanged (0026).
    expect(validateSession(durable)).toBe(durable);
  });

  it("refuses a session with a stray field, a missing param, or an unknown one", () => {
    const durable = sessionSnapshot(createSessionStore().getState());
    const { "eq.q": _dropped, ...withoutEq } = durable.decks.a.params;
    const withParams = (params: unknown) => ({
      ...durable,
      decks: { ...durable.decks, a: { ...durable.decks.a, params } },
    });

    // Pre-release has no stored version: a session carrying one is not this build's shape.
    expect(() => validateSession({ ...durable, version: 5 })).toThrow(/expected \[activeDeck/u);
    expect(() => validateSession(withParams(withoutEq))).toThrow(/expected \[.*eq\.q.*\]/u);
    expect(() =>
      validateSession(withParams({ ...durable.decks.a.params, "eq.wobble": 1 })),
    ).toThrow(/eq\.wobble/u);
  });
});

/** One deck's stored rack, in whatever shape the refusal below is about. */
const withRack = (effects: unknown, bypassed: unknown) => {
  const durable = sessionSnapshot(createSessionStore().getState());
  return {
    ...durable,
    decks: { ...durable.decks, a: { ...durable.decks.a, effects, bypassed } },
  };
};

// The bypass refusal matrix, beside the rack projection it hardens (0023).
describe("rack bypass session validation", () => {
  it("accepts a bypass list that is a rack-ordered subset of the effects", () => {
    const migrated = validateSession(withRack(["filter", "delay"], ["filter", "delay"]));
    expect(migrated.decks.a.bypassed).toEqual(["filter", "delay"]);
  });

  it("rejects a bypass that is not an array of known, held, unique, ordered effects", () => {
    expect(() => validateSession(withRack(["filter"], "filter"))).toThrow(/not an array/u);
    expect(() => validateSession(withRack(["filter"], ["nope"]))).toThrow(/unknown effect/u);
    expect(() => validateSession(withRack(["filter"], ["delay"]))).toThrow(
      /rack does not hold: delay/u,
    );
    expect(() => validateSession(withRack(["filter"], ["filter", "filter"]))).toThrow(
      /repeats filter/u,
    );
    expect(() => validateSession(withRack(["filter", "delay"], ["delay", "filter"]))).toThrow(
      /not in rack order/u,
    );
  });
});

describe("session validation", () => {
  it("rejects malformed stored data loudly", () => {
    const durable = sessionSnapshot(createSessionStore().getState());
    expect(() => validateSession(null)).toThrow(/not an object/u);
    expect(() => validateSession({ ...durable, activeDeck: "z" })).toThrow(/registered deck/u);
    expect(() =>
      validateSession({
        ...durable,
        decks: { ...durable.decks, a: { ...durable.decks.a, playing: true } },
      }),
    ).toThrow(/expected/u);
    expect(() =>
      validateSession({
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
    const durable = sessionSnapshot(createSessionStore().getState());
    expect(() =>
      validateSession({
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
      validateSession({
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

  it("carries an effect-owned lane through the projection and the current validator", () => {
    const store = createSessionStore();
    const points = [
      { at: 0.5, value: 200 },
      { at: 1.5, value: 4000 },
    ];
    patchDeck(store, "a", { effects: ["filter"], automation: { "filter.cutoff": points } });
    const durable = sessionSnapshot(store.getState());

    expect(durable.decks.a.automation).toEqual({ "filter.cutoff": points });
    // No shape changed, so no version did: the registry is what widened, not the format (0024).
    expect(validateSession(durable)).toEqual(durable);
  });

  it("carries the EQ's rack place, bypass, values and lanes through v5", () => {
    const store = createSessionStore();
    const frequency = [
      { at: 0, value: 400 },
      { at: 2, value: 6000 },
    ];
    const gain = [
      { at: 0, value: -12 },
      { at: 2, value: 18 },
    ];
    patchDeck(store, "a", {
      effects: ["filter", "eq"],
      bypassed: ["eq"],
      params: { ...store.getState().decks.a.params, "eq.q": 7.5 },
      automation: { "eq.frequency": frequency, "eq.gain": gain },
    });
    const durable = sessionSnapshot(store.getState());

    expect(durable.decks.a.effects).toEqual(["filter", "eq"]);
    expect(durable.decks.a.bypassed).toEqual(["eq"]);
    expect(durable.decks.a.params["eq.q"]).toBe(7.5);
    expect(durable.decks.a.automation).toEqual({ "eq.frequency": frequency, "eq.gain": gain });
    // The EQ's parameters are v5's, so the current projection validates unchanged (0026).
    expect(validateSession(durable)).toEqual(durable);
  });

  it("rejects duplicate, non-finite, and non-canonical signed-zero points", () => {
    const durable = sessionSnapshot(createSessionStore().getState());
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
      validateSession(
        withLane([
          { at: 1, value: 0.25 },
          { at: 1, value: 0.5 },
        ]),
      ),
    ).toThrow(/not normalized/u);
    expect(() => validateSession(withLane([{ at: 1, value: Number.NaN }]))).toThrow(/finite/u);
    expect(() => validateSession(withLane([{ at: Number.POSITIVE_INFINITY, value: 1 }]))).toThrow(
      /finite/u,
    );
    expect(() => validateSession(withLane([{ at: -0, value: 0.5 }]))).toThrow(/not normalized/u);
  });
});
