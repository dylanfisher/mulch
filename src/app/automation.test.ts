/** @role Command and history contracts for the generic durable parameter-automation lane. */
import { describe, expect, it, vi } from "vitest";

import { automationTargets } from "@/audio/params";
import type { SessionRepository } from "@/state/repository";
import { sessionV4, type SessionV4 } from "@/state/session";
import { createSessionStore, patchDeck } from "@/state/store";
import { manualClock } from "./clock";
import { restorationCommands } from "./restore";
import type { Engine } from "./engine";
import { AUTOSAVE_DELAY_MS, createInstrument } from "./facade";

const turns = async (): Promise<void> => {
  for (let remaining = 8; remaining > 0; remaining--) {
    // The facade serializes checkpoint preparation through a finite promise chain.
    // oxlint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
};

const engineDouble = (scheduled: unknown[][]): Engine => ({
  load: (_deck, source) => source.secs,
  loadBlob: () => Promise.resolve(1),
  play: () => {},
  playTogether: () => {},
  stop: () => {},
  planned: () => false,
  setLoop: () => null,
  setParam: () => {},
  setAutomation: (deck, param, lane, base) => {
    scheduled.push([deck, param, lane, base]);
  },
  addEffect: () => 0,
  setEffectBypass: () => {},
  removeEffect: () => {},
  reorderEffects: () => {},
  peek: () => {},
  peaks: () => null,
  prepareRestore: (session) =>
    Promise.resolve({
      durations: { a: 0, b: 0 },
      commit: () => {
        const lane = session.decks.a.automation["deck.gain"] ?? [];
        scheduled.push(["restore", "deck.gain", lane, session.decks.a.params["deck.gain"]]);
      },
      discard: () => {},
    }),
});

// The generic effect-parameter path: one target list, one command, one retention rule (0024).
// oxlint-disable-next-line max-lines-per-function
describe("effect-owned automation", () => {
  it("offers a target only while the effect declaring it is in the rack", () => {
    const instrument = createInstrument(manualClock());
    expect(automationTargets(instrument.probe().decks.a.effects)).toEqual(["deck.gain"]);

    instrument.send({ t: "effect.add", deck: "a", effect: "filter" });
    expect(automationTargets(instrument.probe().decks.a.effects)).toEqual([
      "deck.gain",
      "filter.cutoff",
    ]);
  });

  it("schedules an effect target through the same command as a deck target", () => {
    const scheduled: unknown[][] = [];
    const instrument = createInstrument(manualClock(), () => engineDouble(scheduled));
    const points = [
      { at: 1, value: 200 },
      { at: 2, value: 4000 },
    ];
    instrument.send({ t: "effect.add", deck: "a", effect: "filter" });
    instrument.send({ t: "automation.set", deck: "a", param: "filter.cutoff", points });

    expect(instrument.probe().decks.a.automation).toEqual({ "filter.cutoff": points });
    expect(scheduled).toEqual([["a", "filter.cutoff", points, 1000]]);
    expect(instrument.ring().at(-1)).toMatchObject({
      t: "automation.changed",
      deck: "a",
      param: "filter.cutoff",
      points,
    });
  });

  it("retains a removed effect's lane unscheduled and schedules it again on re-add", () => {
    const scheduled: unknown[][] = [];
    const instrument = createInstrument(manualClock(), () => engineDouble(scheduled));
    const points = [{ at: 1, value: 200 }];
    instrument.send({ t: "effect.add", deck: "a", effect: "filter" });
    instrument.send({ t: "automation.set", deck: "a", param: "filter.cutoff", points });
    instrument.send({ t: "effect.remove", deck: "a", effect: "filter" });

    // Retained, exactly as the removed effect's parameter values are (0023, 0024).
    expect(instrument.probe().decks.a.automation).toEqual({ "filter.cutoff": points });
    scheduled.length = 0;
    // With no owning effect there is nothing to schedule onto, and nothing is scheduled.
    instrument.send({ t: "param.set", deck: "a", param: "filter.cutoff", value: 800 });
    instrument.send({ t: "automation.set", deck: "a", param: "filter.cutoff", points });
    expect(scheduled).toEqual([]);

    instrument.send({ t: "effect.add", deck: "a", effect: "filter" });
    expect(scheduled).toEqual([["a", "filter.cutoff", points, 800]]);
  });

  it("carries a removed effect's retained lane through a reload without scheduling it", () => {
    const points = [{ at: 1, value: 200 }];
    // What a save writes after the effect was removed: the lane outlives its owner (0024).
    const store = createSessionStore();
    patchDeck(store, "a", { effects: [], automation: { "filter.cutoff": points } });
    const durable = sessionV4(store.getState());
    expect(durable.decks.a.automation).toEqual({ "filter.cutoff": points });
    expect(durable.decks.a.effects).toEqual([]);

    // What a reload replays. The lane lands in state; with no owning effect in the rack there is
    // nothing to schedule it onto, and nothing is scheduled (0024).
    const scheduled: unknown[][] = [];
    const reloaded = createInstrument(manualClock(), () => engineDouble(scheduled));
    for (const command of restorationCommands(durable)) reloaded.send(command);

    expect(reloaded.probe().decks.a.automation).toEqual({ "filter.cutoff": points });
    expect(scheduled.filter(([, param]) => param === "filter.cutoff")).toEqual([]);
  });

  it("keeps automating a bypassed effect, which is out of the path and still bound", () => {
    const scheduled: unknown[][] = [];
    const instrument = createInstrument(manualClock(), () => engineDouble(scheduled));
    const points = [{ at: 1, value: 200 }];
    instrument.send({ t: "effect.add", deck: "a", effect: "filter" });
    instrument.send({ t: "effect.bypass", deck: "a", effect: "filter", bypassed: true });
    instrument.send({ t: "automation.set", deck: "a", param: "filter.cutoff", points });

    expect(scheduled).toEqual([["a", "filter.cutoff", points, 1000]]);
  });

  it("clears a lane and sets the value that replaced it as one undoable transaction", async () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", effect: "filter" });
    instrument.send({
      t: "automation.set",
      deck: "a",
      param: "filter.cutoff",
      points: [{ at: 1, value: 200 }],
    });
    await turns();
    instrument.send({
      t: "history.group",
      commands: [
        { t: "automation.set", deck: "a", param: "filter.cutoff", points: [] },
        { t: "param.set", deck: "a", param: "filter.cutoff", value: 5000 },
      ],
    });
    await turns();
    expect(instrument.probe().decks.a.automation).toEqual({});
    expect(instrument.probe().decks.a.params["filter.cutoff"]).toBe(5000);

    instrument.send({ t: "history.undo" });
    await turns();
    const restored = instrument.probe().decks.a;
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
    expect(instrument.probe().decks.a.automation).toEqual({ "deck.gain": expected });
    expect(scheduled).toEqual([["a", "deck.gain", expected, 1]]);
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
    expect(instrument.probe().decks.a.automation).toEqual({});
  });

  it("reschedules a future lane when its durable base value changes", () => {
    const scheduled: unknown[][] = [];
    const instrument = createInstrument(manualClock(), () => engineDouble(scheduled));
    const points = [{ at: 3, value: 0.25 }];
    instrument.send({ t: "automation.set", deck: "a", param: "deck.gain", points });
    instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value: 0.5 });

    expect(scheduled).toEqual([
      ["a", "deck.gain", points, 1],
      ["a", "deck.gain", points, 0.5],
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
    expect(instrument.probe().decks.a.automation).toEqual({});

    instrument.send({ t: "history.redo" });
    await turns();
    expect(instrument.probe().decks.a.automation).toEqual({ "deck.gain": points });

    instrument.send({ t: "automation.set", deck: "a", param: "deck.gain", points: [] });
    expect(instrument.probe().decks.a.automation).toEqual({});
  });

  it("emits and autosaves once for one whole-lane command", async () => {
    vi.useFakeTimers();
    try {
      const saves: SessionV4[] = [];
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
      expect(saves[0]?.decks.a.automation["deck.gain"]).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
