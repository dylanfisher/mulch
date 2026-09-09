/**
 * @role The biquad as pure maths — the four shapes an EQ band may take, the coefficients the Web
 *   Audio specification defines for each of them, and the magnitude response they produce at a
 *   frequency.
 * @instead The effect itself → src/audio/effects/eq.ts, which builds the native node this file
 *   only describes. Nothing here processes a sample and nothing in the signal path calls it: a
 *   second implementation of the maths is exactly what this file must not become. It states, on
 *   its own, what a frequency, gain, Q and shape are supposed to do to a spectrum, to the precision
 *   the browser smoke's dB windows cannot reach; the smoke measures the real node independently.
 */

import { positive } from "./guards.ts";

/**
 * The shapes one EQ band may take, in the order the knob steps through them — and, written as the
 * `BiquadFilterNode.type` strings themselves, the one list the entry sets the node from and the
 * picture reads the band's own draw off. Declared here rather than in the plugin because
 * src/lib may not import src/audio (docs/map.md) and the look needs the same list the node does:
 * two spellings of which shape index means which shape is principle 1's own failure.
 *
 * Peaking first, because that is where the band ships and the one shape whose silence the entry's
 * presence describes — a gain of nought is flat only for a shape that reads the gain at all.
 */
export const EQ_SHAPES = ["peaking", "lowpass", "highpass", "bandpass"] as const;

export type EqShape = (typeof EQ_SHAPES)[number];

/** The top of the shape knob's own range: a discrete choice is a number stepped by one (0322). */
export const EQ_SHAPE_MAX = EQ_SHAPES.length - 1;

/**
 * Which shape a value stands for. Quantized to a whole number, because a discrete choice on this
 * instrument is a number with a `step` of one and a command off the wire carries whatever it likes
 * — and **refused rather than clamped** when that whole number names no shape: every caller of this
 * has already been through the command join, which clamps into the declared range, so a value out
 * of range here is a shape nobody declared and not a knob turned too far (principle 5).
 */
export function eqShapeAt(value: number): EqShape {
  if (!Number.isFinite(value)) throw new RangeError(`an EQ shape must be a number: ${value}`);
  const shape = EQ_SHAPES[Math.round(value)];
  if (shape === undefined) throw new RangeError(`no such EQ shape: ${value}`);
  return shape;
}

export type BiquadCoefficients = {
  b0: number;
  b1: number;
  b2: number;
  a0: number;
  a1: number;
  a2: number;
};

/**
 * The coefficients the Web Audio specification's filter formulae (the RBJ cookbook) give one band
 * at one shape: a boost or cut of `gainDb` centred on `frequency`, whose width follows `q`.
 *
 * **The shapes read `q` in the units the specification reads it in, which are not one unit.** A
 * peaking band's Q and a band-pass's are quality factors and reach the maths as `sin(w0) / 2Q`; a
 * low-pass's and a high-pass's is *in decibels* — the height of the resonant peak standing at the
 * corner — and reaches it as `sin(w0) / 2·10^(Q/20)`, so the bottom of that knob is a corner at
 * unity and a Q of twelve is a corner lifted by twelve. Written out here rather than folded into one alpha
 * because that is what the node this file describes actually does, and a file whose whole job is to
 * say what the node does may not say something tidier.
 *
 * **And `gainDb` is read by the peaking shape alone**, exactly as the node reads it: a low-pass at
 * +12dB is the same low-pass. The entry's knob says so in its own sentence rather than a second
 * rule hiding it (src/lib/copyParams.ts, 0322).
 */
export function biquadCoefficients(
  shape: EqShape,
  frequency: number,
  gainDb: number,
  q: number,
  sampleRate: number,
): BiquadCoefficients {
  positive(sampleRate, "sampleRate");
  positive(frequency, "frequency");
  positive(q, "q");
  if (!Number.isFinite(gainDb)) throw new RangeError(`gainDb must be finite: ${gainDb}`);
  if (frequency >= sampleRate / 2) {
    throw new RangeError(`frequency must stay below Nyquist: ${frequency} of ${sampleRate}`);
  }
  const omega = (2 * Math.PI * frequency) / sampleRate;
  const cosine = Math.cos(omega);
  const sine = Math.sin(omega);
  if (shape === "peaking") {
    const amplitude = 10 ** (gainDb / 40);
    const alpha = sine / (2 * q);
    return {
      b0: 1 + alpha * amplitude,
      b1: -2 * cosine,
      b2: 1 - alpha * amplitude,
      a0: 1 + alpha / amplitude,
      a1: -2 * cosine,
      a2: 1 - alpha / amplitude,
    };
  }
  // The denominator every pass shape shares — one pole pair at the corner, and only the numerator
  // says which side of it is kept.
  const alpha = shape === "bandpass" ? sine / (2 * q) : sine / (2 * 10 ** (q / 20));
  const poles = { a0: 1 + alpha, a1: -2 * cosine, a2: 1 - alpha };
  if (shape === "bandpass") return { b0: alpha, b1: 0, b2: -alpha, ...poles };
  if (shape === "lowpass") {
    return { b0: (1 - cosine) / 2, b1: 1 - cosine, b2: (1 - cosine) / 2, ...poles };
  }
  return { b0: (1 + cosine) / 2, b1: -(1 + cosine), b2: (1 + cosine) / 2, ...poles };
}

/** |H(e^jω)| — how much the filter multiplies a sine at `frequency`, as a linear ratio. */
export function magnitudeAt(
  coefficients: BiquadCoefficients,
  frequency: number,
  sampleRate: number,
): number {
  positive(sampleRate, "sampleRate");
  if (!Number.isFinite(frequency) || frequency < 0) {
    throw new RangeError(`frequency must be finite and non-negative: ${frequency}`);
  }
  if (frequency > sampleRate / 2) {
    throw new RangeError(`frequency must stay at or below Nyquist: ${frequency} of ${sampleRate}`);
  }
  const omega = (2 * Math.PI * frequency) / sampleRate;
  const { b0, b1, b2, a0, a1, a2 } = coefficients;
  const numeratorReal = b0 + b1 * Math.cos(omega) + b2 * Math.cos(2 * omega);
  const numeratorImaginary = -(b1 * Math.sin(omega) + b2 * Math.sin(2 * omega));
  const denominatorReal = a0 + a1 * Math.cos(omega) + a2 * Math.cos(2 * omega);
  const denominatorImaginary = -(a1 * Math.sin(omega) + a2 * Math.sin(2 * omega));
  const denominator = Math.hypot(denominatorReal, denominatorImaginary);
  if (denominator === 0) throw new RangeError("the filter has a pole on the unit circle");
  return Math.hypot(numeratorReal, numeratorImaginary) / denominator;
}

/** The same response in dB, which is the unit a peaking EQ's gain is already stated in. */
export function magnitudeDbAt(
  coefficients: BiquadCoefficients,
  frequency: number,
  sampleRate: number,
): number {
  return 20 * Math.log10(magnitudeAt(coefficients, frequency, sampleRate));
}
