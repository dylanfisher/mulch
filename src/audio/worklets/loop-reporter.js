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
 * A plan is `{ startTime, offset, period }`, posted when a deck starts and `null` when it stops.
 * `period` is the loop length in seconds, or 0 for a source that plays through once.
 */
class LoopReporter extends AudioWorkletProcessor {
  constructor() {
    super();
    this.plan = null;
    this.cycle = 0;
    this.started = false;
    this.port.addEventListener("message", (event) => {
      this.plan = event.data;
      this.cycle = 0;
      this.started = false;
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
      this.port.postMessage({ t: "started", at: plan.startTime, offset: plan.offset });
    }

    if (plan.period > 0) {
      const completed = Math.floor((currentTime - plan.startTime) / plan.period);
      // A loop shorter than a render quantum completes more than once per block. Reporting the
      // count would drop cycles from the log; the loop below reports each one it owes.
      while (this.cycle < completed) {
        this.cycle += 1;
        this.port.postMessage({
          t: "looped",
          at: plan.startTime + this.cycle * plan.period,
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
