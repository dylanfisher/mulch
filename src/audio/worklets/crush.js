// @role The crush stage's per-sample work, on the audio thread: the sample-and-hold that decimates
//   what passes through, the quantiser that rounds what is held onto a countable number of levels,
//   and the dry/wet crossfade — which happens *here*, because the kernel holds the dry and the wet
//   sample at once (0209).
//
// Plain JavaScript, not TypeScript, for the reason ./loop-reporter.js gives: a worklet is its own
// module graph, loaded by URL rather than imported, and a .ts file would reach the browser
// untransformed. The kernels below are `export`ed the way ./pop.js's are, so ./crush.test.ts drives
// the real arithmetic rather than a second copy of it.
//
// Two classes, and one of them is the processor: the stage and the processor that drives it are a
// single per-sample path, and a worklet has no bundler to split them across — a second file would
// have to be loaded as a second module nothing imports (0007). The rule reports at the file, so
// the waiver is the file's; ./pop.js is the same shape for the same reason.
// oxlint-disable max-classes-per-file
//
// Nothing here reads Math.random(): there is no noise source in this file at all, so two renders
// of one session are the same file by construction (0068).

/**
 * The rate this worklet runs at. `sampleRate` is a global the browser puts on the worklet scope
 * and is constant for the life of a context, so it is read once, here, and named.
 * @type {number}
 */
const RATE = sampleRate;

/**
 * How many quantisation levels a bit depth is, either side of nothing: a whole bit is the sign and
 * the rest are the resolution, so one bit is three values — up, nothing, down — and sixteen is
 * finer than anything that reaches a converter. Fractional depths are on the line between two
 * whole ones on purpose: the knob carries an automation lane, and a lane that could only arrive at
 * whole bits would be a staircase of staircases.
 * @param {number} bits @returns {number}
 */
export function levelsOf(bits) {
  return 2 ** (bits - 1);
}

/**
 * One sample rounded onto `levels` steps either side of nothing. Uniform in amplitude rather than
 * in decibels, which is what makes it a converter's own dirt: the error is the same size at every
 * level, so a quiet passage is where it is heard and a loud one buries it.
 *
 * Nothing is clamped here. A sample above one comes out above one, and the rack is a series chain
 * whose stages are free to hand each other more than unity — clamping would be a limiter this
 * entry never advertised.
 * @param {number} sample @param {number} levels @returns {number}
 */
export function quantise(sample, levels) {
  return Math.round(sample * levels) / levels;
}

/**
 * The whole stage for one stereo pair: the hold's own phase, the pair of held samples and the
 * crossfade. One phase over the pair rather than one per channel, because a hold that ran twice
 * would take the left channel a sample before the right and the image would move with the knob.
 */
export class CrushStage {
  /** @param {number} rate */
  constructor(rate) {
    this.rate = rate;
    /**
     * How far through the current held sample this stage stands, on 0..1. It starts at one so the
     * first sample of the first block is taken rather than held over from a stage that has heard
     * nothing — a hold that opened at nought would write a block of silence into the front of
     * every fresh instance.
     */
    this.phase = 1;
    this.heldLeft = 0;
    this.heldRight = 0;
  }

  /**
   * Fill `outLeft` and `outRight` for one block. `bits` and `hz` are this block's values, read once
   * because a k-rate worklet parameter is one number per block; `mix` is a-rate and is read per
   * sample, because it is the one value here that a lane rides and a fade across 128 frames is what
   * an automator's arrival sounds like (0209).
   * @param {Float32Array} inLeft @param {Float32Array} inRight @param {Float32Array} outLeft
   * @param {Float32Array} outRight @param {number} bits @param {number} hz @param {Float32Array} mix
   */
  run(inLeft, inRight, outLeft, outRight, bits, hz, mix) {
    const levels = levelsOf(bits);
    // A hold asked for faster than the context runs is a hold of one sample, which is no hold at
    // all: the step is capped at a whole sample so the phase cannot skip a take.
    const step = Math.min(hz / this.rate, 1);
    for (let i = 0; i < outLeft.length; i++) {
      const left = inLeft[i];
      const right = inRight[i];
      this.phase += step;
      if (this.phase >= 1) {
        this.phase -= 1;
        this.heldLeft = left;
        this.heldRight = right;
      }
      // The crossfade, in the kernel that already holds both samples. Linear rather than
      // equal-power, and for the reason ./pop.js gives: the wet is the dry rounded rather than a
      // decorrelated second signal, so the two sum in phase (0209).
      const blend = mix.length === 1 ? mix[0] : mix[i];
      outLeft[i] = left + (quantise(this.heldLeft, levels) - left) * blend;
      outRight[i] = right + (quantise(this.heldRight, levels) - right) * blend;
    }
  }
}

/**
 * The processor. Its parameter names are ../effects/crush.ts's declared parameter ids, spelled
 * again here for the reason ./pop.js gives: a worklet imports nothing, so the pair is written twice
 * and a mismatch is a silent no-op on an AudioParam nobody is reading.
 */
export class CrushBits extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: "crush.bits", defaultValue: 8, minValue: 1, maxValue: 16, automationRate: "k-rate" },
      {
        name: "crush.rate",
        defaultValue: 6000,
        minValue: 100,
        maxValue: 24_000,
        automationRate: "k-rate",
      },
      // The one a-rate parameter, and the reason this stage crossfades in its own kernel: a mix is
      // what an automator fades to bring the whole effect in, and a fade quantized to 128 frames
      // is a staircase (0209).
      { name: "crush.mix", defaultValue: 0.5, minValue: 0, maxValue: 1, automationRate: "a-rate" },
    ];
  }

  constructor() {
    super();
    /** @type {CrushStage | null} */
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
     * (../effects/crush.ts), so on a mono deck this is the block that is thrown away. */
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
    // one: both are a pair here, so the hold always has two samples to take.
    const inLeft = input[0] ?? this.silence;
    const inRight = input[1] ?? inLeft;

    this.stage ??= new CrushStage(RATE);
    this.stage.run(
      inLeft,
      inRight,
      outLeft,
      outRight,
      parameters["crush.bits"][0],
      parameters["crush.rate"][0],
      parameters["crush.mix"],
    );
    // True until the main thread says otherwise: the held sample is this stage's whole memory, and
    // one taken before a rest is what the next sound is crossfaded against.
    return true;
  }
}

// The main thread's copy of this name is CRUSH_BITS in ../worklet.ts, and the pair is asserted by
// ../worklet.test.ts. A worklet can import nothing, so the string is unavoidably written twice.
registerProcessor("crush-bits", CrushBits);
