/**
 * @role Command-chain tests for a yard's sequence: one deck's whole run of steps, held entire —
 *   what the log said, what the session holds, what history undoes, and what a copy and a clip
 *   carry (0379).
 * @instead The jumping module's own commands, whose shape this one follows → ./deckPlayer.test.ts.
 */
import { describe, expect, it } from "vitest";

import type { DeckSequence } from "@/lib/deckSequence";
import { genSecs } from "@/lib/waveform";
import { sessionSnapshot, validateSession, type Session } from "@/state/session";
import { manualClock } from "./clock";
import type { Engine } from "./engine";
import { silentEngine } from "./engineDouble";
import type { Event } from "./events";
import { createInstrument } from "./facade";

/** The two calls a sequence makes of the graph, and nothing else this file presses. */
const engineDouble = (calls: string[]): Engine =>
  silentEngine({
    load: (deck, source) => {
      calls.push(`load:${deck}`);
      return genSecs(source.gen);
    },
    setSequence: (deck, steps) => {
      calls.push(`sequence:${deck}:${steps.map((step) => `${step.kind}${step.secs}`).join(",")}`);
    },
  });

/** Undo and redo prepare a graph and replace the session through a promise chain. */
const settle = async (): Promise<void> => {
  for (let remaining = 20; remaining > 0; remaining--) {
    // oxlint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
};

const BREATH: DeckSequence = [
  { kind: "in", secs: 120 },
  { kind: "play", secs: 300 },
  { kind: "out", secs: 60 },
];

const loaded = (calls: string[] = []) => {
  const instrument = createInstrument(manualClock(), () => engineDouble(calls));
  instrument.send({ t: "deck.load", deck: "a", source: { gen: "sine" } });
  return instrument;
};

// One case per road a sequence reaches the yard by — set, cleared, held before a load, undone,
// copied with the yard and clipped, refused at the wire — each driving the real instrument and
// reading the log back. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the sequence as a durable run of steps", () => {
  it("holds the whole run, hands it to the graph, and says so on the log", () => {
    const calls: string[] = [];
    const instrument = loaded(calls);
    const events: Event[] = [];
    instrument.on((event) => {
      events.push(event);
    });
    instrument.send({ t: "deck.sequence", deck: "a", steps: BREATH });

    expect(instrument.probe().decks.a?.sequence).toEqual(BREATH);
    expect(calls).toContain("sequence:a:in120,play300,out60");
    expect(events.filter((event) => event.t === "deck.sequence.changed")).toMatchObject([
      { deck: "a", steps: BREATH },
    ]);
    // Durable: the projection the session, the archive and history all read carries it, and the
    // one validator storage comes through accepts what it wrote (0026).
    const stored: Session = sessionSnapshot(instrument.state.getState());
    expect(stored.decks.a?.sequence).toEqual(BREATH);
    expect(validateSession(JSON.parse(JSON.stringify(stored))).decks.a?.sequence).toEqual(BREATH);
  });

  it("clears to an empty run, which is the whole of none", () => {
    const calls: string[] = [];
    const instrument = loaded(calls);
    instrument.send({ t: "deck.sequence", deck: "a", steps: BREATH });
    instrument.send({ t: "deck.sequence", deck: "a", steps: [] });
    expect(instrument.probe().decks.a?.sequence).toEqual([]);
    expect(calls.filter((call) => call.startsWith("sequence:"))).toEqual([
      "sequence:a:in120,play300,out60",
      "sequence:a:",
    ]);
  });

  it("is held before anything is loaded: a fade over whatever comes to play", () => {
    const calls: string[] = [];
    const instrument = createInstrument(manualClock(), () => engineDouble(calls));
    const events: Event[] = [];
    instrument.on((event) => {
      events.push(event);
    });
    instrument.send({ t: "deck.sequence", deck: "a", steps: BREATH });
    expect(events.filter((event) => event.t === "error")).toEqual([]);
    expect(instrument.probe().decks.a?.sequence).toEqual(BREATH);
  });

  it("undoes as one durable edit, and a run of edits to one yard as one entry", async () => {
    const calls: string[] = [];
    const instrument = loaded(calls);
    instrument.send({ t: "deck.sequence", deck: "a", steps: BREATH.slice(0, 1) });
    instrument.send({ t: "deck.sequence", deck: "a", steps: BREATH.slice(0, 2) });
    instrument.send({ t: "deck.sequence", deck: "a", steps: BREATH });
    expect(instrument.probe().decks.a?.sequence).toEqual(BREATH);

    // Three commands on one yard's sequence are one hand on one control: one entry (0067, 0379).
    instrument.send({ t: "history.undo" });
    await settle();
    expect(instrument.probe().decks.a?.sequence).toEqual([]);
    instrument.send({ t: "history.redo" });
    await settle();
    expect(instrument.probe().decks.a?.sequence).toEqual(BREATH);
    // The graph is handed the restored run, not only the store.
    expect(calls.at(-1)).toBe("sequence:a:in120,play300,out60");
  });

  it("rides a copy of the yard and a clip of it", async () => {
    const instrument = loaded();
    instrument.send({ t: "deck.sequence", deck: "a", steps: BREATH });
    instrument.send({
      t: "deck.duplicate",
      deck: "a",
      to: "b",
      index: 1,
      emoji: "🌵",
      name: "Wild Moss",
    });
    await settle();
    expect(instrument.probe().decks.b?.sequence).toEqual(BREATH);

    // A clip is the whole yard, and the sequence is part of the whole (0027).
    instrument.send({ t: "clip.capture", id: "clip-1", name: "intro", deck: "a" });
    expect(instrument.probe().clips[0]?.deck.sequence).toEqual(BREATH);
    instrument.send({ t: "deck.sequence", deck: "a", steps: [] });
    instrument.send({ t: "clip.apply", id: "clip-1", deck: "a" });
    await settle();
    expect(instrument.probe().decks.a?.sequence).toEqual(BREATH);
  });

  it("refuses a run that is not one at the wire, and holds what it had", () => {
    const instrument = loaded();
    const events: Event[] = [];
    instrument.on((event) => {
      events.push(event);
    });
    instrument.send({ t: "deck.sequence", deck: "a", steps: BREATH });
    expect(() => {
      instrument.send(
        // oxlint-disable-next-line no-unsafe-type-assertion -- a malformed line off the wire
        { t: "deck.sequence", deck: "a", steps: [{ kind: "hold", secs: 1 }] } as never,
      );
    }).toThrow(/kind is hold/u);
    expect(() => {
      instrument.send(
        // oxlint-disable-next-line no-unsafe-type-assertion -- a malformed line off the wire
        { t: "deck.sequence", deck: "a", steps: [{ kind: "in", secs: 1.5 }] } as never,
      );
    }).toThrow(/not whole/u);
    expect(instrument.probe().decks.a?.sequence).toEqual(BREATH);
  });
});
