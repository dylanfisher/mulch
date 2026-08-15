# 0032. One decode cache, keyed by blob id, owned by the audio host

- **Date:** 2026-08-15
- **Status:** accepted

## Context

Two earlier steps named the same missing piece and deferred it.
[0027](0027-clips-are-borrowed-deck-presets.md) measured what applying a clip costs: the
pre-flight decodes the clip's source, `deck.load` decodes it again, and the group's rollback
preparation decodes the whole prior session on top of that — "the fix is a decode cache keyed by
blob id, not a second engine". P12 restated it for checkpoint restores, which prepare every
deck's buffer and therefore grow with the deck count.

P15 forces the question, because it needs peaks for a source _no deck is holding_: a clip's
thumbnail draws a blob that may be nowhere in the graph. The two wrong answers are obvious and
both were available — decode it again in the UI, or give the thumbnail its own little cache — and
either one makes the second place that turns bytes into audio, which is the thing this project has
spent [0011](0011-sound.md), [0018](0018-offline-export-parity.md) and 0027 refusing to grow.

## Decision

**One cache per audio host, keyed by `BlobId`, held inside `createAudioEngine`.** Every path that
turns stored bytes into sound or into pixels goes through it: `deck.load`'s blob branch,
`prepareRestore` (so a grouped edit's rollback, a checkpoint restore, an import and a clip
pre-flight all share one entry), and `sourcePeaks`, the read a clip thumbnail is drawn from. The
cache is `src/audio/decodeCache.ts`, and it holds no context: the engine injects its own
`decodeAudioData`. A host without a context has no cache and no decodes, exactly as it has no
voices.

**An entry is the decoded buffer _and_ its peaks**, computed once at decode. Everything that
wants one wants the other — a load draws a waveform, a restore fills the peaks map, a thumbnail
draws columns — so the reduction is paid per blob rather than per caller.

**The bytes are read by the engine, not by the caller, and only on a miss.** `deck.load` and
`sourcePeaks` hand the engine a `() => Promise<Blob>` rather than a `Blob`. A blob already
decoded therefore costs no IndexedDB read either, which for a large sample is the larger half of
the saving. It moves one refusal: "missing blob" now surfaces when the engine asks for the bytes,
which is where a decode failure already surfaced.

**Bounded by count, evicted least-recently-used, and decoded one at a time.**
`DECODE_CACHE_LIMIT` is 8 entries. Decoded audio is tens of megabytes a minute, so an unbounded
memo of every blob a long session ever touched is a leak with a friendly name. Decodes are
serialized behind one tail because a rack of clip thumbnails asks for every row at once; that is
the same reason `prepareRestore` already decoded its decks one after another, now stated in one
place instead of by each caller's discipline.

**A cached `AudioBuffer` is shared by every voice that plays it.** Buffers are read-only to the
graph — two `AudioBufferSourceNode`s may point at one — so nothing is copied when both decks, or
a deck and a prepared replacement graph, hold the same source.

## Alternatives considered

- **A cache in the UI, or one per thumbnail** — rejected. It is a second decoder in a tier that
  may not own audio, and it would decode blobs the engine already has.
- **Caching peaks separately from buffers** — rejected. Two caches keyed by the same id, evicting
  independently, is a second source of truth for "have we decoded this".
- **Bounding by decoded bytes rather than entry count** — considered, and the honest better bound.
  Rejected for now: `AudioBuffer` byte size is derivable but the limit would need a number nobody
  can justify yet, and eight sources is already far more than a rack shows at once. The day a
  session holds a hundred long samples, this is the line to change.
- **Keeping the entry forever, keyed weakly** — rejected. A `WeakRef`/`FinalizationRegistry` pair
  makes the instrument's memory behaviour depend on GC timing, which is untestable and unstable.
- **Reading the bytes in the executor and passing them in** — rejected. It keeps a multi-megabyte
  IndexedDB read on the path of every load, including the ones that are cache hits, for no gain.

## Consequences

Applying a clip to a deck whose source is already decoded costs **zero** decodes, measured in the
real browser: three `decodeAudioData` calls before this change (pre-flight, rollback preparation,
`deck.load`), none after, on a one-second source. The gesture is still one grouped, undoable
durable edit doing exactly what 0027 says it does; only the arithmetic changed. Checkpoint
restore and archive import get the same relief for free, since they share `prepareRestore`.

A thumbnail is a view of durable data and adds nothing durable: no command, no session field, no
history entry. It carries the blob id it asked for and checks it at the paint, so a decode that
lands after its row has moved on is discarded rather than drawn — the same identity rule the
analysis host follows ([0025](0025-beat-analysis-is-derived-not-durable.md)).

The cache lives and dies with its host. A render builds its own context, so it builds its own
cache and shares nothing with the live instrument — which is correct, because a buffer decoded at
one sample rate must not be played at another.
