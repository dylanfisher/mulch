/**
 * @role Command-chain tests for the rack that is no yard's: every rack command reaching it at
 *   `deck: null`, the guard that refuses an address with no instance beside it, and everything
 *   `effect.move` carries between two racks (0320, 0321).
 * @instead The same commands at a yard's address → src/app/effects.test.ts. What a copy carries,
 *   which a move deliberately does not repeat → src/app/effectDuplicate.test.ts.
 */
import { describe, expect, it } from "vitest";

import type { EffectInstanceId } from "@/audio/effects/contract";
import type { EffectId } from "@/audio/effects/registry";
import type { RackId } from "@/state/store";
import { manualClock } from "./clock";
import { silentEngine } from "./engineDouble";
import type { Event } from "./events";
import { createInstrument, type Instrument } from "./facade";

/** Which rack the graph was told about, beside what it was told — the whole point of the step. */
type RackCalls = {
  added: [rack: RackId, instance: EffectInstanceId, effect: EffectId][];
  removed: [rack: RackId, instance: EffectInstanceId][];
  bypassed: [rack: RackId, instance: EffectInstanceId, bypassed: boolean][];
  orders: [rack: RackId, order: EffectInstanceId[]][];
};

const rackInstrument = (): { instrument: Instrument; calls: RackCalls; events: Event[] } => {
  const calls: RackCalls = { added: [], removed: [], bypassed: [], orders: [] };
  const instrument = createInstrument(manualClock(), () =>
    silentEngine({
      addEffect: (deck, instance, effect) => {
        calls.added.push([deck, instance, effect]);
        return calls.added.length - 1;
      },
      removeEffect: (deck, instance) => {
        calls.removed.push([deck, instance]);
      },
      setEffectBypass: (deck, instance, bypassed) => {
        calls.bypassed.push([deck, instance, bypassed]);
      },
      reorderEffects: (deck, order) => {
        calls.orders.push([deck, [...order]]);
      },
    }),
  );
  const events: Event[] = [];
  instrument.on((event) => {
    events.push(event);
  });
  return { instrument, calls, events };
};

/** The master rack a probe holds, as the pairs every assertion below is about. */
const masterOf = (instrument: Instrument): [EffectInstanceId, EffectId][] =>
  instrument.probe().master.effects.map((entry) => [entry.id, entry.effect]);

const yardOf = (instrument: Instrument): [EffectInstanceId, EffectId][] =>
  instrument.probe().decks.a!.effects.map((entry) => [entry.id, entry.effect]);

/** What one refusal said, or a throw naming what arrived instead of one. */
const errorOf = (event: Event | undefined): string => {
  if (event?.t !== "error") throw new Error(`not a refusal: ${String(event?.t)}`);
  return event.detail;
};

const turns = async (): Promise<void> => {
  for (let remaining = 12; remaining > 0; remaining--) {
    // History restoration serializes graph preparation behind repository work.
    // oxlint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
};

// One flat list: every rack command said at the one address that names no yard (0320).
// oxlint-disable-next-line max-lines-per-function
describe("a rack addressed with null", () => {
  it("adds, bypasses, reorders and removes on the master, leaving every yard alone", () => {
    const { instrument, calls, events } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", id: "yard", effect: "delay" });
    instrument.send({ t: "effect.add", deck: null, id: "one", effect: "delay" });
    instrument.send({ t: "effect.add", deck: null, id: "two", effect: "eq" });
    instrument.send({ t: "effect.bypass", deck: null, instance: "one", bypassed: true });
    instrument.send({ t: "effect.reorder", deck: null, instance: "two", index: 0 });
    instrument.send({ t: "effect.remove", deck: null, instance: "one" });

    expect(masterOf(instrument)).toEqual([["two", "eq"]]);
    // The yard's rack is a different rack, and nothing said at the master's address reached it.
    expect(yardOf(instrument)).toEqual([["yard", "delay"]]);
    expect(calls.added).toEqual([
      ["a", "yard", "delay"],
      [null, "one", "delay"],
      [null, "two", "eq"],
    ]);
    expect(calls.bypassed).toEqual([[null, "one", true]]);
    expect(calls.orders).toEqual([[null, ["two", "one"]]]);
    expect(calls.removed).toEqual([[null, "one"]]);
    expect(events.filter((event) => event.t === "effect.added")).toMatchObject([
      { deck: "a", instance: "yard" },
      { deck: null, instance: "one" },
      { deck: null, instance: "two" },
    ]);
  });

  // The one rack command whose reducer does not go through `targetOf`, and it narrows at its own
  // top for the same reason: a refusal is on the log, never thrown at whoever sent it (0023).
  it("refuses a span at the master's own address on the log rather than throwing", () => {
    const { instrument, events } = rackInstrument();
    expect(() => {
      instrument.send({ t: "automation.span", deck: null, param: "deck.gain", span: 2 });
    }).not.toThrow();
    expect(errorOf(events.at(-1))).toContain("master");
  });

  it("holds a value and a lane on a master instance, and refuses one on the rack itself", () => {
    const { instrument } = rackInstrument();
    instrument.send({ t: "effect.add", deck: null, id: "one", effect: "delay" });
    instrument.send({
      t: "param.set",
      deck: null,
      instance: "one",
      param: "delay.time",
      value: 0.4,
    });
    instrument.send({
      t: "automation.set",
      deck: null,
      instance: "one",
      param: "delay.mix",
      points: [
        { at: 0, value: 0 },
        { at: 1, value: 1 },
      ],
    });
    const held = instrument.probe().master.effects[0]!;
    expect(held.params["delay.time"]).toBe(0.4);
    expect(held.automation["delay.mix"]).toHaveLength(2);

    // A rack that is no yard's holds no parameter of its own, so an address with no instance
    // beside it names nothing — refused on the log rather than written onto the master (0321).
    const events: Event[] = [];
    instrument.on((event) => {
      events.push(event);
    });
    instrument.send({ t: "param.set", deck: null, param: "deck.gain", value: 0.5 });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ t: "error" });
    expect(errorOf(events[0])).toContain("master");
  });
});

// What a move carries and what it refuses — one command, one history entry (0320).
// oxlint-disable-next-line max-lines-per-function
describe("effect.move", () => {
  it("carries the instance's values, lanes and bypass, and lands it at the index asked for", async () => {
    const { instrument, calls } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "delay" });
    instrument.send({ t: "param.set", deck: "a", instance: "one", param: "delay.mix", value: 0.6 });
    instrument.send({
      t: "automation.set",
      deck: "a",
      instance: "one",
      param: "delay.feedback",
      points: [
        { at: 0, value: 0.2 },
        { at: 1, value: 0.8 },
      ],
    });
    instrument.send({ t: "effect.bypass", deck: "a", instance: "one", bypassed: true });
    // Something already on the master, so the index a move asks for is a place and not the only
    // slot there is.
    instrument.send({ t: "effect.add", deck: null, id: "standing", effect: "eq" });

    instrument.send({ t: "effect.move", from: "a", to: null, instance: "one", index: 0 });
    await turns();

    expect(yardOf(instrument)).toEqual([]);
    expect(masterOf(instrument)).toEqual([
      ["one", "delay"],
      ["standing", "eq"],
    ]);
    const moved = instrument.probe().master.effects[0]!;
    // The same instance, whole: its id, its values, its lane and its switch.
    expect(moved.params["delay.mix"]).toBe(0.6);
    expect(moved.automation["delay.feedback"]).toHaveLength(2);
    expect(moved.bypassed).toBe(true);
    // The graph was told both halves: gone from the one rack, built in the other.
    expect(calls.removed).toContainEqual(["a", "one"]);
    expect(calls.added).toContainEqual([null, "one", "delay"]);
  });

  // The one thing only a growable entry carries, said on the one entry that grows (0208).
  it("carries the window a hand put on what the moved instance may draw", async () => {
    const { instrument } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", id: "auto", effect: "automator" });
    instrument.send({
      t: "effect.bounds",
      deck: "a",
      instance: "auto",
      param: "eq.frequency",
      bounds: { min: 60, max: 90 },
    });

    instrument.send({ t: "effect.move", from: "a", to: null, instance: "auto", index: 0 });
    await turns();

    expect(instrument.probe().master.effects[0]!.bounds["eq.frequency"]).toEqual({
      min: 60,
      max: 90,
    });
  });

  it("comes back to the rack it left in one undo", async () => {
    const { instrument } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "delay" });
    instrument.send({ t: "param.set", deck: "a", instance: "one", param: "delay.mix", value: 0.7 });
    instrument.send({ t: "effect.move", from: "a", to: null, instance: "one", index: 0 });
    await turns();
    expect(masterOf(instrument)).toEqual([["one", "delay"]]);

    instrument.send({ t: "history.undo" });
    await turns();
    expect(masterOf(instrument)).toEqual([]);
    expect(yardOf(instrument)).toEqual([["one", "delay"]]);
    expect(instrument.probe().decks.a!.effects[0]!.params["delay.mix"]).toBe(0.7);
  });

  // The expansion is async, so a refusal lands on the log rather than on the caller — exactly
  // where a copy's guards land (0078, 0092).
  it("refuses a move into the rack the instance is already in", async () => {
    const { instrument, calls, events } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "delay" });
    instrument.send({ t: "effect.move", from: "a", to: "a", instance: "one", index: 0 });
    await turns();
    expect(yardOf(instrument)).toEqual([["one", "delay"]]);
    expect(calls.removed).toEqual([]);
    expect(errorOf(events.at(-1))).toContain("reorder");
  });

  it("refuses a yard the session does not hold, at either end", async () => {
    const { instrument, calls, events } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "delay" });
    instrument.send({ t: "effect.move", from: "a", to: "z", instance: "one", index: 0 });
    await turns();
    expect(errorOf(events.at(-1))).toContain("z");
    instrument.send({ t: "effect.move", from: "z", to: null, instance: "one", index: 0 });
    await turns();
    expect(errorOf(events.at(-1))).toContain("z");
    // Neither refusal touched the rack the instance is standing in.
    expect(yardOf(instrument)).toEqual([["one", "delay"]]);
    expect(calls.removed).toEqual([]);
  });

  // An id is unique inside a rack and only inside one, so two racks may each hold one under the
  // same name — and a move that let the arrival report the clash would already have removed the
  // source's copy (0030).
  it("refuses a move onto a rack already holding that id, and takes nothing away", async () => {
    const { instrument, calls, events } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", id: "x", effect: "delay" });
    instrument.send({ t: "effect.add", deck: null, id: "x", effect: "eq" });

    instrument.send({ t: "effect.move", from: "a", to: null, instance: "x", index: 0 });
    await turns();

    expect(yardOf(instrument)).toEqual([["x", "delay"]]);
    expect(masterOf(instrument)).toEqual([["x", "eq"]]);
    expect(calls.removed).toEqual([]);
    expect(errorOf(events.at(-1))).toContain("already held");
  });

  it("reports an instance the source rack is not holding and changes nothing", () => {
    const { instrument, events } = rackInstrument();
    instrument.send({ t: "effect.move", from: "a", to: null, instance: "ghost", index: 0 });
    expect(masterOf(instrument)).toEqual([]);
    expect(events).toHaveLength(1);
    expect(errorOf(events[0])).toContain("ghost");
  });
});
