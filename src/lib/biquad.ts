/**
 * @role The peaking biquad as pure maths — the coefficients the Web Audio specification defines
 *   for a `"peaking"` BiquadFilterNode, and the magnitude response they produce at a frequency.
 * @instead The effect itself → src/audio/effects/eq.ts, which builds the native node this file
 *   only describes. Nothing here processes a sample and nothing in the signal path calls it: a
 *   second implementation of the maths is exactly what this file must not become. It states, on
 *   its own, what a frequency, gain and Q are supposed to do to a spectrum, to the precision the
 *   browser smoke's dB windows cannot reach; the smoke measures the real node independently.
 */

import { positive } from "./guards.ts";

export type BiquadCoefficients = {
  b0: number;
  b1: number;
  b2: number;
  a0: number;
  a1: number;
  a2: number;
};

/**
 * The peaking-EQ coefficients from the Web Audio specification's filter formulae (the RBJ
 * cookbook): a boost or cut of `gainDb` centred on `frequency`, whose width follows `q`.
 */
export function peakingCoefficients(
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
  const amplitude = 10 ** (gainDb / 40);
  const omega = (2 * Math.PI * frequency) / sampleRate;
  const alpha = Math.sin(omega) / (2 * q);
  const cosine = Math.cos(omega);
  return {
    b0: 1 + alpha * amplitude,
    b1: -2 * cosine,
    b2: 1 - alpha * amplitude,
    a0: 1 + alpha / amplitude,
    a1: -2 * cosine,
    a2: 1 - alpha / amplitude,
  };
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
