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
 * channel a frame to move one grating is a large bill for a scalar, and this is what a grating gets.
 * What a *fold* gets is `spectralFlatness` and `spectralEdge` below, which is one spectrum a frame
 * on one channel and is argued on its own cost (0241) — this reading is not paid for out of it.
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

/**
 * The quietest a **bin** may be and still be a sound, in dBFS. Digital silence differences to
 * `-Infinity` and a browser may hand over a whole array of it, so both measures need a floor to
 * stand on before they can say anything at all.
 *
 * **A bin is not a level.** Broadband energy divides across `frequencyBinCount` of them, so a bin
 * sits roughly `10·log10(bins)` — about 27dB at the meter's own window — under the level the same
 * signal reads at. A floor set at the -60 every level readout rounds away would therefore call a
 * -35dBFS hiss silence while the meter beside it is plainly lit. A hundred and twenty is that
 * spread plus the whole of the quiet end under it, so what falls through is a window nobody can
 * hear rather than a window nobody turned up.
 */
export const SPECTRUM_FLOOR_DB = -120;

/** One bin's dB as the magnitude it stands for — the `/20` written once for both measures. */
const magnitudeOf = (db: number): number => 10 ** (db / 20);

/** That floor as a magnitude — the weight a bin carrying nothing is worth. */
const FLOOR_MAGNITUDE = magnitudeOf(SPECTRUM_FLOOR_DB);

/** One bin's dB, floored and with a broken reading treated as an empty one. */
const binDb = (db: number | undefined): number =>
  db !== undefined && Number.isFinite(db) && db > SPECTRUM_FLOOR_DB ? db : SPECTRUM_FLOOR_DB;

/**
 * How evenly the window's energy is spread across `bins`, on 0..1 — the one thing a time-domain
 * scan will not say, and the whole of the difference between a broad wash and a narrow resonance.
 * A ringing drone puts nearly all of its power in a few bins and reads near nothing; noise puts the
 * same power in every bin and reads near one. The geometric mean of the bin magnitudes over their
 * arithmetic mean, which is the classical measure and is nearly free here: `bins` arrive in dB
 * (`AnalyserNode.getFloatFrequencyData`), dB is already a logarithm, so the geometric mean is the
 * plain mean of the array and costs one running sum.
 *
 * A window with nothing over `SPECTRUM_FLOOR_DB` in it answers 0 — the same sentinel `crestFactor`
 * and `spectralTilt` use for "measured nothing", and the opposite of the 1 a floored array would
 * otherwise read as. So does an empty one. Neither is a claim that the output is resonant.
 */
export function spectralFlatness(bins: Float32Array): number {
  let db = 0;
  let sum = 0;
  let heard = 0;
  for (let i = 0; i < bins.length; i++) {
    const level = binDb(bins[i]);
    if (level > SPECTRUM_FLOOR_DB) heard += 1;
    db += level;
    sum += magnitudeOf(level);
  }
  if (heard === 0) return 0;
  return clamp(magnitudeOf(db / bins.length) / (sum / bins.length), 0, 1);
}

/**
 * Where in `bins` the energy sits, on 0..1 across the band — the spectral centroid, and what a
 * sharp sound has that a dull one does not. Each bin's magnitude weighs its own position, with the
 * floor taken off first so a bin carrying nothing pulls the answer nowhere. A tone an octave up is
 * twice the answer of the tone under it, which is what makes this the reading `spectralTilt` is
 * not: the tilt says how much of the window survives a differencing, this says where the survivors
 * are.
 *
 * `bins` are in dB, as `spectralFlatness` takes them. A window with nothing over the floor answers
 * 0, and so does one too short to have a band at all.
 */
export function spectralEdge(bins: Float32Array): number {
  if (bins.length < 2) return 0;
  let weighted = 0;
  let total = 0;
  for (let i = 0; i < bins.length; i++) {
    const magnitude = magnitudeOf(binDb(bins[i])) - FLOOR_MAGNITUDE;
    if (magnitude <= 0) continue;
    weighted += i * magnitude;
    total += magnitude;
  }
  if (total <= 0) return 0;
  return clamp(weighted / total / (bins.length - 1), 0, 1);
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
