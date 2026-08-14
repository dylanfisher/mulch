/**
 * @role The one guard every consumer of split-channel samples keeps: at least one channel, and
 *   every channel the same length. Returns the frame count the layout is then read from.
 * @instead Doing anything with the samples once their shape is trusted → the caller. This file
 *   exists because peaks, fingerprint and wav each read past channel 0's layout, where a short
 *   channel would silently read as zeros.
 */

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
