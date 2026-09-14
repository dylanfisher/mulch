# 0378 — A lane on a deciding parameter is read at the instant the decision is spent

- **Date:** 2026-09-12
- **Status:** accepted, resting on [0204](0204-a-run-is-laid-on-the-automation-horizon.md) for
  why the pump is ahead of the clock and amending [0377](0377-a-lull-is-a-chance-and-a-rest.md),
  whose Rest and Every stop rebuilding.

**The lull's Chance, Rest and Every take lanes.** They could not before because the run rolls on
the pump, up to a horizon ahead of the clock, and a lane's value read then is neither the knob's nor
the lane's at the check it decides. No AudioParam answers what it will be worth at an instant. So
the rack now has one road for a cycle onto a held instance, `setAutomation`, which schedules it onto
the target and tells the instance through `automated` — the same points, base, origin and clock —
and an instance that decides at an instant keeps a mirror of the schedule (`src/lib/laneReader.ts`)
and reads it there. The target is still what sounds; the mirror is never a second road for a value.

**None of the three rebuilds any more.** A move continues the run — the rests already laid stand,
and the next check reads the new value at its own instant — because a rebuild redraws from the seed
and drops what it laid, and a lane moving sixty times a second may not do that. The Seed and the
Grid still rebuild.
