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
import { MOIRE_OVERLAY } from "@/lib/copy";
import type { DeckState } from "@/state/store";
import { deckLanes, MoireStrip, paintsPerFrame } from "@/ui/MoireStrip";

const instrument = () => createInstrument(manualClock());
const emptyDeck = (): DeckState => {
  const deck = instrument().state.getState().decks.a;
  if (deck === undefined) throw new Error("the initial session holds no deck a");
  return deck;
};

const render = (state: DeckState) =>
  renderToStaticMarkup(<MoireStrip instrument={instrument()} deck="a" state={state} />);

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
    ).toEqual([{ key: paramKey(null, "deck.gain"), period: 2 }]);
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
    expect(lanes).toEqual([{ key: paramKey("fx1", "delay.mix"), period: 3 }]);
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
