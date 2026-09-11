/**
 * @role The screen worker, standing in: a port that bakes where it is asked rather than on a
 *   message, so a test's painting reads back the tile it wanted instead of the one the canvas last
 *   stood on. Nothing in production imports this file — the page builds a real worker
 *   (src/app/screen.ts) and the shop's own cases hand it ports of their own (0354).
 * @instead The bake this runs → src/lib/moireScreenField.ts, which is what src/workers/screen.ts
 *   runs band for band. The shop the port is given to → src/ui/moireScreenShop.ts. The painting
 *   that reads the tile back → src/ui/moireCanvasPainted.ts.
 */
import type { ScreenPort } from "@/app/screen";
import { screenField } from "@/lib/moireScreenField";
import { applyTunings } from "@/lib/moireTuning";
import { forgetScreenTiles, screenTileOf } from "@/ui/moireScreenShop";

/**
 * The screen worker, standing in: a port that bakes where it is asked rather than on a message, so
 * a painting reads back the tile it wanted instead of the one the canvas last stood on. **It is the
 * same bake** — `screenField` is what src/workers/screen.ts runs, band for band — and what it
 * leaves out is only the seam, which is the shop's own cases' subject and not the painter's
 * (src/ui/moireScreenShop.test.ts, 0354). Installed once beside the shop's own module state, so a
 * painter case that paints twice reads the held tile on the second painting exactly as it did
 * before the bake moved off this task.
 */
export function hereScreenPort(): ScreenPort {
  // A canvas where the worker's reply says `ImageBitmap`: what the shop holds is whatever a 2D
  // context will draw, and jsdom has no bitmaps (`ScreenTileImage`, src/ui/moireScreenShop.ts).
  let answer: ((result: { t: "baked"; key: string; tile: ImageBitmap }) => void) | null = null;
  return {
    bake: (request) => {
      applyTunings(request.tunings);
      const { height, key, width } = request.order;
      const pixels = new Uint8ClampedArray(width * height * 4);
      screenField(request.order, pixels);
      const tile = screenTileOf(width, height, pixels);
      if (tile === null) return;
      // oxlint-disable-next-line no-unsafe-type-assertion
      answer?.({ t: "baked", key, tile: tile as unknown as ImageBitmap });
    },
    listen: (onResult) => {
      answer = onResult;
    },
    listenFailure: () => {},
  };
}

/** The shop, emptied and given that port — what every painting in a test is drawn through. */
export function installHereScreenPort(): void {
  forgetScreenTiles(hereScreenPort);
}

// Re-exported so a case that hands the shop a port of its own names this module and not two: the
// two belong to one question, which is what a test's picture is baked by.
export { forgetScreenTiles };
