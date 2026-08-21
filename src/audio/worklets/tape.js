// @role The tape echo's per-sample work, on the audio thread: a circular buffer read at a
//   fractional tap, a delay time that is resampled rather than jumped, wow and flutter from
//   bandpassed noise, and a saturator and filter pair inside the feedback loop so every repeat
//   compounds. The dry signal never enters this file — `tape.amount` is graph-side (../effects/tape.ts).
//
// Plain JavaScript, not TypeScript, for the reason ./loop-reporter.js gives: a worklet is its own
// module graph, loaded by URL rather than imported, and a .ts file would reach the browser
// untransformed. What is different here is that the kernels below are `export`ed: a worklet module
// is still an ES module, the browser ignores the extra exports, and Node can import this file and
// drive the real arithmetic rather than a second copy of it (./tape.test.ts, ../../../scripts/bench).
//
// Over the soft cap, and it is one loop: the kernels, the channel that runs them and the processor
// that owns the channels are a single per-sample path, and a worklet has no bundler to split them
// across — a second file would have to be loaded as a second module nothing imports (0007).
// oxlint-disable max-lines
//
// Nothing here reads Math.random(). Every noise source is an xorshift seeded from a constant and
// the channel index, so two renders of one session are the same file and the fingerprint keeps
// meaning what it says (0068).

/**
 * The longest tap this processor holds, in seconds. Written twice on purpose, exactly like the
 * registered name: `tape.time`'s declared maximum in ../effects/tape.ts is the main thread's copy,
 * and a declared maximum above this one would read past what is heard. The pair is asserted
 * against the declaration in ./tape.test.ts, so it cannot drift unnoticed.
 */
export const MAX_DELAY_SECS = 2;

/** How long the read pointer takes to reach a new time. This is the whole tape character: the
 * pointer's velocity, not its position, is what a time change moves, so the pitch bends. */
const TIME_GLIDE_SECS = 0.08;

/** Wow and flutter as a fraction of the delay time, at full `tape.wow`. Both are deviations of
 * the tap, so a longer delay wobbles by proportionally more, the way a longer loop of tape does. */
const WOW_DEPTH = 0.0035;
const FLUTTER_DEPTH = 0.0006;

/** The two noise bands, in Hz: wow around a hertz, flutter an order above it. Each is stated as
 * the lowpass corner and a highpass a fifth of it — one shape at two scales, which is what lets
 * `bandGain` be one number rather than one per band. Measured: 0.8Hz and 8.6Hz (./tape.test.ts). */
const WOW_BAND = { low: 1.5, high: 0.3 };
const FLUTTER_BAND = { low: 15, high: 3 };

/**
 * The furthest the head can be asked to move, as a fraction of the delay: the two depths against
 * the peak a unit-variance band reaches. It is the buffer's headroom and the wobble's bound in one
 * number — sized short, the head clamps at the longest tap and the pitch bend stops dead for half
 * of every second instead of wobbling (./tape.test.ts).
 */
export const MAX_DEVIATION = (WOW_DEPTH + FLUTTER_DEPTH) * 4;

/** How many poles the band's lowpass has. One is not a wobble: a single pole at a hertz leaves a
 * process that crosses zero a hundred and seventy times a second, which is jitter and not wow. */
const BAND_POLES = 4;

/** The most the head's position may move per sample: read velocity stays in [0.5, 1.5], so a time
 * change is a bend of at most an octave-ish and the head never runs backwards. */
const MAX_SLEW = 0.5;

/** Full-scale hiss, as an amplitude. Injected into the loop, so it builds with feedback. */
const HISS_LEVEL = 0.006;

/** Anything under this is a denormal in all but name; flushed so the loop cannot stall on one. */
const DENORMAL = 1e-18;

/**
 * The rate this worklet runs at. `sampleRate` is a global the browser puts on the worklet scope
 * and is constant for the life of a context, so it is read once, here, and named.
 * @type {number}
 */
const RATE = sampleRate;

/** The seed the noise starts from, offset per channel so the two do not wobble in lockstep. */
const NOISE_SEED = 0x9e3779b9;
const CHANNEL_STRIDE = 0x85ebca6b;

/** Flush a denormal to zero. A tape loop is an IIR that never fully decays, so without this the
 * tail spends forever in subnormal arithmetic that some CPUs price at a hundred times a float.  * @param {number} value @returns {number}
 */
export function flush(value) {
  return Math.abs(value) < DENORMAL ? 0 : value;
}

/**
 * Catmull-Rom at a fractional position in a circular buffer — the fractional tap. Cubic rather
 * than linear because a linear tap is a lowpass whose corner moves with the fraction, so a moving
 * head would sound like a filter sweeping as well as a pitch bending.
 * @param {Float32Array} buffer @param {number} position @returns {number}
 */
export function cubicTap(buffer, position) {
  const size = buffer.length;
  const base = Math.floor(position);
  const t = position - base;
  const i1 = ((base % size) + size) % size;
  const i0 = (i1 - 1 + size) % size;
  const i2 = (i1 + 1) % size;
  const i3 = (i1 + 2) % size;
  const y0 = buffer[i0];
  const y1 = buffer[i1];
  const y2 = buffer[i2];
  const y3 = buffer[i3];
  const a = -0.5 * y0 + 1.5 * y1 - 1.5 * y2 + 0.5 * y3;
  const b = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
  const c = -0.5 * y0 + 0.5 * y2;
  return ((a * t + b) * t + c) * t + y1;
}

/** One pole toward a target. The smoothed time, the tone filters and the noise bands are all this.  * @param {number} current @param {number} target @param {number} coefficient @returns {number}
 */
export function onePole(current, target, coefficient) {
  return current + (target - current) * coefficient;
}

/** The coefficient a one-pole needs to cover a time constant of `seconds` at `rate`.  * @param {number} seconds @param {number} rate @returns {number}
 */
export function smoothingCoefficient(seconds, rate) {
  if (!(seconds > 0)) return 1;
  return 1 - Math.exp(-1 / (seconds * rate));
}

/** The same, stated as a corner frequency — what the tone control and the noise bands are set in.  * @param {number} hz @param {number} rate @returns {number}
 */
export function cornerCoefficient(hz, rate) {
  return smoothingCoefficient(1 / (2 * Math.PI * hz), rate);
}

/**
 * A deterministic white source: xorshift32 in [-1, 1). Seeded rather than drawn from
 * `Math.random()`, because a render is a spec and two runs of one session are one file (0068).
 * @param {number} seed @returns {() => number}
 */
export function noiseSource(seed) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 2147483648 - 1;
  };
}

/**
 * What a band at `coefficient` has to be multiplied by for its output to have unit variance. One
 * pole on unit-variance white has std sqrt(a / (2 - a)); the other three poles and the highpass
 * take a further factor out, and because both bands are the same shape at two scales that factor
 * is one measured number rather than one per band (asserted in ./tape.test.ts).
 * @param {number} coefficient @returns {number}
 */
const POLE_LOSS = 4.1;
export function bandGain(coefficient) {
  return POLE_LOSS * Math.sqrt((2 - coefficient) / coefficient);
}

/** A band's state: four lowpass poles and the slow one that is subtracted out as the highpass.  * @returns {{ low: Float64Array, base: number }}
 */
export function bandState() {
  return { low: new Float64Array(BAND_POLES), base: 0 };
}

/**
 * One step of a noise band: four cascaded lowpass poles, minus a slower lowpass of the last,
 * which is the highpass. State is advanced in place. Bandpassed noise rather than a sine LFO
 * because real wow is not periodic — a sine gives a vibrato you can hum, and tape does not.
 * @param {{ low: Float64Array, base: number }} state @param {number} white @param {number} lowCoefficient @param {number} highCoefficient @returns {number}
 */
export function bandStep(state, white, lowCoefficient, highCoefficient) {
  state.low[0] = onePole(state.low[0], white, lowCoefficient);
  for (let pole = 1; pole < BAND_POLES; pole++) {
    state.low[pole] = onePole(state.low[pole], state.low[pole - 1], lowCoefficient);
  }
  const band = state.low[BAND_POLES - 1];
  state.base = onePole(state.base, band, highCoefficient);
  return band - state.base;
}

/**
 * The head's position, glided toward a new time and slew-limited. A one-pole alone moves fastest
 * where it is furthest, so a half-second jump would step the position by two and a half samples
 * per sample — a read pointer running backwards at 1.5x, which is a stutter and not a tape.
 * @param {number} current @param {number} target @param {number} coefficient @returns {number}
 */
export function glide(current, target, coefficient) {
  const step = (target - current) * coefficient;
  return current + Math.min(Math.max(step, -MAX_SLEW), MAX_SLEW);
}

/**
 * How far the head is off its nominal position this sample, as a fraction of the delay: the two
 * bands, at their depths, scaled by `tape.wow`. The channel carries the bands' state and is
 * advanced in place, which is what makes this the noise-modulated tap and not a second copy of it.
 *
 * @param {TapeChannel} channel @param {number} wow @returns {number}
 */
export function headDeviation(channel, wow) {
  return (
    wow *
    (WOW_DEPTH *
      channel.wowGain *
      bandStep(channel.wow, channel.white(), channel.wowLow, channel.wowHigh) +
      FLUTTER_DEPTH *
        channel.flutterGain *
        bandStep(channel.flutter, channel.white(), channel.flutterLow, channel.flutterHigh))
  );
}

/**
 * Where the head reads, as an absolute position in the circular buffer: the smoothed delay plus
 * the noise deviation, clamped so a tap can never overtake the write head or reach past the end.
 * @param {number} writeIndex @param {number} delaySamples @param {number} deviation @param {number} size @returns {number}
 */
export function modulatedTap(writeIndex, delaySamples, deviation, size) {
  const wanted = delaySamples + deviation;
  const clamped = Math.min(Math.max(wanted, 2), size - 4);
  return writeIndex - clamped + size;
}

/** ln(cosh x), the antiderivative of tanh, written so a loud loop cannot overflow it.  * @param {number} x @returns {number}
 */
export function logCosh(x) {
  const magnitude = Math.abs(x);
  return magnitude + Math.log1p(Math.exp(-2 * magnitude)) - Math.LN2;
}

/**
 * tanh, antiderivative-antialiased to first order: the output is tanh's *average* across the step
 * the input just took rather than its value at the end of it. A nonlinearity inside a feedback
 * loop is an aliasing machine, and this is the answer that costs one log and one exp per sample
 * instead of running the whole loop at 2× (docs/plan.md §4, and ../../../scripts/bench prices both).
 *
 * State is `{ x1, f1 }`, advanced in place. The fallback is the removable singularity at x == x1,
 * where the difference quotient is 0/0 and the average is the midpoint value.
 * @param {{ x1: number, f1: number }} state @param {number} x @returns {number}
 */
export function adaaTanh(state, x) {
  const f = logCosh(x);
  const dx = x - state.x1;
  const y = Math.abs(dx) < 1e-5 ? Math.tanh((x + state.x1) * 0.5) : (f - state.f1) / dx;
  state.x1 = x;
  state.f1 = f;
  return y;
}

/**
 * One channel of tape: its own buffer, its own head, its own noise. Constructed by the processor
 * and driven a block at a time, and constructed directly by ../../../scripts/bench, which prices
 * this loop against the two alternatives §4's rule is decided on.
 */
export class TapeChannel {
  /** @param {number} rate @param {number} seed */
  constructor(rate, seed) {
    this.rate = rate;
    // The longest tap plus the room the head needs to wobble around it. Sized to the delay alone,
    // `modulatedTap` would clamp at the top of the range and flat-top the wow (./tape.test.ts).
    this.buffer = new Float32Array(Math.ceil(MAX_DELAY_SECS * rate * (1 + MAX_DEVIATION)) + 8);
    this.write = 0;
    /** The delay in samples the head is actually reading at — never assigned, only glided to. */
    this.delay = -1;
    this.glideCoefficient = smoothingCoefficient(TIME_GLIDE_SECS, rate);
    this.wow = bandState();
    this.flutter = bandState();
    this.wowLow = cornerCoefficient(WOW_BAND.low, rate);
    this.wowHigh = cornerCoefficient(WOW_BAND.high, rate);
    this.flutterLow = cornerCoefficient(FLUTTER_BAND.low, rate);
    this.flutterHigh = cornerCoefficient(FLUTTER_BAND.high, rate);
    this.wowGain = bandGain(this.wowLow);
    this.flutterGain = bandGain(this.flutterLow);
    this.white = noiseSource(seed);
    this.hissWhite = noiseSource(seed ^ CHANNEL_STRIDE);
    this.hissLast = 0;
    this.tone = 0;
    this.body = 0;
    this.sat = { x1: 0, f1: logCosh(0) };
    /** The band-limiting pair's low corner: fixed, because it is the head's own bass loss. */
    this.lowCut = cornerCoefficient(90, rate);
  }

  /**
   * Fill `output` from `input` for one block. `time`, `feedback`, `tone`, `drive` and `wow` are
   * this block's parameter values; the loop reads them once, because a k-rate worklet parameter
   * is one number per block and the per-sample smoothing that matters is the head's own glide.
   * @param {Float32Array} input @param {Float32Array} output @param {number} time
   * @param {number} feedback @param {number} tone @param {number} drive @param {number} wow
   * @param {number} hiss
   */
  run(input, output, time, feedback, tone, drive, wow, hiss) {
    const buffer = this.buffer;
    const size = buffer.length;
    // Clamped to the declared maximum rather than to the buffer: the extra is the head's room to
    // move, not more delay, and a time past the maximum is one the AudioParam already refused.
    const target = Math.min(Math.max(time, 0) * this.rate, MAX_DELAY_SECS * this.rate);
    // A first block glides from nowhere, which would be a two-second sweep into position.
    if (this.delay < 0) this.delay = target;
    const toneCoefficient = cornerCoefficient(tone, this.rate);
    const hissLevel = hiss * HISS_LEVEL;

    for (let i = 0; i < output.length; i++) {
      this.delay = glide(this.delay, target, this.glideCoefficient);
      const deviation = this.delay * headDeviation(this, wow);
      const read = cubicTap(buffer, modulatedTap(this.write, this.delay, deviation, size));

      // Hiss is highpassed white and goes *into* the loop, so it builds with feedback rather
      // than sitting at a constant level over the top of it.
      const white = this.hissWhite();
      const hissed = (white - this.hissLast) * 0.5 * hissLevel;
      this.hissLast = white;

      // The loop, in order: what comes back, saturated, then band-limited. Every repeat is one
      // more pass through all three, which is why the fourth echo is darker than the first.
      const driven = adaaTanh(this.sat, (input[i] + read * feedback + hissed) * drive) / drive;
      this.tone = onePole(this.tone, driven, toneCoefficient);
      this.body = onePole(this.body, this.tone, this.lowCut);
      buffer[this.write] = flush(this.tone - this.body);

      output[i] = read;
      this.write = this.write + 1 === size ? 0 : this.write + 1;
    }
    this.tone = flush(this.tone);
    this.body = flush(this.body);
  }
}

/**
 * The processor. Its parameter names are ../effects/tape.ts's declared parameter ids, spelled
 * again here for the same reason the registered name is: a worklet imports nothing, so the pair
 * is written twice and a mismatch is a silent no-op on an AudioParam nobody is reading.
 */
// The processor and the per-channel state it drives are one thing, and a worklet has no bundler:
// splitting the channel into its own file would put half of one loop behind a module boundary
// this file cannot cross (0007).
// oxlint-disable-next-line max-classes-per-file
export class TapeDelay extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    // k-rate throughout: one value per 128-frame block is under three milliseconds, and the
    // smoothing that matters — the head's glide — is per sample and inside the loop.
    const rate = "k-rate";
    return [
      {
        name: "tape.time",
        defaultValue: 0.35,
        minValue: 0.005,
        maxValue: MAX_DELAY_SECS,
        automationRate: rate,
      },
      {
        name: "tape.feedback",
        defaultValue: 0.55,
        minValue: 0,
        maxValue: 1.4,
        automationRate: rate,
      },
      {
        name: "tape.tone",
        defaultValue: 3200,
        minValue: 200,
        maxValue: 16000,
        automationRate: rate,
      },
      { name: "tape.drive", defaultValue: 1.5, minValue: 1, maxValue: 8, automationRate: rate },
      { name: "tape.wow", defaultValue: 0.35, minValue: 0, maxValue: 1, automationRate: rate },
      { name: "tape.hiss", defaultValue: 0.25, minValue: 0, maxValue: 1, automationRate: rate },
    ];
  }

  constructor() {
    super();
    /** @type {TapeChannel[]} */
    this.channels = [];
    /**
     * Whether the main thread has let this node go. A processor that always returns true is an
     * active source for the life of its context: `dispose` disconnects the node, but the buffer
     * and the pull stay. An offline context is never closed (../../app/render.ts), so an export
     * of a session holding a tape would leave one behind on every render (0086).
     */
    this.stopped = false;
    /** One block of nothing, kept: a silent upstream must not allocate per quantum. */
    this.silence = new Float32Array(0);
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
    // Answered before anything else: this is the one thing that takes the node off the pull list
    // and lets its buffers go, and ../effects/tape.ts posts it from `dispose`.
    if (this.stopped) return false;
    const output = outputs[0];
    const input = inputs[0] ?? [];
    // k-rate: one value for the block. A parameter ramping across it lands on the next one, which
    // at 128 frames is under three milliseconds — and the head's own glide is what smooths time.
    const at = (name) => parameters[name][0];
    const time = at("tape.time");
    const feedback = at("tape.feedback");
    const tone = at("tape.tone");
    const drive = at("tape.drive");
    const wow = at("tape.wow");
    const hiss = at("tape.hiss");

    for (let channel = 0; channel < output.length; channel++) {
      // Built on the first block that needs it, and kept: a tape's buffer is its memory, and
      // rebuilding it on a channel-count change would erase the repeats still in flight.
      this.channels[channel] ??= new TapeChannel(RATE, NOISE_SEED + channel * CHANNEL_STRIDE);
      const wet = output[channel];
      // Silence rather than nothing when the source has stopped: an input with no channels is
      // what a stopped deck delivers, and the loop must keep running or the tail stops decaying
      // mid-repeat. `channelCount: 2, explicit` is what makes the channel counts agree.
      if (this.silence.length < wet.length) this.silence = new Float32Array(wet.length);
      const from = input[channel] ?? this.silence;
      this.channels[channel].run(from, wet, time, feedback, tone, drive, wow, hiss);
    }
    // True until the main thread says otherwise: a processor that returned false while a repeat
    // was still in flight would be collected with the tail still in its buffer.
    return true;
  }
}

// The main thread's copy of this name is TAPE_DELAY in ../worklet.ts, and the pair is asserted by
// ../worklet.test.ts. A worklet can import nothing, so the string is unavoidably written twice.
registerProcessor("tape-delay", TapeDelay);
