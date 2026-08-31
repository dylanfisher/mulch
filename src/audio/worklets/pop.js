// @role The pop stage's per-sample work, on the audio thread: a two-sided expander around a pivot
//   it tracks itself, a mid/side width that leaves the bass where the body is, a high-band
//   saturator, and the dry/wet crossfade — which happens *here*, because the kernel holds the dry
//   and the wet sample at once (0209).
//
// Plain JavaScript, not TypeScript, for the reason ./loop-reporter.js gives: a worklet is its own
// module graph, loaded by URL rather than imported, and a .ts file would reach the browser
// untransformed. The kernels below are `export`ed the way ./tape.js's are, so ./pop.test.ts drives
// the real arithmetic rather than a second copy of it.
//
// Two classes, and one of them is the processor: the stage and the processor that drives it are a
// single per-sample path, and a worklet has no bundler to split them across — a second file would
// have to be loaded as a second module nothing imports (0007). The rule reports at the file, so
// the waiver is the file's; ./tape.js is the same shape for the same reason.
// oxlint-disable max-classes-per-file
//
// Nothing here reads Math.random(): there is no noise source in this file at all, so two renders
// of one session are the same file by construction (0068).

/** The most the expander may move a sample, in decibels either way. An expander with no ceiling is
 * a runaway and one with no floor is a gate, so both ends are bounded and neither is a knob. */
export const MAX_LIFT_DB = 12;

/** How long the pivot takes to follow the programme. Slow on purpose: it is the level the expander
 * is measured *from*, so a pivot that moved at the follower's speed would track the follower and
 * the gain would sit at one whatever Lift said. */
export const PIVOT_SECS = 1.5;

/** Where the side is cut so the low end stays where the body is: below this, width does nothing. */
const SIDE_CUT_HZ = 250;

/** Where the sheen's band begins, and how hard that band is driven into the saturator. The drive is
 * normalized by its own `tanh` rather than by itself, so a quiet band comes back lifted and a loud
 * one comes back rounded: normalized by the drive, the saturator is the identity everywhere a real
 * high band lives and the knob does nothing at all. */
const SHEEN_CUT_HZ = 3500;
const SHEEN_DRIVE = 2.5;
const SHEEN_NORM = Math.tanh(SHEEN_DRIVE);

/** The quietest amplitude the follower reads as a level, so a silent block is -120dB and not -∞. */
const DB_FLOOR = 1e-6;

/** Anything under this is a denormal in all but name; the followers are one-poles that never quite
 * arrive, so without this a decayed stage spends forever in subnormal arithmetic. */
const DENORMAL = 1e-18;

/**
 * The rate this worklet runs at. `sampleRate` is a global the browser puts on the worklet scope
 * and is constant for the life of a context, so it is read once, here, and named.
 * @type {number}
 */
const RATE = sampleRate;

/** Flush a denormal — or a non-finite — to zero, for the reason ./tape.js's copy of this gives.
 * The second occurrence of a four-line kernel across two files a bundler never joins, which is
 * where principle 3 says duplication is still cheaper than the module boundary a worklet has no
 * way to cross.
 * @param {number} value @returns {number}
 */
export function flush(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.abs(value) < DENORMAL ? 0 : value;
}

/** One pole toward a target — the followers, the side split and the sheen band are all this.
 * @param {number} current @param {number} target @param {number} coefficient @returns {number}
 */
export function onePole(current, target, coefficient) {
  return current + (target - current) * coefficient;
}

/** The coefficient a one-pole needs to cover a time constant of `seconds` at `rate`.
 * @param {number} seconds @param {number} rate @returns {number}
 */
export function smoothingCoefficient(seconds, rate) {
  if (!(seconds > 0)) return 1;
  return 1 - Math.exp(-1 / (seconds * rate));
}

/** The same, stated as a corner frequency — what the two band splits are set in.
 * @param {number} hz @param {number} rate @returns {number}
 */
export function cornerCoefficient(hz, rate) {
  return smoothingCoefficient(1 / (2 * Math.PI * hz), rate);
}

/** An amplitude as decibels, floored so silence is a number.
 * @param {number} amplitude @returns {number}
 */
export function ampToDb(amplitude) {
  return 20 * Math.log10(Math.max(Math.abs(amplitude), DB_FLOOR));
}

/**
 * The expander's gain, as a linear multiplier: how far the follower stands above or below the
 * pivot, scaled by `lift` and clamped to `MAX_LIFT_DB` either way. Two-sided by construction —
 * the same line answers a boost above the pivot and a duck below it — so loud goes louder and
 * quiet goes quieter, and the pivot itself never moves. It is one at the pivot whatever `lift` is,
 * and one at a `lift` of nothing whatever the level is: the knob adds range without moving the
 * level and without caring what the level was.
 * @param {number} levelDb @param {number} pivotDb @param {number} lift @returns {number}
 */
export function expandGain(levelDb, pivotDb, lift) {
  const wanted = lift * (levelDb - pivotDb);
  const bounded = Math.min(Math.max(wanted, -MAX_LIFT_DB), MAX_LIFT_DB);
  return 10 ** (bounded / 20);
}

/**
 * A left/right pair from a mid and a side split in two: the part of the side below the cut, which
 * width never touches, and the part above it, which is all width scales. Identity at a width of
 * one, mono above the cut at nought, and the low half survives either way — which is the whole
 * reason the side is split rather than scaled whole.
 * @param {number} mid @param {number} low @param {number} high @param {number} width
 * @returns {{ left: number, right: number }}
 */
export function widthPair(mid, low, high, width) {
  const side = low + high * width;
  return { left: mid + side, right: mid - side };
}

/**
 * What the sheen adds to a sample: its high band put through a soft saturator, minus the band
 * itself, so the sum is the untouched signal plus only what the saturator changed. Nought at an
 * `amount` of nought whatever the band holds, which is what makes the knob's floor a no-op rather
 * than a very quiet effect. A quiet band is lifted by the drive and a loud one bends back under
 * it, which is what makes this air rather than a very slight high-frequency softener.
 *
 * Plain `tanh`, and not the antialiased one ./tape.js goes to the trouble of: that saturator sits
 * *inside* a feedback loop, where every repeat compounds whatever the last one folded back, and
 * this one is a single feed-forward pass whose only added term is the cubic — about 25dB under a
 * band already above 3.5kHz. A third copy of the ADAA kernel, and a log and an exp per sample, to
 * bury an image that far down is not the trade that file made.
 * @param {number} band @param {number} amount @returns {number}
 */
export function sheenAt(band, amount) {
  return amount * (Math.tanh(band * SHEEN_DRIVE) / SHEEN_NORM - band);
}

/**
 * The whole stage for one stereo pair: the follower and its pivot, the side's split, the two sheen
 * bands and the crossfade. One object rather than one per channel, because mid and side are a fact
 * about the pair and not about either channel of it.
 */
export class PopStage {
  /** @param {number} rate */
  constructor(rate) {
    this.rate = rate;
    /** The fast follower, whose speed is Snap, and the slow average it is measured against. */
    this.env = 0;
    this.pivot = 0;
    /**
     * How many samples of actual level this stage has heard. Both followers are one-poles that
     * start at nothing, and they climb at their own speeds — so on the first sound their ratio
     * opens forty decibels apart and the expander sits pinned at its ceiling for the first tenth
     * of a second of everything it is given, which is a step in level on insertion and after every
     * rest. Counted here so each pole's coefficient can be held at `1 / heard` until its own window
     * has actually gone by: below that, a one-pole *is* the running mean of everything heard, both
     * poles are the same mean, and the gain is one because there is nothing yet to be above or
     * below. Silence is not counted, so a render's own leading silence does not spend the warm-up.
     */
    this.heard = 0;
    this.pivotCoefficient = smoothingCoefficient(PIVOT_SECS, rate);
    this.sideCut = cornerCoefficient(SIDE_CUT_HZ, rate);
    this.sheenCut = cornerCoefficient(SHEEN_CUT_HZ, rate);
    /** The side's low half, and the two channels' low halves for the sheen's band. */
    this.sideLow = 0;
    this.toneLeft = 0;
    this.toneRight = 0;
  }

  /**
   * Fill `outLeft` and `outRight` for one block. `lift`, `snap`, `width` and `sheen` are this
   * block's values, read once because a k-rate worklet parameter is one number per block; `mix` is
   * a-rate and is read per sample, because it is the one value here that a lane rides and a fade
   * across 128 frames is what an automator's arrival sounds like.
   * @param {Float32Array} inLeft @param {Float32Array} inRight @param {Float32Array} outLeft
   * @param {Float32Array} outRight @param {number} lift @param {number} snap @param {number} width
   * @param {number} sheen @param {Float32Array} mix
   */
  run(inLeft, inRight, outLeft, outRight, lift, snap, width, sheen, mix) {
    const envCoefficient = smoothingCoefficient(snap, this.rate);
    for (let i = 0; i < outLeft.length; i++) {
      const left = inLeft[i];
      const right = inRight[i];
      const mid = (left + right) * 0.5;
      const side = (left - right) * 0.5;

      // The follower and the pivot read the same thing at two speeds: the difference between them
      // is the whole expander, so what the level happens to be never reaches the gain.
      const magnitude = Math.abs(mid);
      if (magnitude > DB_FLOOR) this.heard++;
      // The warm start `heard` exists for: a pole younger than its own window is the plain mean of
      // what it has heard, and two plain means of one signal are one number.
      const warm = this.heard === 0 ? 0 : 1 / this.heard;
      this.env = onePole(this.env, magnitude, Math.max(envCoefficient, warm));
      this.pivot = onePole(this.pivot, magnitude, Math.max(this.pivotCoefficient, warm));
      const gain = expandGain(ampToDb(this.env), ampToDb(this.pivot), lift);

      // The gain is one number over the pair, so the image does not move as it works.
      this.sideLow = onePole(this.sideLow, side * gain, this.sideCut);
      const pair = widthPair(mid * gain, this.sideLow, side * gain - this.sideLow, width);

      this.toneLeft = onePole(this.toneLeft, pair.left, this.sheenCut);
      this.toneRight = onePole(this.toneRight, pair.right, this.sheenCut);
      const wetLeft = pair.left + sheenAt(pair.left - this.toneLeft, sheen);
      const wetRight = pair.right + sheenAt(pair.right - this.toneRight, sheen);

      // The crossfade, in the kernel that already holds both samples. Linear rather than
      // equal-power, and that is not an oversight: nothing in this file looks ahead, so the wet is
      // the dry moved rather than a decorrelated second signal, and the two sum in phase (0209).
      const blend = mix.length === 1 ? mix[0] : mix[i];
      outLeft[i] = left + (wetLeft - left) * blend;
      outRight[i] = right + (wetRight - right) * blend;
    }
    this.env = flush(this.env);
    this.pivot = flush(this.pivot);
    this.sideLow = flush(this.sideLow);
    this.toneLeft = flush(this.toneLeft);
    this.toneRight = flush(this.toneRight);
  }
}

/**
 * The processor. Its parameter names are ../effects/pop.ts's declared parameter ids, spelled again
 * here for the reason ./tape.js gives: a worklet imports nothing, so the pair is written twice and
 * a mismatch is a silent no-op on an AudioParam nobody is reading.
 */
export class PopDynamics extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: "pop.lift", defaultValue: 0.35, minValue: 0, maxValue: 1, automationRate: "k-rate" },
      {
        name: "pop.snap",
        defaultValue: 0.03,
        minValue: 0.002,
        maxValue: 0.4,
        automationRate: "k-rate",
      },
      { name: "pop.width", defaultValue: 1, minValue: 0, maxValue: 2, automationRate: "k-rate" },
      { name: "pop.sheen", defaultValue: 0.2, minValue: 0, maxValue: 1, automationRate: "k-rate" },
      // The one a-rate parameter, and the reason this stage crossfades in its own kernel: a mix is
      // what an automator fades to bring the whole effect in, and a fade quantized to 128 frames
      // is a staircase (0209).
      { name: "pop.mix", defaultValue: 0.5, minValue: 0, maxValue: 1, automationRate: "a-rate" },
    ];
  }

  constructor() {
    super();
    /** @type {PopStage | null} */
    this.stage = null;
    /**
     * Whether the main thread has let this node go — the same fact ./tape.js keeps, and for the
     * same reason: a processor that always returns true is an active source for the life of its
     * context, and an offline context is never closed (0086).
     */
    this.stopped = false;
    /** One block of nothing, kept: a silent upstream must not allocate per quantum. */
    this.silence = new Float32Array(0);
    /** Where the right channel goes when this node is built with one output channel, which a mono
     * yard is: the plugin takes the count that arrives rather than forcing two (../effects/pop.ts),
     * so on a mono deck the side is nought and this is the block that is thrown away. */
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
    // one: both are a pair here, so mid and side are always defined.
    const inLeft = input[0] ?? this.silence;
    const inRight = input[1] ?? inLeft;

    this.stage ??= new PopStage(RATE);
    this.stage.run(
      inLeft,
      inRight,
      outLeft,
      outRight,
      parameters["pop.lift"][0],
      parameters["pop.snap"][0],
      parameters["pop.width"][0],
      parameters["pop.sheen"][0],
      parameters["pop.mix"],
    );
    // True until the main thread says otherwise: the followers are one-poles with a tail, so a
    // processor collected mid-decay would take the release with it.
    return true;
  }
}

// The main thread's copy of this name is POP_DYNAMICS in ../worklet.ts, and the pair is asserted by
// ../worklet.test.ts. A worklet can import nothing, so the string is unavoidably written twice.
registerProcessor("pop-dynamics", PopDynamics);
