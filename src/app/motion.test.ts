/** @role Command and history contracts for a parameter's motion: held, cleared, exclusive with its lane, replayed (0309). */
// One flat matrix of motion cases, deck-owned and instance-owned beside each other (0007).
// oxlint-disable max-lines
import { describe, expect, it } from "vitest";

import type { MotionSpec } from "@/lib/motion";
import { manualClock } from "./clock";
import type { Engine } from "./engine";
import { silentEngine } from "./engineDouble";
import { createInstrument } from "./facade";
import { instanceIn } from "./rackProbe";

const turns = async (): Promise<void> => {
  for (let remaining = 12; remaining > 0; remaining--) {
    // The facade serializes checkpoint preparation through a finite promise chain.
    // oxlint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
};

const engineDouble = (calls: unknown[][]): Engine =>
  silentEngine({
    setMotion: (deck, instance, param, motion, base) => {
      calls.push(["motion", deck, instance, param, motion, base]);
    },
    setAutomation: (deck, instance, param, lane, base) => {
      calls.push(["lane", deck, instance, param, lane, base]);
    },
  });

const SMOOTH: MotionSpec = { character: "smooth", seed: 7 };
const PULSE: MotionSpec = { character: "pulse", seed: 12 };
const points = [
  { at: 0, value: 0.2 },
  { at: 1, value: 0.9 },
];

describe("motion.set", () => {
  it("holds a motion on the deck, hands the graph the spec and the knob's value, and says so", () => {
    const calls: unknown[][] = [];
    const instrument = createInstrument(manualClock(), () => engineDouble(calls));
    const events: unknown[] = [];
    instrument.on((event) => {
      if (event.t === "motion.changed") events.push(event);
    });
    instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value: 0.5 });
    instrument.send({ t: "motion.set", deck: "a", param: "deck.gain", motion: SMOOTH });

    expect(instrument.probe().decks.a!.motion).toEqual({ "deck.gain": SMOOTH });
    expect(calls).toEqual([["motion", "a", null, "deck.gain", SMOOTH, 0.5]]);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      t: "motion.changed",
      deck: "a",
      param: "deck.gain",
      motion: SMOOTH,
    });

    instrument.send({ t: "motion.set", deck: "a", param: "deck.gain", motion: null });
    expect(instrument.probe().decks.a!.motion).toEqual({});
    expect(calls.at(-1)).toEqual(["motion", "a", null, "deck.gain", null, 0.5]);
  });

  it("holds a motion on the instance that declares the parameter, and off its twin", () => {
    const calls: unknown[][] = [];
    const instrument = createInstrument(manualClock(), () => engineDouble(calls));
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    instrument.send({ t: "effect.add", deck: "a", id: "two", effect: "filter" });
    instrument.send({
      t: "motion.set",
      deck: "a",
      instance: "one",
      param: "filter.cutoff",
      motion: PULSE,
    });

    expect(instanceIn(instrument, "one").motion).toEqual({ "filter.cutoff": PULSE });
    expect(instanceIn(instrument, "two").motion).toEqual({});
    expect(instrument.probe().decks.a!.motion).toEqual({});
    expect(calls).toEqual([["motion", "a", "one", "filter.cutoff", PULSE, 1000]]);
  });

  it("refuses a parameter that does not automate, a name that is no character, and a broken seed", () => {
    const instrument = createInstrument(manualClock());
    expect(() => {
      instrument.send({ t: "motion.set", deck: "a", param: "deck.speed", motion: SMOOTH });
    }).toThrow(/does not support automation/u);
    expect(() => {
      instrument.send({
        t: "motion.set",
        deck: "a",
        param: "deck.gain",
        // A word from another build, arriving as parsed JSON does.
        // oxlint-disable-next-line no-unsafe-type-assertion
        motion: { character: "wobble", seed: 1 } as unknown as MotionSpec,
      });
    }).toThrow(/character/u);
    expect(() => {
      instrument.send({
        t: "motion.set",
        deck: "a",
        param: "deck.gain",
        motion: { character: "smooth", seed: 1.5 },
      });
    }).toThrow(/seed/u);
    expect(instrument.probe().decks.a!.motion).toEqual({});
  });

  it("takes the key's lane away when a motion lands, and the motion away when a lane does", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "automation.set", deck: "a", param: "deck.gain", points });
    instrument.send({ t: "motion.set", deck: "a", param: "deck.gain", motion: SMOOTH });
    expect(instrument.probe().decks.a!.automation).toEqual({});
    expect(instrument.probe().decks.a!.motion).toEqual({ "deck.gain": SMOOTH });

    instrument.send({ t: "automation.set", deck: "a", param: "deck.gain", points });
    expect(instrument.probe().decks.a!.motion).toEqual({});
    expect(instrument.probe().decks.a!.automation).toEqual({ "deck.gain": points });

    // The same on an instance, and a cleared lane leaves a motion alone: clearing is not a lane.
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "delay" });
    instrument.send({
      t: "automation.set",
      deck: "a",
      instance: "one",
      param: "delay.mix",
      points,
    });
    instrument.send({
      t: "motion.set",
      deck: "a",
      instance: "one",
      param: "delay.mix",
      motion: PULSE,
    });
    expect(instanceIn(instrument, "one").automation).toEqual({});
    instrument.send({
      t: "automation.set",
      deck: "a",
      instance: "one",
      param: "delay.mix",
      points: [],
    });
    expect(instanceIn(instrument, "one").motion).toEqual({ "delay.mix": PULSE });
  });

  it("re-bases a held motion onto the value the knob is set to", () => {
    const calls: unknown[][] = [];
    const instrument = createInstrument(manualClock(), () => engineDouble(calls));
    instrument.send({ t: "motion.set", deck: "a", param: "deck.gain", motion: SMOOTH });
    instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value: 0.25 });
    expect(calls).toEqual([
      ["motion", "a", null, "deck.gain", SMOOTH, 1],
      ["motion", "a", null, "deck.gain", SMOOTH, 0.25],
    ]);
  });

  it("clears a motion and sets the value that replaced it as one undoable transaction", async () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "motion.set", deck: "a", param: "deck.gain", motion: SMOOTH });
    await turns();
    instrument.send({
      t: "history.group",
      commands: [
        { t: "motion.set", deck: "a", param: "deck.gain", motion: null },
        { t: "param.set", deck: "a", param: "deck.gain", value: 0.4 },
      ],
    });
    // The rest of the drag joins the group: the key a motion is coalesced under is its value's.
    instrument.send({ t: "param.set", deck: "a", param: "deck.gain", value: 0.3 });
    instrument.send({ t: "gesture.end" });
    await turns();
    expect(instrument.probe().decks.a!.motion).toEqual({});
    expect(instrument.probe().decks.a!.params["deck.gain"]).toBe(0.3);

    instrument.send({ t: "history.undo" });
    await turns();
    expect(instrument.probe().decks.a!.motion).toEqual({ "deck.gain": SMOOTH });
    expect(instrument.probe().decks.a!.params["deck.gain"]).toBe(1);

    instrument.send({ t: "history.redo" });
    await turns();
    expect(instrument.probe().decks.a!.motion).toEqual({});
  });

  it("copies a motion with the instance that holds it, seed and all, and mints none it does not", async () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "delay" });
    instrument.send({
      t: "motion.set",
      deck: "a",
      instance: "one",
      param: "delay.mix",
      motion: PULSE,
    });
    instrument.send({ t: "effect.duplicate", deck: "a", instance: "one", id: "two" });
    await turns();
    expect(instanceIn(instrument, "two").motion).toEqual({ "delay.mix": PULSE });
    expect(instanceIn(instrument, "two").motion["delay.time"]).toBeUndefined();
  });

  it("goes with a duplicated yard", async () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "deck.load", deck: "a", source: { gen: "noise" } });
    instrument.send({ t: "motion.set", deck: "a", param: "deck.pan", motion: SMOOTH });
    instrument.send({
      t: "deck.duplicate",
      deck: "a",
      to: "b",
      index: 1,
      emoji: "🌱",
      name: "Copy",
    });
    await turns();
    expect(instrument.probe().decks.b!.motion).toEqual({ "deck.pan": SMOOTH });
  });
});
