/**
 * @role The two linear ramps an export may put on the ends of a rendered buffer — up from the
 *   first sample, down into the last — as maths over samples the graph has already produced.
 * @instead Anything that shapes what the instrument plays → src/audio; a fade is not a parameter,
 *   nothing durable holds one, and no node makes it. Measuring the result → src/lib/fingerprint.ts.
 */
import { assertChannels } from "./channels.ts";
import { finite, positive } from "./guards.ts";

/**
 * One end's length, checked. Zero means that end is left exactly as it rendered. Exported because
 * a caller has to be able to refuse a fade _before_ it spends ten minutes rendering the buffer the
 * fade would then throw over — a spec is checked at the door, not at the far end (principle 5).
 */
export function assertFadeSecs(secs: number, at: string): number {
  const value = finite(secs, at);
  // Loud rather than a ramp that runs backwards: a negative length would produce gains above one
  // at one end and below zero at the other, which reads as distortion rather than as the refusal
  // it is.
  if (value < 0) throw new RangeError(`${at} is negative: ${value}`);
  return value;
}

/** That length in frames, clamped to the buffer it is being put on. */
function fadeFrames(secs: number, at: string, frames: number, sampleRate: number): number {
  return Math.min(frames, Math.round(assertFadeSecs(secs, at) * sampleRate));
}

/**
 * Ramp both ends of a rendered buffer, in place and in the caller's own arrays.
 *
 * Linear in amplitude, and each ramp reaches exactly zero at the buffer's own edge: the first
 * sample of a fade in and the last sample of a fade out are silent, which is the whole point of
 * asking for one. The two multiply where they overlap — a fade longer than the render is clamped
 * to it rather than refused, so a ten second fade on a five second export is a five second one.
 */
export function applyFades(
  channels: readonly Float32Array[],
  sampleRate: number,
  fadeInSecs: number,
  fadeOutSecs: number,
): void {
  const frames = assertChannels(channels, "a fade");
  positive(sampleRate, "fade sample rate");
  const rising = fadeFrames(fadeInSecs, "a fade in", frames, sampleRate);
  const falling = fadeFrames(fadeOutSecs, "a fade out", frames, sampleRate);
  if (rising === 0 && falling === 0) return;

  for (const data of channels) {
    for (let i = 0; i < rising; i++) data[i] = (data[i] ?? 0) * (i / rising);
    for (let i = 0; i < falling; i++) {
      const at = frames - 1 - i;
      data[at] = (data[at] ?? 0) * (i / falling);
    }
  }
}
