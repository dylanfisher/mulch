/**
 * @role One module worker as the three things a host needs from it: something to post, somewhere
 *   the replies arrive, and somewhere the worker's own failure arrives — a shape a test can be
 *   without a browser. Three hosts hold one of these now (the analysis, the curved rows' tiles and
 *   the screen's), so what a worker handle costs is written here and not once per host: the
 *   construction, the two listeners, and the two sentences a browser says when a worker will not
 *   start or a message will not cross (0354).
 * @instead Which worker, and what it is asked — src/app/analysis.ts, src/app/drift.ts,
 *   src/app/screen.ts, each of which **constructs its own `Worker` inline** and hands it here. That
 *   is not a style: a bundler rewrites `new Worker(new URL("…", import.meta.url), …)` where it is
 *   written and follows nothing handed in as a variable, so a helper that took the URL emitted no
 *   worker chunk at all and every worker in the built app failed to start. The workers themselves →
 *   src/workers/. Deciding when to ask, what to draw meanwhile and what happens where a port cannot
 *   be built → the shop that holds it.
 */

/** A worker, as the three things a host needs from it. `Out` is asked; `In` comes back. */
export type WorkerPort<Out, In> = {
  // Properties and not methods, because a host hands these straight on as its own port's members
  // and a method read off an object is a method a linter cannot see the `this` of.
  post: (message: Out) => void;
  listen: (onResult: (result: In) => void) => void;
  /**
   * The worker itself failed — a module that would not load, or a message neither side could
   * deserialise — so no reply carries a key to attribute it to. Every request in flight is now one
   * that will never answer, and the host puts the port down.
   */
  listenFailure: (onFailure: (detail: string) => void) => void;
};

/**
 * The three listeners around a worker the caller has already built. **The `new Worker(new URL(…,
 * import.meta.url), …)` stays at the call site**, because that is the expression a bundler rewrites
 * and it cannot follow a URL through a parameter: written here, the build emits no worker chunk and
 * every worker in the built app fails to start.
 */
export function workerPort<Out, In>(worker: Worker): WorkerPort<Out, In> {
  return {
    post: (message) => {
      // A Worker handle's postMessage takes no targetOrigin; that is window's overload.
      // oxlint-disable-next-line unicorn/require-post-message-target-origin
      worker.postMessage(message);
    },
    listen: (onResult) => {
      worker.addEventListener("message", (event: MessageEvent<In>) => {
        onResult(event.data);
      });
    },
    listenFailure: (onFailure) => {
      // A worker that never ran its first line fires a plain `Event` with no message on it, so the
      // sentence cannot read one off unguarded: "undefined" is what that said, and it named neither
      // the worker nor the fault.
      worker.addEventListener("error", (event: Event) => {
        const said = event instanceof ErrorEvent ? event.message : "";
        onFailure(said === "" ? "it failed to start" : said);
      });
      worker.addEventListener("messageerror", () => {
        onFailure("a reply could not be deserialised");
      });
    },
  };
}
