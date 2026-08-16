# 0009. The app tier: commands in, events out, and the only writer of state

- **Date:** 2026-08-13
- **Status:** accepted

A new tier, `src/app`, is the headless instrument and the only writer of `src/state`: `send(cmd)` is the sole mutator of a JSON-serialisable command (scheduling in the envelope, never the command), every change emits a `seq`-stamped event off an injected clock, `probe()` returns full state as JSON, and only `src/ui` may import `src/app` — keeping a direct, read-only import of `src/state` for per-frame reads.
