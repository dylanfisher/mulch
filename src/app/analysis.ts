/**
 * @role The analysis host: one worker port, one live request per deck, and the transient
 *   `analysis` the store carries. A reply whose deck has moved on is dropped before it can be
 *   applied — async work carries identity so stale completion cannot overwrite newer state
 *   (docs/plan.md §2, 0025).
 * @instead The maths → src/lib/analysis.ts. The worker shell → src/workers/analysis.ts. What a
 *   snapped edge then does → the ordinary `deck.loop` command in src/app/execute.ts.
 */
import type { BeatAnalysis } from "@/lib/analysis";
import { type DeckId, patchDeck, type SessionStore } from "@/state/store";
import type { AnalysisMessage, AnalysisResult } from "@/workers/analysis";
import type { EventBody } from "./events";

/** The worker, as the three things this file needs from it — so a test can be the worker. */
export type AnalysisPort = {
  post(message: AnalysisMessage): void;
  listen(onResult: (result: AnalysisResult) => void): void;
  /**
   * The worker itself failed, so no reply carries an id to attribute it to: a module that would
   * not load, or a message neither side could deserialise. Every live request is now one that
   * will never answer, and a deck silently stuck at `analysis: null` is exactly the quiet
   * fallback principle 5 forbids — so this reaches the log instead.
   */
  listenFailure(onFailure: (detail: string) => void): void;
};

export type Analyzer = {
  /**
   * Measure what this deck just loaded. Supersedes anything still in flight for it, and clears
   * what the deck was previously told: the old answer describes a buffer that has gone.
   */
  request(deck: DeckId, channels: readonly Float32Array[], sampleRate: number): void;
  /** This deck holds nothing worth measuring. Drops any live request and clears the deck. */
  invalidate(deck: DeckId): void;
  /** Requests the worker has not answered yet. This map is the only place that number lives. */
  inFlight(): number;
};

/**
 * The real port. One module worker per instrument, created by the host that has a DOM; the
 * offline render host passes no analyzer at all, because a render measures nothing.
 */
export function workerAnalysisPort(): AnalysisPort {
  const worker = new Worker(new URL("../workers/analysis.ts", import.meta.url), {
    type: "module",
    name: "mulch-analysis",
  });
  return {
    post: (message) => {
      // A Worker handle's postMessage takes no targetOrigin; that is window's overload.
      // oxlint-disable-next-line unicorn/require-post-message-target-origin
      worker.postMessage(message);
    },
    listen: (onResult) => {
      worker.addEventListener("message", (event: MessageEvent<AnalysisResult>) => {
        onResult(event.data);
      });
    },
    listenFailure: (onFailure) => {
      worker.addEventListener("error", (event: ErrorEvent) => {
        onFailure(event.message === "" ? "worker failed to start" : event.message);
      });
      worker.addEventListener("messageerror", () => {
        onFailure("a reply could not be deserialised");
      });
    },
  };
}

// Over the line cap by design: this closure owns the two identity maps and every member that
// reads them, and each member is a few lines. Splitting it means threading both maps through
// helpers with one caller each. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function createAnalyzer(
  port: AnalysisPort,
  store: SessionStore,
  /** The same shape src/app/execute.ts's Runtime takes; analysis emits one kind of event. */
  emit: (body: EventBody) => void,
): Analyzer {
  /** Which deck asked for a request id, and which id each deck is currently waiting on. */
  const owner = new Map<number, DeckId>();
  const live = new Map<DeckId, number>();
  let issued = 0;

  const drop = (deck: DeckId): void => {
    const previous = live.get(deck);
    if (previous === undefined) return;
    live.delete(deck);
    owner.delete(previous);
    // Correctness is the identity check below; this only saves the work.
    port.post({ t: "cancel", requestId: previous });
  };

  port.listen((result) => {
    const deck = owner.get(result.requestId);
    // The deck has moved on — a reload, an undo, an import. This answer is about a buffer it
    // no longer holds, so it is data about nothing and must not overwrite newer state.
    if (deck === undefined) return;
    owner.delete(result.requestId);
    live.delete(deck);
    if (result.t === "failed") {
      emit({ t: "error", detail: `deck ${deck} analysis: ${result.detail}` });
      return;
    }
    const analysis: BeatAnalysis = { bpm: result.bpm, onsets: result.onsets };
    patchDeck(store, deck, { analysis });
    // The candidates themselves stay on probe(); the log carries the tempo and how many (0025).
    emit({ t: "deck.analyzed", deck, bpm: analysis.bpm, onsets: analysis.onsets.length });
  });

  port.listenFailure((detail) => {
    // Nothing in flight can answer now. Forget it, so a later worker is not shadowed by ids
    // no reply will ever carry, and say so once rather than leaving decks quietly unmeasured.
    owner.clear();
    live.clear();
    emit({ t: "error", detail: `analysis worker: ${detail}` });
  });

  return {
    request: (deck, channels, sampleRate) => {
      drop(deck);
      const requestId = ++issued;
      owner.set(requestId, deck);
      live.set(deck, requestId);
      patchDeck(store, deck, { analysis: null });
      port.post({ t: "analyze", requestId, sampleRate, channels: [...channels] });
    },
    invalidate: (deck) => {
      drop(deck);
      patchDeck(store, deck, { analysis: null });
    },
    inFlight: () => live.size,
  };
}
