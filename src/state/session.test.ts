// One flat contract matrix per durable shape — decks, racks and now clips — beside the one
// hand-written stored session they are all asserted against (0007, 0026).
// oxlint-disable max-lines, max-lines-per-function
import { describe, expect, it } from "vitest";

import { effectParamDefaults } from "@/audio/params";
import { assertPlayer, playerSequence } from "@/lib/player";
import { activateDeck, addDeck, deckIdsOf, patchDeck, createSessionStore } from "./store";
import { sessionBlobIds, validateSession, sessionSnapshot, type SessionEffect } from "./session";

/** One rack entry at its plugin's defaults — the live shape every fixture below dresses. */
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
};

// The rack refusal matrix, beside the instance projection it hardens (0023, 0030).
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
          params: { ...effectParamDefaults("eq"), "eq.q": 7.5 },
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
  "deck.speed": 1,
  "deck.pitch": 0,
  "deck.tone": 440,
};

/** One rack, spelled out: an instance holds exactly the parameters its own plugin declares. */
const STORED_RACK = [
  {
    id: "flt",
    effect: "filter",
    bypassed: false,
    params: { "filter.cutoff": 1000 },
    automation: {
      "filter.cutoff": [
        { at: 0, value: 400 },
        { at: 1, value: 900 },
      ],
    },
  },
  {
    id: "dly",
    effect: "delay",
    bypassed: true,
    params: { "delay.time": 0.25, "delay.feedback": 0.35, "delay.mix": 0.25 },
    automation: {},
  },
];

const STORED_DECK = {
  params: STORED_PARAMS,
  automation: {},
  effects: [],
  source: null,
  loop: null,
  player: null,
};

/** One stored clip, written by hand — the shape capture writes and apply reads back (0027). */
const STORED_CLIP = {
  id: "clip-1",
  name: "intro",
  deck: {
    params: STORED_PARAMS,
    automation: {},
    effects: STORED_RACK,
    source: { blobId: "audio-9" },
    loop: { in: 0, out: 1 },
    player: {
      seed: 12_345,
      variation: "wander",
      distance: 4,
      repeats: 3,
      gate: 0.5,
      burst: 1,
      vary: 0,
      varyChance: 1,
      rest: 0,
      restChance: 1,
      restSpread: 0,
      hold: 0,
      chance: 1,
      spread: 2,
      drift: 4,
    },
  },
};

/** A whole stored session, written by hand — the shape a clip travels inside (0027). */
const STORED_SESSION = {
  activeDeck: "a",
  deckList: [
    { id: "a", emoji: "🏡", name: "Quiet Fern" },
    { id: "b", emoji: "🌴", name: "North Willow" },
  ],
  decks: { a: STORED_DECK, b: STORED_DECK },
  spentDeckIds: ["a", "b"],
  clips: [STORED_CLIP],
  sync: 0.5,
};

const withClips = (clips: unknown) => ({ ...STORED_SESSION, clips });

const clip = (patch: Record<string, unknown>) => [{ ...STORED_CLIP, ...patch }];

describe("stored clips", () => {
  it("accepts a hand-written session whose clip is a whole deck preset", () => {
    const session = validateSession(STORED_SESSION);
    expect(deckIdsOf(session.deckList)).toEqual(["a", "b"]);
    expect(session.clips).toHaveLength(1);
    expect(session.clips[0]?.deck.effects.map((entry) => entry.id)).toEqual(["flt", "dly"]);
    // The clip's borrowed blob is reachable, which is the one projection GC, history and the
    // portable archive all share — so nothing collects a blob a clip still needs (0027).
    expect([...sessionBlobIds(session)]).toEqual(["audio-9"]);
  });

  it("keeps a clip's projection identical to the shape written by hand", () => {
    const store = createSessionStore();
    patchDeck(store, "a", {
      source: { blobId: "audio-9" },
      effects: [
        instance("flt", "filter", {
          automation: {
            "filter.cutoff": [
              { at: 0, value: 400 },
              { at: 1, value: 900 },
            ],
          },
        }),
        instance("dly", "delay", { bypassed: true }),
      ],
      loop: { in: 0, out: 1 },
      player: {
        seed: 12_345,
        variation: "wander",
        distance: 4,
        repeats: 3,
        gate: 0.5,
        burst: 1,
        vary: 0,
        varyChance: 1,
        rest: 0,
        restChance: 1,
        restSpread: 0,
        hold: 0,
        chance: 1,
        spread: 2,
        drift: 4,
      },
    });
    const projected = sessionSnapshot(store.getState()).decks.a!;
    expect(JSON.parse(JSON.stringify(projected))).toEqual(STORED_CLIP.deck);
  });

  /**
   * The amounts behind the three markers on the jumps card are durable spec fields like every
   * other, so the claim is the seam's: the projection keeps each one, a stored session carrying
   * them validates, and the spec read back out is what the seeded walk reads — not a default it
   * fell back to. Both are shown by their effect: a wait refused on some jumps and a landing left
   * unvaried on others are things neither amount at its default can produce (P87, 0089).
   */
  it("carries the amounts behind each marker through the projection into the seeded walk", () => {
    const store = createSessionStore();
    const player = {
      seed: 12_345,
      variation: "wander" as const,
      distance: 4,
      repeats: 3,
      gate: 0,
      burst: 1,
      vary: 1,
      varyChance: 0.5,
      rest: 2,
      restChance: 0.5,
      restSpread: 0.5,
      hold: 0,
      chance: 1,
      spread: 2,
      drift: 4,
    };
    patchDeck(store, "a", { source: { gen: "sine", secs: 2 }, loop: { in: 0, out: 1 }, player });
    const projected = sessionSnapshot(store.getState()).decks.a?.player;
    expect(projected).toEqual(player);
    const stored = validateSession(
      JSON.parse(JSON.stringify(sessionSnapshot(store.getState()))) as unknown,
    );
    const walked = playerSequence(assertPlayer(stored.decks.a?.player, "the stored player")!, 400);
    expect(walked.some((step) => step.rest === 0)).toBe(true);
    expect(
      new Set(walked.filter((step) => step.rest > 0).map((step) => step.rest)).size,
    ).toBeGreaterThan(1);
    expect(walked.some((step) => step.burst === player.burst)).toBe(true);
    expect(walked.some((step) => step.burst !== player.burst)).toBe(true);
  });

  it("refuses a clip list that is not one of unique ids, bounded names and whole decks", () => {
    expect(() => validateSession({ ...STORED_SESSION, clips: {} })).toThrow(/not an array/u);
    expect(() => validateSession(withClips([{ id: "a", name: "b" }]))).toThrow(/expected \[/u);
    expect(() => validateSession(withClips(clip({ id: "" })))).toThrow(/id is not a non-empty/u);
    expect(() => validateSession(withClips([STORED_CLIP, STORED_CLIP]))).toThrow(/repeats clip-1/u);
    expect(() => validateSession(withClips(clip({ name: "" })))).toThrow(
      /name is not a non-empty/u,
    );
    expect(() => validateSession(withClips(clip({ name: "x".repeat(65) })))).toThrow(
      /longer than 64/u,
    );
    // The id is bounded by the same one rule its name is — durable text is durable text.
    expect(() => validateSession(withClips(clip({ id: "x".repeat(65) })))).toThrow(
      /longer than 64/u,
    );
    // The clip body goes through the very same deck validator a stored deck does.
    expect(() =>
      validateSession(clip({ deck: { ...STORED_CLIP.deck, effects: STORED_RACK.slice(0, 1) } })),
    ).toThrow(/not an object/u);
    expect(() =>
      validateSession(
        withClips(
          clip({ deck: { ...STORED_CLIP.deck, effects: [STORED_RACK[0], STORED_RACK[0]] } }),
        ),
      ),
    ).toThrow(/id repeats flt/u);
    // Capture refuses an empty deck, so a sourceless clip is not something this format wrote.
    expect(() =>
      validateSession(
        withClips(clip({ deck: { ...STORED_CLIP.deck, source: null, loop: null, player: null } })),
      ),
    ).toThrow(/has no source/u);
    // A pattern is not tied to a loop: it needs a grid to *run* on, which the transport decides
    // pass by pass, and a deck whose loop was cleared must still store a session that loads
    // (0089). What is refused is a spec that is not one.
    expect(
      validateSession(withClips(clip({ deck: { ...STORED_CLIP.deck, loop: null } }))).clips[0]?.deck
        .player?.seed,
    ).toBe(12_345);
    expect(() =>
      validateSession(withClips(clip({ deck: { ...STORED_CLIP.deck, player: { seed: -1 } } }))),
    ).toThrow(/expected/u);
  });

  /**
   * The clock is the session's, and the only durable fact that is: a stored one is checked by
   * the same validator the command wire comes through, and a session that never held one stores
   * null rather than leaving the key out (0097).
   */
  it("refuses a shared jump clock the module would not accept", () => {
    expect(validateSession({ ...STORED_SESSION, sync: null }).sync).toBeNull();
    expect(validateSession(STORED_SESSION).sync).toBe(0.5);
    expect(() => validateSession({ ...STORED_SESSION, sync: 0 })).toThrow(/outside/u);
    expect(() => validateSession({ ...STORED_SESSION, sync: 1000 })).toThrow(/outside/u);
    const { sync: _dropped, ...withoutSync } = STORED_SESSION;
    expect(() => validateSession(withoutSync)).toThrow(/expected \[/u);
  });

  it("refuses a session with no clip list at all", () => {
    const { clips: _dropped, ...withoutClips } = STORED_SESSION;
    expect(() => validateSession(withoutClips)).toThrow(
      /expected \[activeDeck, clips, deckList, decks, spentDeckIds, sync\]/u,
    );
  });
});
