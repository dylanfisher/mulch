import { describe, expect, it } from "vitest";

import type { ParamId } from "@/audio/params";
import { manualClock } from "./clock";
import type { Command, Envelope } from "./commands";
import type { Engine } from "./engine";
import type { Event } from "./events";
import { createInstrument } from "./facade";

const stubEngine = (
  addEffect: Engine["addEffect"] = () => 0,
  setParam: Engine["setParam"] = () => {},
): Engine => ({
  load: (_deck, source) => source.secs,
  loadBlob: () => Promise.resolve(1),
  play: () => {},
  playTogether: () => {},
  stop: () => {},
  planned: () => false,
  setLoop: () => null,
  setParam,
  addEffect,
  peek: () => {},
  peaks: () => null,
  prepareRestore: () =>
    Promise.resolve({ durations: { a: 0, b: 0 }, commit: () => {}, discard: () => {} }),
});

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
