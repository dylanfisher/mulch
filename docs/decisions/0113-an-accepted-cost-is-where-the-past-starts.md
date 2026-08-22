# 0113. An accepted cost is where the past starts

- **Date:** 2026-08-21
- **Status:** accepted

`./scripts/profile --accept "<why>"` records the run as the new baseline, and `--compare` reads
the history forward from the most recent accepted run rather than back ten from the end. The
accepted run is kept as the first sample of the new normal, and the comparison says out loud
where the baseline was reset and why.

[0051](0051-the-profiler-remembers-its-own-runs.md) holds unchanged: the history is still this
machine's own, still gitignored, still exits 0, still flags rather than blocks.

The band is the last ten runs, so a regression a human read, attributed and decided to carry is a
regression the band keeps rediscovering for ten runs — every honest commit after it flagged for
the change before it. That happened three commits running in one plan, at a dozen interleaved
runs apiece to re-establish each time that the cost predated the commit under test. The decision
was already in the record; what was missing was a way to tell the profiler.

Two constraints follow from what the flag is for. **A reason is required** — the flag exists to
replace a baseline nobody wrote down, so it refuses to be bare, and the reason travels in the
history where the next reader finds it. **An accepted run has to be an honest one**: `--accept`
refuses `--no-record`, `--cpu` and `--heap`, because a run that paid for instrumentation is the
last thing every later run should be judged against.

Accepting is not fixing. It says a number was read and kept, which is only true when the reading
happened — the interleaved attribution, and the entry in [plan.md](../plan.md) §4 that says what
the cost buys. A baseline reset with neither is how a profiler is turned off one commit at a time.
