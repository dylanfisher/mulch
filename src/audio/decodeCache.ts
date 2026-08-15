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
};

/**
 * `decode` is injected rather than a context call because this file must not own an audio host —
 * the engine passes its own `decodeAudioData` plus whatever it reduces the buffer to.
 *
 * Decodes are serialized behind one tail rather than fired as they arrive: a rack of clip
 * thumbnails asks for every row at once, and a browser handed a dozen simultaneous decodes of
 * multi-megabyte sources spends its memory on all of them at the same time. It is the same
 * reason the restore path decodes its decks one after another.
 */
export function createDecodeCache<T>(
  decode: (bytes: ArrayBuffer) => Promise<T>,
  limit: number = DECODE_CACHE_LIMIT,
): DecodeCache<T> {
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new RangeError(`decode cache limit must be a positive integer: ${limit}`);
  }
  // Insertion order is recency order: a hit deletes and re-sets, so the first key is the oldest.
  const held = new Map<BlobId, T>();
  const inFlight = new Map<BlobId, Promise<T>>();
  let tail: Promise<unknown> = Promise.resolve();

  return {
    get: (id, bytes) => {
      const hit = held.get(id);
      if (hit !== undefined) {
        held.delete(id);
        held.set(id, hit);
        return Promise.resolve(hit);
      }
      const pending = inFlight.get(id);
      if (pending !== undefined) return pending;
      const decoded = tail.then(async () => {
        const value = await decode(await bytes());
        held.set(id, value);
        // Oldest first, so the entry evicted is the one nothing has asked for in longest.
        for (const oldest of held.keys()) {
          if (held.size <= limit) break;
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
  };
}
