# 0012. The gate stays under four seconds

- **Date:** 2026-08-13
- **Status:** accepted

`scripts/smoke` builds once (unconditionally, via the `vite` CLI) then runs its three `scripts/drive` invocations concurrently instead of sequentially, taking the gate from ~4.34s to ~3.48s.
