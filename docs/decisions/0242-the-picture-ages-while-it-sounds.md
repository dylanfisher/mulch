# 0242 — The picture ages while it sounds, and only named bands widen with it

- **Date:** 2026-08-31
- **Status:** accepted, extending
  [0145](0145-a-picture-may-rest-on-analysis.md) and
  [0240](0240-the-picture-folds-into-itself.md), constrained by
  [0128](0128-every-motion-in-the-screen-belongs-to-a-parameter.md), **amended by**
  [0243](0243-the-fold-cuts-and-travels.md)

**Amended by 0243: the fold is no longer one of the bands.** `agedFoldReach` is deleted. Gating the
fold's ceiling on the age made an automator's whole contribution zero on a fresh deck and at most one
doubling after twenty minutes, which is a fold nobody sees a run buy; how deep the picture folds is
the population standing and nothing else. The other two bands — the hue and the reference row's
spacing — are unchanged, and so is everything below except that "three" is two.

Nothing in the instrument knew how long it had been playing. Every motion in the picture was a
phase, a meter or a knob, and all three say the same thing in the fortieth minute that they said in
the first — so a performance whose whole subject is that it went somewhere was drawn by a picture
with the same range at both ends of it.

**The reading is elapsed continuous sounding and not wall time.** `DeckPeek.sounding` is the gap
between the context clock and the instant the worklet's own `started` carries, which is the same
clock and the same report the position beside it already runs on (`peek`, src/audio/deck.ts). A
paused instrument is not a maturing one and a session left open overnight has not been anywhere, so
a held deck reads nought.

**And a halt resets it**, which is a written answer rather than a default. A pause comes through
`halt` exactly as a stop, a reload, a seek and a load do, so all of them send it back to null and the
next play begins again from nothing. An age that survived a stop would make the picture a function of
how many times a hand pressed play, which is the class of thing 0128 keeps out of it.

**A re-anchor is not a halt.** A loop moved out from under a playing deck that the playhead survives
(`moveInPlace`) and a rate change both post their new plan with `resume: true` and never tear the
transport down, so the worklet reports no second start and the age carries on. That is the reading
being honest rather than an exception to it: nothing stopped sounding, so nothing has been anywhere
else. The line is the sound and not the gesture — a loop drag the playhead falls outside of restarts
and so resets, and the same drag a few pixels shorter does not.

**What it widens is few, named and bounded** (`src/lib/moireAge.ts`). One curve — a saturating
exponential over `DRIFT_AGE_REACH_SECS`, which approaches one without arriving — and three spends
and no fourth: the ceiling `foldInto` holds the summed presence to, so an hour-old loop folds deeper
than a fresh one and `DRIFT_FOLD_REACH` is the ceiling of that ceiling; the band the picture's hue is
carried across; and the band the reference row's spacing is drawn in. An age multiplied into a term
at the point of use would be the free-floating coefficient this file exists to refuse (principle 1),
and each spend has an end, so the oldest picture the instrument can draw is a picture and not a
smear.

**One floor across all three.** `DRIFT_AGE_FLOOR` is how much of every band a picture with nothing
behind it is drawn in — half, and the same half everywhere. Three floors a hair apart would be three
coefficients nobody could tell apart in the picture, and the age is meant to widen what a term may
reach rather than to change what it means: a fresh picture still says everything an old one says,
over less of the room to say it in.

**What that costs is the same ceiling measured from lower down.** `foldPasses` is still bounded by
`ceil(DRIFT_FOLD_REACH)` (0240), but the picture only asks for the deepest of them after twenty
minutes of unbroken sounding — longer than any `./scripts/profile` run — so what the profiler prices
is now the floor of that band rather than its peak. The bound is unchanged and the measurement is a
lower bound on it, which is worth knowing before a fold cost is read off a run.

Durable shape: none. `sounding` is a reading of the transport exactly as `position` and `crest` are
(0145), and nothing about a picture is stored (0131).
