# 0308. A gesture is checkpointed once, where it ends

- **Date:** 2026-09-07
- **Status:** accepted, narrowing [0304](0304-history-owns-the-checkpoint-it-is-handed.md)

0304 stopped the ledger cloning a whole session per pointer event; the copy and the serialisation
it was handed were still made per event, for a gesture whose only checkpoint that matters is its
end (0067). So `record` is handed the call that would take the snapshot, not the tree. A commit
that continues the open drag holds the call and takes nothing; the ledger spends it once, at
`settle` — the gesture ending, a commit under another key, an undo or redo, the blobs a save keeps
reachable. Twenty moves are two snapshots: the opening and the end.

The held call reads the store when it is spent, so it is spent **before** the next command writes
the store: the facade asks `settleFor(gesture)` ahead of `execute`, and a `record` settling for
itself would already be reading the next command's state. The residual is a completion of a
command sent before the drag that lands inside it: its write is folded into the drag's end
checkpoint and gets no entry of its own. Undo of the drag still lands on the drag's start, which
is what 0067 promises.

The same rule for the autosave. Whether a store write moved anything durable was answered by
serialising the whole session on every write, which was the second of the two serialisations a
pointer move paid. It is asked once, when the autosave timer fires after a burst has gone quiet,
against what was last saved — so a burst that nets to nothing saves nothing, and a move costs the
observer a timer reset.
