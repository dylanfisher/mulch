# 0017. Session v1 is a durable projection with separate blobs

- **Date:** 2026-08-14
- **Status:** accepted; its versioning and fail-on-unreadable-data halves are superseded by
  [0026](0026-pre-release-has-no-migrations.md)

## Context

M6 has to restore one useful instrument after a reload without treating graph-owned transport
state, decoded buffers, or imported `File` objects as JSON. A save must not be triggered by the
audio thread's `playing` reports or the UI's per-frame reads. Real files also make `deck.load`
asynchronous, while the synthetic command path and the facade's `send(): void` contract are already
shipped. Stored data will outlive the code that wrote it, so malformed and future versions cannot
quietly become a blank session.

## Decision

**The current session is a versioned projection of the live store, stored as JSON separately from
unchanged imported blobs.** `SessionV1` contains `version`, every registry parameter, each ordered
effect rack, source references, and loops. It omits derived `duration` and graph-owned `playing`.
The v1 migration is an identity stage that fully validates its input; the migration array is
append-only, and a future format adds a stage rather than changing one already shipped.

One native IndexedDB database has `sessions` and `blobs` stores and one fixed current-session key.
`ingest(file)` gives unchanged bytes an opaque `BlobId` and does not touch session state. Saving
puts the snapshot and deletes every unreferenced blob in one read/write transaction, so singleton
replacement and garbage collection commit or abort together. Node and offline instruments receive
no repository: their `ready` resolves immediately, ingest rejects, and save emits an error.

Live boot constructs the graph and repository, then awaits `instrument.ready` before React renders
or `window.mulch` is attached. Hydration replays ordinary behavior in dependency order: load every
source and await any decode, apply all parameter values, append effects in stored order, then apply
loops. Autosave is suspended throughout. Restored decks therefore start stopped and get duration
from the buffer accepted by the graph, not from stored JSON. Corrupt JSON, an unsupported version,
or a missing/undecodable referenced blob rejects startup visibly.

`send()` remains synchronous. Synthetic loads still commit before it returns. A blob load starts
repository retrieval and context-owned `decodeAudioData`, then commits the source and emits
`deck.loaded` only after the graph accepts the buffer; rejection emits `error` and leaves the deck
unchanged. Each deck has a load epoch checked inside the decode/graph-accept boundary, so an older
decode can never replace a newer blob or synchronous generator. Manual and automatic saves wait
for in-flight loads to settle before snapshot/GC, reject references whose blobs are absent, and
emit `session.saved` only after the transaction commits.

After hydration, the facade compares canonical durable projections on store notifications. A
change restarts one trailing 500 ms timer. Duration, playing, events, peaks, meters, playheads, and
other per-frame reads are absent from that projection and cannot schedule a save. Manual save
cancels a pending timer and serializes behind any write already in flight, preventing an older
snapshot from winning a race.

## Alternatives considered

- **Put blobs inside session JSON or re-encode imports** — rejected because JSON is a poor binary
  container and re-encoding changes bytes, format, and quality. Browser-supported decoding is the
  M6 format policy.
- **Subscribe to every store write and debounce it** — rejected because playback reports would
  continuously dirty a session whose durable content had not changed.
- **Make `send()` return promises** — rejected because that changes the established command seam
  for every caller. Only blob-backed commands need asynchronous completion, observable through the
  existing event stream.
- **Assign restored state directly** — rejected because it would create a second implementation of
  graph setup and bypass validation, parameter routing, effect construction, and loop clamping.
- **Keep orphaned blobs forever** — rejected because failed imports and replaced deck sources would
  grow storage without a user-visible owner.

## Consequences

There is one automatically restored, unnamed session. Imported blobs remain byte-for-byte files,
and a session snapshot is always self-consistent with its retained blobs after a committed save.
Autosave observes durable meaning rather than store activity. Hydration can take as long as browser
decode and fails the whole live boot when durable data is corrupt; this is deliberate fail-loudly
behavior rather than a fallback to an apparently fresh session.

Named sessions, import/export archives, undo history, recording drafts, and codecs Chromium cannot
decode remain out of scope. A future session shape pays the explicit cost of a new version and an
append-only migration stage.
