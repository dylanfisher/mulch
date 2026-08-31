/**
 * @role Samples reduced to one min/max pair per column — the shape a waveform is drawn from,
 *   whichever surface draws it.
 * @instead Measuring a render → src/lib/fingerprint.ts. This throws away everything but the
 *   envelope, so it answers "what did it look like", never "was it right".
 */
import { assertChannels } from "./channels.ts";
import { clamp } from "./range.ts";

/**
 * The loudest |sample| in `samples`, or 0 for an empty read — the one number a meter shows, and
 * the same scan whether it is a deck's mono level or one channel of the master's. Indexed, like
 * every hot loop in this tier: a typed-array iterator is an allocation per read on the
 * unoptimised path, and this runs once per meter per frame.
 */
export function peakMagnitude(samples: Float32Array): number {
  let loudest = 0;
  for (let i = 0; i < samples.length; i++) {
    const magnitude = Math.abs(samples[i] ?? 0);
    if (magnitude > loudest) loudest = magnitude;
  }
  return loudest;
}

/**
 * The power the window carries, as one magnitude: the root of the mean square of `samples`, or 0
 * for an empty read. What a meter's peak is not — a peak is one sample and flickers on every
 * transient, where this is the whole window and moves as the sound does, which is what a picture
 * driven off the output has to rest on. Scanned the same way and for the same reason
 * `peakMagnitude` is: once per read, per frame, allocating nothing.
 */
export function rmsMagnitude(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let power = 0;
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i] ?? 0;
    power += sample * sample;
  }
  return Math.sqrt(power / samples.length);
}

/**
 * How bright the window is, on 0..1, **in the time domain and never a spectrum**: the RMS of its
 * own first difference over the RMS of the window, halved. Differencing a signal is a one-pole
 * high pass, so the ratio is how much of the window survives it — a sine at *f* differences to
 * `2·sin(π f/sr)` times itself, which is nothing at the bottom of the band and two at Nyquist, and
 * halving lands the answer on the unit interval. A dark mix reads near nothing and a bright one
 * near one.
 *
 * The whole point is that it costs one more indexed scan of a window already fetched: an FFT a
 * channel a frame to move one grating is a large bill for a scalar, and `METER_WINDOW`'s own
 * comment is a promise that nothing here asks the analyser for frequency data.
 *
 * A window with nothing in it answers 0 — the same sentinel `crestFactor` uses for "measured
 * nothing". So does one with nothing *moving* in it, which is a window at a level and not a sound
 * anything can hear; both are the coarse end of the band the reading is spent through, and neither
 * is a claim about a signal.
 *
 * `rms` is the window's own power where the caller already has it: the tap reads both off one
 * window, and a second pass to recompute what it is holding is exactly the duplicate `crestFactor`
 * was rid of (principle 1).
 */
export function spectralTilt(samples: Float32Array, rms = rmsMagnitude(samples)): number {
  if (rms <= 0 || samples.length < 2) return 0;
  let power = 0;
  for (let i = 1; i < samples.length; i++) {
    const step = (samples[i] ?? 0) - (samples[i - 1] ?? 0);
    power += step * step;
  }
  const moved = Math.sqrt(power / (samples.length - 1));
  return clamp(moved / rms / 2, 0, 1);
}

/**
 * How far the loudest sample in `samples` stands above the window's own RMS — the crest, which is
 * what "washed" is measurable as: reverb, delay and saturation fill the gaps between transients, so
 * the peak stops standing out and this falls. Scanned the same way and for the same reason
 * `peakMagnitude` is: once per read, per frame, allocating nothing.
 *
 * A window with nothing in it answers 0 rather than a ratio of two zeroes — the same sentinel
 * `BeatAnalysis.crest` uses for "measured nothing" (src/lib/analysis.ts), and not a ratio a window
 * with sound in it can produce: the least a real crest can be is 1, where every sample is as loud
 * as the loudest.
 */
export function crestFactor(samples: Float32Array): number {
  // Both halves are somebody else's answer and never a second scan of their own: one loudest
  // sample and one power under it, one author each (principle 1).
  const loudest = peakMagnitude(samples);
  if (loudest <= 0) return 0;
  const rms = rmsMagnitude(samples);
  return rms > 0 ? loudest / rms : 0;
}

export type Peaks = {
  /** Lowest and highest sample in each column, across every channel. Same length as columns. */
  min: Float32Array<ArrayBuffer>;
  max: Float32Array<ArrayBuffer>;
};

/**
 * Min/max per column, over every channel at once — a mono summary, because a waveform drawn
 * from the loudest of the two channels is what a person is actually looking for.
 *
 * Columns whose span is empty (more columns than frames) keep a flat 0/0 pair rather than
 * borrowing a neighbour's, so an over-wide draw looks sparse instead of looking smooth.
 */
export function peaks(channels: readonly Float32Array[], columns: number): Peaks {
  if (!Number.isInteger(columns) || columns <= 0) {
    throw new RangeError(`columns must be a positive integer: ${columns}`);
  }
  const frames = assertChannels(channels, "peaks");
  const min = new Float32Array(columns);
  const max = new Float32Array(columns);

  for (let column = 0; column < columns; column++) {
    const from = Math.floor((column * frames) / columns);
    const to = Math.floor(((column + 1) * frames) / columns);
    let low = 0;
    let high = 0;
    for (const data of channels) {
      for (let i = from; i < to; i++) {
        const x = data[i] ?? 0;
        if (x < low) low = x;
        if (x > high) high = x;
      }
    }
    min[column] = low;
    max[column] = high;
  }
  return { min, max };
}
