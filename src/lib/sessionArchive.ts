/**
 * @role The pure, versioned portable-session container: one manifest and exactly its unchanged
 *   referenced blob bytes, encoded and validated without DOM or audio work.
 */
import { objectAt } from "./guards";
import type { BlobId } from "./source";

// ASCII `mulch` followed by NUL, before the little-endian container version.
const MAGIC = Uint8Array.of(0x6d, 0x75, 0x6c, 0x63, 0x68, 0x00);
const ARCHIVE_VERSION = 1;
const MANIFEST_ENTRY = "manifest.json";
const FILE_EXTENSION = ".mulch";
const HEADER_BYTES = MAGIC.length + 2 + 4;
const ENTRY_HEADER_BYTES = 2 + 4 + 4;
const MAX_ENTRIES = 10_000;
const MAX_ENTRY_NAME_BYTES = 0xffff;
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

/** The one public file identity shared by creation, the picker, and browser-boundary tests. */
export const SESSION_ARCHIVE_FILE = {
  extension: FILE_EXTENSION,
  mediaType: "application/vnd.mulch.session",
  name: `mulch-session${FILE_EXTENSION}`,
} as const;

export type SessionArchive = {
  manifest: unknown;
  blobs: ReadonlyMap<BlobId, Uint8Array<ArrayBuffer>>;
};

/** One deck-shaped manifest entry's blob reference, if it has one. */
const deckBlobId = (deck: unknown): BlobId | null => {
  if (typeof deck !== "object" || deck === null || Array.isArray(deck)) return null;
  const source = objectAt(deck, "archive deck").source;
  if (typeof source !== "object" || source === null || Array.isArray(source)) return null;
  const id = objectAt(source, "archive source").blobId;
  return typeof id === "string" && id.length > 0 ? id : null;
};

// This tier cannot import `sessionBlobIds` — state is above lib — so the walk is restated here
// against untyped JSON on purpose: it is the container's own cross-check that the bytes it holds
// are exactly the bytes its manifest names. It visits clips beside decks, because a clip borrows
// blob bytes and would otherwise travel without its audio (0027).
const referencedBlobs = (manifest: unknown): BlobId[] => {
  const archive = objectAt(manifest, "archive manifest");
  const decks = objectAt(archive.decks, "archive manifest.decks");
  const ids = new Set<BlobId>();
  for (const deck of Object.values(decks)) {
    const id = deckBlobId(deck);
    if (id !== null) ids.add(id);
  }
  if (Array.isArray(archive.clips)) {
    for (const clip of archive.clips) {
      if (typeof clip !== "object" || clip === null || Array.isArray(clip)) continue;
      const id = deckBlobId(objectAt(clip, "archive clip").deck);
      if (id !== null) ids.add(id);
    }
  }
  // ES2022 has no toSorted; this is a fresh array, so sorting cannot mutate a caller's value.
  // oxlint-disable-next-line unicorn/no-array-sort
  return [...ids].sort();
};

const blobEntry = (id: BlobId): string => {
  // UTF-8 is not injective over JavaScript strings: TextEncoder replaces every unpaired
  // surrogate with the same U+FFFD bytes. Hex the original UTF-16 code units instead, so even
  // opaque ids containing malformed Unicode keep a distinct, deterministic entry name.
  const maxIdLength = Math.floor((MAX_ENTRY_NAME_BYTES - "blobs/".length) / 4);
  if (id.length > maxIdLength) throw new RangeError("archive blob id is too long");
  let hex = "";
  for (let index = 0; index < id.length; index++) {
    // Code units, deliberately: codePointAt would collapse a surrogate pair and lose framing.
    // oxlint-disable-next-line unicorn/prefer-code-point
    hex += id.charCodeAt(index).toString(16).padStart(4, "0");
  }
  return `blobs/${hex}`;
};

/**
 * One byte's worth of the CRC-32 polynomial, folded once at module load. The bit-at-a-time form
 * this replaces did eight shifts per byte, and an archive carrying a source pays that per byte of
 * audio: measured at 96ms for an 11.5MB blob against 19ms here, on both create and parse.
 */
const CRC32_TABLE = ((): Uint32Array => {
  const table = new Uint32Array(256);
  for (let byte = 0; byte < 256; byte++) {
    let crc = byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    table[byte] = crc;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  // Indexed rather than `for…of`: iterating a Uint8Array through its iterator measured three
  // times slower than this loop, which is the whole point of the table.
  for (let index = 0; index < bytes.length; index++) {
    crc = (CRC32_TABLE[(crc ^ (bytes[index] ?? 0)) & 0xff] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const uint32 = (value: number, at: string): number => {
  if (!Number.isSafeInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError(`${at} does not fit in an archive uint32`);
  }
  return value;
};

type Entry = { name: string; bytes: Uint8Array<ArrayBuffer> };

/** Create a deterministic archive from a JSON manifest and its exact referenced bytes. */
// One pass owns manifest normalization, exact reachability, and every encoded size. Splitting it
// would risk validating a different entry list than the one written below. See 0007.
// oxlint-disable-next-line max-lines-per-function
export function createSessionArchive(
  manifest: unknown,
  blobs: ReadonlyMap<BlobId, Uint8Array<ArrayBuffer>>,
): Uint8Array<ArrayBuffer> {
  const manifestJson = JSON.stringify(manifest);
  // The TypeScript library signature promises a string for unknown even though the platform
  // returns undefined for undefined, functions, and symbols.
  // oxlint-disable-next-line no-unnecessary-condition
  if (manifestJson === undefined) throw new TypeError("archive manifest is not JSON data");
  // Derive reachability from the bytes that will actually be archived. This keeps custom toJSON
  // methods (when an untyped caller supplies one) from making a self-inconsistent container.
  const ids = referencedBlobs(JSON.parse(manifestJson));
  // ES2022 has no toSorted; this is a fresh array, so sorting cannot mutate a caller's value.
  // oxlint-disable-next-line unicorn/no-array-sort
  const supplied = [...blobs.keys()].sort();
  if (ids.length !== supplied.length || ids.some((id, index) => id !== supplied[index])) {
    throw new TypeError(
      `archive blobs [${supplied.join(", ")}], expected referenced [${ids.join(", ")}]`,
    );
  }
  const entries: Entry[] = [{ name: MANIFEST_ENTRY, bytes: encoder.encode(manifestJson) }];
  for (const id of ids) {
    const bytes = blobs.get(id);
    if (bytes === undefined) throw new Error(`validated archive blob disappeared: ${id}`);
    entries.push({ name: blobEntry(id), bytes });
  }
  if (entries.length > MAX_ENTRIES)
    throw new RangeError(`too many archive entries: ${entries.length}`);
  const encodedNames = entries.map((entry) => encoder.encode(entry.name));
  const size = entries.reduce((total, entry, index) => {
    const name = encodedNames[index];
    if (name === undefined) throw new Error(`archive entry ${index} has no encoded name`);
    if (name.length > MAX_ENTRY_NAME_BYTES)
      throw new RangeError(`archive entry name is too long: ${entry.name}`);
    return total + ENTRY_HEADER_BYTES + name.length + uint32(entry.bytes.length, entry.name);
  }, HEADER_BYTES);
  const output = new Uint8Array(uint32(size, "archive size"));
  const view = new DataView(output.buffer);
  output.set(MAGIC);
  view.setUint16(MAGIC.length, ARCHIVE_VERSION, true);
  view.setUint32(MAGIC.length + 2, entries.length, true);
  let offset = HEADER_BYTES;
  entries.forEach((entry, index) => {
    const name = encodedNames[index];
    if (name === undefined) throw new Error(`archive entry ${index} has no encoded name`);
    view.setUint16(offset, name.length, true);
    view.setUint32(offset + 2, entry.bytes.length, true);
    view.setUint32(offset + 6, crc32(entry.bytes), true);
    offset += ENTRY_HEADER_BYTES;
    output.set(name, offset);
    offset += name.length;
    output.set(entry.bytes, offset);
    offset += entry.bytes.length;
  });
  return output;
}

const requireBytes = (bytes: Uint8Array, offset: number, length: number, at: string): void => {
  if (offset + length > bytes.length) throw new RangeError(`truncated archive at ${at}`);
};

/** Parse and fully validate a container before returning any of its entries. */
// One forward-only pass owns every offset and bounds check; splitting it would expose unchecked
// cursor state between helpers. See docs/decisions/0007-reviewed-oversized-functions.md.
// oxlint-disable-next-line max-lines-per-function
export function parseSessionArchive(bytes: Uint8Array): SessionArchive {
  requireBytes(bytes, 0, HEADER_BYTES, "header");
  if (MAGIC.some((byte, index) => bytes[index] !== byte))
    throw new TypeError("not a mulch archive");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const version = view.getUint16(MAGIC.length, true);
  if (version !== ARCHIVE_VERSION) throw new RangeError(`unsupported archive version: ${version}`);
  const count = view.getUint32(MAGIC.length + 2, true);
  if (count < 1 || count > MAX_ENTRIES)
    throw new RangeError(`invalid archive entry count: ${count}`);
  const entries = new Map<string, Uint8Array<ArrayBuffer>>();
  let offset = HEADER_BYTES;
  for (let index = 0; index < count; index++) {
    requireBytes(bytes, offset, ENTRY_HEADER_BYTES, `entry ${index} header`);
    const nameLength = view.getUint16(offset, true);
    const payloadLength = view.getUint32(offset + 2, true);
    const checksum = view.getUint32(offset + 6, true);
    offset += ENTRY_HEADER_BYTES;
    requireBytes(bytes, offset, nameLength + payloadLength, `entry ${index}`);
    const name = decoder.decode(bytes.slice(offset, offset + nameLength));
    offset += nameLength;
    const payload = bytes.slice(offset, offset + payloadLength);
    offset += payloadLength;
    if (name.length === 0) throw new TypeError(`archive entry ${index} has an empty name`);
    if (entries.has(name)) throw new TypeError(`duplicate archive entry: ${name}`);
    if (crc32(payload) !== checksum) throw new TypeError(`corrupt archive entry: ${name}`);
    entries.set(name, payload);
  }
  if (offset !== bytes.length) throw new TypeError(`extra archive bytes after ${count} entries`);
  const manifestBytes = entries.get(MANIFEST_ENTRY);
  if (manifestBytes === undefined) throw new TypeError(`missing archive entry: ${MANIFEST_ENTRY}`);
  let manifest: unknown;
  try {
    manifest = JSON.parse(decoder.decode(manifestBytes));
  } catch (error) {
    throw new TypeError(`invalid archive manifest: ${String(error)}`, { cause: error });
  }
  const ids = referencedBlobs(manifest);
  const expected = new Set([MANIFEST_ENTRY, ...ids.map((id) => blobEntry(id))]);
  for (const name of expected) {
    if (!entries.has(name)) throw new TypeError(`missing archive entry: ${name}`);
  }
  for (const name of entries.keys()) {
    if (!expected.has(name)) throw new TypeError(`extra or unsupported archive entry: ${name}`);
  }
  const blobs = new Map<BlobId, Uint8Array<ArrayBuffer>>();
  for (const id of ids) {
    const name = blobEntry(id);
    const payload = entries.get(name);
    if (payload === undefined) throw new Error(`validated archive entry disappeared: ${name}`);
    blobs.set(id, payload);
  }
  return { manifest, blobs };
}
