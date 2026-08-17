/**
 * @role Command-chain tests for the deck list itself — a session's decks are added, removed and
 *   selected by command — and for the N-deck transport shortcuts that ride it.
 */
// One case per deck-list contract; the length tracks how many ways a deck can arrive or leave.
// See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines, max-lines-per-function
import { describe, expect, it } from "vitest";

import { DURABLE_TEXT_MAX } from "@/lib/guards";
import { sessionSnapshot, type Session } from "@/state/session";
import { deckIdsOf, INITIAL_DECK_ID, type DeckId } from "@/state/store";
import { manualClock } from "./clock";
import type { Command } from "./commands";
import type { Engine } from "./engine";
import { silentEngine } from "./engineDouble";
import type { Event } from "./events";
import { createInstrument } from "./facade";

const engineDouble = (calls: string[]): Engine => {
  const planned = new Set<DeckId>();
  return silentEngine({
    addDeck: (deck) => {
      calls.push(`addDeck:${deck}`);
    },
    removeDeck: (deck) => {
      calls.push(`removeDeck:${deck}`);
      planned.delete(deck);
    },
    load: (deck, source) => {
      calls.push(`load:${deck}`);
      return source.secs;
    },
    play: (deck) => {
      calls.push(`play:${deck}`);
      planned.add(deck);
    },
    playTogether: (decks) => {
      calls.push(`playTogether:${decks.join(",")}`);
      for (const deck of decks) planned.add(deck);
    },
    stop: (deck) => {
      calls.push(`stop:${deck}`);
      planned.delete(deck);
    },
    pause: (deck) => {
      calls.push(`pause:${deck}`);
      planned.delete(deck);
    },
    seek: (deck, position) => {
      calls.push(`seek:${deck}:${position}`);
    },
    planned: (deck) => planned.has(deck),
    setLoop: (deck, from, to) => {
      calls.push(`loop:${deck}:${from}:${to}`);
      return to > from ? { in: from, out: to } : null;
    },
  });
};

/** Two decks, the second added by the command that is the only way to get one (0029). */
const twoDecks = (calls: string[] = [], at = 0) => {
  const instrument = createInstrument(manualClock(at), () => engineDouble(calls));
  instrument.send({ t: "deck.add", deck: "b", emoji: "🌴", name: "North Willow" });
  return instrument;
};

/** Undo and redo prepare a graph and replace the session through a promise chain. */
const settle = async (): Promise<void> => {
  for (let remaining = 20; remaining > 0; remaining--) {
    // oxlint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
};

describe("the deck list", () => {
  it("boots with exactly one deck, which is the active one", () => {
    const probe = createInstrument(manualClock()).probe();

    expect(deckIdsOf(probe.deckList)).toEqual([INITIAL_DECK_ID]);
    expect(Object.keys(probe.decks)).toEqual([INITIAL_DECK_ID]);
    expect(probe.activeDeck).toBe(INITIAL_DECK_ID);
  });

  it.each([
    { name: "an unknown deck", command: { t: "param.set", param: "deck.gain", value: 0.5 } },
    { name: "playing one", command: { t: "deck.play" } },
    { name: "removing one", command: { t: "deck.remove" } },
    { name: "activating one", command: { t: "deck.activate" } },
  ])("throws for a command naming $name", ({ command }) => {
    const instrument = createInstrument(manualClock(), () => engineDouble([]));

    // oxlint-disable-next-line no-unsafe-type-assertion -- the JSON wire is what is under test
    const sent = { ...command, deck: "ghost" } as Command;
    expect(() => {
      instrument.send(sent);
    }).toThrow(/unknown deck: ghost/u);
    expect(deckIdsOf(instrument.probe().deckList)).toEqual([INITIAL_DECK_ID]);
  });

  it("adds a deck by its own id, once, with its own voice and event", () => {
    const calls: string[] = [];
    const instrument = createInstrument(manualClock(), () => engineDouble(calls));
    const events: Event[] = [];
    instrument.on((event) => {
      events.push(event);
    });

    instrument.send({ t: "deck.add", deck: "b", emoji: "🌴", name: "North Willow" });
    instrument.send({ t: "deck.add", deck: "b", emoji: "🌴", name: "North Willow" });

    expect(deckIdsOf(instrument.probe().deckList)).toEqual(["a", "b"]);
    expect(instrument.probe().decks.b).toMatchObject({ source: null, effects: [], playing: false });
    expect(calls).toEqual(["addDeck:b"]);
    expect(events).toMatchObject([
      { t: "deck.added", deck: "b" },
      { t: "error", detail: /deck already exists: b/u },
    ]);
  });

  it("removes a deck, disposes its voice, and hands the selection to its neighbour", () => {
    const calls: string[] = [];
    const instrument = twoDecks(calls);
    instrument.send({ t: "deck.activate", deck: "b" });
    const events: Event[] = [];
    instrument.on((event) => {
      events.push(event);
    });

    instrument.send({ t: "deck.remove", deck: "b" });

    expect(deckIdsOf(instrument.probe().deckList)).toEqual(["a"]);
    expect(instrument.probe().decks.b).toBeUndefined();
    expect(instrument.probe().activeDeck).toBe("a");
    expect(calls).toContain("removeDeck:b");
    expect(events).toMatchObject([
      { t: "deck.removed", deck: "b" },
      { t: "deck.activated", deck: "a" },
    ]);
  });

  it("lets the last deck go, and the next added one becomes active again", () => {
    const instrument = createInstrument(manualClock(), () => engineDouble([]));

    instrument.send({ t: "deck.remove", deck: "a" });
    expect(instrument.probe()).toMatchObject({ deckList: [], decks: {}, activeDeck: null });

    instrument.send({ t: "deck.add", deck: "solo", emoji: "🌴", name: "North Willow" });
    expect(instrument.probe()).toMatchObject({
      deckList: [{ id: "solo", emoji: "🌴", name: "North Willow" }],
      activeDeck: "solo",
    });
  });

  it("undoes an add and a remove as ordinary durable edits", async () => {
    const instrument = twoDecks();
    instrument.send({ t: "param.set", deck: "b", param: "deck.gain", value: 0.25 });

    instrument.send({ t: "history.undo" });
    await settle();
    expect(instrument.probe().decks.b?.params["deck.gain"]).toBe(1);

    // The add itself is the next entry back: undoing it leaves the fresh session's one deck.
    instrument.send({ t: "history.undo" });
    await settle();
    expect(deckIdsOf(instrument.probe().deckList)).toEqual(["a"]);

    // Redone, the deck is back — and a removal undoes the same way, into its own place.
    instrument.send({ t: "history.redo" });
    await settle();
    expect(deckIdsOf(instrument.probe().deckList)).toEqual(["a", "b"]);

    // Everything the removed deck held comes back with it, not merely its place in the list.
    instrument.send({ t: "deck.load", deck: "a", source: { gen: "sine", secs: 2 } });
    instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value: 0.375 });
    instrument.send({ t: "effect.add", deck: "a", id: "flt", effect: "filter" });
    instrument.send({
      t: "automation.set",
      deck: "a",
      param: "deck.gain",
      points: [
        { at: 0, value: 0.2 },
        { at: 1, value: 0.8 },
      ],
    });
    const held = instrument.probe().decks.a;

    instrument.send({ t: "deck.remove", deck: "a" });
    expect(deckIdsOf(instrument.probe().deckList)).toEqual(["b"]);
    instrument.send({ t: "history.undo" });
    await settle();
    expect(deckIdsOf(instrument.probe().deckList)).toEqual(["a", "b"]);
    expect(instrument.probe().decks.a).toMatchObject({
      source: held!.source!,
      params: held!.params,
      effects: held!.effects,
      automation: held!.automation,
    });
  });
});

/** Everything a yard is, laid on deck `a`: a source, a value, a rack instance, a lane, a loop. */
const loadedYard = (calls: string[]) => {
  const instrument = createInstrument(manualClock(), () => engineDouble(calls));
  instrument.send({ t: "deck.load", deck: "a", source: { gen: "sine", secs: 2 } });
  instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value: 0.375 });
  instrument.send({ t: "effect.add", deck: "a", id: "flt", effect: "filter" });
  instrument.send({
    t: "param.set",
    deck: "a",
    instance: "flt",
    param: "filter.cutoff",
    value: 900,
  });
  instrument.send({ t: "effect.bypass", deck: "a", instance: "flt", bypassed: true });
  instrument.send({
    t: "automation.set",
    deck: "a",
    param: "deck.gain",
    points: [
      { at: 0, value: 0.2 },
      { at: 1, value: 0.8 },
    ],
  });
  instrument.send({ t: "deck.loop", deck: "a", in: 0.25, out: 1.25 });
  return instrument;
};

/** One durable deck with the identity stripped off its rack — what a copy must match exactly. */
const withoutInstanceIds = (deck: Session["decks"][string]) => ({
  ...deck,
  effects: deck.effects.map(({ id: _id, ...rest }) => rest),
});

describe("duplicating a yard", () => {
  it("copies everything but the identity, and inherits no transport (0078)", async () => {
    const calls: string[] = [];
    const instrument = loadedYard(calls);
    instrument.send({ t: "deck.play", deck: "a" });
    const events: Event[] = [];
    instrument.on((event) => {
      events.push(event);
    });

    instrument.send({ t: "deck.duplicate", deck: "a", to: "b", emoji: "🌵", name: "Wild Moss" });
    await settle();

    const session = sessionSnapshot(instrument.state.getState());
    // The source, the parameters, the rack, its values, its bypass, the lanes and the loop — the
    // whole preset, arrived through the one stage list rather than through a second builder.
    expect(withoutInstanceIds(session.decks.b!)).toEqual(withoutInstanceIds(session.decks.a!));
    // And the identity is exactly what differs: the yard's own id, emoji and name, and an id per
    // copied rack instance that no card has to share (0076).
    expect(session.deckList).toMatchObject([
      { id: "a" },
      { id: "b", emoji: "🌵", name: "Wild Moss" },
    ]);
    expect(session.decks.b!.effects[0]!.id).not.toBe(session.decks.a!.effects[0]!.id);
    // Nothing plays it: the graph was never asked to, and the copy arrives stopped.
    expect(calls.filter((call) => call.startsWith("play:"))).toEqual(["play:a"]);
    expect(instrument.probe().decks.b).toMatchObject({ playing: false, paused: null });
    expect(events.at(-1)).toMatchObject({ t: "deck.duplicated", deck: "a", to: "b" });
  });

  it("refuses a copy onto a yard the session already holds, and changes nothing", async () => {
    const calls: string[] = [];
    const instrument = loadedYard(calls);
    instrument.send({ t: "deck.add", deck: "b", emoji: "🌴", name: "North Willow" });
    const before = sessionSnapshot(instrument.state.getState());
    const events: Event[] = [];
    instrument.on((event) => {
      events.push(event);
    });

    instrument.send({ t: "deck.duplicate", deck: "a", to: "b", emoji: "🌵", name: "Wild Moss" });
    await settle();

    expect(events).toMatchObject([{ t: "error", detail: /deck already exists: b/u }]);
    expect(sessionSnapshot(instrument.state.getState())).toEqual(before);
  });

  it("mints copied instance ids a guard accepts, however long the new yard's id is", async () => {
    const instrument = loadedYard([]);
    instrument.send({ t: "effect.add", deck: "a", id: "dly", effect: "delay" });
    // A deck id is durable text and may be the whole of it — an agent's JSONL names its own.
    const long = "y".repeat(DURABLE_TEXT_MAX);

    instrument.send({ t: "deck.duplicate", deck: "a", to: long, emoji: "🌵", name: "Wild Moss" });
    await settle();

    const copied = instrument.probe().decks[long]?.effects ?? [];
    expect(copied.map((entry) => entry.effect)).toEqual(["filter", "delay"]);
    for (const entry of copied) expect(entry.id.length).toBeLessThanOrEqual(DURABLE_TEXT_MAX);
    expect(new Set(copied.map((entry) => entry.id)).size).toBe(copied.length);
  });

  it("undoes as the one entry it is", async () => {
    const instrument = loadedYard([]);
    instrument.send({ t: "deck.duplicate", deck: "a", to: "b", emoji: "🌵", name: "Wild Moss" });
    await settle();
    expect(deckIdsOf(instrument.probe().deckList)).toEqual(["a", "b"]);

    instrument.send({ t: "history.undo" });
    await settle();

    expect(deckIdsOf(instrument.probe().deckList)).toEqual(["a"]);
  });
});

describe("active deck", () => {
  it("round-trips activation through JSON, state, and one event", () => {
    const instrument = twoDecks([], 3);
    const events: Event[] = [];
    instrument.on((event) => {
      events.push(event);
    });

    // oxlint-disable-next-line no-unsafe-type-assertion -- the JSON wire is the behavior under test
    const command = JSON.parse(JSON.stringify({ t: "deck.activate", deck: "b" })) as Command;
    instrument.send(command);
    instrument.send({ t: "deck.activate", deck: "b" });

    expect(instrument.probe().activeDeck).toBe("b");
    expect(events).toMatchObject([{ t: "deck.activated", deck: "b", at: 3 }]);
  });
});

describe("transport toggle commands", () => {
  it("toggles one loaded deck from graph-reported state, pausing rather than rewinding", () => {
    const calls: string[] = [];
    const instrument = twoDecks(calls);
    instrument.send({ t: "deck.load", deck: "b", source: { gen: "sine", secs: 2 } });

    instrument.send({ t: "deck.play.toggle", deck: "b" });
    instrument.send({ t: "deck.play.toggle", deck: "b" });

    // The toggle's second press pauses: pressed twice it has to leave the deck where it found
    // it, and rewinding to the top of the loop is what `deck.stop` is for (0038).
    expect(calls.filter((call) => /^(play|pause|stop):/u.test(call))).toEqual([
      "play:b",
      "pause:b",
    ]);
  });

  it("starts every loaded deck the session holds and pauses every graph plan", () => {
    const calls: string[] = [];
    const instrument = twoDecks(calls);
    instrument.send({ t: "deck.add", deck: "c", emoji: "🌴", name: "Wild Bramble" });
    const held = deckIdsOf(instrument.probe().deckList);
    for (const deck of held) {
      instrument.send({ t: "deck.load", deck, source: { gen: "sine", secs: 2 } });
    }

    instrument.send({ t: "decks.play.toggle" });
    instrument.send({ t: "decks.play.toggle" });

    expect(held).toEqual(["a", "b", "c"]);
    expect(calls.filter((call) => /^(play|pause|stop):/u.test(call))).toEqual(
      held.map((deck) => `pause:${deck}`),
    );
    expect(calls).toContain(`playTogether:${held.join(",")}`);
  });
});

describe("transport toggle refusals", () => {
  it.each([
    { name: "one deck", command: { t: "deck.play.toggle", deck: "a" } as const },
    { name: "all decks", command: { t: "decks.play.toggle" } as const },
    { name: "one loop", command: { t: "deck.loop.toggle", deck: "a" } as const },
    { name: "one playhead", command: { t: "deck.seek", deck: "a", position: 1 } as const },
  ])("refuses unloaded $name once without changing state or the graph", ({ command }) => {
    const calls: string[] = [];
    const instrument = createInstrument(manualClock(), () => engineDouble(calls));
    const events: Event[] = [];
    instrument.on((event) => {
      events.push(event);
    });
    const before = instrument.probe();

    instrument.send(command);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      t: "error",
      detail: /(nothing|no decks have anything) loaded/u,
    });
    expect(instrument.probe()).toEqual(before);
    expect(calls).toEqual([]);
  });
});

describe("seek command", () => {
  it("hands the graph one playhead move and enters no history", async () => {
    const calls: string[] = [];
    const instrument = createInstrument(manualClock(), () => engineDouble(calls));
    instrument.send({ t: "deck.load", deck: "a", source: { gen: "sine", secs: 2 } });

    instrument.send({ t: "deck.seek", deck: "a", position: 1.25 });

    expect(calls.filter((call) => call.startsWith("seek:"))).toEqual(["seek:a:1.25"]);
    // A playhead is transport, not durable shape: nothing to undo, and nothing recorded (0041).
    expect(instrument.probe().decks.a?.paused).toBeNull();
    // The load before it is the one undoable thing that happened.
    instrument.send({ t: "history.undo" });
    await settle();
    expect(instrument.probe().decks.a?.source).toBeNull();
  });
});

describe("loop toggle command", () => {
  it("refuses deck.loop on an empty deck rather than reporting a cleared one", () => {
    const calls: string[] = [];
    const instrument = createInstrument(manualClock(), () => engineDouble(calls));
    const events: Event[] = [];
    instrument.on((event) => {
      events.push(event);
    });

    instrument.send({ t: "deck.loop", deck: "a", in: 0, out: 1 });

    // The voice would have clamped both edges into a zero-length buffer and returned null, so
    // the log said "loop cleared" where the truth was "there is nothing to loop" (principle 5).
    expect(calls.filter((call) => call.startsWith("loop:"))).toEqual([]);
    expect(events.filter((event) => event.t === "deck.loop.changed")).toEqual([]);
    expect(events.filter((event) => event.t === "error")).toMatchObject([
      { detail: "deck a has nothing loaded" },
    ]);
  });

  it("uses the exact deck.loop behavior", () => {
    const calls: string[] = [];
    const instrument = createInstrument(manualClock(), () => engineDouble(calls));
    const events: Event[] = [];
    instrument.on((event) => {
      events.push(event);
    });
    instrument.send({ t: "deck.load", deck: "a", source: { gen: "sine", secs: 0.5 } });

    instrument.send({ t: "deck.loop.toggle", deck: "a" });
    instrument.send({ t: "deck.loop.toggle", deck: "a" });

    expect(calls.filter((call) => call.startsWith("loop:"))).toEqual([
      "loop:a:0:0.5",
      "loop:a:0:0",
    ]);
    expect(events.filter((event) => event.t === "deck.loop.changed")).toMatchObject([
      { loop: { in: 0, out: 0.5 } },
      { loop: null },
    ]);
  });
});
