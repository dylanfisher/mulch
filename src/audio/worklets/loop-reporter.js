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
      // A block can legitimately owe more than one cycle — a loop just over a quantum long
      // lands two in a block that ran late — so this catches up rather than reporting a count.
      // The cap is what keeps that unbounded loop off the audio thread no matter what was
      // posted: the main thread floors the period (RENDER_QUANTUM in ../deck.ts), and if that
      // guard ever fails, this thread refuses the plan loudly instead of wedging inside one
      // process() call and taking the tab's audio with it.
      let reported = 0;
      while (this.cycle < completed) {
        if (reported >= MAX_CYCLES_PER_BLOCK) {
          this.plan = null;
          this.port.postMessage({
            t: "xrun",
            detail: `loop period ${plan.period}s owes more than ${MAX_CYCLES_PER_BLOCK} cycles in one block — reporting stopped`,
          });
          return true;
        }
        this.cycle += 1;
        reported += 1;
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
