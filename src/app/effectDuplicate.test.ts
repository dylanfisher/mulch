/**
 * @role Command-chain tests for `effect.duplicate`: what one copy carries, where it lands, and
 *   every refusal that keeps a half-built instance out of the rack (0092, 0111).
 * @instead The rack operations the copy's expansion is built out of — add, bypass, reorder,
 *   remove — and the history they run under → src/app/effects.test.ts, which is the file this was
 *   split out of when it reached the hard cap docs/map.md sets and scripts/arch enforces where no
 *   waiver reaches (0045).
 */
import { describe, expect, it } from "vitest";

import type { EffectInstanceId } from "@/audio/effects/contract";
import type { EffectId } from "@/audio/effects/registry";
import { manualClock } from "./clock";
import type { Command, Envelope } from "./commands";
import { silentEngine } from "./engineDouble";
import type { Event } from "./events";
import { createInstrument, type Instrument } from "./facade";
import { instanceIn } from "./rackProbe";

/**
 * An instrument whose graph records the instances it was handed, in the order it got them — the
 * only rack call a copy's expansion is asserted against here. Its own, the way deckPlayer's is:
 * a double a second file needs a different half of is a double each file declares (docs/map.md).
 */
const rackInstrument = (): { instrument: Instrument; calls: RackCalls; events: Event[] } => {
  const calls: RackCalls = { added: [] };
  const instrument = createInstrument(manualClock(), () =>
    silentEngine({
      addEffect: (_deck, instance, effect) => {
        calls.added.push([instance, effect]);
        return calls.added.length - 1;
      },
    }),
  );
  const events: Event[] = [];
  instrument.on((event) => {
    events.push(event);
  });
  return { instrument, calls, events };
};

type RackCalls = { added: [instance: EffectInstanceId, effect: EffectId][] };

/** The rack a probe holds, as the pairs every assertion below is about. */
const rackOf = (instrument: Instrument): [EffectInstanceId, EffectId][] =>
  instrument.probe().decks.a!.effects.map((entry) => [entry.id, entry.effect]);

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

// One command, expanded by the reducer — the whole of what a copy carries (0092).
// oxlint-disable-next-line max-lines-per-function
describe("effect.duplicate", () => {
  it("copies the instance's values and its bypass onto an id of its own", async () => {
    const { instrument, calls, events } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "delay" });
    instrument.send({
      t: "param.set",
      deck: "a",
      instance: "one",
      param: "delay.time",
      value: 0.4,
    });
    instrument.send({ t: "param.set", deck: "a", instance: "one", param: "delay.mix", value: 0.9 });
    instrument.send({ t: "effect.bypass", deck: "a", instance: "one", bypassed: true });

    instrument.send({ t: "effect.duplicate", deck: "a", instance: "one", id: "two" });
    await turns();

    // Into the same rack beside its original, as the same effect, holding the same numbers and
    // the same switch — and nothing of the original's identity, which is the id the caller minted.
    expect(rackOf(instrument)).toEqual([
      ["one", "delay"],
      ["two", "delay"],
    ]);
    expect(instanceIn(instrument, "two").params).toEqual(instanceIn(instrument, "one").params);
    expect(instanceIn(instrument, "two").bypassed).toBe(true);
    expect(calls.added).toEqual([
      ["one", "delay"],
      ["two", "delay"],
    ]);
    expect(events.at(-1)).toMatchObject({
      t: "effect.duplicated",
      deck: "a",
      instance: "one",
      to: "two",
      effect: "delay",
    });
  });

  // A copy belongs beside the thing it is a copy of, not six slots from it: `effect.add` appends,
  // so the group moves the copy into place with the one command a rack's reorder already is, the
  // way a yard's copy lands under the yard it came from (0111, P113).
  it("lands the copy immediately after the instance it copies", async () => {
    const { instrument } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    instrument.send({ t: "effect.add", deck: "a", id: "two", effect: "delay" });
    instrument.send({ t: "effect.add", deck: "a", id: "three", effect: "eq" });

    instrument.send({ t: "effect.duplicate", deck: "a", instance: "one", id: "copy" });
    await turns();

    expect(rackOf(instrument)).toEqual([
      ["one", "filter"],
      ["copy", "filter"],
      ["two", "delay"],
      ["three", "eq"],
    ]);
  });

  // The reason to copy an instance is to keep what was ridden onto it and move it, so the copy
  // takes the lanes too — one `automation.set` per lane the original holds, and none for the
  // parameters it never rode (0092 amended, P94).
  it("copies every lane the instance holds and mints none it does not", async () => {
    const { instrument } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "delay" });
    const points = [
      { at: 0, value: 0.1 },
      { at: 0.5, value: 0.8 },
    ];
    instrument.send({
      t: "automation.set",
      deck: "a",
      instance: "one",
      param: "delay.mix",
      points,
    });

    instrument.send({ t: "effect.duplicate", deck: "a", instance: "one", id: "two" });
    await turns();

    expect(instanceIn(instrument, "two").automation["delay.mix"]).toEqual(points);
    // Its own copy of the points, not the original's array: riding one lane afterwards must not
    // move the other.
    expect(instanceIn(instrument, "two").automation["delay.mix"]).not.toBe(
      instanceIn(instrument, "one").automation["delay.mix"],
    );
    expect(instanceIn(instrument, "two").automation["delay.time"]).toBeUndefined();
  });

  // The reducer expands it, so one press is one entry: the add, the values and the bypass go
  // back together or not at all (0078, 0092).
  it("takes the whole copy back on one undo", async () => {
    const { instrument } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    instrument.send({
      t: "param.set",
      deck: "a",
      instance: "one",
      param: "filter.cutoff",
      value: 320,
    });

    instrument.send({ t: "effect.duplicate", deck: "a", instance: "one", id: "two" });
    await turns();
    expect(instanceIn(instrument, "two").params["filter.cutoff"]).toBe(320);

    instrument.send({ t: "history.undo" });
    await turns();

    expect(rackOf(instrument)).toEqual([["one", "filter"]]);
    expect(instanceIn(instrument, "one").params["filter.cutoff"]).toBe(320);
  });

  it("reports an instance the rack does not hold and changes nothing", async () => {
    const { instrument, calls, events } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });

    instrument.send({ t: "effect.duplicate", deck: "a", instance: "gone", id: "two" });
    await turns();

    expect(rackOf(instrument)).toEqual([["one", "filter"]]);
    expect(calls.added).toEqual([["one", "filter"]]);
    expect(events.at(-1)).toMatchObject({ t: "error" });
  });

  // The clash is refused before the group runs, so the instance already under that id keeps the
  // values it had rather than being rewritten by the copy's.
  it("refuses a copy onto an id the rack already holds", async () => {
    const { instrument, events } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    instrument.send({ t: "effect.add", deck: "a", id: "two", effect: "delay" });
    instrument.send({
      t: "param.set",
      deck: "a",
      instance: "one",
      param: "filter.cutoff",
      value: 320,
    });

    instrument.send({ t: "effect.duplicate", deck: "a", instance: "one", id: "two" });
    await turns();

    expect(rackOf(instrument)).toEqual([
      ["one", "filter"],
      ["two", "delay"],
    ]);
    expect(instanceIn(instrument, "two").effect).toBe("delay");
    expect(events.at(-1)).toMatchObject({ t: "error" });
  });

  // A copy with no id to land under is malformed wire input, and the guard is asserted where a
  // duplicate's guards can reach: the expansion is async, so a bad shape lands on the log rather
  // than on the caller — exactly as `deck.duplicate`'s does (0078).
  it("reports a missing copy id as malformed wire input, and adds nothing", async () => {
    const { instrument, calls, events } = rackInstrument();
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });

    instrument.send(wire('{"t":"effect.duplicate","deck":"a","instance":"one"}'));
    await turns();

    expect(rackOf(instrument)).toEqual([["one", "filter"]]);
    expect(calls.added).toEqual([["one", "filter"]]);
    expect(events.at(-1)).toMatchObject({ t: "error" });
  });
});
