# 0237. A cost no instrument can price is not paid down

- **Date:** 2026-08-31
- **Status:** accepted

A change whose only justification is that it allocates less, or runs fewer operations, is landed
only when one of this repo's three instruments moves on it: `./scripts/profile --compare` against
`.profile-history.jsonl` ([0051](0051-the-profiler-remembers-its-own-runs.md)), `./scripts/bench`
over the pure kernels in `src/lib`, or the gate's own mean by the interleaved method in
[plan.md](../plan.md) §3. Where none of them can reach the path, the allocation is written into
plan.md §4 and left alone.

The case that decided it is `bandOf` (`src/ui/playerScopeCanvas.ts`), which allocates a
hundred-odd short-lived objects per painting of a playing card. The profiler samples its frames
with the rack back at zero and never opens a card; the bench needs no canvas; and the gate may
assert nothing continuous ([0050](0050-the-gate-counts-things-and-the-profiler-measures-them.md)).
The fix is three signature changes in one file with a recording-context test already standing
behind it, and it is still not landed, because a change nobody has priced is indistinguishable
from a change that made things worse — and the reason to stop is not the size of the fix but the
absence of the number.

The tempting move is to build the missing instrument. That is what 0050 and 0051 already refuse
for a threshold, and it costs more here: an instrument built to justify one hoist is an instrument
whose only reading is the one it was made to produce.
