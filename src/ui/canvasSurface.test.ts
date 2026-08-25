/**
 * @role The three things that change what a canvas should be without changing its markup — the
 *   element's size, the display's density and the colour scheme — over the hook every surface
 *   that draws itself mocks away: the backing store it bakes, and that the density it is watching
 *   for is the next one rather than the one already behind it.
 */
import type * as ReactTypes from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** The commit-time paint, held rather than run: React attaches the refs before it flushes one. */
let settle: (() => void) | null = null;
/** And what it said it watches — React re-runs it on a commit that changed one of these. */
let settleDeps: unknown[] = [];
/** The passive effects, held for the same reason — what they observe is an element that does not
 *  exist until the refs are set, so running one at hook-call time observes nothing. */
let effects: (() => (() => void) | void)[] = [];
/** What those effects registered, run together by `unmount()`. */
let teardowns: (() => void)[] = [];

vi.mock("react", async (importOriginal) => {
  const react = await importOriginal<typeof ReactTypes>();
  return {
    ...react,
    useCallback: (callback: unknown) => callback,
    useMemo: (make: () => unknown) => make(),
    useRef: (initial: unknown) => ({ current: initial }),
    useLayoutEffect: (effect: () => void, deps: unknown[]) => {
      settle = effect;
      settleDeps = deps;
    },
    useEffect: (effect: () => (() => void) | void) => {
      effects.push(effect);
    },
  };
});

// An explicit choice re-renders and lands through the layout effect below; this file is about the
// half that arrives with no React signal at all.
vi.mock("@/ui/theme", () => ({ useTheme: () => "system" }));
// The one loop, and the budget a surface with a cadence of its own spends on it. This file is
// about what a surface paints and not about when, so the budget here takes every ask where it
// stands — src/ui/frame.test.ts is where the cadence itself is held to its rate.
vi.mock("@/ui/frame", () => ({
  useOnFrame: () => {},
  paced: (_everyMs: number, work: () => void) => ({ ask: work, stop: () => {} }),
}));

import { useCanvasSurface } from "@/ui/canvasSurface";

/** Not a colour: whatever the token resolved to, so a paint that invented one is visible here. */
const RESOLVED = "whatever the token resolved to";

/** A media query as the hook uses one — the media it names, and who it would tell. */
type Query = {
  media: string;
  listeners: EventListener[];
  addEventListener: (name: string, on: EventListener) => void;
  removeEventListener: (name: string, on: EventListener) => void;
};

let queries: Query[] = [];

/** The last query asked for whose media matches `part` — the one currently being watched. */
function watching(part: string): Query {
  let found: Query | undefined;
  for (const query of queries) if (query.media.includes(part)) found = query;
  if (found === undefined) throw new Error(`nothing is watching ${part}.`);
  return found;
}

/** Every listener still attached to any query for `part`, across every one ever asked for. */
const attached = (part: string) =>
  queries.filter((query) => query.media.includes(part)).flatMap((query) => query.listeners);

function unmount(): void {
  for (const teardown of teardowns) teardown();
  teardowns = [];
}

/** The stand-in observer, declared once so a second display can be watched by the same one. */
class Watcher {
  constructor(rebake: () => void) {
    observer = { rebake, observing: [], live: true };
  }
  observe(target: unknown) {
    watchingSize().observing.push(target);
  }
  disconnect() {
    watchingSize().live = false;
  }
}

/** What the size observer was built around, what it was pointed at, and whether it is still on. */
let observer: { rebake: () => void; observing: unknown[]; live: boolean } | null = null;

/** The one observer this surface built — it has exactly one, or the surface is not watching. */
function watchingSize(): { rebake: () => void; observing: unknown[]; live: boolean } {
  if (observer === null) throw new Error("nothing is watching the element's size.");
  return observer;
}

/**
 * The hook, with its two elements attached and its effects flushed, in React's own order. `view`
 * is the window the two elements belong to — a picture drawn in a window of its own is on that
 * window's display, and an element handed none belongs to no document and falls back to this one.
 */
const useSurface = (paint: (canvas: HTMLCanvasElement, color: string) => void, view?: object) => {
  const owner = view === undefined ? {} : { ownerDocument: { defaultView: view } };
  const canvas = { width: 0, height: 0, ...owner };
  const root = { clientWidth: 0, clientHeight: 0, ...owner };
  const held = useCanvasSurface(paint, false);
  // An element is, to this hook, the two sizes it reads and the backing store it writes — set
  // the way src/ui/listDrag.test.ts sets its own stand-in list, and set before the effects run,
  // because an effect that reads a ref React has not attached yet observes nothing at all.
  Reflect.set(held.rootRef, "current", root);
  Reflect.set(held.canvasRef, "current", canvas);
  for (const effect of effects) {
    const off = effect();
    if (typeof off === "function") teardowns.push(off);
  }
  effects = [];
  return {
    canvas,
    root,
    commit: () => {
      settle?.();
    },
  };
};

beforeEach(() => {
  settle = null;
  settleDeps = [];
  effects = [];
  teardowns = [];
  queries = [];
  observer = null;
  vi.stubGlobal("devicePixelRatio", 2);
  vi.stubGlobal("getComputedStyle", () => ({ color: RESOLVED }));
  vi.stubGlobal("ResizeObserver", Watcher);
  vi.stubGlobal("matchMedia", (media: string): Query => {
    const query: Query = {
      media,
      listeners: [],
      addEventListener: (_name, on) => {
        query.listeners.push(on);
      },
      removeEventListener: (_name, on) => {
        query.listeners = query.listeners.filter((each) => each !== on);
      },
    };
    queries.push(query);
    return query;
  });
});

afterEach(() => {
  unmount();
  vi.unstubAllGlobals();
});

// One case per thing that invalidates a canvas without changing its markup; the length tracks how
// many of those there are. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("a canvas kept in step with its element", () => {
  it("bakes the backing store to the element and the display, in the theme's own colour", () => {
    const paint = vi.fn((_canvas: HTMLCanvasElement, _color: string) => {});
    const held = useSurface(paint);
    held.root.clientWidth = 200;
    held.root.clientHeight = 50;
    held.commit();
    // A yard that never plays still carries its picture: the paint is the commit's, not a frame's.
    expect(paint).toHaveBeenCalledTimes(1);
    expect(held.canvas).toEqual({ width: 400, height: 100 });
    expect(paint.mock.calls[0]?.[1]).toBe(RESOLVED);
  });

  it("leaves a backing store already at its size alone, so a commit does not wipe the picture", () => {
    const paint = vi.fn((_canvas: HTMLCanvasElement, _color: string) => {});
    const held = useSurface(paint);
    held.root.clientWidth = 200;
    held.root.clientHeight = 50;
    held.commit();

    // Writing `width` at all clears a canvas, even to the size it already holds — and a surface
    // that paints on a budget shows that blank until the standing paint is due. Count the writes:
    // a knob turned is a commit, and a commit of the same size must cost none.
    const size = { width: held.canvas.width, height: held.canvas.height };
    let wipes = 0;
    for (const axis of ["width", "height"] as const) {
      Object.defineProperty(held.canvas, axis, {
        get: () => size[axis],
        set: (value: number) => {
          wipes += 1;
          size[axis] = value;
        },
      });
    }

    held.commit();
    expect(wipes).toBe(0);
    expect(paint).toHaveBeenCalledTimes(2);
  });

  it("watches what it paints, so a commit that changed the picture bakes again", () => {
    // A yard that never plays is painted on every commit and never on a frame (0040), and `paint`
    // is the only thing this hook holds that a commit changes: the budget the paint is spent
    // through is stable by construction, so a layout effect that did not watch `paint` would bake
    // the backing store on mount and leave it at 300x150 for the life of the page — which is a
    // strip that never draws anything at all.
    const paint = vi.fn((_canvas: HTMLCanvasElement, _color: string) => {});
    useSurface(paint);
    expect(settleDeps).toContain(paint);
  });

  it("rebakes for the element it is watching when that element changes size", () => {
    const paint = vi.fn((_canvas: HTMLCanvasElement, _color: string) => {});
    const held = useSurface(paint);
    held.root.clientWidth = 100;
    held.root.clientHeight = 20;
    held.commit();
    // The element itself, not the canvas inside it: the canvas is sized from what this reports.
    expect(watchingSize().observing).toEqual([held.root]);

    held.root.clientWidth = 300;
    watchingSize().rebake();
    expect(held.canvas).toEqual({ width: 600, height: 40 });
    expect(paint).toHaveBeenCalledTimes(2);

    unmount();
    expect(watchingSize().live).toBe(false);
  });

  it("keeps a canvas of nothing at a pixel rather than at none", () => {
    const held = useSurface(() => {});
    held.commit();
    // A zero-width backing store is a canvas every later paint throws on for the rest of its life.
    expect(held.canvas).toEqual({ width: 1, height: 1 });
  });

  it("watches the density it has moved to, so a second zoom repaints too", () => {
    const held = useSurface(() => {});
    held.root.clientWidth = 100;
    held.root.clientHeight = 100;
    held.commit();

    vi.stubGlobal("devicePixelRatio", 3);
    for (const on of watching("resolution").listeners.slice()) on(new Event("change"));
    expect(held.canvas).toEqual({ width: 300, height: 300 });
    // The query names one density exactly, so the one that just fired can never fire again: the
    // next zoom is only seen by a query rebuilt against where this one landed.
    expect(watching("resolution").media).toContain("3dppx");

    vi.stubGlobal("devicePixelRatio", 1);
    for (const on of watching("resolution").listeners.slice()) on(new Event("change"));
    expect(held.canvas).toEqual({ width: 100, height: 100 });
    // And exactly one of them is live, not one per flip.
    expect(attached("resolution")).toHaveLength(1);
  });

  it("repaints when the system flips the scheme, which no render reports", () => {
    const paint = vi.fn((_canvas: HTMLCanvasElement, _color: string) => {});
    const held = useSurface(paint);
    held.commit();
    for (const on of watching("prefers-color-scheme").listeners.slice()) on(new Event("change"));
    expect(paint).toHaveBeenCalledTimes(2);

    unmount();
    expect(attached("prefers-color-scheme")).toEqual([]);
    expect(attached("resolution")).toEqual([]);
  });

  it("bakes a canvas in a second document to that document's display, not the opener's", () => {
    // 0138: the drift opens in a window of its own, which may be on another screen entirely. Every
    // one of the three facts this hook owns belongs to the document the canvas is actually in, and
    // reading them off the opener sizes the picture to the wrong display and watches the wrong one.
    const asked: string[] = [];
    const elsewhere = {
      devicePixelRatio: 3,
      matchMedia: (media: string) => {
        asked.push(media);
        return { addEventListener: () => {}, removeEventListener: () => {} };
      },
      ResizeObserver: Watcher,
    };
    const held = useSurface(() => {}, elsewhere);
    held.root.clientWidth = 100;
    held.root.clientHeight = 50;
    held.commit();

    // The opener is still at 2 (`beforeEach`), and this canvas is not on the opener's display.
    expect(held.canvas).toMatchObject({ width: 300, height: 150 });
    expect(asked).toEqual(["(prefers-color-scheme: dark)", "(resolution: 3dppx)"]);
    // And nothing was asked of this window at all: the queries above are the whole of them.
    expect(queries).toEqual([]);
    // The element is still watched — through the second window's own observer, not this one's.
    expect(watchingSize().observing).toEqual([held.root]);
  });
});
