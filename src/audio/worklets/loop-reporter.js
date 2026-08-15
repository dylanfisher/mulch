// @role The transport's ear on the audio thread: it reports when a deck actually started and
//   each time playback crossed its loop point. One source for those two facts — the main thread
//   never infers them from a timer as well (docs/plan.md §1).
//
// Plain JavaScript, not TypeScript, on purpose: a worklet is its own module graph with no
// bundler preamble, loaded by URL rather than imported (see ../worklet.ts). A .ts file would be
// copied to the output untransformed and reach the browser as a syntax error.
//
// It produces no audio. Its output is silence and its connection exists only so the audio thread
// keeps pulling it — the timing it reports is `currentTime`, read on the thread that owns it,
// which is the whole reason this is a worklet and not a setInterval.

/**
 * How many loop boundaries one block may owe before the plan is treated as impossible. A block
 * is 128 frames; a period at or above that can put at most one or two cycles in one block, so
 * this is orders of magnitude of headroom, and the only thing it can catch is a bad plan.
 */
const MAX_CYCLES_PER_BLOCK = 64;

/**
 * A plan is `{ startTime, offset, period, rate, phase, id, base, resume }`, posted when a deck
 * starts and `null` when it stops. `period` is the loop length in *buffer* seconds, or 0 for a
 * source that plays through once; `rate` is how many buffer seconds one second of clock buys, so
 * a cycle costs `period / rate` of this thread's `currentTime` and a deck at 2× reports its
 * boundaries twice as often. `phase` is how far into the cycle the source already was at
 * `startTime`, and `base` how many boundaries it had already crossed by then — both zero for a
 * plan a play created, and non-zero only for one a rate change re-anchored mid-flight.
 *
 * `resume` says exactly that: the source never stopped, so the "it started" fact is kept and the
 * cycle counter carries on. It is an absolute count rather than a per-plan index because the two
 * clocks disagree by up to a block either way: the re-anchored plan is computed from the main
 * thread's `currentTime`, so `base` can be one behind a boundary this thread has already
 * reported — reported again, that would be a repeat — or one ahead of one it has not reported
 * yet. Comparing the count against `base + completed` answers both: a boundary is announced when
 * it is genuinely new and never twice (../deck.ts, 0031).
 *
 * `id` names the plan: this thread's clock runs ahead of the main thread's, so a report can be
 * in flight when the plan it describes is halted over there — every message echoes the id, and
 * the main thread drops echoes of a plan it no longer holds (../deck.ts).
 */
class LoopReporter extends AudioWorkletProcessor {
  constructor() {
    super();
    this.plan = null;
    /** The absolute count, across re-anchorings — the highest boundary already reported. */
    this.cycle = 0;
    this.started = false;
    this.port.addEventListener("message", (event) => {
      if (event.data?.t === "sync") {
        // Messages on each side of one port are ordered. Receiving this echo therefore means
        // every plan before it reached the processor, and every report before it reached the
        // main thread — the deterministic offline-render barrier in src/app/render.ts.
        this.port.postMessage({ t: "synced", token: event.data.token });
        return;
      }
      this.plan = event.data;
      const resume = event.data !== null && event.data.resume === true;
      this.cycle = resume ? this.cycle : 0;
      this.started = resume ? this.started : false;
    });
    // addEventListener on a port does not imply start(); assigning onmessage would have.
    this.port.start();
  }

  process() {
    const plan = this.plan;
    if (plan === null) return true;

    // `currentTime` is the start of this block, so a boundary is reported within one render
    // quantum of it — but the time reported is the exact one arithmetic gives, never the
    // block's. The event carries when it happened, not when it was noticed.
    if (!this.started && currentTime >= plan.startTime) {
      this.started = true;
      this.port.postMessage({ t: "started", id: plan.id, at: plan.startTime, offset: plan.offset });
    }

    if (plan.period > 0) {
      // The main thread reads the same plan as a remainder (playheadAt in src/lib/timeline.ts,
      // which a worklet cannot import) and as this same floor division (`cyclesAt`). Change the
      // plan's shape and change both. Wall becomes buffer time once, here, by the plan's rate.
      const progress = plan.phase + Math.max(0, currentTime - plan.startTime) * plan.rate;
      const completed = plan.base + Math.floor(progress / plan.period);
      // A block can legitimately owe more than one cycle — a loop just over a quantum long
      // lands two in a block that ran late — so this catches up rather than reporting a count.
      // The cap is what keeps that unbounded loop off the audio thread no matter what was
      // posted: the main thread floors the period (RENDER_QUANTUM in ../transport.ts), and if that
      // guard ever fails, this thread refuses the plan loudly instead of wedging inside one
      // process() call and taking the tab's audio with it.
      let reported = 0;
      while (this.cycle < completed) {
        if (reported >= MAX_CYCLES_PER_BLOCK) {
          this.plan = null;
          this.port.postMessage({
            t: "xrun",
            id: plan.id,
            detail: `loop period ${plan.period}s owes more than ${MAX_CYCLES_PER_BLOCK} cycles in one block — reporting stopped`,
          });
          return true;
        }
        this.cycle += 1;
        reported += 1;
        this.port.postMessage({
          t: "looped",
          id: plan.id,
          // cycleTimeAt in src/lib/timeline.ts, from this side of the seam: a cycle costs
          // `period / rate` seconds of clock, and the time reported is the boundary's own.
          at: plan.startTime + ((this.cycle - plan.base) * plan.period - plan.phase) / plan.rate,
          cycle: this.cycle,
        });
      }
    }
    return true;
  }
}

// The main thread's copy of this name is LOOP_REPORTER in ../worklet.ts. A worklet can import
// nothing, so the string is unavoidably written twice; change one and change the other, or
// `new AudioWorkletNode` throws at construction.
registerProcessor("loop-reporter", LoopReporter);
