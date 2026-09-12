# 0372 — A hold is scheduled and never timed

- **Date:** 2026-09-11
- **Status:** accepted, beside [0371](0371-an-effect-may-ask-the-transport-for-a-hold-and-never-touch-it.md),
  resting on [0038](0038-pause-holds-the-playhead-stop-rewinds-it.md) for what a hold is and on
  [0068](0068-an-export-is-a-render-spec.md) for why it may not be a timer.

**A hold is `source.stop(at)` on the running source, and a release is a source started at `at`
from where the hold left the playhead.** Both are laid ahead inside the pump horizon, the way the
player lays its steps, so an offline render — which pumps at four-second stops and runs no main
thread between them — puts every rest on the audio thread before its instant, and the file matches
the performance to the sample. A hold applied when the main thread noticed it would be a rest up to
four seconds late in a render and a few milliseconds late live, and two files of one spec would
differ. Only the ordinary pass is rested: a pattern's steps are their own transport.

**The reporter carries the instant.** A plan re-posted under a rest carries `until`; the loop
reporter counts no boundary past it, posts `held` once at exactly that instant, and takes up the
plan queued behind it — the release, posted under its own id the moment it was laid, and reported
as any other start when its instant comes. The main thread does the paused half of a halt when
`held` arrives, holding the playhead at the position it read off the plan when the ask was taken,
and freezes the lanes at the stop's own instant rather than the report's.

**A rest keeps the tick running.** A release may fall past the horizon — a minute's rest — so a
voice goes on arming through a rest it would otherwise stop ticking under.
