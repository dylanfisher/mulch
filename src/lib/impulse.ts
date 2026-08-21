/**
 * @role The reverb's impulse response as pure maths — the stereo samples a decay time and a tone
 *   fold into, generated here rather than shipped as an asset, and Node-testable with no context.
 * @instead The effect that convolves with it → src/audio/effects/reverb.ts, which owns the
 *   ConvolverNode and decides when to ask for a new response. Nothing here holds a node, a
 *   context or a cache: same arguments, same samples, every time.
 */

/** Stereo, so the two ears hear decorrelated noise and the tail has width at all. */
export const IMPULSE_CHANNELS = 2;

/**
 * Where the tail is judged to have ended: 60dB down, the decay time every reverb states. It is
 * also the buffer's length, so `decay` is a duration and not just a slope.
 */
const DECAY_DB = 60;
const DECAY_NEPERS = (DECAY_DB / 20) * Math.LN10;

/**
 * The one seed, and the stride between channels. A response is a draw from noise, but it is the
 * *same* draw every time: `Math.random()` here would make the convolver a different instrument on
 * every rebuild, and no test could assert a rendered tail at all.
 */
const SEED = 0x9e37_79b9;
const CHANNEL_STRIDE = 0x6d2b_79f5;

/** xorshift32 — the whole PRNG, so nothing about the tail depends on the host's generator. */
function noise(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return (state / 0x1_0000_0000) * 2 - 1;
  };
}

export type ImpulseSpec = {
  /** How long the tail takes to fall 60dB, in seconds — also the response's length. */
  decaySecs: number;
  /** The one-pole corner the noise is damped at, in Hz: what a dark or a bright room means. */
  toneHz: number;
  sampleRate: number;
};

/**
 * The impulse response as one array per channel: damped noise under an exponential decay, each
 * channel scaled to unit energy. Energy and not peak, because what a convolution multiplies a
 * signal by is the root of the sum of the squares — a peak-normalized tail gets louder the longer
 * it is, which would make the wet level a function of the decay time nobody set it for. At unit
 * energy the convolver passes the wet path through at 0dB whatever decay and tone are.
 *
 * Tone shapes the response itself rather than a filter after the convolver, because a room's
 * absorption is part of its tail — which is also why a tone move rebuilds this (0087).
 */
export function impulseResponse({
  decaySecs,
  toneHz,
  sampleRate,
}: ImpulseSpec): Float32Array<ArrayBuffer>[] {
  if (!(decaySecs > 0) || !(toneHz > 0) || !(sampleRate > 0)) {
    throw new RangeError(
      `impulse needs positive decay, tone and rate: ${decaySecs},${toneHz},${sampleRate}`,
    );
  }
  const length = Math.max(1, Math.round(decaySecs * sampleRate));
  // The one-pole coefficient for `toneHz` at this rate, held below 1 so the filter is always a
  // filter: a corner at or past Nyquist would otherwise pass the noise through untouched.
  const alpha = Math.min(1, 1 - Math.exp((-2 * Math.PI * toneHz) / sampleRate));
  // The envelope as a ratio applied per sample rather than an exp() per sample: the same curve,
  // and a rebuild a knob can afford at the declared maximum of eight seconds.
  const perSample = Math.exp(-DECAY_NEPERS / (decaySecs * sampleRate));
  const channels: Float32Array<ArrayBuffer>[] = [];
  for (let channel = 0; channel < IMPULSE_CHANNELS; channel++) {
    const draw = noise(SEED + channel * CHANNEL_STRIDE);
    const samples = new Float32Array(length);
    let filtered = 0;
    let envelope = 1;
    let energy = 0;
    for (let index = 0; index < length; index++) {
      filtered += alpha * (draw() - filtered);
      const sample = filtered * envelope;
      envelope *= perSample;
      samples[index] = sample;
      energy += sample * sample;
    }
    // Each channel to unit energy, so the convolution multiplies by one. A silent response is
    // still a response — a draw that never left zero is not an error, and dividing by its energy
    // would be.
    if (energy > 0) {
      const scale = 1 / Math.sqrt(energy);
      for (let index = 0; index < length; index++) samples[index] = samples[index]! * scale;
    }
    channels.push(samples);
  }
  return channels;
}
