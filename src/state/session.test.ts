// One flat contract matrix per durable shape — decks, racks and now clips — beside the one
// hand-written stored session they are all asserted against (0007, 0026).
// oxlint-disable max-lines, max-lines-per-function
import { describe, expect, it } from "vitest";

import { activateDeck, addDeck, patchDeck, createSessionStore } from "./store";
import { sessionBlobIds, validateSession, sessionSnapshot } from "./session";

describe("durable session", () => {
  it("round-trips the projection and excludes derived and transient fields", () => {
    const store = createSessionStore();
    patchDeck(store, "a", {
      source: { blobId: "audio-1" },
      duration: 12.5,
      playing: true,
      loop: { in: 1, out: 2 },
    });

    addDeck(store, "b");
    activateDeck(store, "b");
    const durable = sessionSnapshot(store.getState());
    expect(JSON.parse(JSON.stringify(durable))).toEqual(durable);
    expect(durable.deckIds).toEqual(["a", "b"]);
    expect(durable.activeDeck).toBe("b");
    expect(durable.decks.a!).not.toHaveProperty("duration");
    expect(durable.decks.a!).not.toHaveProperty("playing");
    expect(durable.decks.a!.source).toEqual({ blobId: "audio-1" });
    // The projection is the shape, so the validator takes it back unchanged (0026).
    expect(validateSession(durable)).toBe(durable);
  });

  it("refuses a session with a stray field, a missing param, or an unknown one", () => {
    const durable = sessionSnapshot(createSessionStore().getState());
    const { "eq.q": _dropped, ...withoutEq } = durable.decks.a!.params;
    const withParams = (params: unknown) => ({
      ...durable,
      decks: { ...durable.decks, a: { ...durable.decks.a!, params } },
    });

    // Pre-release has no stored version: a session carrying one is not this build's shape.
    expect(() => validateSession({ ...durable, version: 5 })).toThrow(/expected \[activeDeck/u);
    expect(() => validateSession(withParams(withoutEq))).toThrow(/expected \[.*eq\.q.*\]/u);
    expect(() =>
      validateSession(withParams({ ...durable.decks.a!.params, "eq.wobble": 1 })),
    ).toThrow(/eq\.wobble/u);
  });
});

/** One deck's stored rack, in whatever shape the refusal below is about. */
const withRack = (effects: unknown, bypassed: unknown) => {
  const durable = sessionSnapshot(createSessionStore().getState());
  return {
    ...durable,
    decks: { ...durable.decks, a: { ...durable.decks.a!, effects, bypassed } },
  };
};

// The bypass refusal matrix, beside the rack projection it hardens (0023).
describe("rack bypass session validation", () => {
  it("accepts a bypass list that is a rack-ordered subset of the effects", () => {
    const migrated = validateSession(withRack(["filter", "delay"], ["filter", "delay"]));
    expect(migrated.decks.a!.bypassed).toEqual(["filter", "delay"]);
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
    expect(() => validateSession({ ...durable, activeDeck: "z" })).toThrow(/not a held deck/u);
    // The list and the keyed map are one shape: neither may name a deck the other does not.
    expect(() => validateSession({ ...durable, deckIds: ["a", "b"] })).toThrow(
      /expected \[a, b\]/u,
    );
    expect(() => validateSession({ ...durable, deckIds: ["a", "a"] })).toThrow(/repeats a/u);
    // A session with decks must name an active one; one with none must name null (0029).
    expect(() => validateSession({ ...durable, activeDeck: null })).toThrow(/decks are held/u);
    expect(() => validateSession({ ...durable, deckIds: [], decks: {}, activeDeck: "a" })).toThrow(
      /not a held deck/u,
    );
    expect(() =>
      validateSession({
        ...durable,
        decks: { ...durable.decks, a: { ...durable.decks.a!, playing: true } },
      }),
    ).toThrow(/expected/u);
    expect(() =>
      validateSession({
        ...durable,
        decks: {
          ...durable.decks,
          a: { ...durable.decks.a!, params: { ...durable.decks.a!.params, "deck.gain": "loud" } },
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
            ...durable.decks.a!,
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
            ...durable.decks.a!,
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

    expect(durable.decks.a!.automation).toEqual({ "filter.cutoff": points });
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
      params: { ...store.getState().decks.a!.params, "eq.q": 7.5 },
      automation: { "eq.frequency": frequency, "eq.gain": gain },
    });
    const durable = sessionSnapshot(store.getState());

    expect(durable.decks.a!.effects).toEqual(["filter", "eq"]);
    expect(durable.decks.a!.bypassed).toEqual(["eq"]);
    expect(durable.decks.a!.params["eq.q"]).toBe(7.5);
    expect(durable.decks.a!.automation).toEqual({ "eq.frequency": frequency, "eq.gain": gain });
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
          ...durable.decks.a!,
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

/**
 * Every parameter, spelled out. This is the one fixture in the repo that states the durable shape
 * independently of the code that writes it: 0026 exists because fixtures projected from
 * `sessionSnapshot` and then edited proved only that the registry agreed with itself. It will fail
 * the day a parameter is registered — which is exactly the signal that every stored session and
 * every stored clip has just been discarded rather than migrated.
 */
const STORED_PARAMS = {
  "deck.gain": 1,
  "deck.pan": 0,
  "filter.cutoff": 1000,
  "delay.time": 0.25,
  "delay.feedback": 0.35,
  "delay.mix": 0.25,
  "eq.frequency": 1000,
  "eq.gain": 0,
  "eq.q": 1,
};

const STORED_DECK = {
  params: STORED_PARAMS,
  automation: {},
  effects: [],
  bypassed: [],
  source: null,
  loop: null,
};

/** One stored clip, written by hand — the shape capture writes and apply reads back (0027). */
const STORED_CLIP = {
  id: "clip-1",
  name: "intro",
  deck: {
    params: STORED_PARAMS,
    automation: {
      "filter.cutoff": [
        { at: 0, value: 400 },
        { at: 1, value: 900 },
      ],
    },
    effects: ["filter", "delay"],
    bypassed: ["delay"],
    source: { blobId: "audio-9" },
    loop: { in: 0, out: 1 },
  },
};

/** A whole stored session, written by hand — the shape a clip travels inside (0027). */
const STORED_SESSION = {
  activeDeck: "a",
  deckIds: ["a", "b"],
  decks: { a: STORED_DECK, b: STORED_DECK },
  clips: [STORED_CLIP],
};

const withClips = (clips: unknown) => ({ ...STORED_SESSION, clips });

const clip = (patch: Record<string, unknown>) => [{ ...STORED_CLIP, ...patch }];

describe("stored clips", () => {
  it("accepts a hand-written session whose clip is a whole deck preset", () => {
    const session = validateSession(STORED_SESSION);
    expect(session.deckIds).toEqual(["a", "b"]);
    expect(session.clips).toHaveLength(1);
    expect(session.clips[0]?.deck.effects).toEqual(["filter", "delay"]);
    // The clip's borrowed blob is reachable, which is the one projection GC, history and the
    // portable archive all share — so nothing collects a blob a clip still needs (0027).
    expect([...sessionBlobIds(session)]).toEqual(["audio-9"]);
  });

  it("keeps a clip's projection identical to the shape written by hand", () => {
    const store = createSessionStore();
    patchDeck(store, "a", {
      source: { blobId: "audio-9" },
      effects: ["filter", "delay"],
      bypassed: ["delay"],
      automation: {
        "filter.cutoff": [
          { at: 0, value: 400 },
          { at: 1, value: 900 },
        ],
      },
      loop: { in: 0, out: 1 },
    });
    const projected = sessionSnapshot(store.getState()).decks.a!;
    expect(JSON.parse(JSON.stringify(projected))).toEqual(STORED_CLIP.deck);
  });

  it("refuses a clip list that is not one of unique ids, bounded names and whole decks", () => {
    expect(() => validateSession({ ...STORED_SESSION, clips: {} })).toThrow(/not an array/u);
    expect(() => validateSession(withClips([{ id: "a", name: "b" }]))).toThrow(/expected \[/u);
    expect(() => validateSession(withClips(clip({ id: "" })))).toThrow(/id is not a non-empty/u);
    expect(() => validateSession(withClips([STORED_CLIP, STORED_CLIP]))).toThrow(/repeats clip-1/u);
    expect(() => validateSession(withClips(clip({ name: "" })))).toThrow(/name is empty/u);
    expect(() => validateSession(withClips(clip({ name: "x".repeat(65) })))).toThrow(
      /longer than 64/u,
    );
    // The clip body goes through the very same deck validator a stored deck does.
    expect(() =>
      validateSession(
        withClips(clip({ deck: { ...STORED_CLIP.deck, bypassed: ["delay", "filter"] } })),
      ),
    ).toThrow(/not in rack order/u);
    // Capture refuses an empty deck, so a sourceless clip is not something this format wrote.
    expect(() =>
      validateSession(withClips(clip({ deck: { ...STORED_CLIP.deck, source: null, loop: null } }))),
    ).toThrow(/has no source/u);
  });

  it("refuses a session with no clip list at all", () => {
    const { clips: _dropped, ...withoutClips } = STORED_SESSION;
    expect(() => validateSession(withoutClips)).toThrow(
      /expected \[activeDeck, clips, deckIds, decks\]/u,
    );
  });
});
