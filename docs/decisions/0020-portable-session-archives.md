# 0020. Portable sessions use a strict native container and staged file handles

- **Date:** 2026-08-14
- **Status:** accepted

Portable sessions use a versioned `mulch\0` binary container (one manifest entry plus one entry per referenced blob, each with an explicit length and CRC-32) instead of ZIP, staged in memory under an opaque `{ archiveId }` handle before `session.import` commits it.
