/**
 * @role Turning a `SourceRef` into an AudioBuffer — the seam between the pure sample maths in
 *   src/lib/waveform.ts and the graph. Imported bytes are decoded by their owning audio host.
 */
import type { GenSource } from "@/lib/source";
import { renderGen } from "@/lib/waveform";

/** A synthetic source is mono: one channel of maths, fanned out by the chain's panner. */
const CHANNELS = 1;

/**
 * The buffer for a synthetic source, at the context's own sample rate — so the samples an
 * offline render fingerprints are generated for that render's rate, not resampled into it.
 *
 * A `{ blobId }` source is not handled here: decoding imported bytes is async and belongs to the
 * owning BaseAudioContext in src/app/engine.ts, while this pure generator path stays synchronous.
 */
export function renderSourceBuffer(ctx: BaseAudioContext, source: GenSource): AudioBuffer {
  const samples = renderGen(source.gen, {
    secs: source.secs,
    sampleRate: ctx.sampleRate,
    ...(source.hz === undefined ? {} : { hz: source.hz }),
  });
  const buffer = ctx.createBuffer(CHANNELS, samples.length, ctx.sampleRate);
  buffer.copyToChannel(samples, 0);
  return buffer;
}
