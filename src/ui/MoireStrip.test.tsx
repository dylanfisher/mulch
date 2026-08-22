/**
 * @role Tests which lanes become rows, that the overlay costs nothing while it is closed — no
 *   canvas in the markup, and no frame subscription, because `paintsPerFrame` is the whole
 *   `enabled` argument both sizes hand `useOnFrame` — that both sizes ask for the one window, and
 *   that Escape closes the large one.
 */
import { renderToStaticMarkup } from "react-dom/server";
import type * as MoireTypes from "@/lib/moire";
import { describe, expect, it, vi } from "vitest";

/** What a render registered rather than what it ran: the effects, and every window it asked for. */
const seen = vi.hoisted(() => ({
  effects: [] as (() => (() => void) | void)[],
  cycles: [] as number[],
}));

// Held rather than run, the way src/ui/AutomationPreview.test.tsx holds its unmount: what the
// overlay registers is the key, and this file presses it by hand. A server render never runs an
// effect, so nothing else in this file changes.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<Record<string, unknown>>();
  return {
    ...react,
    useEffect: (effect: () => (() => void) | void) => {
      seen.effects.push(effect);
    },
  };
});

// The canvas is the one part of this that needs a DOM. Stubbed, the markup is unchanged and the
// only effect either size registers is the one this file is about.
vi.mock("@/ui/canvasSurface", () => ({
  useCanvasSurface: () => ({ rootRef: { current: null }, canvasRef: { current: null } }),
}));

// The real window, and a note of the cycle count it was asked for: the whole claim of P76 is that
// the two sizes ask for the same one.
vi.mock("@/lib/moire", async (importOriginal) => {
  const moire = await importOriginal<typeof MoireTypes>();
  return {
    ...moire,
    moireWindowSecs: (reference: number, periods: readonly number[], cycles: number) => {
      seen.cycles.push(cycles);
      return moire.moireWindowSecs(reference, periods, cycles);
    },
  };
});

import { manualClock } from "@/app/clock";
import { createInstrument } from "@/app/facade";
import { paramKey } from "@/audio/params";
import { fold, MOIRE_OVERLAY } from "@/lib/copy";
import {
  EFFECT_ROW_PERIOD_SECS,
  effectRowPeriod,
  FLAT_BEND,
  laneBend,
  MOIRE_CYCLES,
} from "@/lib/moire";
import type { SessionEffect } from "@/state/session";
import type { DeckState } from "@/state/store";
import { deckLanes, moireRows, MoireOverlay, MoireStrip, paintsPerFrame } from "@/ui/MoireStrip";

const instrument = () => createInstrument(manualClock());
const emptyDeck = (): DeckState => {
  const deck = instrument().state.getState().decks.a;
  if (deck === undefined) throw new Error("the initial session holds no deck a");
  return deck;
};

const render = (state: DeckState) =>
  renderToStaticMarkup(<MoireStrip instrument={instrument()} deck="a" state={state} />);

/**
 * A yard with a loop, and the close a render is handed: both hoisted out of the tests that use
 * them, because a prop built in the caller's own scope is a new one on every render.
 */
const looped: DeckState = { ...emptyDeck(), loop: { in: 0, out: 4 } };
const closed = vi.fn<() => void>();

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

  it("asks for the one window at both sizes, and the same cycles either way", () => {
    // P76: the strip and the overlay differ in how much room they have and in nothing else. At
    // four cycles across a strip's height the rows fill their own band and the small picture reads
    // as a blob; the finer lines follow from the window, not from a second set of drawing rules.
    seen.cycles.length = 0;
    renderToStaticMarkup(<MoireStrip instrument={instrument()} deck="a" state={looped} />);
    renderToStaticMarkup(
      <MoireOverlay instrument={instrument()} deck="a" state={looped} onClose={closed} />,
    );

    expect(seen.cycles).toEqual([MOIRE_CYCLES, MOIRE_CYCLES]);
  });

  it("closes the large picture on Escape, and takes the key away with it", () => {
    const listeners = new Set<(event: unknown) => void>();
    vi.stubGlobal("document", {
      addEventListener: (_type: string, listener: (event: unknown) => void) => {
        listeners.add(listener);
      },
      removeEventListener: (_type: string, listener: (event: unknown) => void) => {
        listeners.delete(listener);
      },
    });
    try {
      closed.mockClear();
      seen.effects.length = 0;
      renderToStaticMarkup(
        <MoireOverlay instrument={instrument()} deck="a" state={looped} onClose={closed} />,
      );
      // One effect, and it is the key: the canvas is stubbed above, so nothing else registers.
      expect(seen.effects).toHaveLength(1);
      const release = seen.effects[0]?.();
      expect(listeners.size).toBe(1);
      const press = (key: string, defaultPrevented = false) => {
        const preventDefault = vi.fn();
        for (const listener of listeners) listener({ key, defaultPrevented, preventDefault });
        return preventDefault;
      };

      // Every other key belongs to whatever has focus — and so does an Escape something above
      // this has already answered, or one press would shut the palette and this picture both.
      expect(press("a")).not.toHaveBeenCalled();
      expect(press("Escape", true)).not.toHaveBeenCalled();
      expect(closed).not.toHaveBeenCalled();
      expect(press("Escape")).toHaveBeenCalledTimes(1);
      expect(closed).toHaveBeenCalledTimes(1);

      // And it leaves with the overlay: a closed picture is not in the tree at all (plan §2), so
      // a listener outliving it would be a key pressing a button nobody can see.
      if (typeof release !== "function") throw new Error("the overlay registered no cleanup");
      release();
      expect(listeners.size).toBe(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
