/**
 * @role What the one peak painter puts on a canvas narrower than the columns it was handed: the
 *   loudest thing under each pixel rather than whichever column that pixel started on, a centre
 *   line where there is nothing, and an element measured at mount rather than at the observer's
 *   first delivery.
 */
// oxlint-disable react/globals -- these module-level slots are the hand-rolled React the file
// mocks with; nothing here is a component, so there is no render for them to be a side effect of.
import type * as ReactTypes from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Peaks } from "@/lib/peaks";

/** The mount-time measurement, held rather than run: React attaches the refs before it flushes. */
let settle: (() => void) | null = null;
/** The passive effects, held for the same reason: an effect that observes a ref React has not
 *  attached yet observes nothing at all. */
let effects: (() => (() => void) | void)[] = [];
let teardowns: (() => void)[] = [];
/** The size observer: what it was built around, what it was pointed at, and whether it is on. */
let observer: { rebake: () => void; observing: unknown[]; live: boolean } | null = null;

/** The one observer this painter built — it has exactly one, or it is watching nothing. */
function watchingSize(): { rebake: () => void; observing: unknown[]; live: boolean } {
  if (observer === null) throw new Error("nothing is watching the element's size.");
  return observer;
}

/** Every media query this painter is listening to, and the listener it registered for it. */
let flips: { query: string; on: () => void }[] = [];

/** Fire the one listener whose query mentions `what`, the way the browser would. */
function flip(what: string): void {
  const found = flips.find((entry) => entry.query.includes(what));
  if (found === undefined) throw new Error(`nothing is watching ${what}: ${flips.length} queries`);
  found.on();
}

/** The rendered tree going away, with everything its effects were holding. */
function unmount(): void {
  for (const teardown of teardowns) teardown();
  teardowns = [];
}

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useRef: (initial: unknown) => ({ current: initial }),
    useLayoutEffect: (effect: () => void) => {
      settle = effect;
    },
    useEffect: (effect: () => (() => void) | void) => {
      effects.push(effect);
    },
  };
});

vi.mock("@/ui/theme", () => ({ useTheme: () => "system" }));

import { usePeakCanvas } from "@/ui/peakCanvas";

/** One filled column, as the painter asks for it. */
type Rect = { x: number; top: number; height: number };

/** A canvas of `width` × 100 device pixels, recording what was drawn into it. */
function canvasOf(width: number) {
  const filled: Rect[] = [];
  const cleared: number[] = [];
  return {
    filled,
    cleared,
    element: {
      width: 0,
      height: 0,
      getContext: () => ({
        fillStyle: "",
        clearRect: (_x: number, _y: number, w: number) => cleared.push(w),
        fillRect: (x: number, top: number, _w: number, height: number) =>
          filled.push({ x, top, height }),
      }),
    },
    root: { clientWidth: width, clientHeight: 100 },
  };
}

/** The hook, with its elements attached and its first bake run, as a commit would. */
const usePainted = (peaks: Peaks | null, width: number) => {
  const parts = canvasOf(width);
  const held = usePeakCanvas(peaks);
  // An element is, to this painter, one measurement and one 2d context — set the way
  // src/ui/listDrag.test.ts sets its own stand-in list.
  Reflect.set(held.rootRef, "current", parts.root);
  Reflect.set(held.canvasRef, "current", parts.element);
  for (const effect of effects) {
    const off = effect();
    if (typeof off === "function") teardowns.push(off);
  }
  effects = [];
  return { ...parts, held };
};

beforeEach(() => {
  settle = null;
  effects = [];
  teardowns = [];
  observer = null;
  vi.stubGlobal("devicePixelRatio", 1);
  vi.stubGlobal("getComputedStyle", () => ({ color: "whatever the token resolved to" }));
  flips = [];
  vi.stubGlobal("matchMedia", (query: string) => ({
    addEventListener: (_name: string, on: () => void) => flips.push({ query, on }),
    removeEventListener: () => {},
  }));
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(rebake: () => void) {
        observer = { rebake, observing: [], live: true };
      }
      observe(target: unknown) {
        watchingSize().observing.push(target);
      }
      disconnect() {
        watchingSize().live = false;
      }
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Eight columns of silence with one full-scale transient in the sixth. */
const SPIKE: Peaks = {
  min: new Float32Array([0, 0, 0, 0, 0, -1, 0, 0]),
  max: new Float32Array([0, 0, 0, 0, 0, 1, 0, 0]),
};

// One `it` per claim the painter makes, over the one stubbed canvas above. See 0007.
// oxlint-disable-next-line max-lines-per-function
describe("what the peak painter puts under one pixel", () => {
  it("keeps a transient a canvas narrower than its columns would otherwise drop", () => {
    // Four pixels over eight columns: pixel 2 covers columns 4 and 5, and sampling the one it
    // begins on is how a peak vanishes at exactly the widths a thumbnail is drawn at.
    const drawn = usePainted(SPIKE, 4);
    // The element, not the canvas inside it: the backing store is sized from what this reports.
    expect(watchingSize().observing).toEqual([drawn.root]);
    watchingSize().rebake();
    expect(drawn.element).toMatchObject({ width: 4, height: 100 });
    expect(drawn.filled[2]).toEqual({ x: 2, top: 0, height: 100 });

    unmount();
    expect(watchingSize().live).toBe(false);
  });

  it("draws a line through the middle where there is nothing", () => {
    const drawn = usePainted(SPIKE, 4);
    watchingSize().rebake();
    // A pixel of silence is still a pixel: a rect of no height is a waveform with holes in it.
    expect(drawn.filled.filter((rect) => rect.height === 1).map((rect) => rect.top)).toEqual([
      50, 50, 50,
    ]);
  });

  it("clears the canvas and draws nothing at all while there is nothing to draw", () => {
    const drawn = usePainted(null, 4);
    watchingSize().rebake();
    // Cleared at its full width — the commit draws once before the bake has sized anything.
    expect(drawn.cleared.at(-1)).toBe(4);
    expect(drawn.filled).toEqual([]);
  });

  /**
   * The half this painter never proved. Zoom and a move between screens change devicePixelRatio
   * with no resize, and the system scheme flips the token with no React signal — the mechanism
   * both are watched through lives in src/ui/canvasSurface.ts, and this is the assertion that it
   * is still wired here rather than restated.
   */
  it("rebakes when the display's density moves, and repaints when the scheme does", () => {
    const painted = usePainted(SPIKE, 8);
    painted.filled.length = 0;
    painted.cleared.length = 0;

    vi.stubGlobal("devicePixelRatio", 2);
    flip("resolution");
    expect(painted.element.width, "a density flip rebakes the backing store").toBe(16);
    expect(painted.filled.length, "and repaints it").toBeGreaterThan(0);

    painted.filled.length = 0;
    vi.stubGlobal("devicePixelRatio", 4);
    flip("prefers-color-scheme");
    expect(painted.filled.length, "a scheme flip repaints").toBeGreaterThan(0);
    expect(painted.element.width, "and does not rebake for a colour").toBe(16);

    unmount();
  });

  it("measures its element at mount rather than at the observer's first delivery", () => {
    // Until this read lands, every caller resolving a position against the width gets 0 — and on
    // a yard that is held rather than playing, nothing comes along later to move it off the edge.
    const drawn = usePainted(SPIKE, 250);
    expect(drawn.held.widthRef.current).toBe(0);
    settle?.();
    expect(drawn.held.widthRef.current).toBe(250);
  });
});
