import { describe, expect, it } from "vitest";

// Every rack operation's cases stay in one flat list beside the add cases they extend (0007).
// oxlint-disable max-lines, import/max-dependencies

import type { EffectInstanceId } from "@/audio/effects/contract";
import type { EffectId } from "@/audio/effects/registry";
import type { EffectParamValues } from "@/audio/params";
import type { SessionEffect } from "@/state/session";
import { fromDecks } from "@/state/store";
import { manualClock } from "./clock";
import type { Command, Envelope } from "./commands";
import type { Engine } from "./engine";
import type { Event } from "./events";
import { createInstrument, type Instrument } from "./facade";

/** What the rack was asked to do, in order — the graph half of every assertion below. */
type RackCalls = {
  added: [instance: EffectInstanceId, effect: EffectId][];
  bypassed: [instance: EffectInstanceId, bypassed: boolean][];
  removed: EffectInstanceId[];
  orders: EffectInstanceId[][];
};

const stubEngine = (
  addEffect: Engine["addEffect"] = () => 0,
  setParam: Engine["setParam"] = () => {},
  rack: Partial<Pick<Engine, "setEffectBypass" | "removeEffect" | "reorderEffects">> = {},
): Engine => ({
  addDeck: () => {},
  removeDeck: () => {},
  load: (_deck, source) => source.secs,
  loadBlob: () => Promise.resolve(1),
  play: () => {},
  playTogether: () => {},
  stop: () => {},
  planned: () => false,
  setLoop: () => null,
  setParam,
  setAutomation: () => {},
  addEffect,
  setEffectBypass: rack.setEffectBypass ?? (() => {}),
  removeEffect: rack.removeEffect ?? (() => {}),
  reorderEffects: rack.reorderEffects ?? (() => {}),
  peek: () => {},
  peaks: () => null,
  sourcePeaks: () =>
    Promise.resolve({ peaks: { min: new Float32Array(), max: new Float32Array() }, duration: 0 }),
  contextState: () => "running",
  analyzing: () => 0,
  prepareRestore: (session) =>
    Promise.resolve({
      durations: fromDecks(session.deckIds, () => 0),
      commit: () => {},
      measure: () => {},
      discard: () => {},
    }),
});

/** An instrument whose graph records the rack calls it was handed, in the order it got them. */
const rackInstrument = (): { instrument: Instrument; calls: RackCalls; events: Event[] } => {
  const calls: RackCalls = { added: [], bypassed: [], removed: [], orders: [] };
  const instrument = createInstrument(manualClock(), () =>
    stubEngine(
      (_deck, instance, effect) => {
        calls.added.push([instance, effect]);
        return calls.added.length - 1;
      },
      () => {},
      {
        setEffectBypass: (_deck, instance, bypassed) => {
          calls.bypassed.push([instance, bypassed]);
        },
        removeEffect: (_deck, instance) => {
          calls.removed.push(instance);
        },
        reorderEffects: (_deck, order) => {
          calls.orders.push([...order]);
        },
      },
    ),
  );
  const events: Event[] = [];
  instrument.on((event) => {
    events.push(event);
  });
  return { instrument, calls, events };
};

/** The rack a probe holds, as the pairs every assertion below is about. */
const rackOf = (instrument: Instrument): [EffectInstanceId, EffectId][] =>
  instrument.probe().decks.a!.effects.map((entry) => [entry.id, entry.effect]);

const instanceIn = (instrument: Instrument, instance: EffectInstanceId): SessionEffect => {
  const entry = instrument.probe().decks.a!.effects.find((current) => current.id === instance);
  if (entry === undefined) throw new Error(`deck a holds no instance ${instance}`);
  return entry;
};

const turns = async (): Promise<void> => {
  for (let remaining = 12; remaining > 0; remaining--) {
    // History restoration serializes graph preparation behind repository work.
    // oxlint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
};

const wire = (json: string): Command | Envelope => {
  // Parsed JSON deliberately stands outside the command union.
  // oxlint-disable-next-line no-unsafe-type-assertion
  return JSON.parse(json) as Command | Envelope;
};

// A flat list of the command's pinned success and refusal cases (0007).
// oxlint-disable-next-line max-lines-per-function
describe("effect.add", () => {
  it("appends instances in command order without an audio host", () => {
    const instrument = createInstrument(manualClock());
    const events: Event[] = [];
    instrument.on((event) => {
      events.push(event);
    });

    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "delay" });
    instrument.send({ t: "effect.add", deck: "a", id: "two", effect: "filter" });

    expect(rackOf(instrument)).toEqual([
      ["one", "delay"],
      ["two", "filter"],
    ]);
    expect(events).toMatchObject([
      { seq: 0, t: "effect.added", instance: "one", effect: "delay", index: 0 },
      { seq: 1, t: "effect.added", instance: "two", effect: "filter", index: 1 },
    ]);
  });

  // P13's proof at the command seam: an effect the rack already holds is added again, and the
  // two instances are two rows with two sets of values (0030).
  it("adds a second instance of an effect the rack already holds", () => {
    const { instrument, calls, events } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "delay" });
    instrument.send({ t: "effect.add", deck: "a", id: "two", effect: "delay" });

    expect(rackOf(instrument)).toEqual([
      ["one", "delay"],
      ["two", "delay"],
    ]);
    expect(calls.added).toEqual([
      ["one", "delay"],
      ["two", "delay"],
    ]);
    expect(events.some((event) => event.t === "error")).toBe(false);

    // One value lookup per (instance, param): moving the second delay's time leaves the first's.
    instrument.send({
      t: "param.set",
      deck: "a",
      instance: "two",
      param: "delay.time",
      value: 0.8,
    });
    expect(instanceIn(instrument, "one").params["delay.time"]).toBe(0.25);
    expect(instanceIn(instrument, "two").params["delay.time"]).toBe(0.8);
  });

  it("builds a fresh instance from its plugin's own declared defaults", () => {
    let initial: EffectParamValues | undefined;
    const instrument = createInstrument(manualClock(), () =>
      stubEngine((_deck, _instance, _effect, values) => {
        initial = values;
        return 0;
      }),
    );

    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });

    expect(initial?.["filter.cutoff"]).toBe(1_000);
    expect(instanceIn(instrument, "one").params["filter.cutoff"]).toBe(1_000);
  });

  it("reports a repeated instance id and leaves state and graph unchanged", () => {
    let additions = 0;
    const instrument = createInstrument(manualClock(), () => stubEngine(() => additions++));
    const events: Event[] = [];
    instrument.on((event) => {
      events.push(event);
    });

    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "delay" });
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });

    expect(additions).toBe(1);
    expect(rackOf(instrument)).toEqual([["one", "delay"]]);
    expect(events.at(-1)).toMatchObject({ t: "error", detail: /instance already held: one/u });
  });

  it("throws for an unknown effect id as malformed wire input", () => {
    const instrument = createInstrument(manualClock());
    expect(() => {
      instrument.send(wire('{"t":"effect.add","deck":"a","id":"one","effect":"nope"}'));
    }).toThrow(/unknown effect: nope/u);
    expect(rackOf(instrument)).toEqual([]);
  });

  it("throws for a missing instance id as malformed wire input", () => {
    const instrument = createInstrument(manualClock());
    expect(() => {
      instrument.send(wire('{"t":"effect.add","deck":"a","effect":"filter"}'));
    }).toThrow(/is not a non-empty string/u);
    expect(rackOf(instrument)).toEqual([]);
  });

  it("does not commit state when graph construction fails", () => {
    const instrument = createInstrument(manualClock(), () =>
      stubEngine(() => {
        throw new Error("graph refused");
      }),
    );

    expect(() => {
      instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    }).toThrow(/graph refused/u);
    expect(rackOf(instrument)).toEqual([]);
  });

  it("refuses a value for a parameter no held instance declares", () => {
    const { instrument, events } = rackInstrument();
    instrument.send({ t: "param.set", deck: "a", param: "delay.mix", value: 0.75 });
    expect(events.at(-1)).toMatchObject({ t: "error", detail: /delay\.mix is not on the deck/u });

    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "delay" });
    instrument.send({
      t: "param.set",
      deck: "a",
      instance: "two",
      param: "delay.mix",
      value: 0.75,
    });
    expect(events.at(-1)).toMatchObject({ t: "error", detail: /delay\.mix is not on two/u });
    // The right parameter on the wrong instance's effect is the same refusal.
    instrument.send({
      t: "param.set",
      deck: "a",
      instance: "one",
      param: "filter.cutoff",
      value: 400,
    });
    expect(events.at(-1)).toMatchObject({ t: "error", detail: /filter\.cutoff is not on one/u });
  });

  it("keeps probes JSON-safe after rack and parameter changes", () => {
    const instrument = createInstrument(manualClock(3));
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    instrument.send({
      t: "param.set",
      deck: "a",
      instance: "one",
      param: "filter.cutoff",
      value: 4,
    });
    const probe = instrument.probe();
    expect(JSON.parse(JSON.stringify(probe))).toEqual(probe);
  });
});

// A flat list of each rack operation's pinned success and refusal cases (0007, 0023).
// oxlint-disable-next-line max-lines-per-function
describe("effect.bypass", () => {
  it("keeps a bypassed instance's place in the rack and its parameter values", () => {
    const { instrument, calls, events } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    instrument.send({ t: "effect.add", deck: "a", id: "two", effect: "delay" });
    instrument.send({
      t: "param.set",
      deck: "a",
      instance: "one",
      param: "filter.cutoff",
      value: 240,
    });

    instrument.send({ t: "effect.bypass", deck: "a", instance: "one", bypassed: true });

    expect(rackOf(instrument)).toEqual([
      ["one", "filter"],
      ["two", "delay"],
    ]);
    expect(instanceIn(instrument, "one").bypassed).toBe(true);
    expect(instanceIn(instrument, "one").params["filter.cutoff"]).toBe(240);
    expect(calls.bypassed).toEqual([["one", true]]);
    expect(events.at(-1)).toMatchObject({
      t: "effect.bypass.changed",
      deck: "a",
      instance: "one",
      effect: "filter",
      bypassed: true,
    });
  });

  // P13's proof at the command seam: bypass is a flag on the instance, so two instances of one
  // effect are bypassed one at a time (0030).
  it("bypasses one of two instances of the same effect independently", () => {
    const { instrument, calls } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "delay" });
    instrument.send({ t: "effect.add", deck: "a", id: "two", effect: "delay" });

    instrument.send({ t: "effect.bypass", deck: "a", instance: "two", bypassed: true });

    expect(instanceIn(instrument, "one").bypassed).toBe(false);
    expect(instanceIn(instrument, "two").bypassed).toBe(true);
    expect(calls.bypassed).toEqual([["two", true]]);
  });

  it("does not commit state or an event when the graph refuses the rewire", () => {
    const instrument = createInstrument(manualClock(), () =>
      stubEngine(undefined, undefined, {
        setEffectBypass: () => {
          throw new Error("rewire refused");
        },
      }),
    );
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    const before = instrument.ring().length;

    expect(() => {
      instrument.send({ t: "effect.bypass", deck: "a", instance: "one", bypassed: true });
    }).toThrow(/rewire refused/u);
    expect(instanceIn(instrument, "one").bypassed).toBe(false);
    expect(instrument.ring().length).toBe(before);
  });

  it("reports an instance that is not in the rack and changes nothing", () => {
    const { instrument, calls, events } = rackInstrument();
    instrument.send({ t: "effect.bypass", deck: "a", instance: "one", bypassed: true });

    expect(calls.bypassed).toEqual([]);
    expect(rackOf(instrument)).toEqual([]);
    expect(events.at(-1)).toMatchObject({ t: "error", detail: /instance is not held: one/u });
  });

  it("is a silent no-op when the instance is already in the requested state", () => {
    const { instrument, calls, events } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    instrument.send({ t: "effect.bypass", deck: "a", instance: "one", bypassed: false });

    expect(calls.bypassed).toEqual([]);
    expect(events.filter((event) => event.t === "effect.bypass.changed")).toEqual([]);
  });

  it("throws for a non-boolean bypass flag as malformed wire input", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    expect(() => {
      instrument.send(wire('{"t":"effect.bypass","deck":"a","instance":"one","bypassed":"yes"}'));
    }).toThrow(/bypass is not a boolean/u);
  });
});

// oxlint-disable-next-line max-lines-per-function
describe("effect.remove", () => {
  it("removes from the rack and the graph, taking the instance's values with it", () => {
    const { instrument, calls, events } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    instrument.send({ t: "effect.add", deck: "a", id: "two", effect: "delay" });
    instrument.send({
      t: "param.set",
      deck: "a",
      instance: "two",
      param: "delay.mix",
      value: 0.75,
    });

    instrument.send({ t: "effect.remove", deck: "a", instance: "two" });

    expect(rackOf(instrument)).toEqual([["one", "filter"]]);
    expect(calls.removed).toEqual(["two"]);
    expect(events.at(-1)).toMatchObject({
      t: "effect.removed",
      deck: "a",
      instance: "two",
      effect: "delay",
      index: 1,
    });
  });

  it("leaves the other instance of the same effect entirely alone", () => {
    const { instrument } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "delay" });
    instrument.send({ t: "effect.add", deck: "a", id: "two", effect: "delay" });
    instrument.send({
      t: "param.set",
      deck: "a",
      instance: "one",
      param: "delay.mix",
      value: 0.75,
    });

    instrument.send({ t: "effect.remove", deck: "a", instance: "two" });

    expect(rackOf(instrument)).toEqual([["one", "delay"]]);
    expect(instanceIn(instrument, "one").params["delay.mix"]).toBe(0.75);
  });

  it("does not commit state when the graph refuses the removal", () => {
    const instrument = createInstrument(manualClock(), () =>
      stubEngine(undefined, undefined, {
        removeEffect: () => {
          throw new Error("removal refused");
        },
      }),
    );
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });

    expect(() => {
      instrument.send({ t: "effect.remove", deck: "a", instance: "one" });
    }).toThrow(/removal refused/u);
    expect(rackOf(instrument)).toEqual([["one", "filter"]]);
  });

  it("reports removing an instance that is not in the rack", () => {
    const { instrument, calls, events } = rackInstrument();
    instrument.send({ t: "effect.remove", deck: "a", instance: "two" });

    expect(calls.removed).toEqual([]);
    expect(events.at(-1)).toMatchObject({ t: "error", detail: /instance is not held: two/u });
  });
});

// oxlint-disable-next-line max-lines-per-function
describe("effect.reorder", () => {
  it("moves an instance and hands the graph the resulting order first", () => {
    const { instrument, calls, events } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    instrument.send({ t: "effect.add", deck: "a", id: "two", effect: "delay" });

    instrument.send({ t: "effect.reorder", deck: "a", instance: "two", index: 0 });

    expect(rackOf(instrument)).toEqual([
      ["two", "delay"],
      ["one", "filter"],
    ]);
    expect(calls.orders).toEqual([["two", "one"]]);
    expect(events.at(-1)).toMatchObject({
      t: "effect.reordered",
      deck: "a",
      instance: "two",
      effect: "delay",
      from: 1,
      to: 0,
    });
  });

  it("reorders two instances of one effect past each other", () => {
    const { instrument } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "delay" });
    instrument.send({ t: "effect.add", deck: "a", id: "two", effect: "delay" });

    instrument.send({ t: "effect.reorder", deck: "a", instance: "two", index: 0 });

    expect(rackOf(instrument)).toEqual([
      ["two", "delay"],
      ["one", "delay"],
    ]);
  });

  it("clamps an index past the end of the rack, like a parameter out of range", () => {
    const { instrument } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    instrument.send({ t: "effect.add", deck: "a", id: "two", effect: "delay" });

    instrument.send({ t: "effect.reorder", deck: "a", instance: "one", index: 9 });

    expect(rackOf(instrument)).toEqual([
      ["two", "delay"],
      ["one", "filter"],
    ]);
  });

  it("is a silent no-op when the instance is already at that index", () => {
    const { instrument, calls, events } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    instrument.send({ t: "effect.reorder", deck: "a", instance: "one", index: 0 });

    expect(calls.orders).toEqual([]);
    expect(events.filter((event) => event.t === "effect.reordered")).toEqual([]);
  });

  it("throws for a non-integer index as malformed wire input", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    expect(() => {
      instrument.send(wire('{"t":"effect.reorder","deck":"a","instance":"one","index":0.5}'));
    }).toThrow(/index is not an integer/u);
  });

  it("does not commit state when the graph refuses the reorder", () => {
    const instrument = createInstrument(manualClock(), () =>
      stubEngine(undefined, undefined, {
        reorderEffects: () => {
          throw new Error("reorder refused");
        },
      }),
    );
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    instrument.send({ t: "effect.add", deck: "a", id: "two", effect: "delay" });

    expect(() => {
      instrument.send({ t: "effect.reorder", deck: "a", instance: "two", index: 0 });
    }).toThrow(/reorder refused/u);
    expect(rackOf(instrument)).toEqual([
      ["one", "filter"],
      ["two", "delay"],
    ]);
  });
});

// oxlint-disable-next-line max-lines-per-function
describe("rack operations under history", () => {
  it("undoes and redoes each operation as one atomic transaction", async () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    instrument.send({ t: "effect.add", deck: "a", id: "two", effect: "delay" });
    instrument.send({ t: "effect.bypass", deck: "a", instance: "one", bypassed: true });
    instrument.send({ t: "effect.reorder", deck: "a", instance: "two", index: 0 });
    instrument.send({ t: "effect.remove", deck: "a", instance: "two" });
    expect(rackOf(instrument)).toEqual([["one", "filter"]]);

    instrument.send({ t: "history.undo" });
    await turns();
    expect(rackOf(instrument)).toEqual([
      ["two", "delay"],
      ["one", "filter"],
    ]);

    instrument.send({ t: "history.undo" });
    await turns();
    expect(rackOf(instrument)).toEqual([
      ["one", "filter"],
      ["two", "delay"],
    ]);
    expect(instanceIn(instrument, "one").bypassed).toBe(true);

    instrument.send({ t: "history.undo" });
    await turns();
    expect(instanceIn(instrument, "one").bypassed).toBe(false);

    instrument.send({ t: "history.redo" });
    await turns();
    expect(instanceIn(instrument, "one").bypassed).toBe(true);
    instrument.send({ t: "history.redo" });
    await turns();
    instrument.send({ t: "history.redo" });
    await turns();
    expect(rackOf(instrument)).toEqual([["one", "filter"]]);
    expect(instanceIn(instrument, "one").bypassed).toBe(true);
  });

  it("commits an ordered group of rack operations as one entry", async () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    instrument.send({
      t: "history.group",
      commands: [
        { t: "effect.add", deck: "a", id: "two", effect: "delay" },
        { t: "effect.reorder", deck: "a", instance: "two", index: 0 },
        { t: "effect.bypass", deck: "a", instance: "two", bypassed: true },
      ],
    });
    await turns();
    expect(rackOf(instrument)).toEqual([
      ["two", "delay"],
      ["one", "filter"],
    ]);

    instrument.send({ t: "history.undo" });
    await turns();
    expect(rackOf(instrument)).toEqual([["one", "filter"]]);
  });
});

// P6's seam assertion: the EQ arrived as one plugin file, so every rack operation it needs
// already exists. Nothing below names a command, event or field the other effects do not use.
// oxlint-disable-next-line max-lines-per-function
describe("the parametric EQ through the generic surface", () => {
  it("adds, bypasses, reorders, removes and undoes with no EQ-specific command", async () => {
    const { instrument, calls, events } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    instrument.send({ t: "effect.add", deck: "a", id: "two", effect: "eq" });
    instrument.send({ t: "param.set", deck: "a", instance: "two", param: "eq.q", value: 6 });
    instrument.send({ t: "param.set", deck: "a", instance: "two", param: "eq.gain", value: -18 });
    instrument.send({ t: "effect.reorder", deck: "a", instance: "two", index: 0 });
    instrument.send({ t: "effect.bypass", deck: "a", instance: "two", bypassed: true });

    expect(calls.added).toEqual([
      ["one", "filter"],
      ["two", "eq"],
    ]);
    expect(calls.orders).toEqual([["two", "one"]]);
    expect(calls.bypassed).toEqual([["two", true]]);
    expect(rackOf(instrument)).toEqual([
      ["two", "eq"],
      ["one", "filter"],
    ]);
    expect(instanceIn(instrument, "two").bypassed).toBe(true);
    // Values set after activation survive the rewiring, like every other plugin's.
    expect(instanceIn(instrument, "two").params["eq.q"]).toBe(6);
    expect(instanceIn(instrument, "two").params["eq.gain"]).toBe(-18);

    instrument.send({ t: "effect.remove", deck: "a", instance: "two" });
    expect(calls.removed).toEqual(["two"]);
    expect(rackOf(instrument)).toEqual([["one", "filter"]]);

    instrument.send({ t: "history.undo" });
    await turns();
    expect(rackOf(instrument)).toEqual([
      ["two", "eq"],
      ["one", "filter"],
    ]);
    expect(instanceIn(instrument, "two").bypassed).toBe(true);
    instrument.send({ t: "history.redo" });
    await turns();
    expect(rackOf(instrument)).toEqual([["one", "filter"]]);

    expect(events.some((event) => event.t === "error")).toBe(false);
  });

  it("clamps each of its parameters into the range its own declaration states", () => {
    const { instrument } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "eq" });
    instrument.send({ t: "param.set", deck: "a", instance: "one", param: "eq.gain", value: 400 });
    instrument.send({
      t: "param.set",
      deck: "a",
      instance: "one",
      param: "eq.frequency",
      value: 0,
    });
    instrument.send({ t: "param.set", deck: "a", instance: "one", param: "eq.q", value: -3 });

    const params = instanceIn(instrument, "one").params;
    expect(params["eq.gain"]).toBe(24);
    expect(params["eq.frequency"]).toBe(20);
    expect(params["eq.q"]).toBe(0.1);
    // The first automatable range with a negative floor, so its lower bound has to hold as hard.
    instrument.send({ t: "param.set", deck: "a", instance: "one", param: "eq.gain", value: -400 });
    expect(instanceIn(instrument, "one").params["eq.gain"]).toBe(-24);
  });
});
