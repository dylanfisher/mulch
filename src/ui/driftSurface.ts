/**
 * @role The drift's canvas: the one surface every picture is drawn on, held to the picture's own
 *   cadence, slowed with the pictures animating beside it, given a share of each frame, and asked
 *   to draw again whenever a tile it wanted lands or a tuning moves (0144, 0284, 0399).
 * @instead The tile shops it redraws for → src/ui/driftTiles.ts and src/ui/moireScreenShop.ts.
 *   Sizing, theme and the paced paint every canvas shares → src/ui/canvasSurface.ts. The cadence's
 *   own numbers → `looksPaintMs` and `standingPaintMs` in src/ui/moireLooks.ts.
 */
import { useCallback, useEffect } from "react";

import { subscribeTuning } from "@/lib/moireTuning";
import { useCanvasSurface, type CanvasSurface } from "@/ui/canvasSurface";
import { onDriftBaked, picturesAnimating, standUp } from "@/ui/driftTiles";
import { perFrame } from "@/ui/frame";
import { LOOK_PER_FRAME, standingPaintMs } from "@/ui/moireLooks";
import { onScreenBaked } from "@/ui/moireScreenShop";

/**
 * The share of a frame the pictures animating paint inside between them, which keeps the ones that
 * come due together from all painting on one frame (`perFrame`, 0399). How many are animating is
 * the tile shop's count (`standUp`), which slows each of them past a few (`standingPaintMs`) and
 * sizes the round its caps guard. The page's and not a yard's, like the shops: a popped-out window
 * rides this realm's loop too.
 */
const drawsThisFrame = perFrame(() => LOOK_PER_FRAME.value);

/**
 * A canvas for one drift picture: the surface every drawing surface shares, held to the picture's
 * own cadence — declared in one place and slower than the frame rate, because the drift may lag and
 * the hand may not (0144) — and asked to draw again whenever a tile lands after the painting that
 * wanted it, which is every tile a worker baked and every one a painting could not afford.
 *
 * `everyMs` is the gap between two paintings — the picture's own cadence, or half of it under a
 * chain longer than the whole rate holds (`looksPaintMs`, src/ui/moireLooks.ts, 0284). Asked for on
 * the budget's own timer and never handed in as a number: what a painting costs is what the rack it
 * is of asks for, that is read off the set the last painting walked, and a look still draining out
 * of the chain is still a pass being drawn long after the commit that let it go (`carryLooks`).
 */
export function useDriftSurface(
  paint: (canvas: HTMLCanvasElement, color: string) => void,
  animate: boolean,
  everyMs: () => number,
): CanvasSurface {
  // Counted while this picture animates, and never while it holds a frame: a paused yard costs no
  // painting, so it slows nobody else's (0399).
  useEffect(() => (animate ? standUp() : undefined), [animate]);
  const loaded = useCallback(() => standingPaintMs(everyMs(), picturesAnimating()), [everyMs]);
  const surface = useCanvasSurface(paint, animate, loaded, drawsThisFrame);
  const { repaint } = surface;
  useEffect(() => onDriftBaked(repaint), [repaint]);
  // And whenever a screen tile lands: the same picture holds two shops now, and a tile baked off
  // the frame after the painting that wanted it would otherwise never be drawn (0354).
  useEffect(() => onScreenBaked(repaint), [repaint]);
  // And whenever a tuning moves: a halted picture would otherwise hold the old number until
  // something else asked it to paint (src/lib/moireTuning.ts, 0299). The same ask as above, and
  // a no-op inside a budget already standing.
  useEffect(() => subscribeTuning(repaint), [repaint]);
  return surface;
}
