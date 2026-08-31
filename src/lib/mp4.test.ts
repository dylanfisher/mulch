/**
 * @role Contract tests for the MP4 codec read: the four letters under the sample description,
 *   and the clause a refused import carries because of them.
 */
import { describe, expect, it } from "vitest";

import { mp4AudioCodec, undecodableMp4Reason } from "./mp4";

/** One box: its size, its type, and whatever it holds. */
const box = (type: string, ...payload: Uint8Array[]): Uint8Array => {
  const held = payload.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(8 + held);
  new DataView(out.buffer).setUint32(0, out.length);
  out.set(new TextEncoder().encode(type), 4);
  let at = 8;
  for (const part of payload) {
    out.set(part, at);
    at += part.length;
  }
  return out;
};

const raw = (...bytes: number[]) => new Uint8Array(bytes);

/** A sample description holding one entry of this format, nested where a real file nests it. */
const file = (codec: string, ...extra: Uint8Array[]): ArrayBuffer => {
  const stsd = box(
    "stsd",
    // A version byte, three flag bytes, then the entry count.
    raw(0, 0, 0, 0),
    raw(0, 0, 0, 1),
    box(codec),
  );
  const parts = [
    box("ftyp", new TextEncoder().encode("M4A ")),
    ...extra,
    box("moov", box("trak", box("mdia", box("minf", box("stbl", stsd))))),
  ];
  const all = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of parts) {
    all.set(part, at);
    at += part.length;
  }
  return all.buffer;
};

describe("mp4AudioCodec", () => {
  it("reads the codec out of the sample description", () => {
    expect(mp4AudioCodec(file("alac"))).toBe("alac");
    expect(mp4AudioCodec(file("mp4a"))).toBe("mp4a");
  });

  it("walks past the boxes between the brand and the movie", () => {
    // What a real iTunes file puts there: a media data box megabytes long, whose contents are
    // compressed audio that can hold the four letters of anything by chance.
    const mdat = box("mdat", new TextEncoder().encode("stsdalacstsdalac"));
    expect(mp4AudioCodec(file("alac", mdat))).toBe("alac");
  });

  it("says nothing for bytes that are not an MP4", () => {
    expect(mp4AudioCodec(new TextEncoder().encode("RIFFxxxxWAVEfmt ").buffer)).toBeNull();
    expect(mp4AudioCodec(new ArrayBuffer(0))).toBeNull();
  });

  it("says nothing for a box tree that runs off the end of the bytes", () => {
    const truncated = new Uint8Array(file("alac")).slice(0, 40);
    expect(mp4AudioCodec(truncated.buffer)).toBeNull();
  });
});

describe("undecodableMp4Reason", () => {
  it("names the lossless codec no browser but Safari decodes", () => {
    expect(undecodableMp4Reason(file("alac"))).toBe(
      "the file is Apple Lossless (ALAC), which this browser has no decoder for — convert it to wav or flac",
    );
  });

  it("names a codec it has no name for by its four letters", () => {
    expect(undecodableMp4Reason(file("qwrt"))).toContain("the codec qwrt");
  });

  it("adds nothing when the codec is the one that does decode", () => {
    // An AAC .m4a that failed did not fail for being AAC, and saying so would be a lie the
    // decoder's own message then sits above.
    expect(undecodableMp4Reason(file("mp4a"))).toBeNull();
    expect(undecodableMp4Reason(new ArrayBuffer(4))).toBeNull();
  });
});
