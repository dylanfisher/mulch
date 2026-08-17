# 0071. The offline pump arms the lanes

- **Date:** 2026-08-16
- **Status:** accepted; rests on [0035](0035-a-lane-runs-on-its-own-clock.md) and [0068](0068-an-export-is-a-render-spec.md)

A deck arms every cycle of every held lane that begins inside `AUTOMATION_HORIZON_SECS` and re-arms
the next stretch on a `setInterval`. That interval is wall time, and no timer fires while an
`OfflineAudioContext` is rendering — so a render longer than one horizon played each lane for eight
seconds and then froze every automated parameter at the last value it had been handed. On a delay's
feedback that is the difference between a gesture and a wall of it, and it was invisible to every
render the repo had, all of which are under a second.

The offline host arms them instead: `renderOffline` suspends every `AUTOMATION_REARM_SECS` and calls
`armAutomation()`, which is the tick's own work done on demand — the same horizon, the same cadence,
the same `armLanes`. There is no offline scheduling path and no second renderer: the deck decides
where a cycle lands, and the pump only says when to ask. A render's stops are already where the
harness delivers commands, so this is one more reason to stop, not a new mechanism.
