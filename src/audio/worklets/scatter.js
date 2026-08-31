// @role The scatter stage's per-sample work, on the audio thread: a circular capture of the last
//   few seconds of everything that passed through, and a trigger that opens a short window
//   somewhere inside it, gated in and out at its own edge.
//
// Plain JavaScript, not TypeScript, for the reason ./loop-reporter.js gives: a worklet is its own
// module graph, loaded by URL rather than imported, and a .ts file would reach the browser
// untransformed. The kernels below are `export`ed the way ./pop.js's are, so ./scatter.test.ts
// drives the real arithmetic rather than a second copy of it.
//
// **This stage hears what passes through it and nothing else.** It cannot read the deck's buffer
// and does not know where the loop is: the transport is the one thing that may move a read
// position, so "how far back" here is how far back in what this node has heard (0030, and the
// rack's own place in src/audio/chain.ts).
//
// Two classes, and one of them is the processor, for the reason ./pop.js gives: the stage and the
// processor that drives it are one per-sample path and a worklet has no bundler to split them
// across (0007).
// oxlint-disable max-classes-per-file
//
// Nothing here reads Math.random(): every draw is an xorshift seeded from a constant, so two
// renders of one session are the same file by construction (0068).

/**
 * How much of the past this stage keeps, in seconds — and so the top of Reach, which is "up to the
 * whole capture". Written twice: ../effects/scatter.ts declares the same number as the maximum of
 * its own Reach, and ./scatter.test.ts asserts the descriptors against that declaration.
 */
export const CAPTURE_SECS = 4;

/**
 * How often a window may be taken, in seconds — the rate the trigger is offered a chance at, which
 * Odds is the chance of. Stated as a time rather than left at the block rate so the density a knob
 * asks for is the same at every sample rate and every render quantum: at 128 frames the block rate
 * is under three milliseconds, and an Odds of a half would mean two hundred windows a second.
 */
const SLICE_SECS = 1 / 32;

/** The seed every draw here comes from. A constant, so a render is a spec (0068). */
const NOISE_SEED = 0x5c_a7_7e_11;

/** Anything under this is a denormal in all but name; flushed for the reason ./pop.js's copy is. */
const DENORMAL = 1e-18;

/**
 * The rate this worklet runs at. `sampleRate` is a global the browser puts on the worklet scope
 * and is constant for the life of a context, so it is read once, here, and named.
 * @type {number}
 */
const RATE = sampleRate;

/** Flush a denormal — or a non-finite — to zero, for the reason ./pop.js's copy of this gives.
 * @param {number} value @returns {number}
 */
export function flush(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.abs(value) < DENORMAL ? 0 : value;
}

/**
 * A deterministic draw in [0, 1): xorshift32, seeded rather than drawn from `Math.random()`,
 * because a render is a spec and two runs of one session are one file (0068). ./tape.js's own
 * source is the same generator read as [-1, 1) for noise; this one is read as a fraction, because
 * what it decides here is a chance and a share of a knob rather than a sample.
 * @param {number} seed @returns {() => number}
 */
export function drawSource(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
}

/**
 * What one window actually uses of a knob, given how much of it is drawn rather than held. At a
 * `stray` of nothing every window is exactly what the knob says; at one it is anywhere from
 * nothing up to it; in between the knob is the ceiling and `stray` is how far under it a window
 * may fall. One line for all four of the drawn knobs, which is what makes Stray one knob rather
 * than four.
 * @param {number} value @param {number} stray @param {number} draw @returns {number}
 */
export function drawnValue(value, stray, draw) {
  return value * (1 - stray * draw);
}

/**
 * How far open the gate stands `elapsed` seconds into a window of `span`, as a fraction of what
 * the gate was asked for: up over `edge`, held, and down over `edge` again, and nothing at all
 * outside the window. Where the window is shorter than two edges the two ramps meet before either
 * arrives, so a short window at a long edge is a swell that never fully opens rather than a click
 * — which is the whole of what Edge does, and the reason it is not clamped to the span instead.
 * @param {number} elapsed @param {number} span @param {number} edge @returns {number}
 */
export function windowGain(elapsed, span, edge) {
  if (elapsed <= 0 || elapsed >= span) return 0;
  if (!(edge > 0)) return 1;
  return Math.min(1, elapsed / edge, (span - elapsed) / edge);
}

/**
 * The whole stage for one stereo pair: the capture, the trigger and the window. One object rather
 * than one per channel, because when a window opens and how far back it is taken from are facts
 * about the pair — two channels triggering separately would move the image every time one opened.
 */
export class ScatterStage {
  /** @param {number} rate */
  constructor(rate) {
    this.rate = rate;
    this.length = Math.max(1, Math.round(CAPTURE_SECS * rate));
    /** The capture itself: the last `CAPTURE_SECS` of both channels, written every sample. */
    this.left = new Float32Array(this.length);
    this.right = new Float32Array(this.length);
    this.write = 0;
    /**
     * How much of the capture has actually been heard, in samples. A window is taken from what
     * passed through and never from further back than that: the buffer starts as silence, and
     * replaying silence the stage was never given would make the first seconds of every render a
     * gate rather than a scatter.
     *
     * **Capped one short of the buffer's own length**, which is the whole of what a circular
     * buffer can hold: the Nth lap back lands on the sample being written this instant, so a
     * window taken from there would replay what is passing through and the effect would do
     * exactly nothing at the top of Reach — its one advertised extreme.
     */
    this.heard = 0;
    this.draw = drawSource(NOISE_SEED);
    this.slice = Math.max(1, Math.round(SLICE_SECS * rate));
    /** Samples since the last chance at a window; only counted while none is open. */
    this.since = 0;
    /** Whether a window is open, and what it was opened with. */
    this.open = false;
    this.elapsed = 0;
    this.spanSamples = 0;
    this.back = 0;
    this.level = 0;
    this.edgeSecs = 0;
    this.spanSecs = 0;
  }

  /**
   * Open a window here: three draws, one per knob that Stray reaches, and the fourth for how far
   * open its gate stands. Drawn once at the opening rather than per sample, because a window is
   * one piece taken from one place — a reach that moved under it would be a pitch bend.
   * @param {number} reach @param {number} span @param {number} edge @param {number} stray
   */
  begin(reach, span, edge, stray) {
    const back = drawnValue(reach, stray, this.draw());
    this.spanSecs = drawnValue(span, stray, this.draw());
    this.edgeSecs = drawnValue(edge, stray, this.draw());
    this.level = drawnValue(1, stray, this.draw());
    this.spanSamples = Math.max(1, Math.round(this.spanSecs * this.rate));
    // At least a sample back, and never further than has been heard: the read head runs at the
    // write head's own speed, so this gap is constant for the life of the window and the one can
    // never overtake the other.
    this.back = Math.min(Math.max(1, Math.round(back * this.rate)), this.heard);
    this.elapsed = 0;
    this.open = true;
  }

  /**
   * Fill `outLeft` and `outRight` for one block. `reach`, `span`, `odds`, `edge` and `stray` are
   * this block's values, read once because a k-rate worklet parameter is one number per block;
   * `gate` is a-rate and is read per sample, because it is this entry's own presence and a fade
   * across 128 frames is what an automator's arrival sounds like (0202, 0209).
   * @param {Float32Array} inLeft @param {Float32Array} inRight @param {Float32Array} outLeft
   * @param {Float32Array} outRight @param {number} reach @param {number} span @param {number} odds
   * @param {number} edge @param {number} stray @param {Float32Array} gate
   */
  // The per-sample path: capture, trigger, window and blend are one pass over one block, and the
  // three of them split into helpers would be three passes over the same samples (0007).
  // oxlint-disable-next-line max-lines-per-function
  run(inLeft, inRight, outLeft, outRight, reach, span, odds, edge, stray, gate) {
    for (let i = 0; i < outLeft.length; i++) {
      const dryLeft = inLeft[i];
      const dryRight = inRight[i];
      this.left[this.write] = dryLeft;
      this.right[this.write] = dryRight;
      if (this.heard < this.length - 1) this.heard++;

      if (!this.open) {
        this.since++;
        if (this.since >= this.slice) {
          this.since = 0;
          // The one place Odds is spent, and it is spent whether or not a window follows: a draw
          // taken only when it would open would make the run's sequence depend on the knob's
          // history rather than on the seed.
          if (this.draw() < odds) this.begin(reach, span, edge, stray);
        }
      }

      let wetLeft = dryLeft;
      let wetRight = dryRight;
      if (this.open) {
        const at = this.write - this.back;
        const read = at < 0 ? at + this.length : at;
        const shape = windowGain(this.elapsed / this.rate, this.spanSecs, this.edgeSecs);
        // The blend, in the kernel that already holds the dry sample beside the piece: linear, and
        // toward the piece rather than summed with it, so the gate is how far the window replaces
        // what is passing through rather than how loud a second copy of it is (0209).
        const blend = shape * this.level * (gate.length === 1 ? gate[0] : gate[i]);
        wetLeft = dryLeft + (this.left[read] - dryLeft) * blend;
        wetRight = dryRight + (this.right[read] - dryRight) * blend;
        this.elapsed++;
        if (this.elapsed >= this.spanSamples) this.open = false;
      }

      outLeft[i] = flush(wetLeft);
      outRight[i] = flush(wetRight);
      this.write = this.write + 1 >= this.length ? 0 : this.write + 1;
    }
  }
}

/**
 * The processor. Its parameter names are ../effects/scatter.ts's declared parameter ids, spelled
 * again here for the reason ./pop.js gives: a worklet imports nothing, so the pair is written twice
 * and a mismatch is a silent no-op on an AudioParam nobody is reading.
 */
export class ScatterGrains extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "scatter.reach",
        defaultValue: 1,
        minValue: 0.01,
        maxValue: CAPTURE_SECS,
        automationRate: "k-rate",
      },
      {
        name: "scatter.span",
        defaultValue: 0.12,
        minValue: 0.01,
        maxValue: 1,
        automationRate: "k-rate",
      },
      {
        name: "scatter.odds",
        defaultValue: 0.5,
        minValue: 0,
        maxValue: 1,
        automationRate: "k-rate",
      },
      // The one a-rate parameter, and for the reason ./pop.js's mix is: this is the parameter this
      // entry declares its presence on, so an automator fades the whole effect in and out on it,
      // and a fade quantized to 128 frames is a staircase (0202, 0209).
      {
        name: "scatter.gate",
        defaultValue: 0.8,
        minValue: 0,
        maxValue: 1,
        automationRate: "a-rate",
      },
      {
        name: "scatter.edge",
        defaultValue: 0.01,
        minValue: 0.001,
        maxValue: 0.2,
        automationRate: "k-rate",
      },
      {
        name: "scatter.stray",
        defaultValue: 0.3,
        minValue: 0,
        maxValue: 1,
        automationRate: "k-rate",
      },
    ];
  }

  constructor() {
    super();
    /** @type {ScatterStage | null} */
    this.stage = null;
    /**
     * Whether the main thread has let this node go — the same fact ./pop.js keeps, and for the
     * same reason: a processor that always returns true is an active source for the life of its
     * context, and an offline context is never closed (0086).
     */
    this.stopped = false;
    /** One block of nothing, kept: a silent upstream must not allocate per quantum. */
    this.silence = new Float32Array(0);
    /** Where the right channel goes when this node is built with one output channel, which a mono
     * yard is: the plugin takes the count that arrives rather than forcing two
     * (../effects/scatter.ts), so on a mono deck this is the block that is thrown away. */
    this.discard = new Float32Array(0);
    this.port.addEventListener("message", (event) => {
      if (event.data?.t === "stop") this.stopped = true;
    });
    // addEventListener on a port does not imply start(); assigning onmessage would have.
    this.port.start();
  }

  /**
   * @param {Float32Array[][]} inputs @param {Float32Array[][]} outputs
   * @param {Record<string, Float32Array>} parameters @returns {boolean}
   */
  process(inputs, outputs, parameters) {
    if (this.stopped) return false;
    const output = outputs[0];
    const outLeft = output[0];
    const input = inputs[0] ?? [];
    if (this.silence.length < outLeft.length) this.silence = new Float32Array(outLeft.length);
    if (output[1] === undefined && this.discard.length < outLeft.length) {
      this.discard = new Float32Array(outLeft.length);
    }
    const outRight = output[1] ?? this.discard;
    // A source that has stopped delivers an input with no channels, and a mono upstream delivers
    // one: both are a pair here, so the capture always has two channels to write.
    const inLeft = input[0] ?? this.silence;
    const inRight = input[1] ?? inLeft;

    this.stage ??= new ScatterStage(RATE);
    this.stage.run(
      inLeft,
      inRight,
      outLeft,
      outRight,
      parameters["scatter.reach"][0],
      parameters["scatter.span"][0],
      parameters["scatter.odds"][0],
      parameters["scatter.edge"][0],
      parameters["scatter.stray"][0],
      parameters["scatter.gate"],
    );
    // True until the main thread says otherwise: the capture is this stage's memory, and a
    // processor collected between two windows would take the last few seconds with it.
    return true;
  }
}

// The main thread's copy of this name is SCATTER_GRAINS in ../worklet.ts, and the pair is asserted
// by ../worklet.test.ts. A worklet can import nothing, so the string is unavoidably written twice.
registerProcessor("scatter-grains", ScatterGrains);
