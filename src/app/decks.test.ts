/** @role Command-chain tests for active-deck selection and N-deck transport shortcuts. */
import { describe, expect, it } from "vitest";

import { DECK_IDS } from "@/state/store";
import { manualClock } from "./clock";
import type { Command } from "./commands";
import type { Engine } from "./engine";
import type { Event } from "./events";
import { createInstrument } from "./facade";

const engineDouble = (calls: string[]): Engine => {
  const planned = new Set<(typeof DECK_IDS)[number]>();
  return {
    load: (deck, source) => {
      calls.push(`load:${deck}`);
      return source.secs;
    },
    loadBlob: () => Promise.resolve(1),
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
    planned: (deck) => planned.has(deck),
    setLoop: (deck, from, to) => {
      calls.push(`loop:${deck}:${from}:${to}`);
      return to > from ? { in: from, out: to } : null;
    },
    setParam: () => {},
    addEffect: () => 0,
    peek: () => {},
    peaks: () => null,
    prepareRestore: () =>
      Promise.resolve({ durations: { a: 0, b: 0 }, commit: () => {}, discard: () => {} }),
  };
};

describe("active deck", () => {
  it("round-trips activation through JSON, state, and one event", () => {
    const instrument = createInstrument(manualClock(3));
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
  it("toggles one loaded deck from graph-reported state", () => {
    const calls: string[] = [];
    const instrument = createInstrument(manualClock(), () => engineDouble(calls));
    instrument.send({ t: "deck.load", deck: "b", source: { gen: "sine", secs: 2 } });

    instrument.send({ t: "deck.play.toggle", deck: "b" });
    instrument.send({ t: "deck.play.toggle", deck: "b" });

    expect(calls.filter((call) => /^(play|stop):/u.test(call))).toEqual(["play:b", "stop:b"]);
  });

  it("starts every loaded deck and stops every registered graph plan", () => {
    const calls: string[] = [];
    const instrument = createInstrument(manualClock(), () => engineDouble(calls));
    for (const deck of DECK_IDS) {
      instrument.send({ t: "deck.load", deck, source: { gen: "sine", secs: 2 } });
    }

    instrument.send({ t: "decks.play.toggle" });
    instrument.send({ t: "decks.play.toggle" });

    expect(calls.filter((call) => /^(play|stop):/u.test(call))).toEqual(
      DECK_IDS.map((deck) => `stop:${deck}`),
    );
    expect(calls).toContain(`playTogether:${DECK_IDS.join(",")}`);
  });
});

describe("transport toggle refusals", () => {
  it.each([
    { name: "one deck", command: { t: "deck.play.toggle", deck: "a" } as const },
    { name: "all decks", command: { t: "decks.play.toggle" } as const },
    { name: "one loop", command: { t: "deck.loop.toggle", deck: "a" } as const },
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

describe("loop toggle command", () => {
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
