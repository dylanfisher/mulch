/**
 * @role A rendered buffer as a .wav file — 16-bit PCM, the one format everything plays.
 * @instead Measuring a render rather than saving it → src/lib/fingerprint.ts. The fingerprint
 *   is the assertion surface; this is for when a person wants to hear the thing.
 */
import { assertChannels } from "./channels.ts";
import { clamp } from "./range";

/** Bits per sample. 16 because the point of this file is that anything can open the result. */
export const WAV_BITS = 16;
const BYTES_PER_SAMPLE = WAV_BITS / 8;
const HEADER_BYTES = 44;
const FORMAT_PCM = 1;

/** The 44 fixed bytes in front of the samples: RIFF, the PCM fmt chunk, and the data length. */
function writeHeader(view: DataView, channels: number, frames: number, sampleRate: number): void {
  const blockAlign = channels * BYTES_PER_SAMPLE;
  const dataBytes = frames * blockAlign;
  let at = 0;
  const ascii = (text: string): void => {
    for (const character of text) view.setUint8(at++, character.codePointAt(0) ?? 0);
  };
  const u32 = (value: number): void => {
    view.setUint32(at, value, true);
    at += 4;
  };
  const u16 = (value: number): void => {
    view.setUint16(at, value, true);
    at += 2;
  };

  ascii("RIFF");
  // Everything after this field — the RIFF size excludes its own eight bytes.
  u32(HEADER_BYTES - 8 + dataBytes);
  ascii("WAVE");
  ascii("fmt ");
  // The PCM fmt chunk's own length, then the chunk.
  u32(16);
  u16(FORMAT_PCM);
  u16(channels);
  u32(sampleRate);
  u32(sampleRate * blockAlign);
  u16(blockAlign);
  u16(WAV_BITS);
  ascii("data");
  u32(dataBytes);
}

/**
 * Interleaved 16-bit PCM with a RIFF header. Samples outside [-1, 1] are clamped rather than
 * wrapped — the graph's soft clip means they should not arrive, and a wrap would turn a gain
 * bug into tearing that reads like a different bug entirely.
 */
export function encodeWav(
  channels: readonly Float32Array[],
  sampleRate: number,
): Uint8Array<ArrayBuffer> {
  const frames = assertChannels(channels, "a wav");

  const bytes = new ArrayBuffer(HEADER_BYTES + frames * channels.length * BYTES_PER_SAMPLE);
  const view = new DataView(bytes);
  writeHeader(view, channels.length, frames, sampleRate);

  let at = HEADER_BYTES;
  for (let i = 0; i < frames; i++) {
    for (const data of channels) {
      const clamped = clamp(data[i] ?? 0, -1, 1);
      // Asymmetric scaling on purpose: two's complement holds one more negative value than
      // positive, and using 32768 for both is the classic way to clip every full-scale peak.
      view.setInt16(at, Math.round(clamped * (clamped < 0 ? 0x80_00 : 0x7f_ff)), true);
      at += 2;
    }
  }
  return new Uint8Array(bytes);
}
