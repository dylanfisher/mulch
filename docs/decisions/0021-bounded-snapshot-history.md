# 0021. History is bounded session checkpoints restored through the graph

- **Date:** 2026-08-14
- **Status:** accepted

Undo/redo keep an in-memory, `HISTORY_CAP`-bounded (100) stack of complete `SessionV2` checkpoints, restored through the same prepared-graph restoration path as load, rather than reversing individual commands; history itself is never durable — absent from the session, archives, autosave and startup — but its checkpoints' blob ids keep those blobs reachable against persistence GC.
