/**
 * @role Tests which lanes become rows, that a rack instance's row is what the instance is set to
 *   rather than only what it is, and that a bypassed instance contributes neither its own row nor
 *   the lanes riding it.
 */
import { describe, expect, it } from "vitest";

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { effectById } from "@/audio/effects/registry";
import { paramKey } from "@/audio/params";
import { fold } from "@/lib/copy";
import {
  DRIFT_DEPTH_FLOOR,
  EFFECT_ROW_PERIOD_SECS,
  effectRowPeriod,
  FLAT_BEND,
  laneBend,
  PLAIN_PROFILE,
} from "@/lib/moire";
import type { SessionEffect } from "@/state/session";
import type { DeckState } from "@/state/store";
import { deckLanes, moireRows } from "@/ui/moireRows";

const emptyDeck = (): DeckState => {
  const deck = createInstrument(manualClock()).state.getState().decks.a;
  if (deck === undefined) throw new Error("the initial session holds no deck a");
  return deck;
};

/**
 * A rack instance the way the session builds one: every parameter its entry declares, at the
 * default unless this test says otherwise. `paramIn` throws on a value an instance does not hold
 * (0030), so a fixture holding half a rack entry is a fixture no session could produce.
 */
const instance = (
  id: string,
  over: Partial<{
    effect: SessionEffect["effect"];
    bypassed: boolean;
    params: SessionEffect["params"];
    automation: SessionEffect["automation"];
  }> = {},
): SessionEffect => {
  const effect = over.effect ?? "delay";
  return {
    id,
    effect,
    bypassed: over.bypassed ?? false,
    params: {
      ...Object.fromEntries(effectById(effect).params.map((param) => [param.id, param.default])),
      ...over.params,
    },
    automation: over.automation ?? {},
  };
};

const mix = [
  { at: 0, value: 0 },
  { at: 3, value: 1 },
];

// One flat list of what a yard's rows are made of, each case a few lines (0007).
// oxlint-disable-next-line max-lines-per-function
describe("moireRows", () => {
  it("makes a row of every lane that has a period, and of nothing else", () => {
    const state = emptyDeck();
    expect(deckLanes(state.automation, state.effects)).toEqual([]);
    // A lane that never moved has no period and is not drift (0035).
    expect(deckLanes({ "deck.gain": [{ at: 0, value: 0.5 }] }, [])).toEqual([]);
    expect(
      deckLanes(
        {
          "deck.gain": [
            { at: 0, value: 0.5 },
            { at: 2, value: 1 },
          ],
        },
        [],
      ),
    ).toEqual([
      {
        key: paramKey(null, "deck.gain"),
        period: 2,
        // The parameter picks the waveform, so two lanes of the same period on different knobs
        // are different rows; the lane's own values bend it.
        shape: fold("deck.gain"),
        bend: laneBend([
          { at: 0, value: 0.5 },
          { at: 2, value: 1 },
        ]),
        // A deck's own knob belongs to no effect, so its row is cut to the plain grating the
        // loop's reference row is — nothing in the picture claims it as its own kind (P99).
        profile: PLAIN_PROFILE,
      },
    ]);
  });

  it("finds a rack instance's lanes under the instance's own key", () => {
    const lanes = deckLanes({}, [instance("fx1", { automation: { "delay.mix": mix } })]);
    expect(lanes).toEqual([
      {
        key: paramKey("fx1", "delay.mix"),
        period: 3,
        shape: fold("delay.mix"),
        bend: laneBend(mix),
        // A knob on an effect is that effect doing something, so the row is cut to the profile the
        // registry entry declares rather than to the plain one a deck's own knob draws.
        profile: effectById("delay").drift,
      },
    ]);
    expect(effectById("delay").drift).not.toBe(PLAIN_PROFILE);
  });

  it("gives an instance in the rack a row of its own, lane or no lane", () => {
    const { rows, keys } = moireRows([], [instance("fx1")], 0);
    // An effect is drawn whether or not anything is automating it, and nothing automates this one,
    // so its phase comes off the deck's own clock rather than out of a lane's key.
    expect(rows).toHaveLength(1);
    expect(keys).toEqual([null]);
    // Its angle and where in its cycle it starts are still folded out of its own id the way its
    // name is (0076) — two rows that agreed in every field would draw no fringe at all.
    expect(rows[0]?.shape).toBe(fold("fx1"));
    expect(rows[0]?.reference).toBe(false);
    // And it says which kind of effect it is: the profile is the plugin's (P99).
    expect(rows[0]?.profile).toBe(effectById("delay").drift);
    const [shortest, longest] = EFFECT_ROW_PERIOD_SECS;
    expect(rows[0]?.period).toBeGreaterThanOrEqual(shortest);
    expect(rows[0]?.period).toBeLessThanOrEqual(longest);
    // And a lane on that effect keeps bending the row it already bends: the instance's own row is
    // beside it, and the loop is still the last one.
    const bent = instance("fx1", { automation: { "delay.mix": mix } });
    const withLane = moireRows(deckLanes({}, [bent]), [bent], 8);
    expect(withLane.rows.map((each) => each.period)).toEqual([3, rows[0]?.period, 8]);
    expect(withLane.keys).toEqual([paramKey("fx1", "delay.mix"), null, null]);
  });

  it("draws an instance at what it is set to, and two set alike alike", () => {
    // The delay declares its time into the row's period and its feedback into its depth, so the
    // picture moves with the knobs rather than only with the rack's contents (0139).
    const slow = moireRows([], [instance("fx1", { params: { "delay.time": 1.8 } })], 0).rows[0];
    const fast = moireRows([], [instance("fx1", { params: { "delay.time": 0.03 } })], 0).rows[0];
    expect(slow?.period).toBeGreaterThan((fast?.period ?? 0) * 1.5);
    const loud = moireRows([], [instance("fx1", { params: { "delay.feedback": 0.9 } })], 0).rows[0];
    const quiet = moireRows([], [instance("fx1", { params: { "delay.feedback": 0 } })], 0).rows[0];
    expect(loud?.depth).toBeCloseTo(1, 9);
    // Never to nothing: an effect turned all the way down is still in the signal path, and a row
    // that vanished at one end of a knob's travel would be the bypass switch saying it.
    expect(quiet?.depth).toBeCloseTo(DRIFT_DEPTH_FLOOR, 9);

    // Two instances of one effect set alike agree in everything their values reach, and differ
    // only in the identity the fold gives them.
    const [one, two] = moireRows(
      [],
      [
        instance("fx1", { params: { "delay.time": 0.4 } }),
        instance("fx2", { params: { "delay.time": 0.4 } }),
      ],
      0,
    ).rows;
    expect({ ...one, shape: 0 }).toEqual({ ...two, shape: 0 });
    expect(one?.shape).not.toBe(two?.shape);
  });

  it("keeps the fold for a dimension no value of the effect's reaches", () => {
    // The filter declares its cutoff into the row's pitch and nothing else, so its period is still
    // the one its own id folds to and two of them still beat against each other.
    const rows = moireRows(
      [],
      [instance("fx1", { effect: "filter" }), instance("fx2", { effect: "filter" })],
      0,
    ).rows;
    expect(rows[0]?.period).toBe(effectRowPeriod(fold("fx1")));
    expect(rows[1]?.period).toBe(effectRowPeriod(fold("fx2")));
    expect(rows[0]?.bend).toBe(FLAT_BEND);
    expect(rows[0]?.depth).toBe(1);
    const wide = moireRows(
      [],
      [instance("fx1", { effect: "filter", params: { "filter.cutoff": 20_000 } })],
      0,
    ).rows[0];
    expect(wide?.pitch).not.toBe(rows[0]?.pitch);
    expect(wide?.period).toBe(rows[0]?.period);
  });

  it("leaves a bypassed instance out of the picture, and its lanes with it", () => {
    // What the rack skips is not in the signal path, so it is not on the screen either: neither
    // the instance's own row nor a lane riding one of its knobs (0139).
    const playing = instance("fx1", { automation: { "delay.mix": mix } });
    const skipped = instance("fx1", { bypassed: true, automation: { "delay.mix": mix } });
    expect(deckLanes({}, [playing])).toHaveLength(1);
    expect(deckLanes({}, [skipped])).toEqual([]);
    expect(moireRows(deckLanes({}, [playing]), [playing], 8).rows).toHaveLength(3);
    // The loop is still there — it belongs to the yard and not to the rack.
    const rows = moireRows(deckLanes({}, [skipped]), [skipped], 8).rows;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.reference).toBe(true);
    // And it comes back unchanged when the switch does, because nothing about a row is stored.
    expect(moireRows(deckLanes({}, [playing]), [playing], 8).rows).toEqual(
      moireRows(deckLanes({}, [playing]), [playing], 8).rows,
    );
  });
});
