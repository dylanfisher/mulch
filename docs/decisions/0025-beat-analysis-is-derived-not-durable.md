# 0025. Analysis is derived data, and the loop it helped choose is the only durable fact

- **Date:** 2026-08-14
- **Status:** accepted

Beat analysis (`bpm`, `onsets`) is pure, worker-computed, request-id-guarded transient deck state re-derived on every load and never stored in the session; only the loop points a performer actually snaps to are recorded, via the ordinary `deck.loop` command.
