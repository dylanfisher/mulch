/** @role Command and history contracts for the generic durable parameter-automation lane. */
// One flat matrix of lane cases, deck-owned and instance-owned beside each other (0007).
// oxlint-disable max-lines
import { describe, expect, it, vi } from "vitest";

import { paramReachable } from "@/audio/params";
import type { SessionRepository } from "@/state/repository";
import { sessionSnapshot, type Session } from "@/state/session";
import { fromDecks } from "@/state/store";
import type { EffectInstanceId } from "@/audio/effects/contract";
import type { SessionEffect } from "@/state/session";
import { manualClock } from "./clock";
import type { Engine } from "./engine";
import { silentEngine } from "./engineDouble";
import { AUTOSAVE_DELAY_MS, createInstrument, type Instrument } from "./facade";

/** One instance of deck a, or a loud miss — the (instance, param) half of every lookup below. */
const instanceIn = (instrument: Instrument, instance: EffectInstanceId): SessionEffect => {
  const entry = instrument.probe().decks.a!.effects.find((current) => current.id === instance);
  if (entry === undefined) throw new Error(`deck a holds no instance ${instance}`);
  return entry;
};

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
        durations: fromDecks(session.deckIds, () => 0),
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

// The generic effect-parameter path: one reachability rule, one command, and lanes that belong
// to the instance holding them (0024, 0030).
// oxlint-disable-next-line max-lines-per-function
describe("instance-owned automation", () => {
  it("reaches a target only through the instance whose plugin declares it", () => {
    const instrument = createInstrument(manualClock());
    const rack = () => instrument.probe().decks.a!.effects;
    expect(paramReachable(rack(), "one", "filter.cutoff")).toBe(false);

    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    expect(paramReachable(rack(), "one", "filter.cutoff")).toBe(true);
    // The deck does not own an effect's parameter, and never did the value either (0030).
    expect(paramReachable(rack(), null, "filter.cutoff")).toBe(false);
  });

  it("schedules an instance target through the same command as a deck target", () => {
    const scheduled: unknown[][] = [];
    const instrument = createInstrument(manualClock(), () => engineDouble(scheduled));
    const points = [
      { at: 1, value: 200 },
      { at: 2, value: 4000 },
    ];
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    instrument.send({
      t: "automation.set",
      deck: "a",
      instance: "one",
      param: "filter.cutoff",
      points,
    });

    expect(instanceIn(instrument, "one").automation).toEqual({ "filter.cutoff": points });
    // The deck's own lanes are untouched: a lane is held where its value is (0030).
    expect(instrument.probe().decks.a!.automation).toEqual({});
    expect(scheduled).toEqual([["a", "one", "filter.cutoff", points, 1000]]);
    expect(instrument.ring().at(-1)).toMatchObject({
      t: "automation.changed",
      deck: "a",
      instance: "one",
      param: "filter.cutoff",
      points,
    });
  });

  // P13's third proof clause: a lane on the second instance only (0030).
  it("keeps a lane on the instance that recorded it and off its twin", () => {
    const scheduled: unknown[][] = [];
    const instrument = createInstrument(manualClock(), () => engineDouble(scheduled));
    const points = [{ at: 1, value: 200 }];
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    instrument.send({ t: "effect.add", deck: "a", id: "two", effect: "filter" });
    instrument.send({
      t: "param.set",
      deck: "a",
      instance: "two",
      param: "filter.cutoff",
      value: 800,
    });
    instrument.send({
      t: "automation.set",
      deck: "a",
      instance: "two",
      param: "filter.cutoff",
      points,
    });

    expect(instanceIn(instrument, "one").automation).toEqual({});
    expect(instanceIn(instrument, "two").automation).toEqual({ "filter.cutoff": points });
    // Scheduled against the second instance's binding and its own manual value, not the first's.
    expect(scheduled).toEqual([["a", "two", "filter.cutoff", points, 800]]);

    // And it survives one round trip through the durable shape as the same one lane.
    const durable = sessionSnapshot(instrument.probe());
    expect(durable.decks.a!.effects.map((entry) => entry.automation)).toEqual([
      {},
      { "filter.cutoff": points },
    ]);
  });

  it("takes an instance's lane away with the instance, and a fresh one starts empty", () => {
    const scheduled: unknown[][] = [];
    const instrument = createInstrument(manualClock(), () => engineDouble(scheduled));
    const points = [{ at: 1, value: 200 }];
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    instrument.send({
      t: "automation.set",
      deck: "a",
      instance: "one",
      param: "filter.cutoff",
      points,
    });
    instrument.send({ t: "effect.remove", deck: "a", instance: "one" });

    // Nothing retained: the lane was the instance's, and the instance is gone (0030).
    expect(instrument.probe().decks.a!.effects).toEqual([]);
    expect(instrument.probe().decks.a!.automation).toEqual({});
    scheduled.length = 0;

    instrument.send({ t: "effect.add", deck: "a", id: "two", effect: "filter" });
    expect(instanceIn(instrument, "two").automation).toEqual({});
    expect(scheduled).toEqual([]);
  });

  it("keeps automating a bypassed instance, which is out of the path and still bound", () => {
    const scheduled: unknown[][] = [];
    const instrument = createInstrument(manualClock(), () => engineDouble(scheduled));
    const points = [{ at: 1, value: 200 }];
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    instrument.send({ t: "effect.bypass", deck: "a", instance: "one", bypassed: true });
    instrument.send({
      t: "automation.set",
      deck: "a",
      instance: "one",
      param: "filter.cutoff",
      points,
    });

    expect(scheduled).toEqual([["a", "one", "filter.cutoff", points, 1000]]);
  });

  it("clears a lane and sets the value that replaced it as one undoable transaction", async () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    instrument.send({
      t: "automation.set",
      deck: "a",
      instance: "one",
      param: "filter.cutoff",
      points: [{ at: 1, value: 200 }],
    });
    await turns();
    instrument.send({
      t: "history.group",
      commands: [
        { t: "automation.set", deck: "a", instance: "one", param: "filter.cutoff", points: [] },
        { t: "param.set", deck: "a", instance: "one", param: "filter.cutoff", value: 5000 },
      ],
    });
    await turns();
    expect(instanceIn(instrument, "one").automation).toEqual({});
    expect(instanceIn(instrument, "one").params["filter.cutoff"]).toBe(5000);

    instrument.send({ t: "history.undo" });
    await turns();
    const restored = instanceIn(instrument, "one");
    expect(restored.automation).toEqual({ "filter.cutoff": [{ at: 1, value: 200 }] });
    expect(restored.params["filter.cutoff"]).toBe(1000);
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
        param: "deck.pan",
        points: [{ at: 1, value: 0 }],
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
