/**
 * @role A folder of files as one downloadable archive: the stored (uncompressed) zip every
 *   browser and every desktop expands back into the directory it was named after.
 * @instead The app's own portable session container → src/lib/sessionArchive.ts, which is a
 *   manifest and its exact blob bytes rather than a directory anything else can open. Handing the
 *   result to the browser → src/ui/download.ts.
 */

import { crc32 } from "./crc32.ts";

/**
 * The one public identity of what this writes, shared by the download and by whatever asserts on
 * it. `application/zip` is what every unpacker sniffs for; the extension is what the desktop
 * double-clicks.
 */
export const ZIP_FILE = { extension: ".zip", mediaType: "application/zip" } as const;

/** One member of the folder: the name it takes inside it, and its exact bytes. */
export type ZipEntry = { name: string; bytes: Uint8Array<ArrayBuffer> };

const LOCAL_HEADER = 0x04_03_4b_50;
const CENTRAL_HEADER = 0x02_01_4b_50;
const END_OF_CENTRAL = 0x06_05_4b_50;
const LOCAL_HEADER_BYTES = 30;
const CENTRAL_HEADER_BYTES = 46;
const END_OF_CENTRAL_BYTES = 22;
/** The version that understands a stored entry, in the format's own tenths. */
const VERSION = 20;
/** Bit 11: the names below are UTF-8, which is the only encoding this writes. */
const UTF8_FLAG = 0x08_00;
/** Stored, never deflated — see the file's own note on why. */
const STORED = 0;
/**
 * 1980-01-01 00:00 in the DOS pair the format carries, and the same pair for every entry. A zip
 * of one export is a function of that export: stamping the wall clock into it would make two
 * archives of one performance differ in their bytes and nothing else.
 */
const DOS_TIME = 0;
const DOS_DATE = 0x00_21;

/**
 * The largest archive the format's own fields can describe: every size and every offset below is
 * a 32-bit little-endian number, and past this they wrap. Anything larger is Zip64, which is a
 * second header shape this does not write — so it is refused rather than truncated into an
 * archive that downloads and will not open (principle 5).
 */
const MAX_BYTES = 0xff_ff_ff_ff;

const encoder = new TextEncoder();

/**
 * One folder, as the archive that carries it. Every entry is written under `folder/` so that
 * unpacking anywhere produces the directory rather than loose files in whatever the person was
 * looking at — which is the whole reason an export is one download instead of two.
 *
 * Stored rather than deflated on purpose: what goes in here is a wav and a session archive whose
 * own blob bytes are already whatever the person imported, so deflate would spend a pass over
 * hundreds of megabytes to save nothing, and the browser has no synchronous deflate to spend it
 * with. The container is the point; the compression never was.
 */
// One pass owns every offset in the archive: the local headers, the central directory that points
// back at them and the record that says where that directory starts. Splitting it would put the
// arithmetic of where a thing is in one function and the writing of it in another, which is how a
// container ends up pointing at the wrong byte. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function zipFolder(folder: string, entries: readonly ZipEntry[]): Uint8Array<ArrayBuffer> {
  if (folder.includes("/") || folder.length === 0) {
    throw new RangeError(`a zip folder is one directory name: ${folder}`);
  }
  if (entries.length === 0) throw new RangeError("a zip of no entries is not a folder");
  const paths = entries.map(({ bytes, name }) => ({
    bytes,
    path: encoder.encode(`${folder}/${name}`),
  }));
  const localBytes = paths.reduce(
    (total, entry) => total + LOCAL_HEADER_BYTES + entry.path.length + entry.bytes.length,
    0,
  );
  const centralBytes = paths.reduce(
    (total, entry) => total + CENTRAL_HEADER_BYTES + entry.path.length,
    0,
  );
  const total = localBytes + centralBytes + END_OF_CENTRAL_BYTES;
  // The whole archive, because every offset written below is smaller than it: one test covers the
  // sizes and the offsets at once.
  if (total > MAX_BYTES) {
    throw new RangeError(`a zip is at most ${MAX_BYTES} bytes: ${folder} came to ${total}`);
  }
  // The checksums come after the guard: a refused archive should not pay a pass over its bytes.
  const named = paths.map(({ bytes, path }) => ({ bytes, path, crc: crc32(bytes) }));
  const out = new Uint8Array(total);
  const view = new DataView(out.buffer);
  let at = 0;
  const offsets: number[] = [];
  for (const entry of named) {
    offsets.push(at);
    view.setUint32(at, LOCAL_HEADER, true);
    view.setUint16(at + 4, VERSION, true);
    view.setUint16(at + 6, UTF8_FLAG, true);
    view.setUint16(at + 8, STORED, true);
    view.setUint16(at + 10, DOS_TIME, true);
    view.setUint16(at + 12, DOS_DATE, true);
    view.setUint32(at + 14, entry.crc, true);
    view.setUint32(at + 18, entry.bytes.length, true);
    view.setUint32(at + 22, entry.bytes.length, true);
    view.setUint16(at + 26, entry.path.length, true);
    view.setUint16(at + 28, 0, true);
    out.set(entry.path, at + LOCAL_HEADER_BYTES);
    out.set(entry.bytes, at + LOCAL_HEADER_BYTES + entry.path.length);
    at += LOCAL_HEADER_BYTES + entry.path.length + entry.bytes.length;
  }
  const central = at;
  for (const [index, entry] of named.entries()) {
    view.setUint32(at, CENTRAL_HEADER, true);
    view.setUint16(at + 4, VERSION, true);
    view.setUint16(at + 6, VERSION, true);
    view.setUint16(at + 8, UTF8_FLAG, true);
    view.setUint16(at + 10, STORED, true);
    view.setUint16(at + 12, DOS_TIME, true);
    view.setUint16(at + 14, DOS_DATE, true);
    view.setUint32(at + 16, entry.crc, true);
    view.setUint32(at + 20, entry.bytes.length, true);
    view.setUint32(at + 24, entry.bytes.length, true);
    view.setUint16(at + 28, entry.path.length, true);
    // No extra field, no comment, disk zero, and no attributes: a stored file and nothing else.
    view.setUint32(at + 42, offsets[index] ?? 0, true);
    out.set(entry.path, at + CENTRAL_HEADER_BYTES);
    at += CENTRAL_HEADER_BYTES + entry.path.length;
  }
  view.setUint32(at, END_OF_CENTRAL, true);
  view.setUint16(at + 8, named.length, true);
  view.setUint16(at + 10, named.length, true);
  view.setUint32(at + 12, at - central, true);
  view.setUint32(at + 16, central, true);
  return out;
}
