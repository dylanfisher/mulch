/**
 * @role The drift worker's port: the one place a `mulch-drift` worker is constructed, and the three
 *   things the picture needs from it. The same shape src/app/analysis.ts holds for the analysis
 *   worker, and here for the same two reasons — a worker entry point is reached through the tier
 *   that may import one (docs/map.md), and a port made of three functions is a worker a test can be.
 * @instead The bake itself → src/workers/drift.ts. Which tile is wanted, which one is drawn
 *   meanwhile, and what happens where this port cannot be built → src/ui/driftTiles.ts. This file
 *   writes no session state and sends no command: a tile is a picture and nothing durable (0144).
 */
import type { DriftBakeRequest, DriftBakeResult } from "@/workers/drift";
import { workerPort } from "@/app/workerPort";

export type { DriftBakeRequest, DriftBakeResult };

/** The worker, as the three things the tile shop needs from it — so a test can be the worker. */
export type DriftPort = {
  bake(request: DriftBakeRequest): void;
  listen(onResult: (result: DriftBakeResult) => void): void;
  /**
   * The worker itself failed — a module that would not load, or a message neither side could
   * deserialise — so no reply carries a key to attribute it to. Every bake in flight is now one
   * that will never answer, and the shop puts the port down and bakes on this thread instead.
   */
  listenFailure(onFailure: (detail: string) => void): void;
};

/**
 * Whether this browser can bake off the thread the hand is on. Both halves are needed: the worker
 * to run in and the `OffscreenCanvas` to draw on inside it.
 */
export const driftOffThread = (): boolean =>
  typeof Worker !== "undefined" && typeof OffscreenCanvas !== "undefined";

/** The real port. One worker per page, built by the shop on the first curved row and never before. */
export function driftWorkerPort(): DriftPort {
  const port = workerPort<DriftBakeRequest, DriftBakeResult>(
    // Inline, and it may not be lifted: a bundler rewrites this expression where it stands.
    new Worker(new URL("../workers/drift.ts", import.meta.url), {
      type: "module",
      name: "mulch-drift",
    }),
  );
  return { bake: port.post, listen: port.listen, listenFailure: port.listenFailure };
}
