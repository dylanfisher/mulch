# 0040. Automation holds where the transport left it

- **Date:** 2026-08-15
- **Status:** accepted
- **Supersedes:** [0035](0035-a-lane-runs-on-its-own-clock.md) in part — its anchor, which was the
  audio clock itself.

A lane's clock now runs only while the deck sounds — frozen on any halt (pause, stop, reload, loop move, dispose) and released on the next play by shifting every anchor forward by exactly the gap — so a paused deck's automation holds its phase instead of drifting with the wall clock, and every reader (arming, `peek()`, the knob, the preview) reads that one frozen-or-running clock.
