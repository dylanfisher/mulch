/**
 * @role The main-thread end of one deck's loop reporter: the port's messages sorted into what the
 *   voice reads, the plans posted down it, and the sync barrier an offline render drains it with —
 *   a token that comes back once every plan before it has reached the processor and every report
 *   before it has reached this side (src/app/render.ts).
 * @instead The audio-thread half → src/audio/worklets/loop-reporter.js. What a report means to
 *   the transport → src/audio/deck.ts, which hands this the one reader it has.
 */
// A MessagePort's postMessage has no targetOrigin argument — that parameter belongs to
// window.postMessage, which this file never calls. The rule cannot tell the two apart.
// oxlint-disable unicorn/require-post-message-target-origin

/** What the processor posts back. Its own shape, declared where it is read (see worklets/). */
export type Reported =
  | { t: "started"; id: number; at: number; offset: number }
  | { t: "looped"; id: number; at: number; cycle: number }
  | { t: "held"; id: number; at: number }
  | { t: "xrun"; id: number; detail: string };

/** How long a sync may go unanswered before the render it barriers is refused (0036). */
const SYNC_TIMEOUT_MS = 5_000;

export type DeckReporter = {
  /** A plan, a re-anchoring, a rest's instant, or the null a halt posts (loop-reporter.js). */
  post(message: unknown): void;
  /** Resolves after the reporter has received every plan and returned every prior report. */
  sync(): Promise<void>;
  /** Close the port and let the node go; every sync still pending is forgotten with it. */
  dispose(): void;
};

export function createDeckReporter(
  reporter: AudioWorkletNode,
  onReport: (message: Reported) => void,
): DeckReporter {
  let nextSyncToken = 0;
  const pendingSyncs = new Map<
    number,
    { done: () => void; timeout: ReturnType<typeof setTimeout> }
  >();

  const listener = (event: MessageEvent<Reported | { t: "synced"; token: number }>) => {
    const message = event.data;
    if (message.t === "synced") {
      const pending = pendingSyncs.get(message.token);
      if (pending === undefined) return;
      pendingSyncs.delete(message.token);
      clearTimeout(pending.timeout);
      pending.done();
      return;
    }
    onReport(message);
  };
  reporter.port.addEventListener("message", listener);
  // addEventListener on a port does not imply start(); assigning onmessage would have.
  reporter.port.start();

  return {
    post: (message) => {
      reporter.port.postMessage(message);
    },
    sync: () =>
      new Promise<void>((done, reject) => {
        const token = nextSyncToken++;
        const timeout = setTimeout(() => {
          pendingSyncs.delete(token);
          reject(new Error(`audio reporter did not acknowledge sync ${token}`));
        }, SYNC_TIMEOUT_MS);
        pendingSyncs.set(token, { done, timeout });
        reporter.port.postMessage({ t: "sync", token });
      }),
    dispose: () => {
      reporter.port.removeEventListener("message", listener);
      reporter.port.close();
      reporter.disconnect();
      for (const pending of pendingSyncs.values()) clearTimeout(pending.timeout);
      pendingSyncs.clear();
    },
  };
}
