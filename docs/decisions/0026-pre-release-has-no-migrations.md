# 0026. Pre-release has no migrations: one shape, discarded when it changes

- **Date:** 2026-08-14
- **Status:** accepted; expires at first release, when someone else's data needs a version and an append-only pipeline again
- **Supersedes:** the versioning half of [0017](0017-session-v1.md)

While the app is pre-release, durable data has exactly one shape (one `Session` type, one projection, one validator, no `version` field, no migration array), and any stored data that does not match that shape is discarded and the instrument starts fresh rather than being repaired.
