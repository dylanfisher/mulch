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

/** The five calls a pattern, a cue and a clock make of the graph, and nothing else this file
 *  presses. `cues` is what the pass answers a cue with: false is the deck not jumping (0181). */
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
    cuePlayer: (deck, part) => {
      calls.push(`cue:${deck}:${part}`);
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
    song: [],
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
   * already say (0041, 0181).
   */
  it("cues a part to the graph without touching the session or the log", () => {
    const calls: string[] = [];
    const instrument = loaded(calls);
    const events: Event[] = [];
    const song = [{ id: "one", name: "One", skip: false, voice: partVoice(PLAYER), length: 4 }];
    instrument.send({ t: "deck.player", deck: "a", player: { ...PLAYER, song } });
    instrument.on((event) => {
      events.push(event);
    });
    instrument.send({ t: "deck.playerCue", deck: "a", part: "one" });

    expect(calls).toContain("cue:a:one");
    expect(instrument.probe().decks.a?.player?.song).toEqual(song);
    expect(events).toEqual([]);
  });

  /**
   * And every refusal is said out loud rather than passed over (principle 5). Three are facts
   * about the durable spec and are answered where it is held; the fourth is the pass's own.
   */
  it("refuses a cue nothing could answer, and says which one it was", () => {
    const events: Event[] = [];
    const instrument = loaded();
    instrument.on((event) => {
      events.push(event);
    });
    instrument.send({ t: "deck.playerCue", deck: "a", part: "one" });
    const song = [{ id: "one", name: "One", skip: false, voice: partVoice(PLAYER), length: 4 }];
    // A pattern drawing its own arrangement has no list a press can name a part of (0158).
    instrument.send({ t: "deck.player", deck: "a", player: { ...PLAYER, arrange: 2, song } });
    instrument.send({ t: "deck.playerCue", deck: "a", part: "one" });
    instrument.send({ t: "deck.player", deck: "a", player: { ...PLAYER, song } });
    instrument.send({ t: "deck.playerCue", deck: "a", part: "two" });

    expect(errorsIn(events)).toEqual([
      "deck.playerCue: deck a holds no pattern to cue",
      "deck.playerCue: deck a is drawing its own arrangement",
      "deck.playerCue: deck a stands in no part two",
    ]);
    // And the pass's own refusal, which reaches this tier as an answer rather than a throw: a
    // deck holding a pattern it is not playing has nothing to wind (principle 5).
    const still = loaded([], false);
    const quiet: Event[] = [];
    still.on((event) => {
      quiet.push(event);
    });
    still.send({ t: "deck.player", deck: "a", player: { ...PLAYER, song } });
    still.send({ t: "deck.playerCue", deck: "a", part: "one" });
    expect(errorsIn(quiet)).toEqual(["deck.playerCue: deck a is not jumping"]);
    // Malformed rather than unanswerable, so it throws the way every other wire guard does.
    expect(() => {
      // oxlint-disable-next-line no-unsafe-type-assertion -- a part id off the wire is untyped
      instrument.send({ t: "deck.playerCue", deck: "a", part: 7 as unknown as string });
    }).toThrow(/deck.playerCue part/u);
  });

  it("refuses a clock the module would not accept, before anything durable moves", () => {
    const instrument = loaded();
    expect(() => {
      instrument.send({ t: "session.sync", sync: 0 });
    }).toThrow(/session.sync is outside/u);
    expect(instrument.probe().sync).toBeNull();
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
