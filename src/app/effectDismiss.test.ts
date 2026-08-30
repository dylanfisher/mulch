/**
 * @role Command-chain tests for `effect.dismiss`: that a place let go of by hand reaches the graph
 *   and nothing else — no durable shape, no history entry — and that a place the run is no longer
 *   holding is refused rather than applied to whatever rolled into its slot (0204, 0205).
 * @instead The retire it performs, and the slot it leaves empty until that slot's own tick →
 *   src/audio/effects/automator.test.ts. The rack's durable commands and the history they run
 *   under → src/app/effects.test.ts, which is the file these would have joined had it not already
 *   been at the hard cap docs/map.md sets and scripts/arch enforces where no waiver reaches — the
 *   same split ./effectDuplicate.test.ts is (0045).
 */
import { describe, expect, it } from "vitest";

import type { EffectInstanceId } from "@/audio/effects/contract";
import { manualClock } from "./clock";
import { silentEngine } from "./engineDouble";
import type { Event } from "./events";
import { createInstrument } from "./facade";

/** How long a history restoration takes to settle, as ./effects.test.ts counts it. */
const turns = async (): Promise<void> => {
  for (let remaining = 12; remaining > 0; remaining--) {
    // oxlint-disable-next-line no-await-in-loop
    await Promise.resolve();
  }
};

/**
 * An instrument whose graph answers a dismissal the way a run holding the place would — or the way
 * one that has already let it go does. Its own double rather than ./effects.test.ts's, the way
 * ./effectDuplicate.test.ts declares its own (docs/map.md).
 */
const dismissing = (answer: boolean) => {
  const asked: [EffectInstanceId, EffectInstanceId][] = [];
  const instrument = createInstrument(manualClock(), () =>
    silentEngine({
      dismissGrown: (_deck, instance, place) => {
        asked.push([instance, place]);
        return answer;
      },
    }),
  );
  const events: Event[] = [];
  instrument.on((event) => {
    events.push(event);
  });
  instrument.send({ t: "effect.add", deck: "a", id: "auto", effect: "automator" });
  return { instrument, asked, events };
};

describe("effect.dismiss", () => {
  it("reaches the graph, writes nothing durable, and enters no history", async () => {
    const { instrument, asked, events } = dismissing(true);
    const before = JSON.stringify(instrument.probe().decks.a);
    instrument.send({ t: "effect.dismiss", deck: "a", instance: "auto", place: "auto:0:0:0:eq" });

    expect(asked).toEqual([["auto", "auto:0:0:0:eq"]]);
    expect(events.some((event) => event.t === "effect.dismissed")).toBe(true);
    // The run is drawn from its seed and never stored, so there is nothing for a dismissal to
    // write and nothing for an undo to put back (0204, 0205).
    expect(JSON.stringify(instrument.probe().decks.a)).toBe(before);
    // The one undo there is to take is the add: the dismissal took no entry of its own.
    instrument.send({ t: "history.undo" });
    await turns();
    expect(instrument.probe().decks.a?.effects).toEqual([]);
  });

  it("refuses a place the run is no longer holding, and an entry that grows nothing", () => {
    const { instrument, events } = dismissing(false);
    instrument.send({ t: "effect.add", deck: "a", id: "one", effect: "filter" });
    // The graph answers false: that place has gone, and it is not applied to whatever has since
    // rolled into its slot (principle 5).
    instrument.send({ t: "effect.dismiss", deck: "a", instance: "auto", place: "auto:0:0:0:eq" });
    // And an entry with no run at all has no place to let go of.
    instrument.send({ t: "effect.dismiss", deck: "a", instance: "one", place: "auto:0:0:0:eq" });

    expect(events.flatMap((event) => (event.t === "error" ? [event.detail] : []))).toEqual([
      "effect.dismiss: deck a is not holding auto:0:0:0:eq",
      "effect.dismiss: filter grows nothing: one",
    ]);
    expect(events.some((event) => event.t === "effect.dismissed")).toBe(false);
  });
});
