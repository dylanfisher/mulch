import { describe, expect, it } from "vitest";

import { encodeWav, WAV_BITS } from "./wav";

const RATE = 48_000;
const HEADER_BYTES = 44;

const header = (wav: Uint8Array) => new DataView(wav.buffer, wav.byteOffset, HEADER_BYTES);
const ascii = (wav: Uint8Array, at: number, length: number) =>
  String.fromCodePoint(...wav.subarray(at, at + length));

describe("encodeWav", () => {
  it("writes a RIFF header describing exactly the buffer that follows", () => {
    const wav = encodeWav([new Float32Array(RATE), new Float32Array(RATE)], RATE);
    const bytesPerFrame = (2 * WAV_BITS) / 8;
    expect(wav).toHaveLength(HEADER_BYTES + RATE * bytesPerFrame);

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
    const samples = new Int16Array(wav.buffer, wav.byteOffset + HEADER_BYTES, 4);
    expect([...samples]).toEqual([0x7f_ff, 0, 0, -0x80_00]);
  });

  it("clamps out-of-range samples rather than wrapping them into tearing", () => {
    const wav = encodeWav([Float32Array.of(4, -4)], RATE);
    const samples = new Int16Array(wav.buffer, wav.byteOffset + HEADER_BYTES, 2);
    expect([...samples]).toEqual([0x7f_ff, -0x80_00]);
  });

  it("refuses input it cannot lay out", () => {
    expect(() => encodeWav([], RATE)).toThrow(/channel/u);
    expect(() => encodeWav([new Float32Array(2), new Float32Array(3)], RATE)).toThrow(/length/u);
  });
});
