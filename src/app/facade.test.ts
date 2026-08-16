// Over the file cap the same way its biggest describe is over the function cap: one `it` per
// pinned wire behaviour, and the count tracks how many are pinned, not logic. See
// docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable max-lines
import { describe, expect, it } from "vitest";
import { manualClock } from "./clock";
import type { Command, Envelope } from "./commands";
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
    expect(instrument.probe().decks.a!.params["deck.gain"]).toBe(0.5);
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
    expect(instrument.probe().decks.a!.params["deck.gain"]).toBe(1);

    clock.set(2);
    instrument.pump();
    expect(events[0]).toMatchObject({ t: "param.changed", at: 2, value: 0.25 });
  });
});

// A flat list of deadline cases, one `it` per way an envelope can be on time or late (0007).
// oxlint-disable-next-line max-lines-per-function
describe("missed deadlines", () => {
  it("reports an envelope delivered long after it came due, and still runs it", () => {
    const clock = manualClock(0);
    const instrument = createInstrument(clock);
    const events: Event[] = [];
    instrument.on((e) => {
      events.push(e);
    });

    instrument.send({ at: 1, cmd: setGain(0.5).cmd });
    // The pump did not run for a whole second after this envelope was due — the one deadline
    // the instrument can actually miss. Everything downstream is schedule-ahead, so a late
    // pump makes a sound later; only this makes it late.
    clock.set(2);
    instrument.pump();

    expect(events[0]).toMatchObject({ t: "xrun", detail: /param\.set delivered 1000\.0ms late/u });
    // Late is not dropped: the command still ran, and the log carries both facts in order.
    expect(events[1]).toMatchObject({ t: "param.changed", value: 0.5 });
  });

  it("says nothing about an `at` that was already history when the envelope was sent", () => {
    // The live clock has been running since page load, so a fixture's {"at":0} arrives with
    // its moment long past. That is a position in the order, not a deadline anyone missed —
    // late is measured from when the envelope could first have run, which is its send().
    const clock = manualClock(5);
    const instrument = createInstrument(clock);
    const events: Event[] = [];
    instrument.on((e) => {
      events.push(e);
    });

    instrument.send({ at: 0, cmd: setGain(0.5).cmd });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ t: "param.changed", value: 0.5 });
  });

  it("says nothing about an envelope delivered on time", () => {
    const clock = manualClock(0);
    const instrument = createInstrument(clock);
    const events: Event[] = [];
    instrument.on((e) => {
      events.push(e);
    });

    instrument.send(setGain(0.5));
    instrument.send({ at: 1, cmd: setGain(0.25).cmd });
    clock.set(1);
    instrument.pump();

    expect(events.filter((e) => e.t === "xrun")).toEqual([]);
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
    expect(instrument.probe().decks.a!.params["deck.gain"]).toBe(1.5);
  });

  it("emits an error event when session.save has no persistence host", () => {
    const instrument = createInstrument(manualClock());
    const events: Event[] = [];
    instrument.on((e) => {
      events.push(e);
    });

    instrument.send({ t: "session.save" });

    expect(events[0]).toMatchObject({ t: "error", detail: /no persistence/u });
  });

  it("says on the log why a command that needs sound did nothing, with no audio host", () => {
    const instrument = createInstrument(manualClock());
    const events: Event[] = [];
    instrument.on((e) => {
      events.push(e);
    });

    // The spine runs without a graph — that is what makes these tests milliseconds long. A
    // command that needs one is unanswerable rather than malformed, so it lands on the log
    // instead of throwing, and an agent reading the stream can tell the two apart.
    instrument.send({ t: "deck.play", deck: "a" });

    expect(events[0]).toMatchObject({ t: "error", detail: /^no audio host: deck\.play/u });
    expect(instrument.probe().decks.a!.playing).toBe(false);
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

// A flat list of refusal cases, one `it` per way the wire can be wrong; the count tracks how
// many wrongs are pinned, not logic. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("wire payloads the facade refuses", () => {
  it("refuses malformed blob source unions synchronously", () => {
    const instrument = createInstrument(manualClock());
    expect(() => {
      instrument.send(wire('{"t":"deck.load","deck":"a","source":{"blobId":""}}'));
    }).toThrow(/non-empty string/u);
    expect(() => {
      instrument.send(
        wire('{"t":"deck.load","deck":"a","source":{"blobId":"x","gen":"sine","secs":1}}'),
      );
    }).toThrow(/mixes blob and generator/u);
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
    expect(instrument.probe().decks.a!.params["deck.gain"]).toBe(1);
  });

  it("turns a scheduled malformed command into an error event — pump() has no caller", () => {
    const clock = manualClock(0);
    const instrument = createInstrument(clock);
    const events: Event[] = [];
    instrument.on((e) => {
      events.push(e);
    });

    // Malformed but scheduled: the door only checks shape, so this is accepted — and when it
    // comes due there is no caller left to throw to. Silently dropping it (or unwinding the
    // host's pump interval) hides the fact; the log must carry it instead.
    instrument.send(wire('{"at":1,"cmd":{"t":"deck.explode","deck":"a"}}'));
    instrument.send({ at: 1, cmd: setGain(0.5).cmd });
    clock.set(1);
    expect(() => {
      instrument.pump();
    }).not.toThrow();

    expect(events[0]).toMatchObject({ t: "error", detail: /deck\.explode/u });
    // The bad envelope cost itself, never the one queued behind it.
    expect(events[1]).toMatchObject({ t: "param.changed", value: 0.5 });
  });

  it("never blames a bystander: a stale bad envelope coming due inside send() stays an event", () => {
    const clock = manualClock(0);
    const instrument = createInstrument(clock);
    const events: Event[] = [];
    instrument.on((e) => {
      events.push(e);
    });

    instrument.send(wire('{"at":1,"cmd":{"t":"deck.explode","deck":"a"}}'));
    clock.set(1);
    // enqueue drains everything due, so the stale malformed envelope runs inside this send —
    // whose own command is fine. Its throw belongs to the log, not to this caller.
    expect(() => {
      instrument.send(setGain(0.5));
    }).not.toThrow();

    expect(events[0]).toMatchObject({ t: "error", detail: /deck\.explode/u });
    expect(events[1]).toMatchObject({ t: "param.changed", value: 0.5 });
  });

  it("routes throws by envelope, not command identity, when one object is sent twice", () => {
    const clock = manualClock(0);
    const instrument = createInstrument(clock);
    const events: Event[] = [];
    instrument.on((e) => {
      events.push(e);
    });

    // One object, two envelopes: scheduled, then — after its moment has passed unpumped —
    // sent again immediately. The stale envelope drains first inside the second send; its
    // throw is the log's, and the caller is answered by its own envelope, which throws for
    // its own reason. Command identity cannot tell the two apart; the enqueue ticket can.
    // oxlint-disable-next-line no-unsafe-type-assertion -- untyped JSON is the point
    const cmd = JSON.parse('{"t":"deck.explode","deck":"a"}') as Command;
    instrument.send({ at: 1, cmd });
    // Past due, but inside the xrun tolerance: the throw routing is the only thing on trial.
    clock.set(1.04);
    expect(() => {
      instrument.send(cmd);
    }).toThrow(/unknown command/u);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ t: "error", detail: /deck\.explode/u });
    // Nothing left pending: the stale envelope did not unwind the drain under the fresh one.
    instrument.pump();
    expect(events).toHaveLength(1);
  });

  it("refuses an envelope whose cmd is not a command, while there is a caller to throw to", () => {
    const instrument = createInstrument(manualClock());
    // Scheduled for later, a null cmd would otherwise surface as an unhandled throw
    // inside some future pump() — no error event, nobody's stack.
    expect(() => {
      instrument.send(wire('{"at":5,"cmd":null}'));
    }).toThrow(/envelope\.cmd is not a command/u);
    expect(() => {
      instrument.send(wire('{"at":5,"cmd":"deck.play"}'));
    }).toThrow(/envelope\.cmd is not a command/u);
  });
});

describe("the read channel", () => {
  it("peek() reads zeros with no engine, the way probe() reads a silent session", () => {
    const instrument = createInstrument(manualClock());
    expect(instrument.peek("a")).toEqual({ position: 0, meter: 0, automation: new Map() });
  });

  it("peek() refills one object per deck rather than allocating — identity is the contract", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "deck.add", deck: "b" });
    expect(instrument.peek("a")).toBe(instrument.peek("a"));
    expect(instrument.peek("a")).not.toBe(instrument.peek("b"));
    // A deck the session does not hold has no scratch to hand out, and says so (0029).
    expect(() => instrument.peek("ghost")).toThrow(/no deck ghost/u);
  });

  it("peek() refuses a removed deck, whose scratch would otherwise still answer zeros", () => {
    const instrument = createInstrument(manualClock());
    instrument.send({ t: "deck.add", deck: "b" });
    // The first read is what mints the scratch entry; the check must survive it.
    expect(instrument.peek("b")).toEqual({ position: 0, meter: 0, automation: new Map() });
    instrument.send({ t: "deck.remove", deck: "b" });
    expect(() => instrument.peek("b")).toThrow(/no deck b/u);
  });

  it("peaks() is null before anything is loaded or with no engine at all", () => {
    const instrument = createInstrument(manualClock());
    expect(instrument.peaks("a")).toBeNull();
  });

  it("sourcePeaks() answers null with no audio host, and calls that no error", async () => {
    const instrument = createInstrument(manualClock());
    const events: Event[] = [];
    instrument.on((event) => {
      events.push(event);
    });
    // A paint site asks for columns; a spine with no audio host has none. Null, never a throw —
    // and running without a host is the pure tests' normal state, not something to log about.
    await expect(instrument.sourcePeaks({ blobId: "nothing" })).resolves.toBeNull();
    expect(events).toEqual([]);
  });
});

describe("probe", () => {
  it("probe() is plain JSON: a round-trip through the wire loses nothing", () => {
    const instrument = createInstrument(manualClock(1));
    instrument.send({ t: "deck.add", deck: "b" });
    instrument.send(setGain(0.75));
    const probe = instrument.probe();
    expect(JSON.parse(JSON.stringify(probe))).toEqual(probe);
    expect(probe.decks.b!.params["deck.gain"]).toBe(1);
  });
});
