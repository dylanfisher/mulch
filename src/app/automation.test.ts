/** @role Command and history contracts for the generic durable parameter-automation lane. */
import { describe, expect, it, vi } from "vitest";

import type { SessionRepository } from "@/state/repository";
import type { SessionV3 } from "@/state/session";
import { manualClock } from "./clock";
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
      const saves: SessionV3[] = [];
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
