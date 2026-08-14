# 0021. History is bounded session checkpoints restored through the graph

- **Date:** 2026-08-14
- **Status:** accepted

## Context

Undo has to cover durable command-owned state without trying to reverse graph reports, playback,
ingest, saves, or other transient facts. Inverse commands look compact, but loads, effect racks,
session imports, and future grouped edits would each need bespoke inverses and rollback ordering.
Blob-backed checkpoints also outlive the current session snapshot, while asynchronous decode can
finish after an undo has made its intended source stale.

## Decision

Keep an in-memory history of complete `SessionV2` checkpoints. A single durable edit and one
serialisable `history.group` of durable edits use the same transaction boundary: capture the
checkpoint before execution, run the edit or ordered group, and add one entry only when the final
durable projection differs. Empty and all-no-op groups add nothing. Import cannot be nested in a
group because it establishes a fresh history root. A failed group restores its already-prepared
starting graph and publishes none of its buffered command events. A divergent edit clears redo.
`HISTORY_CAP` is the sole bound and limits undoable transactions to 100.

`history.undo` and `history.redo` are ordinary commands. They restore a checkpoint with the
existing prepared graph restoration path: sources first, then parameters, ordered effects, and
loops. Checkpoints contain the same opaque blob IDs as the session, never copied or remapped
audio. Persistence garbage collection retains IDs reachable from every undo and redo checkpoint.
When entries leave the bound, their blobs become eligible for deletion on the next persistence
write; import clears the local ledger and atomically replaces those bytes with the archive's exact
reachable set.

Every restore advances all deck load epochs before preparation. It commits only if its own history
intent is still current, so a decode started before undo cannot finish into the restored state and
an edit made while restoration prepares prevents that older restore from resurrecting its target.

History itself is not part of `SessionV2`, portable archives, autosave, or startup restoration.
Reload and archive import therefore begin from the restored current checkpoint with no prior undo
or redo entries. The durable format does not change, so there is no session migration. Blobs kept
only for live history are storage reachability, not additional durable session state.

## Alternatives considered

- **Inverse commands** — rejected because each source, rack, import, and future automation edit
  would need a second implementation of its semantics and failure order.
- **Persist history in a SessionV3** — rejected because cross-reload undo has no stated user
  outcome and would enlarge every save and archive with implementation history.
- **Store decoded buffers or blob bytes in checkpoints** — rejected because graph objects are not
  session data and IndexedDB already owns unchanged bytes under stable IDs.
- **Restore by assigning only the store** — rejected because the UI and graph could then describe
  different sources, effects, parameters, and loops.

## Consequences

Undo cost is proportional to the fixed session shape, and graph restoration may decode referenced
audio before it can commit. The snapshot model automatically covers new durable fields once their
session migration and graph restoration are implemented. History never captures playheads,
meters, playing reports, persistence events, or file-ingest capabilities.
