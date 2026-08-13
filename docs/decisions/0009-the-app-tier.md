# 0009. The app tier: commands in, events out, and the only writer of state

- **Date:** 2026-08-13
- **Status:** accepted

## Context

The post-mortem behind [docs/plan.md](../plan.md) describes the failure this tier exists to
prevent: an app whose UI was the only way to drive it grew parallel render paths and a test
story that verified something other than what shipped. The plan's organising claim is that
anything the UI can do, it does by sending a command — so an agent can do the same thing
headlessly, against the real audio graph, and observe what happened.

That claim has to be true before the first deck exists. Retrofitted, it becomes a second
implementation of the app.

## Decision

A new tier, `src/app` — the headless instrument. It may import `lib`, `audio`, `workers` and
`state`; only `ui` may import it.

- `send(cmd)` is the only mutator. Every mutation is a JSON-serialisable command; scheduling
  lives in the envelope (`{ at?, cmd }`), never inside a command.
- Every state change and audio milestone is an event stamped with a gapless `seq` and an
  audio-clock timestamp, emitted from one place per fact.
- Time comes from an injected clock (`{ now(): number }`), taken by the bus from birth, so the
  spine is testable in plain Vitest under Node before any `AudioContext` exists.
- `probe()` returns the full state as JSON.
- `src/app` is the **only writer** of `src/state`. `src/ui` keeps a direct import of `state` for
  reads only — per-frame subscription must not round-trip through `probe()`. `scripts/arch`
  enforces the import edges; the read-only direction of `ui → state` is a review rule.

## Alternatives considered

- **No tier — UI talks to `state`/`audio` directly, add a driver later.** Rejected: the driver
  becomes a second implementation of the app, the exact §2.2 failure in the post-mortem.
- **Commands as methods on the store or graph objects.** Rejected: a method call is not
  serialisable, so a repro, a macro, a MIDI binding and an agent's JSONL line would each grow
  their own path in.
- **Forbid `ui → state` and route all reads through `app`.** Rejected: per-frame values
  (playhead, meters) cannot afford the indirection, and a `probe()` polled per frame is a worse
  seam than a read-only import.

## Consequences

Easy: headless driving (`./scripts/drive`, M1) is a transport over an API that already exists;
tests and agents share the UI's one entry point; undo/redo later gets a command log for free.

Hard: the write-direction of `ui → state` is unenforceable by `scripts/arch` and must be held in
review (plan §5). Every new interaction costs a command shape decision up front.

Revisit if: a per-frame value ever needs to be _written_ per frame — that would need its own
lane, not a widened rule.
