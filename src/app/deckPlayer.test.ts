/**
 * @role Command-chain tests for the jumping module's own three commands: one deck's whole player
 *   spec, the cue that winds its pass to one part of the song, and the one jump clock the whole
 *   session shares — what the log said, what the session holds, and every refusal that keeps a
 *   spec from landing half-checked or a cue from being answered by nothing (0089, 0097, 0181).
 * @instead The deck list itself, and the transport shortcuts that ride it → src/app/decks.test.ts,
 *   which is the file this was split out of when the spec grew it past the hard cap docs/map.md
 *   sets and scripts/arch enforces where no waiver reaches (0045).
 */
// One case per contract the player and the clock carry; the length tracks how many of them there
// are. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines-per-function
// And one import over the dependency cap, which is `partVoice`: a cue names a part, and a part
// carries a spec this file has to build the one way the module builds one (principle 1).
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable import/max-dependencies
import { describe, expect, it } from "vitest";

import { sessionSnapshot, validateSession, type Session } from "@/state/session";
import { manualClock } from "./clock";
import type { Command } from "./commands";
import type { Engine } from "./engine";
import { silentEngine } from "./engineDouble";
import type { Event } from "./events";
import { createInstrument } from "./facade";
import { genSecs } from "@/lib/waveform";
import { PLAYER_CAST_MAX } from "@/lib/playerCast";
import { partVoice } from "@/lib/player";
import { songsParts, oneSong } from "@/lib/playerSongs";

/** The five calls a pattern, a cue and a clock make of the graph, and nothing else this file
 *  presses. `cues` is what the pass answers a solo with: false is the deck not jumping (0190). */
const engineDouble = (calls: string[], cues = true): Engine =>
  silentEngine({
    load: (deck, source) => {
      calls.push(`load:${deck}`);
      return genSecs(source.gen);
    },
    setLoop: (deck, from, to) => {
      calls.push(`loop:${deck}:${from}:${to}`);
      return to > from ? { in: from, out: to } : null;
    },
    setPlayer: (deck, player) => {
      calls.push(`player:${deck}:${player === null ? "off" : player.seed}`);
    },
    setSync: (sync) => {
      calls.push(`sync:${sync ?? "off"}`);
    },
    soloPlayer: (deck, part) => {
      calls.push(`solo:${deck}:${part ?? "off"}`);
      return cues;
    },
  });

/** Undo and redo prepare a graph and replace the session through a promise chain. */
const settle = async (): Promise<void> => {
  for (let remaining = 20; remaining > 0; remaining--) {
    // oxlint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
};

// The player is durable deck state beside the loop, and the rules that makes it subject to: it
// needs a source, it needs a loop under it, and what the session holds is what the log said
// (0089).
/** Every refusal the log carried, as the sentences it said them in. */
const errorsIn = (events: Event[]): string[] =>
  events.filter((event) => event.t === "error").map((event) => event.detail);

describe("the player as a durable module", () => {
  /** Typed through the command rather than through a second import of the spec's own type. */
  const PLAYER: NonNullable<Extract<Command, { t: "deck.player" }>["player"]> = {
    bypassed: false,
    bed: 0,
    bedPer: "jump",
    beds: [],
    bedEvery: 0,
    bedDistance: 2,
    bedBias: 0,
    bedHome: 0,
    seed: 9,
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
    distance: 3,
    repeats: 4,
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
  };

  const loaded = (calls: string[] = [], cues = true) => {
    const instrument = createInstrument(manualClock(), () => engineDouble(calls, cues));
    instrument.send({ t: "deck.load", deck: "a", source: { gen: "sine" } });
    instrument.send({ t: "deck.loop", deck: "a", in: 0, out: 1 });
    return instrument;
  };

  it("holds the whole spec, hands it to the graph, and says so on the log", () => {
    const calls: string[] = [];
    const instrument = loaded(calls);
    const events: Event[] = [];
    instrument.on((event) => {
      events.push(event);
    });
    instrument.send({ t: "deck.player", deck: "a", player: { ...PLAYER } });

    expect(instrument.probe().decks.a?.player).toEqual(PLAYER);
    expect(calls).toContain("player:a:9");
    expect(events.filter((event) => event.t === "deck.player.changed")).toMatchObject([
      { deck: "a", player: PLAYER },
    ]);
    // Durable: the projection the session, the archive and history all read carries it.
    const stored: Session = sessionSnapshot(instrument.state.getState());
    expect(stored.decks.a?.player).toEqual(PLAYER);
  });

  it("switches off to null, which is the whole of off", () => {
    const calls: string[] = [];
    const instrument = loaded(calls);
    instrument.send({ t: "deck.player", deck: "a", player: { ...PLAYER } });
    instrument.send({ t: "deck.player", deck: "a", player: null });
    expect(instrument.probe().decks.a?.player).toBeNull();
    expect(calls.filter((call) => call.startsWith("player:"))).toEqual([
      "player:a:9",
      "player:a:off",
    ]);
  });

  /**
   * And the switch on the card, which is the other half of it: the spec is held entire — in the
   * store, on the log, and in the projection the session and the archive read — while the graph is
   * handed null, so a hand turning the module off keeps the pattern it was playing and turning it
   * back on plays that pattern rather than a fresh mint (P164).
   */
  it("hands the graph null for a bypassed pattern while holding the whole spec", () => {
    const calls: string[] = [];
    const instrument = loaded(calls);
    instrument.send({ t: "deck.player", deck: "a", player: { ...PLAYER } });
    instrument.send({ t: "deck.player", deck: "a", player: { ...PLAYER, bypassed: true } });
    expect(calls.filter((call) => call.startsWith("player:"))).toEqual([
      "player:a:9",
      "player:a:off",
    ]);
    expect(instrument.probe().decks.a?.player).toEqual({ ...PLAYER, bypassed: true });
    const stored: Session = sessionSnapshot(instrument.state.getState());
    expect(stored.decks.a?.player).toEqual({ ...PLAYER, bypassed: true });
    // And back: the same spec reaches the graph again, seed and all, without a mint in between.
    instrument.send({ t: "deck.player", deck: "a", player: { ...PLAYER, bypassed: false } });
    expect(calls.at(-1)).toBe("player:a:9");
  });

  it("refuses one on a deck holding nothing, which has no grid to jump around", () => {
    const empty = createInstrument(manualClock(), () => engineDouble([]));
    const emptyEvents: Event[] = [];
    empty.on((event) => {
      emptyEvents.push(event);
    });
    empty.send({ t: "deck.player", deck: "a", player: { ...PLAYER } });
    expect(errorsIn(emptyEvents).join(" ")).toMatch(/nothing loaded/u);
    expect(empty.probe().decks.a?.player).toBeNull();
  });

  // A pattern is durable on its own: a loop cleared under it must leave a session that still
  // loads, and the transport simply plays the loop straight until there is a grid again (0089).
  it("survives the loop being cleared under it", () => {
    const instrument = loaded();
    instrument.send({ t: "deck.player", deck: "a", player: { ...PLAYER } });
    instrument.send({ t: "deck.loop", deck: "a", in: 0, out: 0 });
    expect(instrument.probe().decks.a?.loop).toBeNull();
    expect(instrument.probe().decks.a?.player).toEqual(PLAYER);
    expect(() =>
      validateSession(JSON.parse(JSON.stringify(sessionSnapshot(instrument.state.getState())))),
    ).not.toThrow();
  });

  // A pattern is a grid measured against the loop of a source this deck no longer holds, so it
  // goes with the loop — which is also what stops a clip applied over it leaving one behind.
  it("goes with the loop when a new source is loaded", () => {
    const calls: string[] = [];
    const instrument = loaded(calls);
    instrument.send({ t: "deck.player", deck: "a", player: { ...PLAYER } });
    instrument.send({ t: "deck.load", deck: "a", source: { gen: "sine" } });
    expect(instrument.probe().decks.a?.loop).toBeNull();
    expect(instrument.probe().decks.a?.player).toBeNull();
  });

  it("refuses a spec that is not one, before anything durable moves", () => {
    const instrument = loaded();
    expect(() => {
      instrument.send({ t: "deck.player", deck: "a", player: { ...PLAYER, distance: 99 } });
    }).toThrow(/distance is outside/u);
    expect(instrument.probe().decks.a?.player).toBeNull();
  });

  /**
   * The clock the yards jump on is the session's, so it is one command naming no deck, one event,
   * one durable field — and it is held whether or not any yard is jumping on it (0097).
   */
  it("holds one shared jump clock for the whole session, and says so on the log", () => {
    const calls: string[] = [];
    const instrument = loaded(calls);
    const events: Event[] = [];
    instrument.on((event) => {
      events.push(event);
    });
    instrument.send({ t: "session.sync", sync: 0.75 });

    expect(instrument.probe().sync).toBe(0.75);
    expect(calls).toContain("sync:0.75");
    expect(events.filter((event) => event.t === "session.sync.changed")).toMatchObject([
      { sync: 0.75 },
    ]);
    expect(sessionSnapshot(instrument.state.getState()).sync).toBe(0.75);

    instrument.send({ t: "session.sync", sync: null });
    expect(instrument.probe().sync).toBeNull();
    expect(calls.filter((call) => call.startsWith("sync:"))).toEqual(["sync:0.75", "sync:off"]);
  });

  /**
   * An audition is transport: it reaches the graph, and it moves nothing durable and says nothing
   * about a change, because there is none — the pattern it lays is the one the held spec and seed
   * already say, and the song that comes back is the song that was held all along (0041, 0190).
   */
  it("solos a part to the graph, and gives it back, without touching the session or the log", () => {
    const calls: string[] = [];
    const instrument = loaded(calls);
    const events: Event[] = [];
    const song = [
      { id: "one", name: "One", skip: false, voice: partVoice(PLAYER), length: 4, steps: [] },
    ];
    instrument.send({ t: "deck.player", deck: "a", player: { ...PLAYER, songs: oneSong(song) } });
    instrument.on((event) => {
      events.push(event);
    });
    instrument.send({ t: "deck.playerSolo", deck: "a", part: "one" });
    instrument.send({ t: "deck.playerSolo", deck: "a", part: null });

    expect(calls).toContain("solo:a:one");
    expect(calls).toContain("solo:a:off");
    expect(songsParts(instrument.probe().decks.a?.player?.songs ?? [])).toEqual(song);
    expect(events).toEqual([]);
  });

  /**
   * And every refusal is said out loud rather than passed over (principle 5). Three are facts
   * about the durable spec and are answered where it is held; the fourth is the pass's own.
   */
  it("refuses a solo nothing could answer, and says which one it was", () => {
    const events: Event[] = [];
    const instrument = loaded();
    instrument.on((event) => {
      events.push(event);
    });
    instrument.send({ t: "deck.playerSolo", deck: "a", part: "one" });
    const song = [
      { id: "one", name: "One", skip: false, voice: partVoice(PLAYER), length: 4, steps: [] },
    ];
    // A pattern drawing its own arrangement has no list a press can name a part of (0158).
    instrument.send({
      t: "deck.player",
      deck: "a",
      player: { ...PLAYER, arrange: 2, songs: oneSong(song) },
    });
    instrument.send({ t: "deck.playerSolo", deck: "a", part: "one" });
    instrument.send({ t: "deck.player", deck: "a", player: { ...PLAYER, songs: oneSong(song) } });
    instrument.send({ t: "deck.playerSolo", deck: "a", part: "two" });

    expect(errorsIn(events)).toEqual([
      "deck.playerSolo: deck a holds no pattern to solo",
      "deck.playerSolo: deck a is drawing its own arrangement",
      "deck.playerSolo: deck a stands in no part two",
    ]);
    // And the pass's own refusal, which reaches this tier as an answer rather than a throw: a
    // deck holding a pattern it is not playing has nothing to wind (principle 5).
    const still = loaded([], false);
    const quiet: Event[] = [];
    still.on((event) => {
      quiet.push(event);
    });
    still.send({ t: "deck.player", deck: "a", player: { ...PLAYER, songs: oneSong(song) } });
    still.send({ t: "deck.playerSolo", deck: "a", part: "one" });
    expect(errorsIn(quiet)).toEqual(["deck.playerSolo: deck a is not jumping"]);
    // Malformed rather than unanswerable, so it throws the way every other wire guard does.
    expect(() => {
      // oxlint-disable-next-line no-unsafe-type-assertion -- a part id off the wire is untyped
      instrument.send({ t: "deck.playerSolo", deck: "a", part: 7 as unknown as string });
    }).toThrow(/deck.playerSolo part/u);
  });

  it("refuses a clock the module would not accept, before anything durable moves", () => {
    const instrument = loaded();
    expect(() => {
      instrument.send({ t: "session.sync", sync: 0 });
    }).toThrow(/session.sync is outside/u);
    expect(instrument.probe().sync).toBeNull();
  });

  // One dial's drag is one history entry, which is what `gestureOf` keys a `deck.player` by the
  // deck for: every pointer move of a drag sends the whole spec, and without a key each of them
  // was a checkpoint of its own — a hundred clones of one movement, and the real edits behind them
  // pushed off the cap (0067, src/app/history.ts).
  it("takes a whole drag back as one entry, and the next dial's as its own", async () => {
    const instrument = loaded();
    instrument.send({ t: "deck.player", deck: "a", player: { ...PLAYER } });
    instrument.send({ t: "gesture.end" });
    // One drag over the gate, as the pointer moves would send it: the whole spec, once per move.
    for (const gate of [0.1, 0.2, 0.3, 0.4]) {
      instrument.send({ t: "deck.player", deck: "a", player: { ...PLAYER, gate } });
    }
    // The hand lets go, which is the boundary the card sends on `pointerup`, and the next dial's
    // drag opens an entry of its own rather than joining the one before it.
    instrument.send({ t: "gesture.end" });
    for (const drop of [0.5, 0.6]) {
      instrument.send({ t: "deck.player", deck: "a", player: { ...PLAYER, gate: 0.4, drop } });
    }
    await settle();
    // One undo takes the whole second drag back to where that dial started, not to 0.5.
    instrument.send({ t: "history.undo" });
    await settle();
    expect(instrument.probe().decks.a?.player).toMatchObject({ gate: 0.4, drop: 0 });
    // And the next takes the whole first drag back to the spec it started from.
    instrument.send({ t: "history.undo" });
    await settle();
    expect(instrument.probe().decks.a?.player).toMatchObject({ gate: 0.5, drop: 0 });
  });

  // Durable means undoable: the clock takes the same road back every other durable edit does,
  // and it is an entry of its own because it names no deck to group with (src/app/wire.ts).
  it("takes a clock back on undo", async () => {
    const instrument = loaded();
    instrument.send({ t: "session.sync", sync: 2 });
    await settle();
    instrument.send({ t: "history.undo" });
    await settle();
    expect(instrument.probe().sync).toBeNull();
  });
});
