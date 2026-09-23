/**
 * @role What a drift picture does when its canvas leaves the screen: it stops animating and stops
 *   being counted among the pictures that slow each other, lets the asks of tiles landing pass, and
 *   paints past the frame's share the moment it comes back (0403).
 */
// oxlint-disable react/globals -- these module-level slots are the hand-rolled React the file
// mocks with; nothing here is a component, so there is no render for them to be a side effect of.
import type * as ReactTypes from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type EffectSlot = { deps: unknown[]; teardown: (() => void) | undefined };
type CallbackSlot = { deps: unknown[]; callback: unknown };

/** One hook call's slot per `useState`, `useEffect` and `useCallback`, at its place in call order,
 *  as React keeps them: what persists from one render of the one mount to the next. */
let states: unknown[] = [];
let callbacks: (CallbackSlot | undefined)[] = [];
let effects: (EffectSlot | undefined)[] = [];
let at = 0;
/** The effects whose dependencies moved this render, run by `useRender()` after the call. */
let pending: (() => void)[] = [];

const moved = (before: unknown[] | undefined, deps: unknown[]): boolean =>
  before === undefined || deps.some((dep, index) => !Object.is(dep, before[index]));

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useState: (initial: unknown) => {
      const index = at++;
      if (!(index in states)) states[index] = initial;
      return [
        states[index],
        (next: unknown) => {
          states[index] = next;
        },
      ];
    },
    useCallback: (callback: unknown, deps: unknown[]) => {
      const index = at++;
      const held = callbacks[index];
      if (held !== undefined && !moved(held.deps, deps)) return held.callback;
      callbacks[index] = { deps, callback };
      return callback;
    },
    useEffect: (effect: () => (() => void) | void, deps: unknown[]) => {
      const index = at++;
      const held = effects[index];
      if (held !== undefined && !moved(held.deps, deps)) return;
      pending.push(() => {
        held?.teardown?.();
        effects[index] = { deps, teardown: effect() ?? undefined };
      });
    },
  };
});

/** What the surface under the picture was last handed and asked. */
const surface = {
  animate: false,
  repaint: vi.fn(),
  repaintStale: vi.fn(),
  rootRef: { current: {} },
  canvasRef: { current: null },
};
/** Who the observer tells when the canvas crosses the screen's edge. */
let crossed: ((shown: boolean) => void) | null = null;

vi.mock("@/ui/canvasSurface", () => ({
  useCanvasSurface: (_paint: unknown, animate: boolean) => {
    surface.animate = animate;
    return {
      rootRef: surface.rootRef,
      canvasRef: surface.canvasRef,
      repaint: surface.repaint,
      repaintStale: surface.repaintStale,
    };
  },
  observeShown: (root: unknown, on: (shown: boolean) => void) => {
    expect(root).toBe(surface.rootRef.current);
    crossed = on;
    return () => {
      crossed = null;
    };
  },
}));

/** How many pictures stand, and who a tile landing tells. */
let standing = 0;
const baked = new Set<() => void>();
vi.mock("@/ui/driftTiles", () => ({
  standUp: () => {
    standing += 1;
    return () => {
      standing -= 1;
    };
  },
  picturesAnimating: () => standing,
  onDriftBaked: (on: () => void) => {
    baked.add(on);
    return () => baked.delete(on);
  },
}));
vi.mock("@/ui/moireScreenShop", () => ({ onScreenBaked: () => () => {} }));
vi.mock("@/lib/moireTuning", () => ({ subscribeTuning: () => () => {} }));
vi.mock("@/ui/moireLooks", () => ({
  LOOK_PER_FRAME: { value: 2 },
  standingPaintMs: (baseMs: number) => baseMs,
}));
vi.mock("@/ui/frame", () => ({ perFrame: () => () => true }));

import { useDriftSurface } from "@/ui/driftSurface";

/** One render of the one mount, animating, with the effects it moved flushed after it. */
function useRender(): void {
  at = 0;
  useDriftSurface(
    () => {},
    true,
    () => 40,
  );
  for (const effect of pending) effect();
  pending = [];
}

/** The canvas crossing the edge. React renders again for the state it set; the case says so. */
function cross(shown: boolean): void {
  if (crossed === null) throw new Error("nothing is watching whether the canvas is shown.");
  crossed(shown);
}

const landed = (): void => {
  for (const on of baked) on();
};

beforeEach(() => {
  states = [];
  callbacks = [];
  effects = [];
  pending = [];
  standing = 0;
  baked.clear();
  crossed = null;
  surface.repaint.mockClear();
  surface.repaintStale.mockClear();
});

afterEach(() => {
  for (const slot of effects) slot?.teardown?.();
});

describe("a drift picture off screen", () => {
  it("stops animating and stops slowing the rest, and paints the moment it comes back", () => {
    useRender();
    expect(surface.animate).toBe(true);
    expect(standing).toBe(1);

    cross(false);
    useRender();
    expect(surface.animate).toBe(false);
    expect(standing).toBe(0);
    // A tile landing is for whoever is looking, and nobody is.
    landed();
    expect(surface.repaint).not.toHaveBeenCalled();
    expect(surface.repaintStale).not.toHaveBeenCalled();

    cross(true);
    useRender();
    expect(surface.repaintStale).toHaveBeenCalledTimes(1);
    expect(surface.animate).toBe(true);
    expect(standing).toBe(1);
    landed();
    expect(surface.repaint).toHaveBeenCalledTimes(1);
  });
});
