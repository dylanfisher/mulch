/** @role Command and history contracts for the generic durable parameter-automation lane. */
// One flat matrix of lane cases, deck-owned and instance-owned beside each other (0007).
// oxlint-disable max-lines, import/max-dependencies
import { describe, expect, it, vi } from "vitest";

import { paramReachable } from "@/audio/params";
import { MAX_LANE_SPAN, MIN_LANE_SPAN } from "@/lib/automation";
import type { MotionDrawn } from "@/lib/motion";
import type { SessionRepository } from "@/state/repository";
import { sessionSnapshot, validateSession, type Session } from "@/state/session";
import { deckIdsOf, fromDecks } from "@/state/store";
import { manualClock } from "./clock";
import type { Command } from "./commands";
import type { Engine } from "./engine";
import { silentEngine } from "./engineDouble";
import { AUTOSAVE_DELAY_MS, createInstrument } from "./facade";
import { instanceIn } from "./rackProbe";
import { restorationCommands } from "./restore";

/** One instance of deck a, or a loud miss — the (instance, param) half of every lookup below. */

const turns = async (): Promise<void> => {
  for (let remaining = 8; remaining > 0; remaining--) {
    // The facade serializes checkpoint preparation through a finite promise chain.
    // oxlint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
};

const engineDouble = (scheduled: unknown[][]): Engine =>
  silentEngine({
    setAutomation: (deck, instance, param, lane, base) => {
      scheduled.push([deck, instance, param, lane, base]);
    },
    prepareRestore: (session) =>
      Promise.resolve({
        durations: fromDecks(deckIdsOf(session.deckList), () => 0),
        commit: () => {
          const lane = session.decks.a!.automation["deck.gain"] ?? [];
          scheduled.push([
            "restore",
            null,
            "deck.gain",
            lane,
            session.decks.a!.params["deck.gain"],
          ]);
        },
        measure: () => {},
        discard: () => {},
      }),
  });

/**
 * One `automation.drawn` off the wire, where a stale macro can say anything — and the two halves
 * this build owns are exactly what the guard checks.
 */
const drawnSaying = (character: string, redraw: number): Command => ({
  t: "automation.drawn",
  deck: "a",
  param: "deck.gain",
  // The point of the case is a pair the union does not admit.
  // oxlint-disable-next-line no-unsafe-type-assertion
  drawn: { character, redraw } as MotionDrawn,
});

// The generic effect-parameter path: one reachability rule, one command, and lanes that belong
// to the instance holding them (0024, 0030).
// oxlint-disable-next-line max-lines-per-function
describe("instance-owned automation", () => {
  it("reaches a target only through the instance whose plugin declares it", () => {
    const instrument = createInstrument(manualClock());
    const rack = () => instrument.probe().decks.a!.effects;
    expect(paramReachable(rack(), "one", "eq.frequency")).toBe(false);

    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "eq" });
    expect(paramReachable(rack(), "one", "eq.frequency")).toBe(true);
    // The deck does not own an effect's parameter, and never did the value either (0030).
    expect(paramReachable(rack(), null, "eq.frequency")).toBe(false);
  });

  it("schedules an instance target through the same command as a deck target", () => {
    const scheduled: unknown[][] = [];
    const instrument = createInstrument(manualClock(), () => engineDouble(scheduled));
    const points = [
      { at: 1, value: 200 },
      { at: 2, value: 4000 },
    ];
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "eq" });
    instrument.send({
      t: "automation.set",
      deck: "a",
      instance: "one",
      param: "eq.frequency",
      points,
    });

    expect(instanceIn(instrument, "one").automation).toEqual({ "eq.frequency": points });
    // The deck's own lanes are untouched: a lane is held where its value is (0030).
    expect(instrument.probe().decks.a!.automation).toEqual({});
    expect(scheduled).toEqual([["a", "one", "eq.frequency", points, 1000]]);
    expect(instrument.ring().at(-1)).toMatchObject({
      t: "automation.changed",
      deck: "a",
      instance: "one",
      param: "eq.frequency",
      points,
    });
  });

  // P13's third proof clause: a lane on the second instance only (0030).
  it("keeps a lane on the instance that recorded it and off its twin", () => {
    const scheduled: unknown[][] = [];
    const instrument = createInstrument(manualClock(), () => engineDouble(scheduled));
    const points = [{ at: 1, value: 200 }];
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "eq" });
    instrument.send({ t: "effect.add", deck: "a", id: "two", effect: "eq" });
    instrument.send({
      t: "param.set",
      deck: "a",
      instance: "two",
      param: "eq.frequency",
      value: 800,
    });
    instrument.send({
      t: "automation.set",
      deck: "a",
      instance: "two",
      param: "eq.frequency",
      points,
    });

    expect(instanceIn(instrument, "one").automation).toEqual({});
    expect(instanceIn(instrument, "two").automation).toEqual({ "eq.frequency": points });
    // Scheduled against the second instance's binding and its own manual value, not the first's.
    expect(scheduled).toEqual([["a", "two", "eq.frequency", points, 800]]);

    // And it survives one round trip through the durable shape as the same one lane.
    const durable = sessionSnapshot(instrument.probe());
    expect(durable.decks.a!.effects.map((entry) => entry.automation)).toEqual([
      {},
      { "eq.frequency": points },
    ]);
  });

  it("takes an instance's lane away with the instance, and a fresh one starts empty", () => {
    const scheduled: unknown[][] = [];
    const instrument = createInstrument(manualClock(), () => engineDouble(scheduled));
    const points = [{ at: 1, value: 200 }];
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "eq" });
    instrument.send({
      t: "automation.set",
      deck: "a",
      instance: "one",
      param: "eq.frequency",
      points,
    });
    instrument.send({ t: "effect.remove", deck: "a", instance: "one" });

    // Nothing retained: the lane was the instance's, and the instance is gone (0030).
    expect(instrument.probe().decks.a!.effects).toEqual([]);
    expect(instrument.probe().decks.a!.automation).toEqual({});
    scheduled.length = 0;

    instrument.send({ t: "effect.add", deck: "a", id: "two", effect: "eq" });
    expect(instanceIn(instrument, "two").automation).toEqual({});
    expect(scheduled).toEqual([]);
  });

  it("keeps automating a bypassed instance, which is out of the path and still bound", () => {
    const scheduled: unknown[][] = [];
    const instrument = createInstrument(manualClock(), () => engineDouble(scheduled));
    const points = [{ at: 1, value: 200 }];
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "eq" });
    instrument.send({ t: "effect.bypass", deck: "a", instance: "one", bypassed: true });
    instrument.send({
      t: "automation.set",
      deck: "a",
      instance: "one",
      param: "eq.frequency",
      points,
    });

    expect(scheduled).toEqual([["a", "one", "eq.frequency", points, 1000]]);
  });

  it("clears a lane and sets the value that replaced it as one undoable transaction", async () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "eq" });
    instrument.send({
      t: "automation.set",
      deck: "a",
      instance: "one",
      param: "eq.frequency",
      points: [{ at: 1, value: 200 }],
    });
    await turns();
    instrument.send({
      t: "history.group",
      commands: [
        { t: "automation.set", deck: "a", instance: "one", param: "eq.frequency", points: [] },
        { t: "param.set", deck: "a", instance: "one", param: "eq.frequency", value: 5000 },
      ],
    });
    await turns();
    expect(instanceIn(instrument, "one").automation).toEqual({});
    expect(instanceIn(instrument, "one").params["eq.frequency"]).toBe(5000);

    instrument.send({ t: "history.undo" });
    await turns();
    const restored = instanceIn(instrument, "one");
    expect(restored.automation).toEqual({ "eq.frequency": [{ at: 1, value: 200 }] });
    expect(restored.params["eq.frequency"]).toBe(1000);
  });
});

// One command's state, graph, event, rejection, and history surfaces stay visible together.
// oxlint-disable-next-line max-lines-per-function
describe("automation.set", () => {
  it("normalizes one generic registry target before state, graph, and event publication", () => {
    const scheduled: unknown[][] = [];
    const instrument = createInstrument(manualClock(), () => engineDouble(scheduled));
    instrument.send({
      t: "automation.set",
      deck: "a",
      param: "deck.gain",
      points: [
        { at: 2, value: 2 },
        { at: 1, value: 0.25 },
        { at: 2, value: 0.75 },
      ],
    });

    const expected = [
      { at: 1, value: 0.25 },
      { at: 2, value: 0.75 },
    ];
    expect(instrument.probe().decks.a!.automation).toEqual({ "deck.gain": expected });
    expect(scheduled).toEqual([["a", null, "deck.gain", expected, 1]]);
    expect(instrument.ring().at(-1)).toMatchObject({
      t: "automation.changed",
      deck: "a",
      param: "deck.gain",
      points: expected,
    });
  });

  it("rejects a ParamId whose registry entry does not opt into automation", () => {
    const instrument = createInstrument(manualClock());
    expect(() => {
      instrument.send({
        t: "automation.set",
        deck: "a",
        param: "deck.speed",
        points: [{ at: 1, value: 1 }],
      });
    }).toThrow(/does not support automation/u);
    expect(instrument.probe().decks.a!.automation).toEqual({});
  });

  it("reschedules a future lane when its durable base value changes", () => {
    const scheduled: unknown[][] = [];
    const instrument = createInstrument(manualClock(), () => engineDouble(scheduled));
    const points = [{ at: 3, value: 0.25 }];
    instrument.send({ t: "automation.set", deck: "a", param: "deck.gain", points });
    instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value: 0.5 });

    expect(scheduled).toEqual([
      ["a", null, "deck.gain", points, 1],
      ["a", null, "deck.gain", points, 0.5],
    ]);
  });

  it("undoes, redoes, and clears a whole lane as one durable edit", async () => {
    const instrument = createInstrument(manualClock());
    const points = [
      { at: 0, value: 0 },
      { at: 1, value: 1.5 },
    ];
    instrument.send({ t: "automation.set", deck: "a", param: "deck.gain", points });
    instrument.send({ t: "history.undo" });
    await turns();
    expect(instrument.probe().decks.a!.automation).toEqual({});

    instrument.send({ t: "history.redo" });
    await turns();
    expect(instrument.probe().decks.a!.automation).toEqual({ "deck.gain": points });

    instrument.send({ t: "automation.set", deck: "a", param: "deck.gain", points: [] });
    expect(instrument.probe().decks.a!.automation).toEqual({});
  });

  it("emits and autosaves once for one whole-lane command", async () => {
    vi.useFakeTimers();
    try {
      const saves: Session[] = [];
      const repository: SessionRepository = {
        load: () => Promise.resolve(),
        save: (session) => {
          saves.push(session);
          return Promise.resolve();
        },
        ingest: () => Promise.reject(new Error("unused")),
        blob: () => Promise.resolve(null),
        blobs: () => Promise.resolve(new Map()),
        replace: () => Promise.resolve(),
      };
      const instrument = createInstrument(manualClock(), undefined, repository);
      await instrument.ready;

      instrument.send({
        t: "automation.set",
        deck: "a",
        param: "deck.gain",
        points: [
          { at: 0, value: 0.25 },
          { at: 1, value: 0.75 },
        ],
      });
      await vi.advanceTimersByTimeAsync(AUTOSAVE_DELAY_MS);
      await turns();

      expect(instrument.ring().filter(({ t }) => t === "automation.changed")).toHaveLength(1);
      expect(saves).toHaveLength(1);
      expect(saves[0]?.decks.a!.automation["deck.gain"]).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });
});

// What drew a lane, beside the lane rather than inside it: one value per (instance, param), set
// by two writers, cleared by the lane going away (0314).
// oxlint-disable-next-line max-lines-per-function
describe("automation.drawn", () => {
  const points = [
    { at: 0, value: 0.25 },
    { at: 1, value: 0.75 },
  ];
  const drawn = { character: "pulse", redraw: 4 } as const;

  it("writes and clears the sibling of the lane it names, on the deck and on an instance", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "delay" });
    instrument.send({ t: "automation.set", deck: "a", param: "deck.gain", points });
    instrument.send({ t: "automation.drawn", deck: "a", param: "deck.gain", drawn });
    instrument.send({
      t: "automation.set",
      deck: "a",
      instance: "one",
      param: "delay.mix",
      points,
    });
    instrument.send({
      t: "automation.drawn",
      deck: "a",
      instance: "one",
      param: "delay.mix",
      drawn: { character: "creep", redraw: 1 },
    });

    expect(instrument.probe().decks.a!.drawn).toEqual({ "deck.gain": drawn });
    expect(instanceIn(instrument, "one").drawn).toEqual({
      "delay.mix": { character: "creep", redraw: 1 },
    });
    // Its own object, not the command's: a caller holding the command must not be able to move
    // what the session holds.
    expect(instrument.probe().decks.a!.drawn["deck.gain"]).not.toBe(drawn);

    instrument.send({ t: "automation.drawn", deck: "a", param: "deck.gain", drawn: null });
    expect(instrument.probe().decks.a!.drawn).toEqual({});
    expect(instrument.ring().filter(({ t }) => t === "automation.drawn")).toHaveLength(3);
  });

  // 0311's rule, written where the fact lives: a lane cleared is a lane nothing drew, and a lane
  // replaced is one whose character still stands.
  it("goes with an emptied lane and stands through one that arrives with points", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "automation.set", deck: "a", param: "deck.gain", points });
    instrument.send({ t: "automation.drawn", deck: "a", param: "deck.gain", drawn });

    instrument.send({
      t: "automation.set",
      deck: "a",
      param: "deck.gain",
      points: [
        { at: 0, value: 0.5 },
        { at: 2, value: 1 },
      ],
    });
    expect(instrument.probe().decks.a!.drawn).toEqual({ "deck.gain": drawn });

    instrument.send({ t: "automation.set", deck: "a", param: "deck.gain", points: [] });
    expect(instrument.probe().decks.a!.drawn).toEqual({});
  });

  it("is durable: it survives a snapshot, a restore and an undo", async () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "automation.set", deck: "a", param: "deck.gain", points });
    instrument.send({ t: "automation.drawn", deck: "a", param: "deck.gain", drawn });
    // The lane and what drew it carry one gesture key, so they are one entry until the hand lets
    // go — which is what makes a draw one press to undo (0067, 0314).
    instrument.send({ t: "gesture.end" });
    await turns();

    const stored = sessionSnapshot(instrument.probe());
    expect(stored.decks.a!.drawn).toEqual({ "deck.gain": drawn });
    // The one validator every stored session goes through, so a knob that was redrawing when the
    // tab closed is one an archive can carry back (0026, 0314).
    expect(() => {
      validateSession(structuredClone(stored));
    }).not.toThrow();

    const restored = createInstrument(manualClock());
    for (const command of restorationCommands(stored)) restored.send(command);
    await turns();
    expect(restored.probe().decks.a!.drawn).toEqual({ "deck.gain": drawn });

    instrument.send({ t: "automation.drawn", deck: "a", param: "deck.gain", drawn: null });
    instrument.send({ t: "gesture.end" });
    await turns();
    expect(instrument.probe().decks.a!.drawn).toEqual({});
    instrument.send({ t: "history.undo" });
    await turns();
    expect(instrument.probe().decks.a!.drawn).toEqual({ "deck.gain": drawn });
  });

  it("refuses a character or a count this build does not offer", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "automation.set", deck: "a", param: "deck.gain", points });
    expect(() => {
      instrument.send(drawnSaying("lolloping", 1));
    }).toThrow(/character is not a character/u);
    expect(() => {
      instrument.send(drawnSaying("pulse", 3));
    }).toThrow(/redraw is not a count/u);
    // And a lane to be about: what drew a lane exists exactly while that lane does, so a drawn
    // state on a parameter holding none is a fact about nothing (0314).
    instrument.send({ t: "automation.set", deck: "a", param: "deck.pan", points: [] });
    instrument.send({
      t: "automation.drawn",
      deck: "a",
      param: "deck.pan",
      drawn: { character: "creep", redraw: 1 },
    });
    expect(instrument.probe().decks.a!.drawn["deck.pan"]).toBeUndefined();
    expect(instrument.ring().at(-1)).toMatchObject({ t: "error" });

    // And nothing but the two halves: an extra key off the wire is refused rather than stored,
    // through the one assert the stored session is checked by (0314).
    expect(() => {
      instrument.send({
        t: "automation.drawn",
        deck: "a",
        param: "deck.gain",
        // oxlint-disable-next-line no-unsafe-type-assertion
        drawn: { character: "pulse", redraw: 1, extra: 1 } as unknown as MotionDrawn,
      });
    }).toThrow(/expected \[character, redraw\]/u);
    expect(instrument.probe().decks.a!.drawn).toEqual({});
  });
});

// The length a lane repeats on, edited after it was played: one command, the same shape at a new
// speed, and the graph rescheduled with it (0079).
// oxlint-disable-next-line max-lines-per-function
describe("automation.span", () => {
  const points = [
    { at: 0, value: 0.25 },
    { at: 2, value: 1.25 },
  ];

  it("scales the lane it names onto the span, in state, graph and log", () => {
    const scheduled: unknown[][] = [];
    const instrument = createInstrument(manualClock(), () => engineDouble(scheduled));
    instrument.send({ t: "automation.set", deck: "a", param: "deck.gain", points });
    instrument.send({ t: "automation.span", deck: "a", param: "deck.gain", span: 1 });

    const stretched = [
      { at: 0, value: 0.25 },
      { at: 1, value: 1.25 },
    ];
    expect(instrument.probe().decks.a!.automation).toEqual({ "deck.gain": stretched });
    expect(scheduled.at(-1)).toEqual(["a", null, "deck.gain", stretched, 1]);
    expect(instrument.ring().at(-1)).toMatchObject({
      t: "automation.changed",
      deck: "a",
      param: "deck.gain",
      points: stretched,
    });
  });

  it("stretches the lane on the instance it names and no other", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "delay" });
    instrument.send({ t: "effect.add", deck: "a", id: "two", effect: "delay" });
    for (const instance of ["one", "two"] as const) {
      instrument.send({ t: "automation.set", deck: "a", instance, param: "delay.mix", points });
    }
    instrument.send({
      t: "automation.span",
      deck: "a",
      instance: "two",
      param: "delay.mix",
      span: 4,
    });

    // The mix range tops out at 1, so what both instances hold is the lane clamped onto it —
    // and the only difference between them is the span one of them was stretched to.
    expect(instanceIn(instrument, "one").automation["delay.mix"]).toEqual([
      { at: 0, value: 0.25 },
      { at: 2, value: 1 },
    ]);
    expect(instanceIn(instrument, "two").automation["delay.mix"]).toEqual([
      { at: 0, value: 0.25 },
      { at: 4, value: 1 },
    ]);
  });

  it("holds the span inside the lengths a lane may have", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "automation.set", deck: "a", param: "deck.gain", points });
    instrument.send({ t: "automation.span", deck: "a", param: "deck.gain", span: 10_000 });
    expect(instrument.probe().decks.a!.automation["deck.gain"]!.at(-1)!.at).toBe(MAX_LANE_SPAN);

    instrument.send({ t: "automation.span", deck: "a", param: "deck.gain", span: 0.000_1 });
    expect(instrument.probe().decks.a!.automation["deck.gain"]!.at(-1)!.at).toBe(MIN_LANE_SPAN);
  });

  it("refuses a span that is not a positive length, changing nothing", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "automation.set", deck: "a", param: "deck.gain", points });
    for (const span of [0, -1, Number.NaN]) {
      expect(() => {
        instrument.send({ t: "automation.span", deck: "a", param: "deck.gain", span });
      }).toThrow();
    }
    expect(instrument.probe().decks.a!.automation).toEqual({ "deck.gain": points });
  });

  it("refuses rather than inventing a lane when the parameter holds none", () => {
    const instrument = createInstrument(manualClock());
    expect(() => {
      instrument.send({ t: "automation.span", deck: "a", param: "deck.gain", span: 1 });
    }).toThrow(/no span/u);

    expect(instrument.probe().decks.a!.automation).toEqual({});
  });

  it("refuses a stretch naming an instance the rack does not hold", () => {
    const instrument = createInstrument(manualClock());
    expect(() => {
      instrument.send({
        t: "automation.span",
        deck: "a",
        instance: "gone",
        param: "delay.mix",
        span: 1,
      });
    }).toThrow(/no instance gone/u);
  });

  it("is one durable edit, undone back to the span the gesture had", async () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "automation.set", deck: "a", param: "deck.gain", points });
    instrument.send({ t: "automation.span", deck: "a", param: "deck.gain", span: 8 });
    instrument.send({ t: "history.undo" });
    await turns();

    expect(instrument.probe().decks.a!.automation).toEqual({ "deck.gain": points });
  });
});
