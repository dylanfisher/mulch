/**
 * @role A canvas kept sized to its own element and to the display, painted on every commit and
 *   then once a frame for exactly as long as it is animating. It owns the three things that
 *   change what a canvas should be without changing its markup — the element's size, the
 *   display's density and the colour scheme — so a surface that draws itself lives-and-moving
 *   declares what to paint and nothing about when (0070).
 * @instead What to draw on one → src/ui/moireCanvas.ts for the drift, src/ui/ToneScope.tsx for a
 *   tone's own wave. Peaks keep their own painter, src/ui/peakCanvas.ts: a peak canvas repaints
 *   when its columns change and never on a frame, so it has no use for the loop this holds.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";

import { paced, useOnFrame } from "@/ui/frame";
import { useTheme } from "@/ui/theme";

/** The three things a canvas asks of the display it is on, and the whole of what `viewOf` answers. */
type Display = {
  devicePixelRatio: number;
  matchMedia: (query: string) => MediaQueryList;
  ResizeObserver: typeof ResizeObserver;
};

/**
 * The window a node lives in. A canvas painted into a second document (0138) is on that document's
 * display, with its own device pixel ratio, its own colour-scheme query and its own observers, so
 * reading those off this module's window would size it to the opener's screen instead of the one
 * it is on. A stand-in element that belongs to no document falls back to this one.
 */
export const viewOf = (node: Node | null): Display =>
  node?.ownerDocument?.defaultView ?? globalThis;

/** Watch an element's size until the returned unsubscribe is called. Null observes nothing. */
export function observeSize(root: HTMLElement | null, on: () => void): () => void {
  const observer = new (viewOf(root).ResizeObserver)(on);
  if (root !== null) observer.observe(root);
  return () => {
    observer.disconnect();
  };
}

/**
 * Watch the two things that change what a canvas should be without changing its CSS size: the
 * display's density, which browser zoom and a move between screens move with no resize event, and
 * the system colour scheme, which flips the token with no React signal. The density query names
 * the current density exactly, so it is rebuilt after each flip to watch for the next one — the
 * same pair src/ui/peakCanvas.ts keeps, for the same two reasons. Both are asked of the window the
 * canvas is in, which is not this module's window when the picture is in one of its own (0138).
 */
export function watchDisplay(
  view: Display,
  on: { density: () => void; scheme: () => void },
): () => void {
  let density: MediaQueryList | null = null;
  const scheme = view.matchMedia("(prefers-color-scheme: dark)");
  function onDensity(): void {
    on.density();
    listen();
  }
  function listen(): void {
    density?.removeEventListener("change", onDensity);
    density = view.matchMedia(`(resolution: ${view.devicePixelRatio}dppx)`);
    density.addEventListener("change", onDensity);
  }
  listen();
  scheme.addEventListener("change", on.scheme);
  return () => {
    density?.removeEventListener("change", onDensity);
    scheme.removeEventListener("change", on.scheme);
  };
}

/**
 * The backing store, sized to the element and to the display. A CSS pixel is not a device pixel,
 * and an element of nothing is still one pixel of canvas — asking for zero throws in some engines
 * and draws nothing in the rest.
 *
 * A size it is already at is left alone: writing `width` at all wipes the canvas, even to the value
 * it holds, and a surface that paints on a budget rather than on the spot (`everyMs` below) would
 * then show the blank for as long as a paint is standing — a flash of the page behind it on every
 * commit that only turned a knob.
 */
export function bakeCanvas(root: HTMLElement, canvas: HTMLCanvasElement): void {
  const dpr = viewOf(canvas).devicePixelRatio;
  const width = Math.max(1, Math.round(root.clientWidth * dpr));
  const height = Math.max(1, Math.round(root.clientHeight * dpr));
  if (canvas.width === width && canvas.height === height) return;
  canvas.width = width;
  canvas.height = height;
}

/**
 * One CSS pixel wide on this display, never nothing. A function rather than a constant because
 * `devicePixelRatio` moves under zoom, which is exactly what `watchDisplay` above exists to catch.
 */
export const hairlinePx = (): number => Math.max(1, devicePixelRatio);

export type CanvasSurface = {
  rootRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  /**
   * Ask for a paint. Taken where it stands at the surface's own cadence, and left standing until the
   * frame it is due on otherwise — for a caller that has learned there is something new to draw
   * between one commit and the next.
   */
  repaint: () => void;
};

/**
 * `paint`, asked for rather than taken: at this surface's own cadence, and where it stands when
 * that cadence is nothing. The budget outlives the renders that change what is painted — it is what
 * makes forty commits inside one frame one paint — so the paint it takes is reached through a ref
 * rather than closed over, and the budget itself is rebuilt only if the cadence changes.
 */
function usePacedPaint(paint: () => void, everyMs: number): () => void {
  const latest = useRef(paint);
  latest.current = paint;
  const pace = useMemo(
    () =>
      paced(everyMs, () => {
        latest.current();
      }),
    [everyMs],
  );
  useEffect(() => pace.stop, [pace]);
  return pace.ask;
}

/**
 * The three things that change what a canvas should be without changing its markup, watched: the
 * element's size, and the density and colour scheme of the window the canvas is actually in —
 * which is not this module's window when the picture is in one of its own (0138). Resolved after
 * the refs are attached, which is why it is an effect and not a read at hook-call time.
 */
function useRebakeWhenDisplayed(
  rootRef: RefObject<HTMLDivElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  rebake: () => void,
): void {
  useEffect(() => observeSize(rootRef.current, rebake), [canvasRef, rebake, rootRef]);
  useEffect(
    () => watchDisplay(viewOf(canvasRef.current), { density: rebake, scheme: rebake }),
    [canvasRef, rebake, rootRef],
  );
}

/**
 * A canvas sized to its root and to the display, painted on every commit and then on the one frame
 * loop for exactly as long as `animate`. A yard that is not moving is painted, not animated: its
 * lanes and its playhead are frozen at the phase they were halted on (0040), so a frame that
 * repainted them would draw the same pixels again.
 *
 * `everyMs` is the cadence this surface keeps: nothing is every paint taken where it is asked for,
 * which is what a cheap surface wants, and a number is a *budget* on the one loop — the paint falls
 * behind the frame rate and the hand does not (0144). A commit asks like anything else, so a drag
 * that commits forty times inside one frame costs one paint and not forty.
 */
export function useCanvasSurface(
  paint: (canvas: HTMLCanvasElement, color: string) => void,
  animate: boolean,
  everyMs = 0,
): CanvasSurface {
  const theme = useTheme();
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /**
   * The theme's own colour, resolved when something could have changed it rather than on the
   * frame that uses it: `getComputedStyle` forces the style it reads, and this read is on the
   * per-frame path (0070). The canvas carries a `text-*` token, so what lands here is the value
   * the theme resolved — never a literal (docs/boundaries.md).
   */
  const color = useRef("");

  // The canvas is resolved here rather than by the caller, so nothing outside needs a ref this
  // hook already holds — and a paint before the element exists is a no-op rather than a throw.
  const repaint = usePacedPaint(
    useCallback(() => {
      const canvas = canvasRef.current;
      if (canvas !== null) paint(canvas, color.current);
    }, [paint]),
    everyMs,
  );

  /** Size the backing store to the element and the display, re-read the token, then ask to paint. */
  const rebake = useCallback(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (root === null || canvas === null) return;
    bakeCanvas(root, canvas);
    color.current = getComputedStyle(canvas).color;
    repaint();
  }, [repaint]);

  // Every commit, so a yard that never plays still carries its picture, and an explicit theme
  // choice — which does re-render — lands without a listener of its own. `paint` is in the
  // dependencies because it is the only thing here that changes per commit: `rebake` is stable
  // once the budget is, and without this the picture is baked on mount and never again.
  useLayoutEffect(() => {
    rebake();
  }, [paint, rebake, theme]);

  useRebakeWhenDisplayed(rootRef, canvasRef, rebake);

  useOnFrame(repaint, animate);

  return { rootRef, canvasRef, repaint };
}
