/**
 * @role What a deck plays, as data — the payload of `deck.load` and the same shape the session
 *   records. It lives in lib because both the command (src/app) and the store (src/state) need
 *   it, and neither may import the other.
 */
import { assertDurableText, isRecord } from "./guards";
import { GEN_KINDS, isGenHz, isGenSecs, type GenKind } from "./waveform";

/** The opaque identity of unchanged imported bytes in the blob store. */
export type BlobId = string;

/** The one rule for what may name stored bytes, wherever a blob id arrives from. */
export function assertBlobId(value: unknown, at: string): asserts value is BlobId {
  assertDurableText(value, at);
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
}
