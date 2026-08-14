# 0020. Portable sessions use a strict native container and staged file handles

- **Date:** 2026-08-14
- **Status:** accepted

## Context

A portable session has to move the current versioned manifest and every referenced imported audio
blob without re-encoding bytes. A browser `File` is not serialisable and cannot enter a command,
while an import must validate all structure, bytes, decoding, and persistence before the live
session changes. ZIP would solve framing, but the platform has no native ZIP API and P1 does not
justify adding a dependency to the preview bundle or worker path.

## Decision

Use a versioned `mulch\0` binary container implemented over `Uint8Array`: one `manifest.json`
entry followed by exactly one deterministically named entry per referenced blob. Every entry has
an explicit byte length and CRC-32; parsing rejects duplicate, missing, corrupt, extra, trailing,
and unsupported entries before returning. Blob entry names hex the original JavaScript UTF-16 code
units, rather than a lossy Unicode encoding, so every valid opaque ID remains distinct. Blob IDs
are preserved, so there is no remapping table.

Archive creation and parsing live in `src/lib` and use no DOM, storage, or audio API. Selecting an
archive calls `ingestSession(File)`, which reads, parses, migrates, and stages it in memory under an
opaque `{ archiveId }` handle. Only that serialisable handle enters `session.import`. The command
prepares a replacement graph off to the side, atomically replaces the IndexedDB snapshot and its
reachable blobs, then swaps the prepared graph and session state in one commit. A failed prepare
or database transaction discards the prepared graph and leaves the prior snapshot and reachable
blobs unchanged.

## Alternatives considered

- **ZIP with a new package** — rejected because it adds browser and build cost for framing that
  this format supplies in a small pure module. ZIP interoperability has no stated user outcome.
- **JSON with base64 blobs** — rejected because it expands audio bytes and requires another full
  copy while encoding and decoding.
- **Put `File` or all archive bytes in `session.import`** — rejected because commands are durable,
  serialisable data and raw file objects are a browser capability, not session intent.
- **Write staged blobs into IndexedDB during file selection** — rejected because a failed or
  abandoned import would change blob reachability before any command committed.
- **Replay restoration commands directly into the live graph** — rejected because a later decode
  or persistence failure would expose partial state, and an imported rack can remove effects the
  append-only live command cannot remove.

## Consequences

Archives are deterministic and worker-friendly, preserve blob bytes and IDs, and need no new
dependency. The container is application-specific rather than inspectable by general ZIP tools.
Changing its framing requires a new container version; changing the manifest continues to use the
existing append-only session migration pipeline.
