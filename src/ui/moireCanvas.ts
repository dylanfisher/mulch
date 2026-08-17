/**
 * @role The one painter of drift: a canvas kept sized to its element and to the display, holding
 *   one horizontal row per period, each ticked at that period and slid by the phase it has
 *   reached. The rows drift against each other and the interference is the picture. One painter
 *   serves the strip and the overlay — they differ only in how wide a window they ask for.
 * @instead The periods and how long they take to line up → src/lib/moire.ts. Peaks →
 *   src/ui/peakCanvas.ts, which is this file's sibling and not its source: peaks reduce samples
 *   to columns, and nothing here has a sample in it.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from "react";

import { useOnFrame } from "@/ui/frame";
import { useTheme } from "@/ui/theme";

/**
 * One row: how long its cycle is in real seconds, how far into that cycle it has reached, and
 * whether it is the reference the others are read against. Allocated once per set of rows and
 * refilled in place, because `phase` is a per-frame read (0070).
 */
export type MoireRow = { period: number; phase: number; reference: boolean };

/** How much of the ink the reference row gets: present, and plainly underneath (no literal). */
const REFERENCE_ALPHA = 0.35;

/** How wide one tick is drawn, in device pixels, and how much air a row leaves above and below. */
const TICK_PX = 2;
const ROW_PAD_PX = 2;

/**
 * How many ticks a row of this stride draws across `width` device pixels, or null for a row whose
 * ticks are closer together than one tick is wide — that row is a solid band and is drawn as one,
 * rather than as a run of rectangles that would either cost a cycle each or stop partway across.
 * The count is bounded by the canvas, because the stride it divides is at least a tick wide.
 */
export const rowTicks = (stride: number, width: number): number | null =>
  stride < TICK_PX ? null : Math.ceil(width / stride) + 1;

/** Draw `rows` across a window of `windowSecs`, in `color` — a token the caller resolved. */
export function paintMoire(
  canvas: HTMLCanvasElement,
  rows: readonly MoireRow[],
  windowSecs: number,
  color: string,
): void {
  const context = canvas.getContext("2d");
  if (context === null) return;
  const { width, height } = canvas;
  context.clearRect(0, 0, width, height);
  if (rows.length === 0 || windowSecs <= 0) return;
  context.fillStyle = color;
  const rowHeight = height / rows.length;
  rows.forEach((row, index) => {
    if (row.period <= 0) return;
    const top = index * rowHeight + ROW_PAD_PX;
    const bottom = Math.max(1, rowHeight - 2 * ROW_PAD_PX);
    context.globalAlpha = row.reference ? REFERENCE_ALPHA : 1;
    const stride = (row.period / windowSecs) * width;
    const ticks = rowTicks(stride, width);
    if (ticks === null) {
      context.fillRect(0, top, width, bottom);
      return;
    }
    // The first tick at or before the left edge: the phase is how far past a tick the row has
    // travelled, so the tick it has just left sits that far behind zero.
    const first = -((row.phase / windowSecs) * width);
    for (let tick = 0; tick <= ticks; tick++) {
      context.fillRect(Math.round(first + tick * stride), top, TICK_PX, bottom);
    }
  });
  context.globalAlpha = 1;
}

/** Watch an element's size until the returned unsubscribe is called. Null observes nothing. */
function observeSize(root: HTMLElement | null, on: () => void): () => void {
  const observer = new ResizeObserver(on);
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
 * same pair src/ui/peakCanvas.ts keeps, for the same two reasons.
 */
function watchDisplay(on: () => void): () => void {
  let density: MediaQueryList | null = null;
  const scheme = matchMedia("(prefers-color-scheme: dark)");
  function onDensity(): void {
    on();
    listen();
  }
  function listen(): void {
    density?.removeEventListener("change", onDensity);
    density = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
    density.addEventListener("change", onDensity);
  }
  listen();
  scheme.addEventListener("change", on);
  return () => {
    density?.removeEventListener("change", onDensity);
    scheme.removeEventListener("change", on);
  };
}

export type MoireCanvas = {
  rootRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
};

/**
 * A canvas sized to its root and to the display, painted once on every commit and then on the one
 * frame loop for exactly as long as `animate`. A yard that is not moving is painted, not animated:
 * its lanes and its playhead are frozen at the phase they were halted on (0040), so a frame that
 * repainted them would draw the same pixels again.
 */
export function useMoireCanvas(
  paint: (canvas: HTMLCanvasElement, color: string) => void,
  animate: boolean,
): MoireCanvas {
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
  const run = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas !== null) paint(canvas, color.current);
  }, [paint]);

  /** Size the backing store to the element and the display, re-read the token, then repaint. */
  const rebake = useCallback(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (root === null || canvas === null) return;
    canvas.width = Math.max(1, Math.round(root.clientWidth * devicePixelRatio));
    canvas.height = Math.max(1, Math.round(root.clientHeight * devicePixelRatio));
    color.current = getComputedStyle(canvas).color;
    run();
  }, [run]);

  // Every commit, so a yard that never plays still carries its picture, and an explicit theme
  // choice — which does re-render — lands without a listener of its own.
  useLayoutEffect(() => {
    rebake();
  }, [rebake, theme]);

  useEffect(() => observeSize(rootRef.current, rebake), [rebake]);
  useEffect(() => watchDisplay(rebake), [rebake]);

  useOnFrame(run, animate);

  return { rootRef, canvasRef };
}
