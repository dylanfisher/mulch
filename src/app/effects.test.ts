import { describe, expect, it } from "vitest";

// Every rack operation's cases stay in one flat list beside the add cases they extend (0007).
// oxlint-disable max-lines

import type { EffectId } from "@/audio/effects/registry";
import type { ParamId } from "@/audio/params";
import { manualClock } from "./clock";
import type { Command, Envelope } from "./commands";
import type { Engine } from "./engine";
import type { Event } from "./events";
import { createInstrument, type Instrument } from "./facade";

/** What the rack was asked to do, in order — the graph half of every assertion below. */
type RackCalls = {
  added: EffectId[];
  bypassed: [effect: EffectId, bypassed: boolean][];
  removed: EffectId[];
  orders: EffectId[][];
};

const stubEngine = (
  addEffect: Engine["addEffect"] = () => 0,
  setParam: Engine["setParam"] = () => {},
  rack: Partial<Pick<Engine, "setEffectBypass" | "removeEffect" | "reorderEffects">> = {},
): Engine => ({
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
  contextState: () => "running",
  analyzing: () => 0,
  prepareRestore: () =>
    Promise.resolve({ durations: { a: 0, b: 0 }, commit: () => {}, discard: () => {} }),
});

/** An instrument whose graph records the rack calls it was handed, in the order it got them. */
const rackInstrument = (): { instrument: Instrument; calls: RackCalls; events: Event[] } => {
  const calls: RackCalls = { added: [], bypassed: [], removed: [], orders: [] };
  const instrument = createInstrument(manualClock(), () =>
    stubEngine(
      (_deck, effect) => {
        calls.added.push(effect);
        return calls.added.length - 1;
      },
      () => {},
      {
        setEffectBypass: (_deck, effect, bypassed) => {
          calls.bypassed.push([effect, bypassed]);
        },
        removeEffect: (_deck, effect) => {
          calls.removed.push(effect);
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
  it("appends effects in command order without an audio host", () => {
    const instrument = createInstrument(manualClock());
    const events: Event[] = [];
    instrument.on((event) => {
      events.push(event);
    });

    instrument.send({ t: "effect.add", deck: "a", effect: "delay" });
    instrument.send({ t: "effect.add", deck: "a", effect: "filter" });

    expect(instrument.probe().decks.a.effects).toEqual(["delay", "filter"]);
    expect(events).toMatchObject([
      { seq: 0, t: "effect.added", effect: "delay", index: 0 },
      { seq: 1, t: "effect.added", effect: "filter", index: 1 },
    ]);
  });

  it("keeps inactive effect values and gives them to graph construction", () => {
    let initial: Readonly<Record<ParamId, number>> | undefined;
    const instrument = createInstrument(manualClock(), () =>
      stubEngine((_deck, _effect, values) => {
        initial = values;
        return 0;
      }),
    );

    instrument.send({ t: "param.set", deck: "a", param: "filter.cutoff", value: 240 });
    expect(instrument.probe().decks.a.effects).toEqual([]);
    instrument.send({ t: "effect.add", deck: "a", effect: "filter" });

    expect(initial?.["filter.cutoff"]).toBe(240);
    expect(instrument.probe().decks.a.effects).toEqual(["filter"]);
  });

  it("reports a duplicate and leaves state and graph unchanged", () => {
    let additions = 0;
    const instrument = createInstrument(manualClock(), () => stubEngine(() => additions++));
    const events: Event[] = [];
    instrument.on((event) => {
      events.push(event);
    });

    instrument.send({ t: "effect.add", deck: "a", effect: "delay" });
    instrument.send({ t: "effect.add", deck: "a", effect: "delay" });

    expect(additions).toBe(1);
    expect(instrument.probe().decks.a.effects).toEqual(["delay"]);
    expect(events.at(-1)).toMatchObject({ t: "error", detail: /effect already active: delay/u });
  });

  it("throws for an unknown effect id as malformed wire input", () => {
    const instrument = createInstrument(manualClock());
    expect(() => {
      instrument.send(wire('{"t":"effect.add","deck":"a","effect":"nope"}'));
    }).toThrow(/unknown effect: nope/u);
    expect(instrument.probe().decks.a.effects).toEqual([]);
  });

  it("does not commit state when graph construction fails", () => {
    const instrument = createInstrument(manualClock(), () =>
      stubEngine(() => {
        throw new Error("graph refused");
      }),
    );

    expect(() => {
      instrument.send({ t: "effect.add", deck: "a", effect: "filter" });
    }).toThrow(/graph refused/u);
    expect(instrument.probe().decks.a.effects).toEqual([]);
  });

  it("keeps probes JSON-safe after effect and inactive parameter changes", () => {
    const instrument = createInstrument(manualClock(3));
    instrument.send({ t: "effect.add", deck: "a", effect: "filter" });
    instrument.send({ t: "param.set", deck: "a", param: "delay.mix", value: 0.75 });
    const probe = instrument.probe();
    expect(JSON.parse(JSON.stringify(probe))).toEqual(probe);
  });
});

// A flat list of each rack operation's pinned success and refusal cases (0007, 0023).
// oxlint-disable-next-line max-lines-per-function
describe("effect.bypass", () => {
  it("keeps a bypassed effect's place in the rack and its parameter values", () => {
    const { instrument, calls, events } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", effect: "filter" });
    instrument.send({ t: "effect.add", deck: "a", effect: "delay" });
    instrument.send({ t: "param.set", deck: "a", param: "filter.cutoff", value: 240 });

    instrument.send({ t: "effect.bypass", deck: "a", effect: "filter", bypassed: true });

    const deck = instrument.probe().decks.a;
    expect(deck.effects).toEqual(["filter", "delay"]);
    expect(deck.bypassed).toEqual(["filter"]);
    expect(deck.params["filter.cutoff"]).toBe(240);
    expect(calls.bypassed).toEqual([["filter", true]]);
    expect(events.at(-1)).toMatchObject({
      t: "effect.bypass.changed",
      deck: "a",
      effect: "filter",
      bypassed: true,
    });
  });

  it("records bypass in rack order however the commands arrive", () => {
    const { instrument } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", effect: "filter" });
    instrument.send({ t: "effect.add", deck: "a", effect: "delay" });

    instrument.send({ t: "effect.bypass", deck: "a", effect: "delay", bypassed: true });
    instrument.send({ t: "effect.bypass", deck: "a", effect: "filter", bypassed: true });

    expect(instrument.probe().decks.a.bypassed).toEqual(["filter", "delay"]);
  });

  it("does not commit state or an event when the graph refuses the rewire", () => {
    const instrument = createInstrument(manualClock(), () =>
      stubEngine(undefined, undefined, {
        setEffectBypass: () => {
          throw new Error("rewire refused");
        },
      }),
    );
    instrument.send({ t: "effect.add", deck: "a", effect: "filter" });
    const before = instrument.ring().length;

    expect(() => {
      instrument.send({ t: "effect.bypass", deck: "a", effect: "filter", bypassed: true });
    }).toThrow(/rewire refused/u);
    expect(instrument.probe().decks.a.bypassed).toEqual([]);
    expect(instrument.ring().length).toBe(before);
  });

  it("reports an effect that is not in the rack and changes nothing", () => {
    const { instrument, calls, events } = rackInstrument();
    instrument.send({ t: "effect.bypass", deck: "a", effect: "filter", bypassed: true });

    expect(calls.bypassed).toEqual([]);
    expect(instrument.probe().decks.a.bypassed).toEqual([]);
    expect(events.at(-1)).toMatchObject({ t: "error", detail: /effect is not active: filter/u });
  });

  it("is a silent no-op when the effect is already in the requested state", () => {
    const { instrument, calls, events } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", effect: "filter" });
    instrument.send({ t: "effect.bypass", deck: "a", effect: "filter", bypassed: false });

    expect(calls.bypassed).toEqual([]);
    expect(events.filter((event) => event.t === "effect.bypass.changed")).toEqual([]);
  });

  it("throws for a non-boolean bypass flag as malformed wire input", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", effect: "filter" });
    expect(() => {
      instrument.send(wire('{"t":"effect.bypass","deck":"a","effect":"filter","bypassed":"yes"}'));
    }).toThrow(/bypass is not a boolean/u);
  });
});

// oxlint-disable-next-line max-lines-per-function
describe("effect.remove", () => {
  it("removes from the rack and the graph, keeping every parameter value", () => {
    const { instrument, calls, events } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", effect: "filter" });
    instrument.send({ t: "effect.add", deck: "a", effect: "delay" });
    instrument.send({ t: "param.set", deck: "a", param: "delay.mix", value: 0.75 });

    instrument.send({ t: "effect.remove", deck: "a", effect: "delay" });

    const deck = instrument.probe().decks.a;
    expect(deck.effects).toEqual(["filter"]);
    expect(deck.params["delay.mix"]).toBe(0.75);
    expect(calls.removed).toEqual(["delay"]);
    expect(events.at(-1)).toMatchObject({
      t: "effect.removed",
      deck: "a",
      effect: "delay",
      index: 1,
    });
  });

  it("drops a removed effect from the bypass list", () => {
    const { instrument } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", effect: "filter" });
    instrument.send({ t: "effect.add", deck: "a", effect: "delay" });
    instrument.send({ t: "effect.bypass", deck: "a", effect: "filter", bypassed: true });
    instrument.send({ t: "effect.bypass", deck: "a", effect: "delay", bypassed: true });

    instrument.send({ t: "effect.remove", deck: "a", effect: "filter" });

    expect(instrument.probe().decks.a.bypassed).toEqual(["delay"]);
  });

  it("does not commit state when the graph refuses the removal", () => {
    const instrument = createInstrument(manualClock(), () =>
      stubEngine(undefined, undefined, {
        removeEffect: () => {
          throw new Error("removal refused");
        },
      }),
    );
    instrument.send({ t: "effect.add", deck: "a", effect: "filter" });

    expect(() => {
      instrument.send({ t: "effect.remove", deck: "a", effect: "filter" });
    }).toThrow(/removal refused/u);
    expect(instrument.probe().decks.a.effects).toEqual(["filter"]);
  });

  it("reports removing an effect that is not in the rack", () => {
    const { instrument, calls, events } = rackInstrument();
    instrument.send({ t: "effect.remove", deck: "a", effect: "delay" });

    expect(calls.removed).toEqual([]);
    expect(events.at(-1)).toMatchObject({ t: "error", detail: /effect is not active: delay/u });
  });
});

// oxlint-disable-next-line max-lines-per-function
describe("effect.reorder", () => {
  it("moves an effect and hands the graph the resulting order first", () => {
    const { instrument, calls, events } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", effect: "filter" });
    instrument.send({ t: "effect.add", deck: "a", effect: "delay" });

    instrument.send({ t: "effect.reorder", deck: "a", effect: "delay", index: 0 });

    expect(instrument.probe().decks.a.effects).toEqual(["delay", "filter"]);
    expect(calls.orders).toEqual([["delay", "filter"]]);
    expect(events.at(-1)).toMatchObject({
      t: "effect.reordered",
      deck: "a",
      effect: "delay",
      from: 1,
      to: 0,
    });
  });

  it("keeps the bypass list in the reordered rack's order", () => {
    const { instrument } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", effect: "filter" });
    instrument.send({ t: "effect.add", deck: "a", effect: "delay" });
    instrument.send({ t: "effect.bypass", deck: "a", effect: "filter", bypassed: true });
    instrument.send({ t: "effect.bypass", deck: "a", effect: "delay", bypassed: true });

    instrument.send({ t: "effect.reorder", deck: "a", effect: "delay", index: 0 });

    expect(instrument.probe().decks.a.bypassed).toEqual(["delay", "filter"]);
  });

  it("clamps an index past the end of the rack, like a parameter out of range", () => {
    const { instrument } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", effect: "filter" });
    instrument.send({ t: "effect.add", deck: "a", effect: "delay" });

    instrument.send({ t: "effect.reorder", deck: "a", effect: "filter", index: 9 });

    expect(instrument.probe().decks.a.effects).toEqual(["delay", "filter"]);
  });

  it("is a silent no-op when the effect is already at that index", () => {
    const { instrument, calls, events } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", effect: "filter" });
    instrument.send({ t: "effect.reorder", deck: "a", effect: "filter", index: 0 });

    expect(calls.orders).toEqual([]);
    expect(events.filter((event) => event.t === "effect.reordered")).toEqual([]);
  });

  it("throws for a non-integer index as malformed wire input", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", effect: "filter" });
    expect(() => {
      instrument.send(wire('{"t":"effect.reorder","deck":"a","effect":"filter","index":0.5}'));
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
    instrument.send({ t: "effect.add", deck: "a", effect: "filter" });
    instrument.send({ t: "effect.add", deck: "a", effect: "delay" });

    expect(() => {
      instrument.send({ t: "effect.reorder", deck: "a", effect: "delay", index: 0 });
    }).toThrow(/reorder refused/u);
    expect(instrument.probe().decks.a.effects).toEqual(["filter", "delay"]);
  });
});

// oxlint-disable-next-line max-lines-per-function
describe("rack operations under history", () => {
  it("undoes and redoes each operation as one atomic transaction", async () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", effect: "filter" });
    instrument.send({ t: "effect.add", deck: "a", effect: "delay" });
    instrument.send({ t: "effect.bypass", deck: "a", effect: "filter", bypassed: true });
    instrument.send({ t: "effect.reorder", deck: "a", effect: "delay", index: 0 });
    instrument.send({ t: "effect.remove", deck: "a", effect: "delay" });
    expect(instrument.probe().decks.a.effects).toEqual(["filter"]);

    instrument.send({ t: "history.undo" });
    await turns();
    expect(instrument.probe().decks.a.effects).toEqual(["delay", "filter"]);

    instrument.send({ t: "history.undo" });
    await turns();
    expect(instrument.probe().decks.a.effects).toEqual(["filter", "delay"]);
    expect(instrument.probe().decks.a.bypassed).toEqual(["filter"]);

    instrument.send({ t: "history.undo" });
    await turns();
    expect(instrument.probe().decks.a.bypassed).toEqual([]);

    instrument.send({ t: "history.redo" });
    await turns();
    expect(instrument.probe().decks.a.bypassed).toEqual(["filter"]);
    instrument.send({ t: "history.redo" });
    await turns();
    instrument.send({ t: "history.redo" });
    await turns();
    expect(instrument.probe().decks.a.effects).toEqual(["filter"]);
    expect(instrument.probe().decks.a.bypassed).toEqual(["filter"]);
  });

  it("commits an ordered group of rack operations as one entry", async () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", effect: "filter" });
    instrument.send({
      t: "history.group",
      commands: [
        { t: "effect.add", deck: "a", effect: "delay" },
        { t: "effect.reorder", deck: "a", effect: "delay", index: 0 },
        { t: "effect.bypass", deck: "a", effect: "delay", bypassed: true },
      ],
    });
    await turns();
    expect(instrument.probe().decks.a.effects).toEqual(["delay", "filter"]);

    instrument.send({ t: "history.undo" });
    await turns();
    expect(instrument.probe().decks.a.effects).toEqual(["filter"]);
    expect(instrument.probe().decks.a.bypassed).toEqual([]);
  });
});

// P6's seam assertion: the EQ arrived as one plugin file, so every rack operation it needs
// already exists. Nothing below names a command, event or field the other effects do not use.
describe("the parametric EQ through the generic surface", () => {
  it("adds, bypasses, reorders, removes and undoes with no EQ-specific command", async () => {
    const { instrument, calls, events } = rackInstrument();
    instrument.send({ t: "param.set", deck: "a", param: "eq.q", value: 6 });
    instrument.send({ t: "effect.add", deck: "a", effect: "filter" });
    instrument.send({ t: "effect.add", deck: "a", effect: "eq" });
    instrument.send({ t: "param.set", deck: "a", param: "eq.gain", value: -18 });
    instrument.send({ t: "effect.reorder", deck: "a", effect: "eq", index: 0 });
    instrument.send({ t: "effect.bypass", deck: "a", effect: "eq", bypassed: true });

    expect(calls.added).toEqual(["filter", "eq"]);
    expect(calls.orders).toEqual([["eq", "filter"]]);
    expect(calls.bypassed).toEqual([["eq", true]]);
    expect(instrument.probe().decks.a.effects).toEqual(["eq", "filter"]);
    expect(instrument.probe().decks.a.bypassed).toEqual(["eq"]);
    // Values set before and after activation survive the rewiring, like every other plugin's.
    expect(instrument.probe().decks.a.params["eq.q"]).toBe(6);
    expect(instrument.probe().decks.a.params["eq.gain"]).toBe(-18);

    instrument.send({ t: "effect.remove", deck: "a", effect: "eq" });
    expect(calls.removed).toEqual(["eq"]);
    expect(instrument.probe().decks.a.effects).toEqual(["filter"]);
    expect(instrument.probe().decks.a.params["eq.gain"]).toBe(-18);

    instrument.send({ t: "history.undo" });
    await turns();
    expect(instrument.probe().decks.a.effects).toEqual(["eq", "filter"]);
    expect(instrument.probe().decks.a.bypassed).toEqual(["eq"]);
    instrument.send({ t: "history.redo" });
    await turns();
    expect(instrument.probe().decks.a.effects).toEqual(["filter"]);

    expect(events.some((event) => event.t === "error")).toBe(false);
  });

  it("clamps each of its parameters into the range its own declaration states", () => {
    const { instrument } = rackInstrument();
    instrument.send({ t: "param.set", deck: "a", param: "eq.gain", value: 400 });
    instrument.send({ t: "param.set", deck: "a", param: "eq.frequency", value: 0 });
    instrument.send({ t: "param.set", deck: "a", param: "eq.q", value: -3 });

    const params = instrument.probe().decks.a.params;
    expect(params["eq.gain"]).toBe(24);
    expect(params["eq.frequency"]).toBe(20);
    expect(params["eq.q"]).toBe(0.1);
    // The first automatable range with a negative floor, so its lower bound has to hold as hard.
    instrument.send({ t: "param.set", deck: "a", param: "eq.gain", value: -400 });
    expect(instrument.probe().decks.a.params["eq.gain"]).toBe(-24);
  });
});
