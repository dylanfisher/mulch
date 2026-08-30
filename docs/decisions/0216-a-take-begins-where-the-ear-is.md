# 0216 — A take begins where the ear is

- **Date:** 2026-08-30
- **Status:** accepted, extending [0112](0112-a-flatten-is-a-spec-the-one-harness-already-accepts.md)

An export used to begin where the restoration commands land, which is the performance's own first
second — never the part anybody was listening to. `ExportSpec.backSecs` is where a take begins
instead: nought is from here, and a number is from that many seconds ago.

**It is the harness exactly as it stands.** A take is one render of `warm + secs` seconds with
`warm` dropped through `RenderSpec.fromSecs`, where `warm` is the live performance's own elapsed
seconds less `backSecs`. Nothing new renders, nothing new fades, and no second thing produces
audio — a live tap on the master bus would be one, and it could not be held against the fingerprint
that proves every other export.

**Warming is what makes it the same part and not a new one.** Everything time-varying counts from
its own start and is drawn from a seed: a grown run's population is a function of its seed and its
tick index ([0204](0204-a-run-is-laid-on-the-automation-horizon.md)), a jumping pattern's steps are
a function of the same one stream ([0089](0089-a-jump-is-the-transports.md)), and a lane is a
function of time. Warm the same commands for the same seconds and the run stands where it stood.

**The elapsed seconds are read where the button is pressed**, off `instrument.stats().at` — the one
clock every envelope is stamped against. The dialog reads them again as it opens, to say which
seconds it is about to render; that line is the box's own P95 reading and not what the export
takes.

**One warm-up is warmed whole, and that is a known limit.** A render's origin is where its
restoration commands land, so every run in a take begins together, while live an automator added
five minutes late is five minutes younger than the yard under it. One warm-up cannot be right for
two runs of different ages. If a run's own age turns out to matter, the fix is to stamp each
restoration command at the age the thing actually has — an envelope already carries `at` — and that
is a second decision, not this one.

**`EXPORT_MAX_SECS` bounds `warm + secs` together.** An offline context allocates its whole output
up front, so a warm-up costs what a take of the same length costs even though none of it is kept. A
performance older than the hour warms to the hour, the take stays the length that was asked for,
and `ExportTake.clamped` says so — a take of a different part of the performance is reported, never
handed over quietly (principle 5).
