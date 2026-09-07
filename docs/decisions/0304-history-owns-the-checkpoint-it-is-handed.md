# 0304. History owns the checkpoint it is handed

- **Date:** 2026-09-06
- **Status:** accepted

`SessionHistory.record` keeps the session it is handed as `#current` without copying it, because the facade only ever hands it `sessionSnapshot` — a tree built fresh for that call which nothing else holds and the store never writes into — so the per-commit `structuredClone` guarded 0021 against a mutation nothing could make, at the price of a whole session per pointer event; a caller of `record` therefore must not write through a reference it keeps, while what the constructor takes and what undo hands out are still copied.
