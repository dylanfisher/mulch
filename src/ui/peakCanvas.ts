/**
 * @role The one painter of peaks: a canvas kept sized to its element and to the display, filled
 *   with one column per pixel in the theme's own colour, and repainted whenever the columns, the
 *   theme or the pixel density move. A deck's waveform and a clip's thumbnail paint through this
 *   or they are two drawings of one thing.
 * @instead Reducing samples to columns → src/lib/peaks.ts. Where those columns come from →
 *   peaks() and sourcePeaks() on src/app/facade.ts. Anything that moves per frame → refs and
 *   src/ui/frame.ts; nothing here runs on the frame loop.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from "react";

import type { Peaks } from "@/lib/peaks";
import { columnRange, secsToPx } from "@/lib/timeline";
import { bakeCanvas, observeSize, viewOf, watchDisplay } from "@/ui/canvasSurface";
import { useTheme } from "@/ui/theme";

/** A CSS position on the buffer, so an overlay tracks its element and not a cached width. */
export const pct = (secs: number, duration: number): string => `${secsToPx(secs, duration, 100)}%`;

export type PeakCanvas = {
  /** The element the canvas is sized to; the caller owns whatever else sits inside it. */
  rootRef: RefObject<HTMLDivElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  /** The root's CSS width, kept for callers that must not read layout per frame. */
  widthRef: RefObject<number>;
};

/**
 * Paints `peaks` into a canvas the hook keeps in step with its root. Pass null before anything
 * is loaded, or while a source is still decoding: the canvas is cleared and nothing is drawn.
 */
// Over the line cap by design: one canvas's whole lifecycle — the paint, the sizing, and the
// three things that invalidate it — sharing two element refs. Splitting it means threading
// those through hooks with one caller each. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function usePeakCanvas(peaks: Peaks | null): PeakCanvas {
  const theme = useTheme();
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const widthRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return;
    const context = canvas.getContext("2d");
    if (context === null) return;
    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);
    if (peaks === null) return;
    // The canvas carries `text-muted-foreground`, so the computed colour is the token resolved
    // for the theme in force — never a literal (docs/decisions/0004-theme-via-color-scheme.md).
    context.fillStyle = getComputedStyle(canvas).color;
    const middle = height / 2;
    const columns = peaks.min.length;
    for (let x = 0; x < width; x++) {
      // Min/max over every column this pixel covers — sampling one would let a transient
      // vanish whenever the canvas is narrower than the peaks (src/lib/timeline.ts).
      const [from, to] = columnRange(x, width, columns);
      let low = 0;
      let high = 0;
      for (let column = from; column < to; column++) {
        const min = peaks.min[column] ?? 0;
        const max = peaks.max[column] ?? 0;
        if (min < low) low = min;
        if (max > high) high = max;
      }
      const top = middle - high * middle;
      const bottom = middle - low * middle;
      // At least a pixel, so silence still draws a centre line.
      context.fillRect(x, top, 1, Math.max(1, bottom - top));
    }
  }, [peaks]);

  /** Size the backing store to the element and the display, then repaint. */
  const rebake = useCallback(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (root === null || canvas === null) return;
    widthRef.current = root.clientWidth;
    bakeCanvas(root, canvas);
    draw();
  }, [draw]);

  // The observer below delivers its first measurement after the commit has painted, so until then
  // `widthRef` reads 0 and every caller's own layout effect resolves a position against nothing.
  // A playhead painted at that moment sits at x=0, and on a deck that is held rather than playing
  // it stays there, because the frame loop only runs while something is moving (0038). Measuring
  // here is one layout read at mount, not a per-frame one.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (root !== null) widthRef.current = root.clientWidth;
  }, []);

  useEffect(() => observeSize(rootRef.current, rebake), [rebake]);

  // The two things that change what this canvas should be without changing its CSS size, from the
  // module that owns them. A density flip rebakes — the backing store is the wrong size for the
  // display — and a scheme flip only repaints, because the token moved and the pixels did not.
  useEffect(
    () => watchDisplay(viewOf(canvasRef.current), { density: rebake, scheme: draw }),
    [draw, rebake],
  );

  // An explicit theme choice reaches `theme`; following the system does not, which is the scheme
  // half above.
  useEffect(() => {
    draw();
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- `theme` is the choice itself
  }, [draw, theme]);

  return { rootRef, canvasRef, widthRef };
}
