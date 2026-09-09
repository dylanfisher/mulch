/**
 * @role The whole stored session, written by hand: every parameter of it stated independently of
 *   the code that writes it, and the clip list that travels inside it (0026, 0027).
 * @instead The per-shape refusal matrices — decks, racks, lanes — → src/state/session.test.ts,
 *   which this was the end of until that file reached the hard 800-line cap (0045).
 */
// One flat matrix over one hand-written stored session (0007).
// oxlint-disable max-lines, max-lines-per-function
import { describe, expect, it } from "vitest";

import { effectParamDefaults } from "@/audio/params";
import type { PlayerSpec } from "@/lib/player";
import { PLAYER_CAST_MAX } from "@/lib/playerCast";
import { assertPlayer } from "@/lib/playerWire";
import { playerSequence } from "@/lib/playerWalk";
import { sessionBlobIds, sessionSnapshot, validateSession, type SessionEffect } from "./session";
import { createSessionStore, deckIdsOf, patchDeck } from "./store";

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
    effect: "eq",
    bypassed: false,
    params: { "eq.frequency": 1000, "eq.gain": 0, "eq.q": 1, "eq.shape": 1 },
    automation: {
      "eq.frequency": [
        { at: 0, value: 400 },
        { at: 1, value: 900 },
      ],
    },
    drawn: {},
    bounds: {},
  },
  {
    id: "dly",
    effect: "delay",
    bypassed: true,
    params: { "delay.time": 0.25, "delay.feedback": 0.35, "delay.mix": 0.25 },
    automation: {},
    drawn: {},
    bounds: {},
  },
];

const STORED_DECK = {
  params: STORED_PARAMS,
  automation: {},
  drawn: {},
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
    drawn: {},
    effects: STORED_RACK,
    source: { blobId: "audio-9" },
    loop: { in: 0, out: 1 },
    player: {
      bypassed: false,
      bed: 0,
      bedPer: "jump",
      beds: [],
      bedEvery: 0,
      bedWanders: true,
      bedReach: "nudge",
      bedWay: "either",
      bedTogether: false,
      zone: null,
      seed: 12_345,
      bias: 0,
      stride: 0,
      home: 0,
      phrase: 0,
      phraseKeep: 4,
      phraseChance: 0,
      phraseReturn: 0,
      arrange: 0,
      arrangeKeep: 4,
      arrangeChance: 0,
      arrangeReturn: 0,
      arrangeAmount: 1,
      arrangeGrow: 0,
      arrangeSpan: 0,
      arrangeApart: 0,
      distance: 4,
      repeats: 3,
      repeatsChance: 1,
      repeatsSpread: 0,
      repeatsHold: 0,
      ratchet: 0,
      gate: 0.5,
      drop: 0,
      reverse: 0,
      spark: 0,
      sparkLevel: 0.5,
      sparkDelay: 0,
      sparkCount: 1,
      burst: 1,
      vary: 0,
      varyChance: 1,
      rest: 0,
      restPulses: 0,
      restSpan: 8,
      restChance: 1,
      restSpread: 0,
      hold: 0,
      chance: 1,
      spread: 2,
      drift: 4,
      climb: 0,
      songs: [],
      cast: PLAYER_CAST_MAX,
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
  ground: { per: "second", leader: null, every: 4, wanders: true, reach: "nudge", way: "either" },
  master: { effects: [] },
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
        instance("flt", "eq", {
          automation: {
            "eq.frequency": [
              { at: 0, value: 400 },
              { at: 1, value: 900 },
            ],
          },
        }),
        instance("dly", "delay", { bypassed: true }),
      ],
      loop: { in: 0, out: 1 },
      player: {
        bypassed: false,
        bed: 0,
        bedPer: "jump",
        beds: [],
        bedEvery: 0,
        bedWanders: true,
        bedReach: "nudge",
        bedWay: "either",
        bedTogether: false,
        zone: null,
        seed: 12_345,
        bias: 0,
        stride: 0,
        home: 0,
        phrase: 0,
        phraseKeep: 4,
        phraseChance: 0,
        phraseReturn: 0,
        arrange: 0,
        arrangeKeep: 4,
        arrangeChance: 0,
        arrangeReturn: 0,
        arrangeAmount: 1,
        arrangeGrow: 0,
        arrangeSpan: 0,
        arrangeApart: 0,
        distance: 4,
        repeats: 3,
        repeatsChance: 1,
        repeatsSpread: 0,
        repeatsHold: 0,
        ratchet: 0,
        gate: 0.5,
        drop: 0,
        reverse: 0,
        spark: 0,
        sparkLevel: 0.5,
        sparkDelay: 0,
        sparkCount: 1,
        burst: 1,
        vary: 0,
        varyChance: 1,
        rest: 0,
        restPulses: 0,
        restSpan: 8,
        restChance: 1,
        restSpread: 0,
        hold: 0,
        chance: 1,
        spread: 2,
        drift: 4,
        climb: 0,
        songs: [],
        cast: PLAYER_CAST_MAX,
      },
    });
    const projected = sessionSnapshot(store.getState()).decks.a!;
    expect(JSON.parse(JSON.stringify(projected))).toEqual(STORED_CLIP.deck);
  });

  /**
   * The amounts behind the four markers on the jumps card are durable spec fields like every
   * other, so the claim is the seam's: the projection keeps each one, a stored session carrying
   * them validates, and the spec read back out is what the seeded walk reads — not a default it
   * fell back to. Both are shown by their effect: a wait refused on some jumps and a landing left
   * unvaried on others are things neither amount at its default can produce (P87, 0089).
   */
  it("carries the amounts behind each marker through the projection into the seeded walk", () => {
    const store = createSessionStore();
    const player: PlayerSpec = {
      bypassed: false,
      bed: 0,
      bedPer: "jump",
      beds: [],
      bedEvery: 0,
      bedWanders: true,
      bedReach: "nudge",
      bedWay: "either",
      bedTogether: false,
      zone: null,
      seed: 12_345,
      bias: 0,
      stride: 0,
      home: 0,
      phrase: 0,
      phraseKeep: 4,
      phraseChance: 0,
      phraseReturn: 0,
      arrange: 0,
      arrangeKeep: 4,
      arrangeChance: 0,
      arrangeReturn: 0,
      arrangeAmount: 1,
      arrangeGrow: 0,
      arrangeSpan: 0,
      arrangeApart: 0,
      distance: 4,
      repeats: 3,
      repeatsChance: 1,
      repeatsSpread: 0,
      repeatsHold: 0,
      ratchet: 0,
      gate: 0,
      drop: 0,
      reverse: 0,
      spark: 0,
      sparkLevel: 0.5,
      sparkDelay: 0,
      sparkCount: 1,
      burst: 1,
      vary: 1,
      varyChance: 0.5,
      rest: 2,
      restPulses: 0,
      restSpan: 8,
      restChance: 0.5,
      restSpread: 0.5,
      hold: 0,
      chance: 1,
      spread: 2,
      drift: 4,
      climb: 0,
      songs: [],
      cast: PLAYER_CAST_MAX,
    };
    patchDeck(store, "a", { source: { gen: "sine" }, loop: { in: 0, out: 1 }, player });
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

  /**
   * And the ground beside it, which is the second: checked by the same validator the command wire
   * comes through, and stored whole rather than as a clock that may be absent — there is no "no
   * ground" for a session to hold (0313).
   */
  it("refuses a shared ground whose leader is not a yard this session holds", () => {
    const whole = { per: "second", leader: null, wanders: true, reach: "nudge", way: "either" };
    expect(validateSession(STORED_SESSION).ground.every).toBe(4);
    // The one thing the ground's own validator could not ask, because it knows no session: a
    // period counted in a yard's parts names a yard that is here. The `activeDeck` rule, said for
    // the ground — what the shape itself may be is asked in src/lib/sessionGround.test.ts.
    expect(
      validateSession({
        ...STORED_SESSION,
        ground: { ...whole, per: "song", leader: "b", every: 2 },
      }).ground.leader,
    ).toBe("b");
    expect(() =>
      validateSession({
        ...STORED_SESSION,
        ground: { ...whole, per: "part", leader: "nowhere", every: 4 },
      }),
    ).toThrow(/not a held deck/u);
    const { ground: _dropped, ...withoutGround } = STORED_SESSION;
    expect(() => validateSession(withoutGround)).toThrow(/expected \[/u);
  });

  /**
   * The rack that is no yard's is validated as the rack it is, by the one rack validator a
   * yard's own comes through — so a master instance of an entry this build no longer registers
   * discards the whole session rather than being repaired (0026, 0321).
   */
  it("accepts a session holding a master rack, and refuses one whose entry is unregistered", () => {
    const held = validateSession({ ...STORED_SESSION, master: { effects: STORED_RACK } });
    expect(held.master.effects.map((entry) => entry.id)).toEqual(["flt", "dly"]);

    expect(() =>
      validateSession({
        ...STORED_SESSION,
        master: { effects: [{ ...STORED_RACK[0], effect: "nowhere" }] },
      }),
    ).toThrow(/not registered: nowhere/u);
    const { master: _dropped, ...withoutMaster } = STORED_SESSION;
    expect(() => validateSession(withoutMaster)).toThrow(/expected \[/u);
    expect(() => validateSession({ ...STORED_SESSION, master: { effects: [], extra: 1 } })).toThrow(
      /session.master has keys/u,
    );
  });

  it("refuses a session with no clip list at all", () => {
    const { clips: _dropped, ...withoutClips } = STORED_SESSION;
    expect(() => validateSession(withoutClips)).toThrow(
      /expected \[activeDeck, clips, deckList, decks, ground, master, spentDeckIds, sync\]/u,
    );
  });
});
