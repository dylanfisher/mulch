/**
 * @role What a deck plays, as data — the payload of `deck.load` and the same shape the session
 *   records. It lives in lib because both the command (src/app) and the store (src/state) need
 *   it, and neither may import the other.
 */
import { assertDurableText, DURABLE_TEXT_MAX, isRecord } from "./guards";
import { GEN_KINDS, isGenHz, isGenSecs, TONE_SECS, type GenKind } from "./waveform";

/** The opaque identity of unchanged imported bytes in the blob store. */
export type BlobId = string;

/** The one rule for what may name stored bytes, wherever a blob id arrives from. */
export function assertBlobId(value: unknown, at: string): asserts value is BlobId {
  assertDurableText(value, at);
}

/**
 * What an imported blob's id is made of: the mark that says it was imported, the unique part that
 * makes it an identity, and then the name of the file the bytes came in as. Everything before the
 * name is fixed-width so the name gets the whole of what is left of `DURABLE_TEXT_MAX`.
 */
const IMPORT_MARK = "import:";
const IMPORT_UID_CHARS = 12;
const IMPORT_NAME_MAX = DURABLE_TEXT_MAX - IMPORT_MARK.length - IMPORT_UID_CHARS - 1;

/**
 * The id imported bytes are stored under: unique, opaque to everything that reads one, and
 * carrying the name of the file they arrived as. An export is named after what it came from
 * (P91), and the file name is the only thing a person recognises a yard's audio by — so it rides
 * on the one durable string that already travels with the bytes through the session, the archive
 * and a clip, rather than becoming a field on a source that every one of those would have to grow
 * ([0026](../../docs/decisions/0026-pre-release-has-no-migrations.md) makes the shape free to
 * change; it does not make a new durable field free to carry).
 *
 * The uniqueness is the caller's `uid` rather than a draw taken here, because this tier holds no
 * state and nothing random: two imports of one file are two blobs, and it is the ingest that
 * decides they are.
 */
export function importedBlobId(fileName: string, uid: string): BlobId {
  return `${IMPORT_MARK}${uid.replaceAll("-", "").slice(0, IMPORT_UID_CHARS)}:${fileName.slice(0, IMPORT_NAME_MAX)}`;
}

/**
 * The file name an id was minted from, or null for every id that was not — a generator has no
 * blob at all, and the bytes a crop or a flatten minted are named by the command that minted them
 * (0047) rather than by any file a person has ever seen.
 */
export function importedFileName(id: BlobId): string | null {
  if (!id.startsWith(IMPORT_MARK)) return null;
  const separator = id.indexOf(":", IMPORT_MARK.length);
  if (separator === -1) return null;
  const name = id.slice(separator + 1);
  return name.length === 0 ? null : name;
}

/**
 * Real audio already in the blob store — put there by `ingest`, either the one sanctioned
 * pre-command step (docs/plan.md §1) or the bytes a `deck.crop` minted (0047) — or a synthetic
 * source, which needs no ingest at all and is why an agent's repro stays a self-contained
 * one-liner.
 */
export type SourceRef = { blobId: BlobId } | { gen: GenKind; secs: number; hz?: number };

/** The synthetic half, for the code paths that have already ruled a blob out. */
export type GenSource = Extract<SourceRef, { gen: unknown }>;

/** Narrows to the blob half of a `SourceRef`, the one discriminant every call site re-derives. */
export function isBlobSource(source: object): source is Extract<SourceRef, { blobId: BlobId }> {
  return "blobId" in source;
}

/** Narrows to the generator half of a `SourceRef` — the complement of `isBlobSource`. */
export function isGenSource(source: object): source is GenSource {
  return "gen" in source;
}

/** The synthetic source a deck is holding, or null for nothing loaded and for a blob. */
export const genOf = (source: SourceRef | null): GenSource | null =>
  source !== null && isGenSource(source) ? source : null;

/**
 * The one generator that is an instrument rather than a fixture, or null for every other source.
 * A tone is drawn as the wave itself rather than reduced to peaks (P70), so this is the question
 * a surface asks before it decides which picture it is drawing.
 */
export function toneOf(source: SourceRef | null): GenSource | null {
  const gen = genOf(source);
  return gen !== null && gen.gen === "tone" ? gen : null;
}

/** Validate the exact JSON source union at the command and persistence boundaries. */
export function assertSourceRef(value: unknown, at = "source"): asserts value is SourceRef {
  if (!isRecord(value)) throw new TypeError(`${at} is not a source`);
  const source = value;
  if (isBlobSource(source)) {
    if (Object.keys(source).length !== 1)
      throw new TypeError(`${at} mixes blob and generator fields`);
    assertBlobId(source.blobId, `${at}.blobId`);
    return;
  }
  const expected = source.hz === undefined ? 2 : 3;
  if (Object.keys(source).length !== expected || !isGenSource(source) || !("secs" in source)) {
    throw new TypeError(`${at} is not a generator source`);
  }
  if (!GEN_KINDS.some((kind) => kind === source.gen)) {
    throw new TypeError(`${at}.gen is unknown: ${source.gen}`);
  }
  if (typeof source.secs !== "number" || !isGenSecs(source.secs)) {
    throw new RangeError(`${at}.secs is outside the supported range`);
  }
  if (source.hz !== undefined && (typeof source.hz !== "number" || !isGenHz(source.hz))) {
    throw new RangeError(`${at}.hz is not a frequency`);
  }
  // The tone is the one generator whose pitch is not a load argument: it is `deck.tone`, a deck
  // parameter with a knob, a clip and an archive entry of its own, and the buffer is one second
  // of the reference it is read against (0110).
  if (source.gen === "tone") {
    if (source.hz !== undefined)
      throw new TypeError(`${at}.hz is not a tone's pitch — deck.tone is`);
    if (source.secs !== TONE_SECS) throw new RangeError(`${at}.secs for a tone is ${TONE_SECS}`);
  }
}
