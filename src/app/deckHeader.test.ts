/**
 * @role Command-chain tests for the two facts a yard's header holds — whether it is heard, and
 *   the word a hand writes on it: what the log said, what the session holds, what history undoes,
 *   and what a copy, a clip and a stored round-trip carry (0386).
 * @instead The scale the mute is, and where in the chain it sits → src/audio/chain.test.ts. The
 *   run of steps beside it, whose shape this one follows → ./deckSequence.test.ts.
 */
import { describe, expect, it } from "vitest";

import { genSecs } from "@/lib/waveform";
import { sessionSnapshot, validateSession } from "@/state/session";
import { manualClock } from "./clock";
import type { Engine } from "./engine";
import { silentEngine } from "./engineDouble";
import type { Event } from "./events";
import { createInstrument } from "./facade";

/** The two calls this file presses the graph for: the load, and the mute the header sends. */
const engineDouble = (calls: string[]): Engine =>
  silentEngine({
    load: (deck, source) => {
      calls.push(`load:${deck}`);
      return genSecs(source.gen);
    },
    setMuted: (deck, muted) => {
      calls.push(`mute:${deck}:${String(muted)}`);
    },
  });

/** Undo and redo prepare a graph and replace the session through a promise chain. */
const settle = async (): Promise<void> => {
  for (let remaining = 20; remaining > 0; remaining--) {
    // oxlint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
};

const loaded = (calls: string[] = []) => {
  const instrument = createInstrument(manualClock(), () => engineDouble(calls));
  instrument.send({ t: "deck.load", deck: "a", source: { gen: "sine" } });
  return instrument;
};

// One case per road the two facts travel — the log, the graph, history, a copy, a clip, storage
// and the wire — and the length is how many roads there are rather than anything this block
// decides. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the mute and the tag a yard's header holds", () => {
  it("holds both, hands the mute to the graph, and says so on the log", () => {
    const calls: string[] = [];
    const instrument = loaded(calls);
    const events: Event[] = [];
    instrument.on((event) => {
      events.push(event);
    });
    instrument.send({ t: "deck.mute", deck: "a", muted: true });
    instrument.send({ t: "deck.tag", deck: "a", tag: "low end" });

    expect(instrument.probe().decks.a?.muted).toBe(true);
    expect(instrument.probe().decks.a?.tag).toBe("low end");
    // The mute reaches the graph; the tag is a word about the yard and asks it nothing.
    expect(calls).toEqual(["load:a", "mute:a:true"]);
    expect(events.map((event) => event.t)).toEqual(["deck.mute.changed", "deck.tag.changed"]);
    expect(events).toMatchObject([
      { t: "deck.mute.changed", deck: "a", muted: true },
      { t: "deck.tag.changed", deck: "a", tag: "low end" },
    ]);
  });

  it("is a state to be put in, so the same line twice is the same yard", () => {
    const calls: string[] = [];
    const instrument = loaded(calls);
    instrument.send({ t: "deck.mute", deck: "a", muted: true });
    instrument.send({ t: "deck.mute", deck: "a", muted: true });
    expect(instrument.probe().decks.a?.muted).toBe(true);
    // And back: unmuting is the same command with the other state, never a stop.
    instrument.send({ t: "deck.mute", deck: "a", muted: false });
    expect(instrument.probe().decks.a?.muted).toBe(false);
    expect(calls).toEqual(["load:a", "mute:a:true", "mute:a:true", "mute:a:false"]);
  });

  it("is held before anything is loaded, and refuses a yard nobody holds", () => {
    const instrument = createInstrument(manualClock(), () => engineDouble([]));
    instrument.send({ t: "deck.mute", deck: "a", muted: true });
    instrument.send({ t: "deck.tag", deck: "a", tag: "tops" });
    expect(instrument.probe().decks.a?.muted).toBe(true);
    expect(instrument.probe().decks.a?.tag).toBe("tops");
    expect(() => {
      instrument.send({ t: "deck.mute", deck: "nowhere", muted: true });
    }).toThrow(/nowhere/u);
    expect(() => {
      instrument.send({ t: "deck.tag", deck: "nowhere", tag: "tops" });
    }).toThrow(/nowhere/u);
  });

  it("undoes as one durable edit each, and hands the graph the mute it comes back to", async () => {
    const calls: string[] = [];
    const instrument = loaded(calls);
    instrument.send({ t: "deck.mute", deck: "a", muted: true });
    instrument.send({ t: "deck.tag", deck: "a", tag: "low end" });

    // The tag first, because it was written last: two facts, two entries (0067).
    instrument.send({ t: "history.undo" });
    await settle();
    expect(instrument.probe().decks.a?.tag).toBe("");
    expect(instrument.probe().decks.a?.muted).toBe(true);

    instrument.send({ t: "history.undo" });
    await settle();
    expect(instrument.probe().decks.a?.muted).toBe(false);

    instrument.send({ t: "history.redo" });
    await settle();
    expect(instrument.probe().decks.a?.muted).toBe(true);
  });

  it("rides a copy of the yard, a clip of it, and the shape a session is stored as", async () => {
    const instrument = loaded();
    instrument.send({ t: "deck.mute", deck: "a", muted: true });
    instrument.send({ t: "deck.tag", deck: "a", tag: "low end" });
    instrument.send({
      t: "deck.duplicate",
      deck: "a",
      to: "b",
      index: 1,
      emoji: "🌵",
      name: "Wild Moss",
    });
    await settle();
    expect(instrument.probe().decks.b?.muted).toBe(true);
    expect(instrument.probe().decks.b?.tag).toBe("low end");

    // A clip is the whole yard, and these two are part of the whole (0027) — which is what makes
    // a clip put back over a yard carry its own state rather than leaving the yard's standing.
    instrument.send({ t: "clip.capture", id: "clip-1", name: "intro", deck: "a" });
    expect(instrument.probe().clips[0]?.deck.muted).toBe(true);
    expect(instrument.probe().clips[0]?.deck.tag).toBe("low end");
    instrument.send({ t: "deck.mute", deck: "a", muted: false });
    instrument.send({ t: "deck.tag", deck: "a", tag: "" });
    instrument.send({ t: "clip.apply", id: "clip-1", deck: "a" });
    await settle();
    expect(instrument.probe().decks.a?.muted).toBe(true);
    expect(instrument.probe().decks.a?.tag).toBe("low end");

    // And the round-trip through storage, which is the one shape this build reads back (0026).
    const stored: unknown = JSON.parse(
      JSON.stringify(sessionSnapshot(instrument.state.getState())),
    );
    const back = validateSession(stored);
    expect(back.decks.a?.muted).toBe(true);
    expect(back.decks.a?.tag).toBe("low end");
  });

  it("refuses a mute that is not a flag and a tag past the bound, and holds what it had", () => {
    const instrument = loaded();
    instrument.send({ t: "deck.mute", deck: "a", muted: true });
    instrument.send({ t: "deck.tag", deck: "a", tag: "low end" });
    expect(() => {
      // oxlint-disable-next-line no-unsafe-type-assertion -- a malformed line off the wire
      instrument.send({ t: "deck.mute", deck: "a", muted: "yes" } as never);
    }).toThrow(/not a boolean/u);
    expect(() => {
      instrument.send({ t: "deck.tag", deck: "a", tag: "x".repeat(65) });
    }).toThrow(/longer than 64/u);
    // The empty word is a yard nobody has named, not a missing one, so it is accepted.
    instrument.send({ t: "deck.tag", deck: "a", tag: "" });
    expect(instrument.probe().decks.a?.tag).toBe("");
    expect(instrument.probe().decks.a?.muted).toBe(true);
  });
});
