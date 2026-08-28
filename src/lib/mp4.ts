/**
 * @role Why an MP4 the browser refused is one it cannot decode: the codec four-character code in
 *   its sample description, read from the bytes and named.
 * @instead What a deck accepts at all → src/lib/audioFile.ts, which reads the name and never the
 *   bytes (0043). Nothing here gates an import: by the time this runs the decoder has already
 *   refused, and this only says what it refused.
 */

/** Boxes this walks into. Every other box is skipped whole — its payload is not a box tree. */
const CONTAINERS = new Set(["moov", "trak", "mdia", "minf", "stbl"]);

/**
 * What a codec is called, for the ones a browser meets in an .m4a and has no decoder for. `mp4a`
 * — AAC — is deliberately absent: it decodes, so a failure carrying it is not about the codec and
 * must not be explained away as if it were.
 */
const CODEC_NAMES: Record<string, string> = {
  alac: "Apple Lossless (ALAC)",
  "ac-3": "Dolby Digital (AC-3)",
  "ec-3": "Dolby Digital Plus (E-AC-3)",
  dtsc: "DTS",
};

const typeAt = (view: DataView, at: number): string =>
  String.fromCharCode(
    view.getUint8(at),
    view.getUint8(at + 1),
    view.getUint8(at + 2),
    view.getUint8(at + 3),
  );

/**
 * The first sample entry's format under `moov/trak/mdia/minf/stbl/stsd`, or null for bytes that
 * are not an MP4 at all or carry no sample description. The tree is walked rather than scanned
 * for: the four letters of a codec occur by chance inside compressed audio, and a guess about
 * which one a file holds is worse than no answer (principle 5).
 */
export function mp4AudioCodec(bytes: ArrayBuffer): string | null {
  const view = new DataView(bytes);
  // An MP4 opens with its brand. Anything else is a wav, a flac, an mp3 — not this file's story.
  if (view.byteLength < 8 || typeAt(view, 4) !== "ftyp") return null;

  const walk = (from: number, to: number): string | null => {
    let at = from;
    while (at + 8 <= to) {
      const declared = view.getUint32(at);
      let header = 8;
      // A size of 1 puts the real one in the eight bytes after the type; a size of 0 means the
      // box runs to the end of its parent.
      let size = declared;
      if (declared === 1) {
        if (at + 16 > to) return null;
        size = Number(view.getBigUint64(at + 8));
        header = 16;
      } else if (declared === 0) {
        size = to - at;
      }
      if (size < header || at + size > to) return null;
      const type = typeAt(view, at + 4);
      if (type === "stsd") {
        // A full box: four bytes of version and flags, four of entry count, then the first
        // entry's own size and its format.
        const format = at + header + 12;
        return format + 4 <= to ? typeAt(view, format) : null;
      }
      if (CONTAINERS.has(type)) {
        const found = walk(at + header, at + size);
        if (found !== null) return found;
      }
      at += size;
    }
    return null;
  };

  return walk(0, view.byteLength);
}

/**
 * The clause that names why these bytes were refused, or null when they say nothing a caller
 * could add. Written as a sentence fragment because it is appended to the decoder's own refusal,
 * which stays the head of the message.
 */
export function undecodableMp4Reason(bytes: ArrayBuffer): string | null {
  const codec = mp4AudioCodec(bytes);
  if (codec === null || codec === "mp4a") return null;
  const name = CODEC_NAMES[codec] ?? `the codec ${codec}`;
  return `the file is ${name}, which this browser has no decoder for — convert it to wav or flac`;
}
