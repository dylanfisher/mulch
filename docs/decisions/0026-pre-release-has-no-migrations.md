# 0026. Pre-release has no migrations: one shape, discarded when it changes

- **Date:** 2026-08-14
- **Status:** accepted
- **Supersedes:** the versioning half of [0017](0017-session-v1.md)

## Context

The EQ shipped as one registry entry on the claim that a registry entry is not a format change.
It was, in one place: `validateDeck` checked `params` with `exactKeys(params, PARAM_IDS)` — the
live registry — at every migration stage, so every session written before the EQ held six
parameters where the running code demanded nine, and startup failed on real stored data.

The migration pipeline did not catch it, and could not have. Every fixture in `session.test.ts` was
built by calling the current projection and deleting the fields a newer version added, so the "v1
session" fed to the pipeline was one no v1 build could have written. Fixture and validator moved
together; the tests asserted only that the registry agrees with itself.

The deeper problem is that four migration stages were maintained for data that never existed
outside one developer's browser. Nothing has shipped. Every stored session in the world is one
IndexedDB record the author can afford to lose, and the cost of pretending otherwise is a frozen
list per version, a stage per change, and a class of bug whose only symptom is a broken startup.

## Decision

**While the app is pre-release, durable data has exactly one shape, and data that is not that shape
is discarded.** `src/state/session.ts` exports one `Session` type, one `sessionSnapshot(state)`
projection and one `validateSession(value)`. There is no `version` field, no `SessionVn` type, no
migration array and no `src/state/version.ts`.

Hydration validates the stored snapshot. On any failure it emits `session.discarded` carrying the
validator's message, writes a fresh snapshot over the unreadable one so the same data cannot fail
the next boot, and the instrument starts empty. Startup no longer fails on stored data at all.

This is recorded in AGENTS.md as a standing rule, not just a session-format decision: no
migrations, no compatibility shims, no deprecation paths for the app's own data until there is
something to be compatible with.

Two versions survive, because neither is about the app's own stored state. The portable archive
container keeps its magic bytes and `ARCHIVE_VERSION` — a `.mulch` file leaves the machine, and
that guard is one comparison with no machinery behind it. The golden render fingerprint is
unrelated.

## Alternatives considered

- **Keep the pipeline and freeze a parameter list per version** — implemented first, then reverted.
  It is the correct design for shipped software and pure overhead for software with no users: every
  parameter added would cost a version, a stage, a frozen literal and a fixture.
- **Refuse to start on unreadable data**, as 0017 required — rejected. Fail-loudly is right for a
  bug in the running code; it is the wrong answer for data whose format the author just changed on
  purpose. Loud and recoverable beats loud and stuck.
- **Keep a version integer purely to detect mismatch** — rejected as a half-measure. Validation
  already detects mismatch precisely, and a stamp invites the migration that is not coming.

## Consequences

Changing durable shape is now free: edit `Session`, edit the projection, edit the validator. Anyone
with a stored session loses it the next time the shape changes and gets a fresh instrument with a
`session.discarded` on the log — the accepted cost, and the reason this decision is scoped to
pre-release. Archives exported from an older build are refused by the same validator, with the same
discard, rather than being upgraded.

**This decision expires at first release.** Once someone else's data is in play, durable shape needs
a version and an append-only pipeline again — and this time the fixtures for it must be frozen
literals, never values projected from the live registry.
