/**
 * @role Tests that the overlay costs nothing while it is closed — no canvas in the markup, and no
 *   frame subscription, because `paintsPerFrame` is the whole `enabled` argument both sizes hand
 *   `useOnFrame` — that the click zooms in place and only the zoomed header asks for a window,
 *   that a press with Option skips to that window and says so with the cursor, that both sizes ask
 *   for the same cycles, and that Escape closes the large one.
 * @instead Which lanes and instances become rows → src/ui/moireRows.test.ts.
 */
// One import over the cap, and the one over it is the registry a row's profile is declared in —
// restating a profile here would be a second declaration of it (principle 1).
// oxlint-disable import/max-dependencies
import { renderToStaticMarkup } from "react-dom/server";
import type * as MoireTypes from "@/lib/moire";
import { describe, expect, it, vi } from "vitest";

/** Whether Option is down, for the one reveal the strip makes — the same stand-in the knob's own
 *  Option tests use (src/ui/ParameterKnob.test.tsx). */
let held = false;

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

// The canvas is the one part of this that needs a DOM, and the drift's own surface is what holds
// it — its cadence and the tile shop behind it are src/ui/driftTiles.test.ts's. Stubbed, the markup
// is unchanged and the only effect either size registers is the one this file is about.
vi.mock("@/ui/driftTiles", async (importOriginal) => ({
  // Spread, not replaced: the painter reaches into this module for its caches, and a factory that
  // named only the hook would throw the moment anything here painted.
  ...(await importOriginal<typeof DriftTiles>()),
  useDriftSurface: () => ({ rootRef: { current: null }, canvasRef: { current: null } }),
}));

// The modifier, held rather than pressed: the arm is a document listener no server render makes,
// so the reveal is read from here the way src/ui/ParameterKnob.test.tsx reads it.
vi.mock("@/ui/shortcuts", () => ({ useAltHeld: () => held }));

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
import { effectById } from "@/audio/effects/registry";
import type * as DriftTiles from "@/ui/driftTiles";
import { MOIRE_OVERLAY, MOIRE_POP_OUT } from "@/lib/copy";
import { MOIRE_CYCLES } from "@/lib/moire";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import type { SessionEffect } from "@/state/session";
import type { DeckState } from "@/state/store";
import { driftPress, MoireOverlay, MoireStrip } from "@/ui/MoireStrip";
import { paintsPerFrame } from "@/ui/moireRows";
import { SHELL_WIDTH } from "@/ui/shell";

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

/** Two documents that only listen: the opener's, and the one a picture in its own window is in. */
const opener = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
const elsewhere = { addEventListener: vi.fn(), removeEventListener: vi.fn() };

/** One rack entry the way a session holds one: every value its registry entry declares (0030). */
const instance = (id: string): SessionEffect => ({
  id,
  effect: "delay",
  bypassed: false,
  params: Object.fromEntries(effectById("delay").params.map((param) => [param.id, param.default])),
  automation: {},
});

// One flat list of the strip's cases (0007).
// oxlint-disable-next-line max-lines-per-function
describe("MoireStrip", () => {
  it("draws nothing at all for a yard running nothing", () => {
    expect(render(emptyDeck())).toBe("");
  });

  it("draws a yard whose rack is the only thing drifting in it", () => {
    // An effect is drawn whether or not anything is automating it (src/ui/moireRows.ts), so a yard
    // holding a rack and no lanes has a picture after all.
    expect(render({ ...emptyDeck(), effects: [instance("fx1")] })).toContain("<canvas");
    // And nothing at all while that instance is bypassed: what the rack skips is not on the screen.
    expect(render({ ...emptyDeck(), effects: [{ ...instance("fx1"), bypassed: true }] })).toBe("");
  });

  // P117: *holding* a pattern is not jumping. A loop with no grid to jump around plays straight
  // past the module (`playerJumps`, src/audio/player.ts), so a yard the transport never jumps has
  // no more of a picture than one with nothing running at all — the rule a bypassed instance is
  // held to, said for the one module that is not in the rack (0159, 0139).
  it("draws nothing for a yard holding a pattern it has no loop to jump around", () => {
    expect(render({ ...emptyDeck(), player: { seed: 5, ...PLAYER_DEFAULTS } })).toBe("");
  });

  it("opens the large picture over this page, and asks for a window from its header", () => {
    // The click zooms in place, so the cheap gesture stops paying for a window (0139) — and the
    // pop-out that asks for one is in the header of the picture already open, never on the strip.
    const markup = render({ ...emptyDeck(), loop: { in: 0, out: 4 } });
    expect(markup).toContain("cursor-zoom-in");
    expect(markup).not.toContain(MOIRE_POP_OUT);
    // A picture already in a window of its own is handed no pop-out and shows none.
    expect(
      renderToStaticMarkup(
        <MoireOverlay instrument={instrument()} deck="a" state={looped} onClose={closed} />,
      ),
    ).not.toContain(MOIRE_POP_OUT);
  });

  it("is the whole of a window of its own: no header, and not held to the shell's measure", () => {
    // Over this page the picture is a thing covering the instrument, so it wears the shell's
    // header and lays out to the one measure every screen does (0074).
    const covering = renderToStaticMarkup(
      <MoireOverlay instrument={instrument()} deck="a" state={looped} onClose={closed} />,
    );
    expect(covering).toContain("<header");
    expect(covering).toContain(SHELL_WIDTH);

    // In a window of its own it is the only thing there: the title is the window's, the close is
    // the window's own and the pop-out has nowhere left to go, so every one of those is chrome
    // over the picture — and a page of nothing but a picture is not a page of reading (0138).
    const alone = renderToStaticMarkup(
      <MoireOverlay
        instrument={instrument()}
        deck="a"
        state={looped}
        onClose={closed}
        // oxlint-disable-next-line no-unsafe-type-assertion -- the two members the hook uses
        doc={elsewhere as unknown as Document}
      />,
    );
    expect(alone).not.toContain("<header");
    expect(alone).not.toContain(SHELL_WIDTH);
    expect(alone).toContain("<canvas");
  });

  it("sends an Option press straight to a window, and arms the cursor that says so", () => {
    const zoom = vi.fn<() => void>();
    const popOut = vi.fn<() => void>();
    driftPress(false, { zoom, popOut })();
    expect(zoom).toHaveBeenCalledTimes(1);
    expect(popOut).not.toHaveBeenCalled();
    driftPress(true, { zoom, popOut })();
    expect(popOut).toHaveBeenCalledTimes(1);
    // A browser that already refused a window leaves no straight route, so that press zooms like
    // any other rather than being a gesture that does nothing (0138).
    driftPress(true, { zoom, popOut: undefined })();
    expect(zoom).toHaveBeenCalledTimes(2);
    // And the reveal the hidden gesture needs: armed, the strip wears the arrow that means this
    // goes somewhere else instead of the zoom.
    held = true;
    expect(render(looped)).toContain("cursor-alias");
    held = false;
    expect(render(looped)).toContain("cursor-zoom-in");
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

  it("binds that key on the document the picture is in, not on the opener's", () => {
    // 0138: the large picture opens in a browser window of its own, and a key pressed there never
    // reaches this document at all — a listener left here is a picture Escape cannot close.
    opener.addEventListener.mockClear();
    elsewhere.addEventListener.mockClear();
    vi.stubGlobal("document", opener);
    try {
      seen.effects.length = 0;
      renderToStaticMarkup(
        <MoireOverlay
          instrument={instrument()}
          deck="a"
          state={looped}
          onClose={closed}
          // oxlint-disable-next-line no-unsafe-type-assertion -- the two members the hook uses
          doc={elsewhere as unknown as Document}
        />,
      );
      seen.effects[0]?.();
      expect(elsewhere.addEventListener).toHaveBeenCalledTimes(1);
      expect(opener.addEventListener).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
