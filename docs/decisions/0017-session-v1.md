# 0017. Session v1 is a durable projection with separate blobs

- **Date:** 2026-08-14
- **Status:** accepted; its versioning and fail-on-unreadable-data halves are superseded by [0026](0026-pre-release-has-no-migrations.md)

The current session is a versioned projection of the live store, stored as JSON separately from unchanged imported blobs, which live in IndexedDB keyed by opaque `BlobId` and are never re-encoded; `send()` stays synchronous, and autosave observes that durable projection rather than store activity, so playback reports cannot dirty a session.
