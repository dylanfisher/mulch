# 0032. One decode cache, keyed by blob id, owned by the audio host

- **Date:** 2026-08-15
- **Status:** accepted

One cache per audio host, keyed by `BlobId` and held inside `createAudioEngine` (`src/audio/decodeCache.ts`), storing each decoded buffer with its peaks, read by the engine only on a miss, bounded to 8 entries and evicted least-recently-used.
