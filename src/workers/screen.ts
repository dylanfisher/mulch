/**
 * @role The screen worker — the message shell around the one loop over a screen tile's pixels, so a
 *   tile is baked off the thread the hand is on (0354). It holds no arithmetic of its own, no canvas
 *   of the page's and no state past the caches the loop itself keeps: every reply carries back the
 *   key it was asked under, and the tile comes back as an `ImageBitmap` a 2D context can draw
 *   straight. The same shape src/workers/drift.ts holds for the curved rows, and for the same
 *   reasons (0025, 0144).
 * @instead The loop, and everything one tile is made of → src/lib/moireScreenField.ts, which Node
 *   tests without a canvas at all. Deciding which tile is wanted, which one is drawn meanwhile, and
 *   what happens where this worker cannot be built → src/ui/moireScreenShop.ts. The theme the order's
 *   colours are resolved off, which is this side's caller's business → src/ui/moireScreenTile.ts.
 */
import { screenField, type ScreenBake } from "@/lib/moireScreenField";
import { applyTunings } from "@/lib/moireTuning";

/** Bake this tile. `key` is the identity the reply carries back; nothing else identifies a bake. */
export type ScreenBakeRequest = {
  t: "bake";
  order: ScreenBake;
  /** Every tunable the page has moved off its rest: this registry hears no slider of its own. */
  tunings: Record<string, number>;
  /** Whether the page is measuring, and so whether this reply is worth a clock (src/lib/measure.ts). */
  measure: boolean;
};

export type ScreenBakeResult =
  /** `bakeMs` is nought unless the request asked for it — the loop's own wall clock, on this side. */
  | { t: "baked"; key: string; tile: ImageBitmap; bakeMs: number }
  | { t: "failed"; key: string; detail: string };

// The worker global. `lib` carries DOM and WebWorker together for the whole project, so `self`
// resolves to the window's shape; this module-local declaration is the narrower truth here.
declare const self: DedicatedWorkerGlobalScope;

/**
 * One tile. There is no queue and no cancel: a request that is already stale is one repaint's worth
 * of work and the host drops the answer by key. Every band in one task, because the whole point of
 * being here is that this task is not the one the hand is on.
 */
function bake(request: ScreenBakeRequest): void {
  const { order } = request;
  const { height, key, width } = order;
  applyTunings(request.tunings);
  const surface = new OffscreenCanvas(width, height);
  const ink = surface.getContext("2d");
  // Never silent: a worker that cannot make a context is one the host must stop asking.
  if (ink === null) {
    self.postMessage({ t: "failed", key, detail: "no 2d context in the worker" });
    return;
  }
  const field = ink.createImageData(width, height);
  // Timed here and recorded there: a cost declared in this realm is one the page could never read
  // back, so what crosses is the span and the one accumulator for it is the shop's (0375).
  const at = request.measure ? performance.now() : 0;
  screenField(order, field.data);
  ink.putImageData(field, 0, 0);
  const bakeMs = request.measure ? performance.now() - at : 0;
  const tile = surface.transferToImageBitmap();
  self.postMessage({ t: "baked", key, tile, bakeMs }, [tile]);
}

self.addEventListener("message", (event: MessageEvent<ScreenBakeRequest>) => {
  try {
    bake(event.data);
  } catch (error) {
    self.postMessage({ t: "failed", key: event.data.order.key, detail: String(error) });
  }
});
