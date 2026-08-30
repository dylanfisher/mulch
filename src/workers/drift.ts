/**
 * @role The drift worker — the message shell around the one loop over a picture's pixels, so a
 *   curved row's tile is baked off the thread the hand is on. It holds no arithmetic of its own, no
 *   canvas of the page's and no state past the request it is answering: every reply carries back the
 *   key it was asked under, and the tile comes back as an `ImageBitmap` a 2D context can draw
 *   straight (0025, 0144).
 * @instead The maths → src/lib/moireGeometry.ts, which Node tests without a canvas at all. Deciding
 *   which tile is wanted, which one is drawn meanwhile, and what happens where this worker cannot be
 *   built → src/ui/driftTiles.ts. Drawing the tiles → src/ui/moireCanvas.ts.
 */
import type { DriftGeometry } from "@/lib/moire";
import type { DriftProfile } from "@/lib/moireProfiles";
import { curvedField, type DriftPlace } from "@/lib/moireGeometry";

/** Bake this tile. `key` is the identity the reply carries back; nothing else identifies a bake. */
export type DriftBakeRequest = {
  t: "bake";
  key: string;
  width: number;
  height: number;
  geometry: DriftGeometry;
  profile: DriftProfile;
  place: DriftPlace;
  ref: number;
};

export type DriftBakeResult =
  | { t: "baked"; key: string; tile: ImageBitmap }
  | { t: "failed"; key: string; detail: string };

// The worker global. `lib` carries DOM and WebWorker together for the whole project, so `self`
// resolves to the window's shape; this module-local declaration is the narrower truth here.
declare const self: DedicatedWorkerGlobalScope;

/**
 * One tile. There is no queue and no cancel: a request that is already stale is one repaint's worth
 * of work and the host drops the answer by key, where an analysis of a several-megabyte source is
 * seconds and is worth queueing (src/workers/analysis.ts).
 */
function bake(request: DriftBakeRequest): void {
  const { height, key, width } = request;
  const surface = new OffscreenCanvas(width, height);
  const ink = surface.getContext("2d");
  // Never silent: a worker that cannot make a context is one the host must stop asking.
  if (ink === null) {
    self.postMessage({ t: "failed", key, detail: "no 2d context in the worker" });
    return;
  }
  const field = ink.createImageData(width, height);
  curvedField(
    field.data,
    width,
    height,
    request.geometry,
    request.profile,
    request.place,
    request.ref,
  );
  ink.putImageData(field, 0, 0);
  const tile = surface.transferToImageBitmap();
  self.postMessage({ t: "baked", key, tile }, [tile]);
}

self.addEventListener("message", (event: MessageEvent<DriftBakeRequest>) => {
  try {
    bake(event.data);
  } catch (error) {
    self.postMessage({ t: "failed", key: event.data.key, detail: String(error) });
  }
});
