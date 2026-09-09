// One flat contract matrix per durable shape — decks, racks and now clips — beside the one
// hand-written stored session they are all asserted against (0007, 0026).
// oxlint-disable max-lines, max-lines-per-function
import { describe, expect, it } from "vitest";

import { effectParamDefaults } from "@/audio/params";
import { activateDeck, addDeck, createSessionStore, deckIdsOf, patchDeck } from "./store";
import { validateSession, sessionSnapshot, type SessionEffect } from "./session";

/** One rack entry at its plugin's defaults — the live shape every fixture below dresses. */
const instance = (
  id: string,
  effect: SessionEffect["effect"],
  rest: Partial<SessionEffect> = {},
): SessionEffect => ({
  id,
  effect,
  bypassed: false,
  params: effectParamDefaults(effect, id),
  automation: {},
  drawn: {},
  bounds: {},
  ...rest,
});

describe("durable session", () => {
  it("round-trips the projection and excludes derived and transient fields", () => {
    const store = createSessionStore();
    patchDeck(store, "a", {
      source: { blobId: "audio-1" },
      duration: 12.5,
      playing: true,
      loop: { in: 1, out: 2 },
    });

    addDeck(store, "b", "🌴", "North Willow");
    activateDeck(store, "b");
    const durable = sessionSnapshot(store.getState());
    expect(JSON.parse(JSON.stringify(durable))).toEqual(durable);
    expect(deckIdsOf(durable.deckList)).toEqual(["a", "b"]);
    expect(durable.activeDeck).toBe("b");
    expect(durable.decks.a!).not.toHaveProperty("duration");
    expect(durable.decks.a!).not.toHaveProperty("playing");
    expect(durable.decks.a!.source).toEqual({ blobId: "audio-1" });
    // The projection is the shape, so the validator takes it back unchanged (0026).
    expect(validateSession(durable)).toBe(durable);
  });

  it("refuses a session with a stray field, a missing param, or an unknown one", () => {
    const durable = sessionSnapshot(createSessionStore().getState());
    const { "deck.pan": _dropped, ...withoutPan } = durable.decks.a!.params;
    const withParams = (params: unknown) => ({
      ...durable,
      decks: { ...durable.decks, a: { ...durable.decks.a!, params } },
    });

    // Pre-release has no stored version: a session carrying one is not this build's shape.
    expect(() => validateSession({ ...durable, version: 5 })).toThrow(/expected \[activeDeck/u);
    expect(() => validateSession(withParams(withoutPan))).toThrow(/expected \[.*deck\.pan.*\]/u);
    // An effect's parameter is not the deck's any more: a deck holding one is not this shape.
    expect(() => validateSession(withParams({ ...durable.decks.a!.params, "eq.q": 1 }))).toThrow(
      /eq\.q/u,
    );
  });
});

/** One deck's stored rack, in whatever shape the refusal below is about. */
const withRack = (effects: unknown) => {
  const durable = sessionSnapshot(createSessionStore().getState());
  return { ...durable, decks: { ...durable.decks, a: { ...durable.decks.a!, effects } } };
};

const STORED_FILTER = {
  id: "flt",
  effect: "filter",
  bypassed: false,
  params: { "filter.cutoff": 1000 },
  automation: {},
  drawn: {},
  bounds: {},
};

// The rack refusal matrix, beside the instance projection it hardens (0023, 0030).
/** One stored automator carrying whatever windows a case wants to put on the pool (0208). */
const storedAuto = (bounds: unknown) => ({
  id: "auto",
  effect: "automator",
  bypassed: false,
  params: effectParamDefaults("automator", "auto"),
  automation: {},
  drawn: {},
  bounds,
});

describe("rack session validation", () => {
  it("accepts two instances of one effect, each with its own values and bypass", () => {
    const stored = withRack([
      STORED_FILTER,
      { ...STORED_FILTER, id: "flt2", bypassed: true, params: { "filter.cutoff": 240 } },
    ]);
    const session = validateSession(stored);
    expect(session.decks.a!.effects.map((entry) => [entry.id, entry.bypassed])).toEqual([
      ["flt", false],
      ["flt2", true],
    ]);
  });

  it("rejects a rack that is not a list of identified, registered, exactly-valued instances", () => {
    expect(() => validateSession(withRack("filter"))).toThrow(/not an array/u);
    expect(() => validateSession(withRack([{ ...STORED_FILTER, effect: "nope" }]))).toThrow(
      /effect is not registered: nope/u,
    );
    expect(() => validateSession(withRack([STORED_FILTER, STORED_FILTER]))).toThrow(
      /id repeats flt/u,
    );
    expect(() => validateSession(withRack([{ ...STORED_FILTER, id: "" }]))).toThrow(
      /id is not a non-empty string/u,
    );
    expect(() => validateSession(withRack([{ ...STORED_FILTER, bypassed: "yes" }]))).toThrow(
      /bypassed is not a boolean/u,
    );
    // Values are keyed by exactly the parameters this instance's own plugin declares (0030).
    expect(() => validateSession(withRack([{ ...STORED_FILTER, params: {} }]))).toThrow(
      /expected \[filter\.cutoff\]/u,
    );
    expect(() =>
      validateSession(
        withRack([{ ...STORED_FILTER, params: { "filter.cutoff": 1000, "delay.mix": 0.5 } }]),
      ),
    ).toThrow(/expected \[filter\.cutoff\]/u);
    expect(() =>
      validateSession(withRack([{ ...STORED_FILTER, params: { "filter.cutoff": 0 } }])),
    ).toThrow(/outside \[20, 20000\]/u);
    // And so are its lanes: a lane for a parameter this plugin does not declare is not its.
    expect(() =>
      validateSession(
        withRack([{ ...STORED_FILTER, automation: { "deck.gain": [{ at: 0, value: 1 }] } }]),
      ),
    ).toThrow(/unsupported param/u);
  });

  /**
   * 0208: `bounds` is a window per *pool* parameter on the entry that draws a run — read off the
   * pool's own declarations, so it is empty on every entry that draws nothing.
   */
  it("carries the windows a run is bounded by, and refuses a bound nothing draws inside", () => {
    const stored = withRack([storedAuto({ "delay.time": { min: 0.1, max: 0.4 } })]);
    const session = validateSession(stored);
    expect(session.decks.a!.effects[0]!.bounds).toEqual({ "delay.time": { min: 0.1, max: 0.4 } });

    // A window on an entry with no run to bound is a fact about nothing.
    expect(() =>
      validateSession(
        withRack([{ ...STORED_FILTER, bounds: { "filter.cutoff": { min: 1, max: 2 } } }]),
      ),
    ).toThrow(/bounds a run this effect does not have/u);
    // The pool's own list: a parameter no arrival is ever drawn at takes no window.
    expect(() =>
      validateSession(withRack([storedAuto({ "auto.most": { min: 1, max: 2 } })])),
    ).toThrow(/unsupported param/u);
    expect(() =>
      validateSession(withRack([storedAuto({ "delay.time": { min: 0.4, max: 0.1 } })])),
    ).toThrow(/not an increasing range/u);
    expect(() =>
      validateSession(withRack([storedAuto({ "delay.time": { min: -1, max: 0.4 } })])),
    ).toThrow(/outside \[0\.01, 2\]/u);
    expect(() =>
      validateSession(withRack([storedAuto({ "delay.time": { min: 0.1, max: 0.4, mid: 0.2 } })])),
    ).toThrow(/expected \[max, min\]/u);
    // And a rack entry with no bounds field at all is not this build's shape.
    const { bounds: _dropped, ...unbounded } = STORED_FILTER;
    expect(() => validateSession(withRack([unbounded]))).toThrow(/expected \[automation, bounds/u);
  });
});

describe("session validation", () => {
  it("rejects malformed stored data loudly", () => {
    const durable = sessionSnapshot(createSessionStore().getState());
    expect(() => validateSession(null)).toThrow(/not an object/u);
    expect(() => validateSession({ ...durable, activeDeck: "z" })).toThrow(/not a held deck/u);
    // The letters this session has drawn: a list, each one durable text, no repeats, and never
    // short of a deck the session holds — a held id that was never spent would be handed out
    // again by the next add (0082).
    expect(() => validateSession({ ...durable, spentDeckIds: "a" })).toThrow(/not an array/u);
    expect(() => validateSession({ ...durable, spentDeckIds: ["a", "a"] })).toThrow(/repeats a/u);
    expect(() => validateSession({ ...durable, spentDeckIds: [] })).toThrow(/is missing a/u);
    expect(() => validateSession({ ...durable, spentDeckIds: ["a", 7] })).toThrow(
      /not a non-empty/u,
    );
    // The list and the keyed map are one shape: neither may name a deck the other does not.
    expect(() =>
      validateSession({
        ...durable,
        deckList: [
          { id: "a", emoji: "🏡", name: "Quiet Fern" },
          { id: "b", emoji: "🌴", name: "North Willow" },
        ],
      }),
    ).toThrow(/expected \[a, b\]/u);
    expect(() =>
      validateSession({
        ...durable,
        deckList: [
          { id: "a", emoji: "🏡", name: "Quiet Fern" },
          { id: "a", emoji: "🌴", name: "North Willow" },
        ],
      }),
    ).toThrow(/repeats a/u);
    // A stored deck entry is the id, the emoji and the name it was added with, and nothing else
    // (0057). An entry short of either decoration is a session from another build (0026).
    expect(() => validateSession({ ...durable, deckList: [{ id: "a" }, { id: "b" }] })).toThrow(
      /has keys/u,
    );
    expect(() => validateSession({ ...durable, deckList: [{ id: "a", emoji: "🏡" }] })).toThrow(
      /has keys/u,
    );
    expect(() =>
      validateSession({
        ...durable,
        deckList: [
          { id: "a", emoji: "", name: "Quiet Fern" },
          { id: "b", emoji: "🌴", name: "North Willow" },
        ],
      }),
    ).toThrow(/emoji/u);
    expect(() =>
      validateSession({
        ...durable,
        deckList: [
          { id: "a", emoji: "🏡", name: "" },
          { id: "b", emoji: "🌴", name: "North Willow" },
        ],
      }),
    ).toThrow(/name/u);
    // A session with decks must name an active one; one with none must name null (0029).
    expect(() => validateSession({ ...durable, activeDeck: null })).toThrow(/decks are held/u);
    expect(() => validateSession({ ...durable, deckList: [], decks: {}, activeDeck: "a" })).toThrow(
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

  /**
   * The two rules a stored loop is held to, and the field swap that is what a session from
   * another build actually looks like: the same number of keys, one of them under a name this
   * build does not write. There is no migration to reach for, so each is a discard (0026).
   */
  it("rejects a loop with nothing to loop, a backwards one, and a renamed field", () => {
    const durable = sessionSnapshot(createSessionStore().getState());
    const deck = (patch: Record<string, unknown>) => ({
      ...durable,
      decks: { ...durable.decks, a: { ...durable.decks.a!, ...patch } },
    });
    const playing = { source: { blobId: "audio-1" } };
    expect(validateSession(deck({ ...playing, loop: { in: 0, out: 1 } })).decks.a?.loop).toEqual({
      in: 0,
      out: 1,
    });
    expect(() => validateSession(deck({ loop: { in: 0, out: 1 } }))).toThrow(
      /loop exists without a source/u,
    );
    expect(() => validateSession(deck({ ...playing, loop: { in: 1, out: 1 } }))).toThrow(
      /not an increasing range/u,
    );
    expect(() => validateSession(deck({ ...playing, loop: { in: -1, out: 2 } }))).toThrow(
      /not an increasing range/u,
    );
    const { loop: _renamed, ...withoutLoop } = durable.decks.a!;
    expect(() =>
      validateSession({ ...durable, decks: { a: { ...withoutLoop, region: null } } }),
    ).toThrow(/has keys/u);
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
            automation: { "deck.speed": [{ at: 0, value: 1 }] },
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

  // What drew a lane is stored beside that lane and only there: the invariant `MotionDrawn`'s own
  // doc states, checked where a stored session comes back in (0026, 0314).
  it("rejects a drawn state with no lane beside it, and takes one that has", () => {
    const store = createSessionStore();
    const points = [
      { at: 0, value: 0.25 },
      { at: 1, value: 0.75 },
    ];
    patchDeck(store, "a", {
      automation: { "deck.gain": points },
      drawn: { "deck.gain": { character: "pulse", redraw: 2 } },
    });
    const durable = sessionSnapshot(store.getState());
    expect(validateSession(durable)).toEqual(durable);

    const orphaned = {
      ...durable,
      decks: {
        ...durable.decks,
        a: { ...durable.decks.a!, automation: {} },
      },
    };
    expect(() => validateSession(orphaned)).toThrow(/deck\.gain has no lane/u);

    // And the same one rack card down, where a clip carries it too.
    patchDeck(store, "a", {
      automation: {},
      drawn: {},
      effects: [
        instance("flt", "filter", {
          drawn: { "filter.cutoff": { character: "creep", redraw: 0 } },
        }),
      ],
    });
    expect(() => validateSession(sessionSnapshot(store.getState()))).toThrow(
      /filter\.cutoff has no lane/u,
    );
  });

  it("carries an instance-owned lane through the projection and the current validator", () => {
    const store = createSessionStore();
    const points = [
      { at: 0.5, value: 200 },
      { at: 1.5, value: 4000 },
    ];
    patchDeck(store, "a", {
      effects: [instance("flt", "filter", { automation: { "filter.cutoff": points } })],
    });
    const durable = sessionSnapshot(store.getState());

    // The lane travels on the instance holding it, not beside the deck's own (0030).
    expect(durable.decks.a!.automation).toEqual({});
    expect(durable.decks.a!.effects[0]?.automation).toEqual({ "filter.cutoff": points });
    expect(validateSession(durable)).toEqual(durable);
  });

  it("carries each of two EQ instances' place, bypass, values and lanes", () => {
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
      effects: [
        instance("eq1", "eq", {
          bypassed: true,
          params: { ...effectParamDefaults("eq", "eq1"), "eq.q": 7.5 },
          automation: { "eq.frequency": frequency, "eq.gain": gain },
        }),
        instance("eq2", "eq"),
      ],
    });
    const durable = sessionSnapshot(store.getState());

    const [first, second] = durable.decks.a!.effects;
    expect(durable.decks.a!.effects.map((entry) => entry.effect)).toEqual(["eq", "eq"]);
    expect([first?.bypassed, second?.bypassed]).toEqual([true, false]);
    // Two instances of one entry, and neither value nor lane leaks between them (0030).
    expect(first?.params["eq.q"]).toBe(7.5);
    expect(second?.params["eq.q"]).toBe(1);
    expect(first?.automation).toEqual({ "eq.frequency": frequency, "eq.gain": gain });
    expect(second?.automation).toEqual({});
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
