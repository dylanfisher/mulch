/**
 * @role Tests which lanes become rows, and that the overlay costs nothing while it is closed:
 *   no canvas in the markup, and no frame subscription, because `paintsPerFrame` is the whole
 *   `enabled` argument both sizes hand `useOnFrame`.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { paramKey } from "@/audio/params";
import { fold } from "@/lib/copy";
import { EFFECT_ROW_PERIOD_SECS, effectRowPeriod, FLAT_BEND, laneBend } from "@/lib/moire";
import { MOIRE_OVERLAY } from "@/lib/copy";
import type { SessionEffect } from "@/state/session";
import type { DeckState } from "@/state/store";
import { deckLanes, moireRows, MoireStrip, paintsPerFrame } from "@/ui/MoireStrip";

const instrument = () => createInstrument(manualClock());
const emptyDeck = (): DeckState => {
  const deck = instrument().state.getState().decks.a;
  if (deck === undefined) throw new Error("the initial session holds no deck a");
  return deck;
};

const render = (state: DeckState) =>
  renderToStaticMarkup(<MoireStrip instrument={instrument()} deck="a" state={state} />);

const instance = (id: string, automation: SessionEffect["automation"] = {}): SessionEffect => ({
  id,
  effect: "delay",
  bypassed: false,
  params: {},
  automation,
});

// One flat list of the strip's cases (0007).
// oxlint-disable-next-line max-lines-per-function
describe("MoireStrip", () => {
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
      },
    ]);
  });

  it("finds a rack instance's lanes under the instance's own key", () => {
    const lanes = deckLanes({}, [
      {
        id: "fx1",
        effect: "delay",
        bypassed: false,
        params: {},
        automation: {
          "delay.mix": [
            { at: 0, value: 0 },
            { at: 3, value: 1 },
          ],
        },
      },
    ]);
    expect(lanes).toEqual([
      {
        key: paramKey("fx1", "delay.mix"),
        period: 3,
        shape: fold("delay.mix"),
        bend: laneBend([
          { at: 0, value: 0 },
          { at: 3, value: 1 },
        ]),
      },
    ]);
  });

  it("gives an instance in the rack a row of its own, lane or no lane", () => {
    const { rows, keys } = moireRows([], [instance("fx1")], 0);
    // An effect is drawn whether or not anything is automating it, out of its own id the way its
    // name is (0076) — and nothing automates it, so its phase comes off the deck's own clock
    // rather than out of a lane's key.
    expect(rows).toEqual([
      {
        period: effectRowPeriod(fold("fx1")),
        phase: 0,
        reference: false,
        shape: fold("fx1"),
        bend: FLAT_BEND,
      },
    ]);
    expect(keys).toEqual([null]);
    const [shortest, longest] = EFFECT_ROW_PERIOD_SECS;
    expect(rows[0]?.period).toBeGreaterThanOrEqual(shortest);
    expect(rows[0]?.period).toBeLessThanOrEqual(longest);
    // Two instances of one effect are two rows that beat against each other, because each is
    // folded out of its own id and not out of its plugin's.
    const two = moireRows([], [instance("fx1"), instance("fx2")], 0).rows;
    const [first, second] = [two[0]?.period ?? 0, two[1]?.period ?? 0];
    expect(Math.max(first, second) / Math.min(first, second)).toBeGreaterThan(1.05);
    // And a lane on that effect keeps bending the row it already bends: the instance's own row is
    // beside it, and the loop is still the last one.
    const lane = [
      { at: 0, value: 0 },
      { at: 3, value: 1 },
    ];
    const bent = instance("fx1", { "delay.mix": lane });
    const withLane = moireRows(deckLanes({}, [bent]), [bent], 8);
    expect(withLane.rows.map((each) => each.period)).toEqual([3, effectRowPeriod(fold("fx1")), 8]);
    expect(withLane.keys).toEqual([paramKey("fx1", "delay.mix"), null, null]);
    // So a yard holding a rack and no lanes has a picture after all.
    expect(render({ ...emptyDeck(), effects: [instance("fx1")] })).toContain("<canvas");
  });

  it("draws nothing at all for a yard running nothing", () => {
    expect(render(emptyDeck())).toBe("");
  });

  it("holds no closed overlay at all — one canvas, and none of the overlay's own elements", () => {
    // The whole proof that a closed overlay costs nothing: it is not in the tree, so it holds no
    // canvas, no frame callback, no resize observer and no estimate of its own.
    const markup = render({ ...emptyDeck(), loop: { in: 0, out: 4 } });
    expect(markup.match(/<canvas/gu)).toHaveLength(1);
    expect(markup).not.toContain(MOIRE_OVERLAY);
    expect(markup).not.toContain(">Close<");
  });

  it("keeps a yard that is not moving off the frame loop, and an empty strip with it", () => {
    // `paintsPerFrame` is the only argument either canvas hands `useOnFrame`, and false there is
    // no registration at all (src/ui/frame.ts) — no callback, no RAF, nothing measured. A halted
    // yard freezes every phase it would paint (0040), so it is painted on commit instead.
    expect(paintsPerFrame(false, 4)).toBe(false);
    expect(paintsPerFrame(true, 0)).toBe(false);
    expect(paintsPerFrame(true, 4)).toBe(true);
    // And it is still drawn: a stopped yard carries its picture, it just does not animate it.
    expect(render({ ...emptyDeck(), loop: { in: 0, out: 4 }, playing: false })).toContain(
      "<canvas",
    );
  });
});
