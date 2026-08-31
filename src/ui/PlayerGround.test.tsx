/**
 * @role What the ground's strip promises: a yard with no loop draws nothing, the blocks it draws
 *   are the loop's own window, the ground the song opens on, the moves ahead of it and the ones a
 *   hand kept, and a press on it writes the bed it landed in as one whole spec — or keeps that
 *   ground, where the press was an Option press (0089, 0191, 0194).
 * @instead The maths behind those blocks → src/lib/playerGround.test.ts and
 *   src/lib/playerBed.test.ts.
 */
import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type * as ReactTypes from "react";
import type * as PeakCanvas from "@/ui/peakCanvas";
import { describe, expect, it, vi } from "vitest";

// The two hooks this surface calls, made callable outside a renderer so its own handler can be
// pressed — the same stand-in src/ui/PlayerPart.test.tsx uses.
vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useMemo: (factory: () => unknown) => factory(),
  };
});

// And the gesture skeleton, which is a capture and three endings this file has no DOM for: what a
// press does with the bed it names is this surface's, and that the capture is taken is
// src/ui/gesture.ts's own claim.
vi.mock("@/ui/gesture", () => ({
  usePointerGesture: () => ({
    held: () => null,
    begin: () => {},
    matched: () => null,
    ended: () => null,
  }),
}));

// The canvas the peaks are painted on is the one part of this that needs a DOM. Stubbed, the
// markup is exactly what the blocks are drawn as — the same call src/ui/PlayerScope.test.tsx makes
// of its own surface.
vi.mock("@/ui/peakCanvas", async (importOriginal) => {
  const peaks = await importOriginal<typeof PeakCanvas>();
  return {
    ...peaks,
    usePeakCanvas: () => ({
      rootRef: { current: null },
      canvasRef: { current: null },
      widthRef: { current: 100 },
    }),
  };
});

import type { Instrument } from "@/app/facade";
import type { PlayerSpec } from "@/lib/player";
import { PLAYER_DEFAULTS } from "@/lib/playerCharacter";
import { PLAYER_BED_ROUND } from "@/lib/playerBed";
import { PLAYER_GROUND_AHEAD } from "@/lib/playerGround";
import { PlayerGround } from "@/ui/PlayerGround";

/** The one thing this surface asks the instrument for, and it has nothing to hand over here: the
 *  peaks are painted on a canvas this file stubs, so what is asserted is the blocks over it. */
// oxlint-disable-next-line no-unsafe-type-assertion -- the one member the surface reads
const instrument = { peaks: () => null } as unknown as Instrument;

const PLAYER: PlayerSpec = { seed: 5, ...PLAYER_DEFAULTS };

/** The loop every case is measured against: one second long, one second into ten of source. */
const LOOP = { in: 1, out: 2 };

/**
 * One strip, called rather than mounted: the element it drew, the markup that renders to, and the
 * press its root answers. Called, because what a press does with the bed it names is this
 * surface's own — the same stand-in a part's row is drawn through (src/ui/PlayerPart.test.tsx).
 */
const drawn = (over: Partial<PlayerSpec> = {}, loop: typeof LOOP | null = LOOP) => {
  const patch = vi.fn<(fields: Partial<PlayerSpec>) => void>();
  const element = PlayerGround({
    instrument,
    deck: "a",
    player: { ...PLAYER, ...over },
    loop,
    duration: 10,
    patch,
  });
  const press = (px: number, altKey = false): void => {
    if (!isValidElement<{ onPointerDown: (event: unknown) => void }>(element)) {
      throw new Error("the ground drew no strip to press");
    }
    // A press `px` pixels along a hundred-pixel strip, which is what the reading is taken off.
    element.props.onPointerDown({
      button: 0,
      pointerId: 1,
      altKey,
      clientX: px,
      currentTarget: {
        clientWidth: 100,
        clientLeft: 0,
        getBoundingClientRect: () => ({ left: 0 }),
      },
    });
  };
  return { patch, press, markup: element === null ? "" : renderToStaticMarkup(element) };
};

/** Every block the strip drew, as the CSS left it was placed at. */
const lefts = (markup: string): string[] =>
  [...markup.matchAll(/left:([^;"]+)/gu)].map(([, at]) => at!.trim());

// One case per thing the strip draws and per gesture it answers, all read out of the same static
// markup. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the ground as a strip", () => {
  /**
   * A yard with no loop has no ground to draw: the strip is the loop's own window and the windows
   * beside it, so there is nothing to be a map of (0159, 0171).
   */
  it("draws nothing for a yard with no loop", () => {
    expect(drawn({}, null).markup).toBe("");
  });

  /**
   * The loop's own window is bed zero, and the ground the song opens on is that window moved by
   * whole loop-lengths — placed by `bedGround`, which is the same fold the plant writes back
   * through, so the rectangle and the loop cannot disagree (principle 1, 0185).
   */
  it("draws the loop's window and the ground the song opens on, a loop-length apart", () => {
    // A one-second loop one second in, over ten seconds of source: bed 2 begins at three seconds.
    const { markup } = drawn({ bed: 2 });
    expect(markup).toContain('data-slot="ground-home"');
    expect(markup).toContain('data-slot="ground-opens"');
    expect(lefts(markup)).toEqual(["10%", "30%"]);
    // Every block is one loop-length wide, whichever ground it is.
    expect([...markup.matchAll(/width:([^;"]+)/gu)].map(([, w]) => w!.trim())).toEqual([
      "10%",
      "10%",
    ]);
  });

  /**
   * And the moves the pattern makes next, drawn ahead of it — no more than the picture says it
   * draws, and none at all for a ground that never moves (`groundsAhead`, 0191).
   */
  it("draws the grounds the pattern moves to next, and none for one that never moves", () => {
    const moving = drawn({ bedEvery: 2, bedDistance: 4, bedBias: 1 });
    expect(lefts(moving.markup).length).toBeGreaterThan(2);
    expect(lefts(moving.markup).length).toBeLessThanOrEqual(2 + PLAYER_GROUND_AHEAD);
    expect(lefts(drawn({ bedEvery: 0 }).markup)).toHaveLength(2);
  });

  /**
   * And the gesture: a press names the bed it landed in and sends it as the whole spec, which is
   * the very command the Bed dial beside it sends — one field, one author (principle 1, 0089).
   * Unchanged is unsent, because a drag crosses a bed boundary once and reports a move a hundred
   * times.
   */
  it("writes the bed a press landed in, and sends nothing for the one it is on", () => {
    const { patch, press } = drawn();
    // Six seconds along ten of source, a hundred pixels wide: five loop-lengths past a loop that
    // begins at one second and is one second long.
    press(60);
    expect(patch.mock.calls).toEqual([[{ bed: 5 }]]);
    // The same press again names the bed the spec is already on, and says nothing.
    const held = drawn({ bed: 5 });
    held.press(60);
    expect(held.patch).not.toHaveBeenCalled();
  });

  /**
   * And the other gesture on the same picture: an Option press keeps the ground it landed in, and
   * a second one lets it go. It never moves the window the press landed on, which is the whole of
   * why it is the modified press and not the plain one (0194).
   */
  it("keeps the ground an option press landed in, and lets a kept one go", () => {
    const { patch, press } = drawn();
    press(60, true);
    expect(patch.mock.calls).toEqual([[{ beds: [{ bed: 5, every: PLAYER_BED_ROUND }] }]]);
    const already = drawn({ beds: [{ bed: 5, every: PLAYER_BED_ROUND }] });
    already.press(60, true);
    expect(already.patch.mock.calls).toEqual([[{ beds: [] }]]);
  });

  /** And each of them is drawn where it falls, beside the window and the ground the song opens on. */
  it("draws a block for every ground kept", () => {
    const kept = drawn({
      beds: [
        { bed: 3, every: 4 },
        { bed: 5, every: 8 },
      ],
    });
    expect(lefts(kept.markup)).toHaveLength(4);
    expect(kept.markup).toContain('data-slot="ground-kept"');
  });
});
