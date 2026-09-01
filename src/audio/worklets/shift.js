// @role The shift stage's per-sample work, on the audio thread: a circular capture of the last
//   fraction of a second, two read heads walking it at the rate the interval asks for, crossfaded
//   against each other so neither is heard arriving, and the dry/wet blend — which happens *here*,
//   because the kernel holds the dry and the wet sample at once (0209).
//
// Plain JavaScript, not TypeScript, for the reason ./loop-reporter.js gives: a worklet is its own
// module graph, loaded by URL rather than imported, and a .ts file would reach the browser
// untransformed. The kernels below are `export`ed the way ./crush.js's are, so ./shift.test.ts
// drives the real arithmetic rather than a second copy of it.
//
// **This stage hears what passes through it and nothing else**, exactly as ./scatter.js does: it
// cannot read the deck's buffer and does not know where the loop is, so the transposition is of
// what has just gone past and never of a source somebody chose (0030).
//
// Two classes, and one of them is the processor, for the reason ./pop.js gives: the stage and the
// processor that drives it are one per-sample path and a worklet has no bundler to split them
// across (0007).
// oxlint-disable max-classes-per-file
//
// Nothing here reads Math.random(): there is no draw and no noise source in this file at all, so
// two renders of one session are the same file by construction (0068).

/**
 * The longest window a head may read, in seconds — and so the top of Window, and the whole of the
 * capture this stage keeps. Written twice: ../effects/shift.ts declares the same number as the
 * maximum of its own Window, and ./shift.test.ts asserts the descriptors against that declaration.
 */
export const WINDOW_MAX_SECS = 0.2;

/**
 * How far apart the two heads stand, as a share of a window. Half, so each is silent exactly where
 * the other is loudest — and ../effects/shift.ts reads this to say what its `settle` is, because
 * the crossfade in "the window plus the crossfade" is this share of a window. ./shift.test.ts holds
 * the pair together.
 */
export const HEAD_OFFSET = 0.5;

/**
 * How long the window takes to reach a length a hand or a lane just asked for. A window is a *read
 * position* — `phase * window` — so a window that arrived between two blocks would move both heads
 * by up to that much at whatever gain they stand at, and the crossfade cannot hide a jump it did not
 * make. Glided instead, the way ./tape.js glides its own time and for the same reason: what moves is
 * the head's velocity rather than its position, so a window swept under a sounding tone bends it
 * rather than cutting it.
 */
const WINDOW_GLIDE_SECS = 0.05;

/** How many semitones an octave is. The one number the interval and the detune are both said in. */
const SEMITONES_PER_OCTAVE = 12;
/** And how many cents a semitone is, which is what makes the detune the same knob said finer. */
const CENTS_PER_SEMITONE = 100;

/**
 * The rate this worklet runs at. `sampleRate` is a global the browser puts on the worklet scope
 * and is constant for the life of a context, so it is read once, here, and named.
 * @type {number}
 */
const RATE = sampleRate;

/**
 * How fast a read head walks the capture, as a multiple of the write head's own speed: an octave up
 * is twice, an octave down is half, and nothing at all is exactly one. The interval and the detune
 * are the same distance said coarsely and finely, so they are summed into one exponent rather than
 * multiplied as two rates — which is the same number and one `Math.pow` instead of two.
 * @param {number} semitones @param {number} cents @returns {number}
 */
export function headRate(semitones, cents) {
  return 2 ** ((semitones + cents / CENTS_PER_SEMITONE) / SEMITONES_PER_OCTAVE);
}

/**
 * How loud the head standing at `phase` of its own window is, on 0..1. A sine over the window, so
 * the head is silent at both ends of it — which is the whole of why the wrap is not heard: a head
 * jumps a window's worth of capture exactly where its own gain is nothing.
 *
 * The second head stands `HEAD_OFFSET` along, where this is `|cos|`, and a sine and a cosine square
 * to one — so the pair is constant *power*, which is what keeps the wrap from pumping.
 *
 * It is not constant *amplitude*, and cannot be: the two heads are the same signal read half a
 * window apart, so they are coherent and interfere. Where the input's own period divides that half
 * window an odd number of times they are antiphase and cancel where the gains are equal — the comb
 * every two-head shifter has, and the reason Window is a knob a hand moves rather than a constant.
 * @param {number} phase @returns {number}
 */
export function headGain(phase) {
  return Math.sin(Math.PI * phase);
}

/** `value` brought back onto 0..1 however far outside it is — the heads' own wrap. @param
 * {number} value @returns {number} */
export function turn(value) {
  const at = value % 1;
  return at < 0 ? at + 1 : at;
}

/**
 * The whole stage for one stereo pair: the capture, the two heads and the crossfade. One object
 * rather than one per channel, because where the heads stand is a fact about the pair — two
 * channels walking separately would transpose the image as well as the sound.
 */
export class ShiftStage {
  /** @param {number} rate */
  constructor(rate) {
    this.rate = rate;
    this.length = Math.max(2, Math.round(WINDOW_MAX_SECS * rate));
    /** The capture itself: the last `WINDOW_MAX_SECS` of both channels, written every sample. */
    this.left = new Float32Array(this.length);
    this.right = new Float32Array(this.length);
    this.write = 0;
    /**
     * How much of the capture has actually been heard, in samples. A head never reads further back
     * than this: the buffer starts as silence, and a head walking into silence the stage was never
     * given would open every fresh instance with a gap rather than with the input.
     *
     * **Capped two short of the buffer's own length**, which is all a circular buffer can hold with
     * a sample to interpolate against: the Nth lap back lands on the sample being written this
     * instant, and `read` reaches one further for the fraction.
     */
    this.heard = 0;
    /**
     * Where the first head stands in its own window, on 0..1, and so how far behind the write head
     * it reads. The second head is always `HEAD_OFFSET` from it, which is why there is one of these
     * and not two. It starts at nothing: a fresh instance reads the sample it is writing, at a gain
     * of nothing, which is the one place the crossfade has nothing to hide.
     */
    this.phase = 0;
    /**
     * The window the heads are actually reading over, in samples — glided toward the one asked for
     * rather than assigned, for the reason `WINDOW_GLIDE_SECS` gives. Nought until the first block,
     * which sets it outright: a first block glided from nowhere would be a sweep into position.
     */
    this.window = 0;
    this.glide = 1 - Math.exp(-1 / (WINDOW_GLIDE_SECS * rate));
  }

  /**
   * One channel of the capture read `back` samples behind the write head, interpolated linearly
   * between the two samples the fraction falls between. Fractional because the head walks at a
   * rate that is not a whole number of samples: rounding it would quantise the transposition to
   * whatever the window length made a whole sample, which is audible as a warble at every interval
   * but the octaves.
   * @param {Float32Array} data @param {number} back @returns {number}
   */
  read(data, back) {
    const whole = Math.floor(back);
    const fraction = back - whole;
    // `+ this.length` before the modulo: the write head is anywhere in the buffer and `back` is up
    // to its whole length, so the raw difference reaches -length and a bare `%` would answer
    // negative.
    const near = (this.write - whole + this.length) % this.length;
    const far = near === 0 ? this.length - 1 : near - 1;
    const at = data[near] ?? 0;
    return at + ((data[far] ?? 0) - at) * fraction;
  }

  /**
   * Fill `outLeft` and `outRight` for one block. `semitones`, `cents` and `windowSecs` are this
   * block's values, read once because a k-rate worklet parameter is one number per block; `mix` is
   * a-rate and is read per sample, because it is this entry's own presence and a fade across 128
   * frames is what an automator's arrival sounds like (0202, 0209).
   * @param {Float32Array} inLeft @param {Float32Array} inRight @param {Float32Array} outLeft
   * @param {Float32Array} outRight @param {number} semitones @param {number} cents
   * @param {number} windowSecs @param {Float32Array} mix
   */
  // The per-sample path: the capture, the two heads and the blend are one pass over one block, and
  // split into helpers they would be three passes over the same samples (0007).
  // oxlint-disable-next-line max-lines-per-function
  run(inLeft, inRight, outLeft, outRight, semitones, cents, windowSecs, mix) {
    // At least a sample, and never more capture than there is: a window is the distance a head
    // covers before it wraps, so a zero-length one would be a divide by nothing.
    const asked = Math.min(Math.max(1, Math.round(windowSecs * this.rate)), this.length - 1);
    if (this.window === 0) this.window = asked;
    // How fast the heads walk the capture, read once because the interval and the detune are both
    // one number per block.
    const rate = headRate(semitones, cents);
    for (let i = 0; i < outLeft.length; i++) {
      const dryLeft = inLeft[i];
      const dryRight = inRight[i];
      this.left[this.write] = dryLeft;
      this.right[this.write] = dryRight;

      this.window += (asked - this.window) * this.glide;
      const window = this.window;
      const first = this.phase;
      const second = turn(first + HEAD_OFFSET);
      // Never further back than has been heard, and never past the capture: both heads are clamped
      // rather than wrapped, because a head that wrapped would read the far end of the buffer at
      // full gain and that is a click rather than a crossfade.
      const backFirst = Math.min(first * window, this.heard);
      const backSecond = Math.min(second * window, this.heard);
      const gainFirst = headGain(first);
      const gainSecond = headGain(second);

      const wetLeft =
        this.read(this.left, backFirst) * gainFirst + this.read(this.left, backSecond) * gainSecond;
      const wetRight =
        this.read(this.right, backFirst) * gainFirst +
        this.read(this.right, backSecond) * gainSecond;
      // The crossfade against the input, in the kernel that already holds both samples. Linear and
      // toward the wet rather than summed with it, for the reason ./crush.js's copy gives: a mix of
      // nothing has to be the input written straight back out (0209).
      const blend = mix.length === 1 ? mix[0] : mix[i];
      outLeft[i] = dryLeft + (wetLeft - dryLeft) * blend;
      outRight[i] = dryRight + (wetRight - dryRight) * blend;

      // How far the head moves through its own window this sample. The read head's own speed is
      // `1 - step * window`, so a step of `(1 - rate) / window` walks the capture at exactly `rate`
      // — which is the whole of the transposition, and the reason this is a subtraction.
      this.phase = turn(this.phase + (1 - rate) / window);
      // Counted after the reads and not before them: the sample written this instant is the newest
      // there is, so at the first sample a head may read back nothing at all — and a count taken
      // ahead of the reads would let it read one sample further back than the stage has been given,
      // which is the untouched tail of the buffer and so the silence every fresh instance would
      // open with.
      if (this.heard < this.length - 2) this.heard++;
      this.write = this.write + 1 >= this.length ? 0 : this.write + 1;
    }
  }
}

/**
 * The processor. Its parameter names are ../effects/shift.ts's declared parameter ids, spelled
 * again here for the reason ./pop.js gives: a worklet imports nothing, so the pair is written twice
 * and a mismatch is a silent no-op on an AudioParam nobody is reading.
 */
export class ShiftPitch extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      {
        name: "shift.interval",
        defaultValue: 12,
        minValue: -24,
        maxValue: 24,
        automationRate: "k-rate",
      },
      {
        name: "shift.detune",
        defaultValue: 0,
        minValue: -100,
        maxValue: 100,
        automationRate: "k-rate",
      },
      {
        name: "shift.window",
        defaultValue: 0.06,
        minValue: 0.01,
        maxValue: WINDOW_MAX_SECS,
        automationRate: "k-rate",
      },
      // The one a-rate parameter, and the reason this stage crossfades in its own kernel: this is
      // the parameter the entry declares its presence on, so an automator fades the whole effect in
      // and out on it, and a fade quantized to 128 frames is a staircase (0202, 0209).
      { name: "shift.mix", defaultValue: 0.5, minValue: 0, maxValue: 1, automationRate: "a-rate" },
    ];
  }

  constructor() {
    super();
    /** @type {ShiftStage | null} */
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
     * (../effects/shift.ts), so on a mono deck this is the block that is thrown away. */
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

    this.stage ??= new ShiftStage(RATE);
    this.stage.run(
      inLeft,
      inRight,
      outLeft,
      outRight,
      parameters["shift.interval"][0],
      parameters["shift.detune"][0],
      parameters["shift.window"][0],
      parameters["shift.mix"],
    );
    // True until the main thread says otherwise: the capture is this stage's memory, and a
    // processor collected between two windows would take the fraction of a second it is reading.
    return true;
  }
}

// The main thread's copy of this name is SHIFT_PITCH in ../worklet.ts, and the pair is asserted by
// ../worklet.test.ts. A worklet can import nothing, so the string is unavoidably written twice.
registerProcessor("shift-pitch", ShiftPitch);
