/**
 * @role Samples reduced to one min/max pair per column — the shape a waveform is drawn from,
 *   whichever surface draws it.
 * @instead Measuring a render → src/lib/fingerprint.ts. This throws away everything but the
 *   envelope, so it answers "what did it look like", never "was it right".
 */
import { assertChannels } from "./channels.ts";

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
  // The peak is `peakMagnitude`'s answer and never a second scan of its own: one loudest sample,
  // one author (principle 1). What this adds is the power the window carries under it.
  const loudest = peakMagnitude(samples);
  if (loudest <= 0 || samples.length === 0) return 0;
  let power = 0;
  for (let i = 0; i < samples.length; i++) {
    const sample = samples[i] ?? 0;
    power += sample * sample;
  }
  const rms = Math.sqrt(power / samples.length);
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
