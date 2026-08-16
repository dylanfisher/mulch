/**
 * @role The layout rules for split-channel samples: the guard every consumer keeps — at least one
 *   channel, and every channel the same length — and the sub-range every channel is cut to
 *   together, which is the whole of what a crop is as maths.
 * @instead Doing anything else with the samples once their shape is trusted → the caller. This
 *   file exists because peaks, fingerprint and wav each read past channel 0's layout, where a
 *   short channel would silently read as zeros.
 */
import { finite, positive } from "./guards.ts";
import { clamp } from "./range.ts";

/** Refuse a malformed channel set loudly; `who` names the caller in the error. */
export function assertChannels(channels: readonly Float32Array[], who: string): number {
  const first = channels[0];
  if (first === undefined) throw new RangeError(`${who} needs at least one channel`);
  const frames = first.length;
  for (const data of channels) {
    if (data.length !== frames) {
      throw new RangeError(`${who}: channels differ in length — ${frames} vs ${data.length}`);
    }
  }
  return frames;
}

/**
 * The frames between two times, every channel cut at the same two indices — the samples a crop
 * writes (0047). Both edges round to the nearest frame and clamp into what is actually there, so
 * a loop the graph already clamped cannot ask for samples past the end; a range that holds no
 * frames throws, because a source of no audio is not something a deck can be handed.
 */
export function cropChannels(
  channels: readonly Float32Array[],
  sampleRate: number,
  inSecs: number,
  outSecs: number,
): Float32Array[] {
  const frames = assertChannels(channels, "a crop");
  positive(sampleRate, "a crop's sample rate");
  const edge = (secs: number, which: string): number =>
    clamp(Math.round(finite(secs, `a crop's ${which}`) * sampleRate), 0, frames);
  const from = edge(inSecs, "in");
  const to = edge(outSecs, "out");
  if (to <= from) throw new RangeError(`a crop of ${inSecs}s to ${outSecs}s holds no frames`);
  return channels.map((data) => data.slice(from, to));
}
