/**
 * @role The screen worker's port: the one place a `mulch-screen` worker is constructed, and the
 *   three things the tile shop needs from it. The same shape src/app/drift.ts holds for the curved
 *   rows, and here for the same two reasons — a worker entry point is reached through the tier that
 *   may import one (docs/map.md), and a port made of three functions is a worker a test can be.
 * @instead The bake itself → src/workers/screen.ts. Which tile is wanted, which one is drawn
 *   meanwhile, and what happens where this port cannot be built → src/ui/moireScreenShop.ts. This
 *   file writes no session state and sends no command: a tile is a picture and nothing durable.
 */
import type { ScreenBakeRequest, ScreenBakeResult } from "@/workers/screen";
import { workerPort } from "@/app/workerPort";

export type { ScreenBakeRequest, ScreenBakeResult };

/** The worker, as the three things the tile shop needs from it — so a test can be the worker. */
export type ScreenPort = {
  bake(request: ScreenBakeRequest): void;
  listen(onResult: (result: ScreenBakeResult) => void): void;
  /** The worker itself failed, so the shop puts the port down and bakes in slices on this thread. */
  listenFailure(onFailure: (detail: string) => void): void;
};

/**
 * Whether this browser can bake a screen tile off the thread the hand is on. Both halves are
 * needed: the worker to run in and the `OffscreenCanvas` to draw on inside it.
 */
export const screenOffThread = (): boolean =>
  typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined";

/** The real port. One worker per page, built on the first screen tile and never before. */
export function screenWorkerPort(): ScreenPort {
  const port = workerPort<ScreenBakeRequest, ScreenBakeResult>(
    // Inline, and it may not be lifted: a bundler rewrites this expression where it stands.
    new Worker(new URL("../workers/screen.ts", import.meta.url), {
      type: "module",
      name: "mulch-screen",
    }),
  );
  return { bake: port.post, listen: port.listen, listenFailure: port.listenFailure };
}
