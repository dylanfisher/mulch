# 0405 — A way back is built when it is taken

- **Date:** 2026-09-22
- **Status:** accepted

**A grouped edit builds its rollback graph only when one of its commands fails**
(`historyGroup`, src/app/facade.ts). Building it up front cost a whole second graph on every
group, and the first move of every drag over an automated knob is one. `before` is a snapshot, so
the graph built from it after the failure is the one that would have been built before. With no
storage read ahead of it, a group runs in the `send` that carries it.

**And `prepareRestore` is handed a reader, not the bytes** (`BlobReader`, src/app/audioEngine.ts):
it asks for a source only when the decode cache misses, so an undo reads nothing from IndexedDB
for audio the host holds. A clip pre-flight still reads its bytes first, because proving they are
stored is its job.

**So a group whose starting state cannot be rebuilt now fails after its edits ran**, with the
store holding them and `history.group rollback failed` on the log, rather than before any of
them did. The starting state is the one the host was just playing, so this should not happen;
if it can, prepare the rollback eagerly for that case only.
