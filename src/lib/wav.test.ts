import { describe, expect, it } from "vitest";

import { encodeWav, WAV_BYTES_PER_SAMPLE, WAV_HEADER_BYTES, WAV_QUANTIZATION_EPSILON } from "./wav";

const RATE = 48_000;

const header = (wav: Uint8Array) => new DataView(wav.buffer, wav.byteOffset, WAV_HEADER_BYTES);
const ascii = (wav: Uint8Array, at: number, length: number) =>
  String.fromCodePoint(...wav.subarray(at, at + length));
const samples = (wav: Uint8Array, count: number) => {
  const view = new DataView(wav.buffer, wav.byteOffset + WAV_HEADER_BYTES);
  return Array.from({ length: count }, (_, index) =>
    view.getInt16(index * WAV_BYTES_PER_SAMPLE, true),
  );
};

describe("encodeWav", () => {
  it("writes a RIFF header describing exactly the buffer that follows", () => {
    const wav = encodeWav([new Float32Array(RATE), new Float32Array(RATE)], RATE);
    const bytesPerFrame = 2 * WAV_BYTES_PER_SAMPLE;
    expect(wav).toHaveLength(WAV_HEADER_BYTES + RATE * bytesPerFrame);

    expect(ascii(wav, 0, 4)).toBe("RIFF");
    expect(ascii(wav, 8, 4)).toBe("WAVE");
    expect(ascii(wav, 36, 4)).toBe("data");
    const view = header(wav);
    // The RIFF size excludes its own eight bytes.
    expect(view.getUint32(4, true)).toBe(wav.length - 8);
    expect(view.getUint16(22, true)).toBe(2);
    expect(view.getUint32(24, true)).toBe(RATE);
    // Byte rate, then the data chunk length — the same number here, one second of audio.
    expect(view.getUint32(28, true)).toBe(RATE * bytesPerFrame);
    expect(view.getUint32(40, true)).toBe(RATE * bytesPerFrame);
  });

  it("interleaves the channels, frame by frame", () => {
    const wav = encodeWav([Float32Array.of(1, 0), Float32Array.of(0, -1)], RATE);
    expect(samples(wav, 4)).toEqual([0x7f_ff, 0, 0, -0x80_00]);
  });

  it("clamps out-of-range samples rather than wrapping them into tearing", () => {
    const wav = encodeWav([Float32Array.of(4, -4)], RATE);
    expect(samples(wav, 2)).toEqual([0x7f_ff, -0x80_00]);
  });

  it("refuses input it cannot lay out", () => {
    expect(() => encodeWav([], RATE)).toThrow(/channel/u);
    expect(() => encodeWav([new Float32Array(2), new Float32Array(3)], RATE)).toThrow(/length/u);
    // `u32` writes a NaN rate as 0, producing a playable file that claims 0 Hz.
    expect(() => encodeWav([new Float32Array(2)], Number.NaN)).toThrow(/sample rate/u);
  });

  it("bounds a round trip at half a PCM step and rejects an adjacent code", () => {
    const input = 0.1;
    const wav = encodeWav([Float32Array.of(input)], RATE);
    const [code] = samples(wav, 1);
    const roundTrip = (code ?? 0) / 0x7f_ff;
    expect(Math.abs(input - roundTrip)).toBeLessThanOrEqual(WAV_QUANTIZATION_EPSILON);
    expect(1 / 0x7f_ff).toBeGreaterThan(WAV_QUANTIZATION_EPSILON);
  });
});

/**
 * A channel list that counts every entry into the iterator protocol — the instrument for a loop
 * that must not walk the channels through `for…of` once a frame.
 */
class CountingChannels extends Array<Float32Array> {
  entered = 0;
  override [Symbol.iterator](): ArrayIterator<Float32Array> {
    this.entered++;
    return super[Symbol.iterator]();
  }
}

describe("encodeWav's sample loop", () => {
  it("walks the channels without entering the array iterator once per frame", () => {
    const frames = 10_000;
    // `for (const data of channels)` in the per-frame loop enters the iterator once a frame,
    // which is 28.8M entries for a ten-minute export.
    const counting = new CountingChannels();
    counting.push(new Float32Array(frames).fill(0.5), new Float32Array(frames).fill(0.5));
    encodeWav(counting, RATE);
    expect(counting.entered).toBeLessThan(frames / 100);
  });
});
