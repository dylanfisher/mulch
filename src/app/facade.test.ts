import { describe, expect, it } from "vitest";
import { manualClock } from "./clock";
import type { Envelope } from "./commands";
import type { Event } from "./events";
import { createInstrument } from "./facade";

const setGain = (value: number): Envelope => ({
  cmd: { t: "param.set", deck: "a", param: "deck.gain", value },
});

// The wire is untyped by nature — this is the test standing where ./scripts/drive will stand,
// feeding in JSON that has forgotten its types. The facade's runtime checks are the guard.
// oxlint-disable-next-line no-unsafe-type-assertion
const wire = (json: string) => JSON.parse(json) as Envelope;

describe("commands through the bus", () => {
  it("round-trips an envelope through the bus: serialised command in, stamped event out", () => {
    const instrument = createInstrument(manualClock(4));
    const events: Event[] = [];
    instrument.on((e) => {
      events.push(e);
    });

    // The round-trip through JSON is part of the claim under test: the wire format is the format.
    instrument.send(wire(JSON.stringify(setGain(0.5))));

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      seq: 0,
      at: 4,
      t: "param.changed",
      deck: "a",
      param: "deck.gain",
      value: 0.5,
    });
    expect(instrument.probe().decks.a.params["deck.gain"]).toBe(0.5);
  });

  it("delivers a scheduled param.set at its `at`, stamped with the time it ran", () => {
    const clock = manualClock(0);
    const instrument = createInstrument(clock);
    const events: Event[] = [];
    instrument.on((e) => {
      events.push(e);
    });

    instrument.send({ at: 2, cmd: setGain(0.25).cmd });
    expect(events).toEqual([]);
    expect(instrument.probe().decks.a.params["deck.gain"]).toBe(1);

    clock.set(2);
    instrument.pump();
    expect(events[0]).toMatchObject({ t: "param.changed", at: 2, value: 0.25 });
  });
});

describe("the wire's guard rails", () => {
  it("clamps an out-of-range param.set and reports the value actually applied", () => {
    const instrument = createInstrument(manualClock());
    const events: Event[] = [];
    instrument.on((e) => {
      events.push(e);
    });

    instrument.send(setGain(99));

    expect(events[0]).toMatchObject({ t: "param.changed", value: 1.5 });
    expect(instrument.probe().decks.a.params["deck.gain"]).toBe(1.5);
  });

  it("emits an error event for a well-formed command no milestone has implemented yet", () => {
    const instrument = createInstrument(manualClock());
    const events: Event[] = [];
    instrument.on((e) => {
      events.push(e);
    });

    instrument.send({ t: "deck.play", deck: "a" });

    expect(events[0]).toMatchObject({ t: "error", detail: "unimplemented: deck.play" });
  });
});

describe("malformed wire input", () => {
  it("throws on malformed input — unknown command, deck or param", () => {
    const instrument = createInstrument(manualClock());
    expect(() => {
      instrument.send(wire('{"t":"deck.explode","deck":"a"}'));
    }).toThrow(/unknown command/u);
    expect(() => {
      instrument.send(wire('{"t":"param.set","deck":"z","param":"deck.gain","value":1}'));
    }).toThrow(/unknown deck/u);
    expect(() => {
      instrument.send(wire('{"t":"param.set","deck":"a","param":"nope","value":1}'));
    }).toThrow(/unknown param/u);
  });

  it("refuses a param value that is not a finite number, before it can reach the log", () => {
    const instrument = createInstrument(manualClock());
    const events: Event[] = [];
    instrument.on((e) => {
      events.push(e);
    });

    expect(() => {
      instrument.send(wire('{"t":"param.set","deck":"a","param":"deck.gain","value":"loud"}'));
    }).toThrow(/not a finite number/u);
    expect(() => {
      instrument.send(setGain(Number.NaN));
    }).toThrow(/not a finite number/u);

    expect(events).toEqual([]);
    expect(instrument.probe().decks.a.params["deck.gain"]).toBe(1);
  });

  it("names the problem when sent something that is no object at all", () => {
    const instrument = createInstrument(manualClock());
    expect(() => {
      instrument.send(wire("null"));
    }).toThrow(/not a command or envelope/u);
    expect(() => {
      instrument.send(wire('"deck.play"'));
    }).toThrow(/not a command or envelope/u);
  });
});

describe("probe", () => {
  it("probe() is plain JSON: a round-trip through the wire loses nothing", () => {
    const instrument = createInstrument(manualClock(1));
    instrument.send(setGain(0.75));
    const probe = instrument.probe();
    expect(JSON.parse(JSON.stringify(probe))).toEqual(probe);
    expect(probe.decks.b.params["deck.gain"]).toBe(1);
  });
});
