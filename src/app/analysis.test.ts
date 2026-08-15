import { describe, expect, it } from "vitest";

import { createSessionStore, type DeckId } from "@/state/store";
import type { AnalysisMessage, AnalysisResult } from "@/workers/analysis";
import { createAnalyzer, type AnalysisPort } from "./analysis";
import type { EventBody } from "./events";

/**
 * The worker, as a test. It records what was posted and lets a test decide when — and whether —
 * a reply comes back, which is the whole of what staleness is made of.
 */
function fakePort() {
  const posted: AnalysisMessage[] = [];
  let deliver: ((result: AnalysisResult) => void) | null = null;
  let breakDown: ((detail: string) => void) | null = null;
  const port: AnalysisPort = {
    post: (message) => {
      posted.push(message);
    },
    listen: (onResult) => {
      deliver = onResult;
    },
    listenFailure: (onFailure) => {
      breakDown = onFailure;
    },
  };
  return {
    port,
    posted,
    reply: (result: AnalysisResult) => {
      if (deliver === null) throw new Error("nothing is listening for analysis results");
      deliver(result);
    },
    /** The worker died, rather than answering — no id, so nothing in flight can ever land. */
    crash: (detail: string) => {
      if (breakDown === null) throw new Error("nothing is listening for analysis failures");
      breakDown(detail);
    },
    /** The id of the nth `analyze` posted, so a test names a request the way the host does. */
    requestId: (index: number) => {
      const analyses = posted.filter((message) => message.t === "analyze");
      const found = analyses[index];
      if (found === undefined) throw new Error(`no analyze #${index} was posted`);
      return found.requestId;
    },
  };
}

const harness = () => {
  const worker = fakePort();
  const store = createSessionStore();
  const events: EventBody[] = [];
  const analyzer = createAnalyzer(worker.port, store, (body) => {
    events.push(body);
  });
  const analysis = (deck: DeckId) => store.getState().decks[deck].analysis;
  return { ...worker, store, events, analyzer, analysis };
};

const samples = () => [Float32Array.from([0.5, 0, -0.5, 0])];
const analyzed = (requestId: number): AnalysisResult => ({
  t: "analyzed",
  requestId,
  bpm: 120,
  onsets: [0, 0.5],
});

// One describe of small, independent cases; the length tracks how many ways a reply can be
// stale, not branching depth. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
describe("the analysis host", () => {
  it("applies a reply to the deck that asked for it", () => {
    const host = harness();
    host.analyzer.request("a", samples(), 48_000);
    expect(host.analysis("a")).toBeNull();
    host.reply(analyzed(host.requestId(0)));
    expect(host.analysis("a")).toEqual({ bpm: 120, onsets: [0, 0.5] });
    expect(host.events).toEqual([{ t: "deck.analyzed", deck: "a", bpm: 120, onsets: 2 }]);
  });

  it("drops a reply for a source the deck has already replaced", () => {
    const host = harness();
    host.analyzer.request("a", samples(), 48_000);
    const stale = host.requestId(0);
    host.analyzer.request("a", samples(), 48_000);
    // The first analysis finishes late, after the reload. It is about a buffer that is gone.
    host.reply({ t: "analyzed", requestId: stale, bpm: 90, onsets: [0.1] });
    expect(host.analysis("a")).toBeNull();
    expect(host.events).toEqual([]);
    // The current one still lands, so dropping the stale reply did not disarm the deck.
    host.reply(analyzed(host.requestId(1)));
    expect(host.analysis("a")).toEqual({ bpm: 120, onsets: [0, 0.5] });
  });

  it("drops a reply that arrives after the deck was invalidated", () => {
    const host = harness();
    host.analyzer.request("b", samples(), 48_000);
    const stale = host.requestId(0);
    host.analyzer.invalidate("b");
    host.reply(analyzed(stale));
    expect(host.analysis("b")).toBeNull();
    expect(host.events).toEqual([]);
  });

  it("clears what a deck was told the moment it loads something else", () => {
    const host = harness();
    host.analyzer.request("a", samples(), 48_000);
    host.reply(analyzed(host.requestId(0)));
    expect(host.analysis("a")).not.toBeNull();
    host.analyzer.request("a", samples(), 48_000);
    expect(host.analysis("a")).toBeNull();
  });

  it("cancels the request it superseded, and only that one", () => {
    const host = harness();
    host.analyzer.request("a", samples(), 48_000);
    const first = host.requestId(0);
    host.analyzer.request("a", samples(), 48_000);
    expect(host.posted.filter((message) => message.t === "cancel")).toEqual([
      { t: "cancel", requestId: first },
    ]);
    // A settled request has nothing to cancel: a reply already landed for it.
    host.reply(analyzed(host.requestId(1)));
    host.analyzer.invalidate("a");
    expect(host.posted.filter((message) => message.t === "cancel")).toHaveLength(1);
  });

  it("keeps two decks' requests apart", () => {
    const host = harness();
    host.analyzer.request("a", samples(), 48_000);
    host.analyzer.request("b", samples(), 48_000);
    host.reply({ t: "analyzed", requestId: host.requestId(1), bpm: 90, onsets: [0] });
    expect(host.analysis("a")).toBeNull();
    expect(host.analysis("b")).toEqual({ bpm: 90, onsets: [0] });
  });

  it("puts a failed analysis on the log and leaves the deck unmeasured", () => {
    const host = harness();
    host.analyzer.request("a", samples(), 48_000);
    host.reply({ t: "failed", requestId: host.requestId(0), detail: "RangeError: nope" });
    expect(host.analysis("a")).toBeNull();
    expect(host.events).toEqual([{ t: "error", detail: "deck a analysis: RangeError: nope" }]);
  });

  it("says so on the log when the worker dies, rather than leaving decks quietly unmeasured", () => {
    const host = harness();
    host.analyzer.request("a", samples(), 48_000);
    host.crash("worker failed to start");
    expect(host.analysis("a")).toBeNull();
    expect(host.events).toEqual([
      { t: "error", detail: "analysis worker: worker failed to start" },
    ]);
    // The dead worker's ids are forgotten, so a reply that somehow followed cannot be applied.
    host.reply(analyzed(host.requestId(0)));
    expect(host.analysis("a")).toBeNull();
  });

  it("posts only messages a worker boundary can actually carry", () => {
    const host = harness();
    host.analyzer.request("a", samples(), 48_000);
    host.analyzer.request("a", samples(), 48_000);
    expect(host.posted.length).toBeGreaterThan(1);
    for (const message of host.posted) {
      // Structured clone is the boundary a worker actually crosses: it takes the channels a
      // JSON round trip could not, and it refuses a function or a node either way.
      expect(structuredClone(message)).toEqual(message);
    }
  });
});
