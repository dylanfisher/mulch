/**
 * @role The one decode cache keyed by blob id: unchanged bytes are turned into whatever a host
 *   decodes them into exactly once, at most one decode at a time, and at most a bounded number
 *   of results held.
 * @instead What a decoded buffer then becomes — a voice, peaks, an analysis — → src/app/engine.ts,
 *   which owns the context that decodes and is the only place this is constructed. This file
 *   holds no context and no deck: it is the memo, never a second engine (0032).
 */
import type { BlobId } from "@/lib/source";

/**
 * How many decoded results are held at once. Decoded audio is large — a minute of stereo is tens
 * of megabytes — so the cache is bounded by count and evicts least-recently-used, which keeps the
 * decks and the clips a person is actually working with resident and lets the tail go.
 */
export const DECODE_CACHE_LIMIT = 8;

export type DecodeCache<T> = {
  /**
   * The decoded result for these bytes. `bytes` is only called on a miss, so a hit costs neither
   * a read nor a copy, and concurrent callers for one id share the single decode in flight.
   */
  get(id: BlobId, bytes: () => Promise<ArrayBuffer>): Promise<T>;
  /**
   * What the held results weigh, by the caller's own `size`. A running total kept on set and
   * evict rather than summed here: this is read once a frame by `stats()`, which must not
   * allocate and must not walk the map (docs/plan.md §3).
   */
  bytesHeld(): number;
};

/**
 * One decode, with every way it can fail named. This is the only place that knows which id was
 * being decoded and how many bytes it was, and the browser's own refusal carries neither: a long
 * .m4a stops at the decoder — handed the whole compressed file and asked for the whole result at
 * once, and forty megabytes of AAC is twenty minutes and half a gigabyte of float — and what it
 * throws is a bare `EncodingError` naming nothing, which is how an import that completed nothing
 * took a report to find. A decode that answers with nothing rather than throwing is the same
 * failure quieter, and is refused the same way (principle 5, P63). The original always travels,
 * as the message and as the `cause`, so the reason a caller could already read is not replaced.
 */
async function decodeNamed<T>(
  id: BlobId,
  raw: ArrayBuffer,
  decode: (bytes: ArrayBuffer) => Promise<T>,
): Promise<T> {
  // Measured before the decode, never after: `decodeAudioData` detaches the buffer it is handed,
  // so a length read on the way out of a failure is zero every time.
  const sent = raw.byteLength;
  let value: T;
  try {
    value = await decode(raw);
  } catch (error) {
    throw new Error(`could not decode ${id} (${sent} bytes): ${String(error)}`, { cause: error });
  }
  if (value === undefined || value === null) {
    throw new Error(`decoding ${id} produced nothing (${sent} bytes)`);
  }
  return value;
}

/**
 * `decode` is injected rather than a context call because this file must not own an audio host —
 * the engine passes its own `decodeAudioData` plus whatever it reduces the buffer to. `size` is
 * injected for the same reason: this cache is generic over `T` and cannot know what one weighs.
 *
 * Decodes are serialized behind one tail rather than fired as they arrive: a rack of clip
 * thumbnails asks for every row at once, and a browser handed a dozen simultaneous decodes of
 * multi-megabyte sources spends its memory on all of them at the same time. It is the same
 * reason the restore path decodes its decks one after another.
 */
export function createDecodeCache<T>(
  decode: (bytes: ArrayBuffer) => Promise<T>,
  size: (value: T) => number,
  limit: number = DECODE_CACHE_LIMIT,
): DecodeCache<T> {
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new RangeError(`decode cache limit must be a positive integer: ${limit}`);
  }
  // Insertion order is recency order: a hit deletes and re-sets, so the first key is the oldest.
  // Each entry carries what `size` said when it was held, so no value is ever measured twice.
  const held = new Map<BlobId, { value: T; bytes: number }>();
  const inFlight = new Map<BlobId, Promise<T>>();
  let tail: Promise<unknown> = Promise.resolve();
  let total = 0;

  return {
    get: (id, bytes) => {
      const hit = held.get(id);
      if (hit !== undefined) {
        held.delete(id);
        held.set(id, hit);
        return Promise.resolve(hit.value);
      }
      const pending = inFlight.get(id);
      if (pending !== undefined) return pending;
      const decoded = tail.then(async () => {
        const value = await decodeNamed(id, await bytes(), decode);
        const weight = size(value);
        held.set(id, { value, bytes: weight });
        total += weight;
        // Oldest first, so the entry evicted is the one nothing has asked for in longest.
        for (const [oldest, entry] of held) {
          if (held.size <= limit) break;
          total -= entry.bytes;
          held.delete(oldest);
        }
        return value;
      });
      inFlight.set(id, decoded);
      // A failed decode is not held: the next caller retries rather than inheriting the refusal,
      // and the rejection itself reaches whoever asked. The tail survives it either way.
      tail = decoded.catch(() => {});
      return decoded.finally(() => {
        if (inFlight.get(id) === decoded) inFlight.delete(id);
      });
    },
    bytesHeld: () => total,
  };
}
