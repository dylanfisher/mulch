/**
 * @role The analysis worker — the message shell around src/lib/analysis.ts, so measuring a
 *   several-megabyte source happens off the thread that paints. It holds no arithmetic, no
 *   deck, no graph and no context: every reply is plain data carrying back the request id it
 *   answers (0025).
 * @instead The maths → src/lib/analysis.ts, which Node tests in milliseconds without a worker.
 *   Deciding whether a reply may be applied → src/app/analysis.ts, which owns the identity.
 */
import { analyzeBeats, type BeatAnalysis } from "@/lib/analysis";

/**
 * Measure these samples. `requestId` is the identity every reply carries back, so a host can
 * drop an answer about a source its deck no longer holds (docs/plan.md §2).
 */
export type AnalysisRequest = {
  t: "analyze";
  requestId: number;
  sampleRate: number;
  /**
   * One entry per channel. Structured-cloned rather than transferred — these are views onto
   * the AudioBuffer the deck is playing, and transferring one would detach it (0025).
   */
  channels: Float32Array[];
};

/** Abandon a request that has not started yet. Arrives as its own task, so it can win. */
export type AnalysisCancel = { t: "cancel"; requestId: number };

export type AnalysisMessage = AnalysisRequest | AnalysisCancel;

export type AnalysisResult =
  | ({ t: "analyzed"; requestId: number } & BeatAnalysis)
  | { t: "failed"; requestId: number; detail: string };

// The worker global. `lib` carries DOM and WebWorker together for the whole project, so `self`
// resolves to the window's shape; this module-local declaration is the narrower truth here.
declare const self: DedicatedWorkerGlobalScope;

/**
 * Requests are queued and drained on a later task rather than measured where they arrive. That
 * is what makes `cancel` mean anything: each message is delivered as its own task, so a cancel
 * posted in the same tick as the request it supersedes lands before the drain runs.
 */
const pending: AnalysisRequest[] = [];
const cancelled = new Set<number>();
let draining = false;

function schedule(): void {
  if (draining || pending.length === 0) return;
  draining = true;
  setTimeout(drain, 0);
}

function drain(): void {
  draining = false;
  const request = pending.shift();
  if (request === undefined) return;
  // One request per task, so a cancel for anything still queued behind this one is delivered
  // between them instead of waiting out the whole backlog.
  if (cancelled.delete(request.requestId)) {
    schedule();
    return;
  }
  try {
    const analysis: BeatAnalysis = analyzeBeats(request.channels, request.sampleRate);
    self.postMessage({ t: "analyzed", requestId: request.requestId, ...analysis });
  } catch (error) {
    // Never silent: a source this analyser cannot measure is a line on the host's log.
    self.postMessage({ t: "failed", requestId: request.requestId, detail: String(error) });
  }
  schedule();
}

self.addEventListener("message", (event: MessageEvent<AnalysisMessage>) => {
  const message = event.data;
  if (message.t === "cancel") {
    // Only for something still queued — a cancel for work already done would leak an id.
    if (pending.some((queued) => queued.requestId === message.requestId)) {
      cancelled.add(message.requestId);
    }
    return;
  }
  pending.push(message);
  schedule();
});
