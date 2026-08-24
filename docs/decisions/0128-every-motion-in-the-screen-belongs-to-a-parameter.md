# 0128 — Every motion in the screen belongs to a parameter

- **Date:** 2026-08-22
- **Status:** accepted

The screen over the drift picture has four motions besides the band's roll: it crawls sideways, it
turns off the picture's axis, its pitch breathes by a fraction of a pixel, and it leans under each
row. **Each one is owned by exactly one automatable parameter**, picked by the fold that parameter
already carries — `rowOffset` spreads that fold across a turn to choose a waveform, and
`SCREEN_TERMS` takes the same turn in as many slices as there are motions. So a rack of parameters
drives all four against each other, which is the picture's own subject applied to the screen over
it, and the mapping is stable because the fold is.

The alternative was four terms on four fixed rates. That draws the same texture on every session
and says nothing about what the human is doing, which is the opposite of what the picture is for.

**A motion no row claims is still, and that is the answer rather than a fallback.** Nothing is
automating that parameter, so nothing is turning the lattice; borrowing another row's phase to keep
it moving would be a default masking a missing value (principle 5), and it would make the screen
lie about how much is going on. The reference row is skipped by all four: it already owns the roll
([0126](0126-the-screen-rides-the-pictures-own-phase.md)).

Every term is read off a row's phase and none off a clock, for the reason 0126 gives — a halted
yard is painted and not animated ([0040](0040-automation-holds-where-the-transport-left-it.md)), so
four more motions would have been four more chances to travel across a picture that is standing
still. Three of the four are one matrix write on the tile's pattern and cost nothing. The lean is
the exception: it is per row, so it is one `setTransform` and one `fillStyle` per row drawn, and
the row loop skips it whole when no row owns it.

The terms sweep **through** rest rather than around it, so what they do to the lattice passes
through square and out the other side rather than sitting at one offset. Nothing is rounded to
whole device pixels any more, as the roll once was: the blobs are a hundred pixels across
([0129](0129-a-beat-is-drawn-because-nothing-else-will-draw-it.md)), and a term rounded to whole
pixels moves them in visible steps.

**Amended, P105: a meter may move a row's depth, and nothing else in the picture.** Everything
above is about the screen over the picture, and it stands: the four terms are still one parameter
each, and a term no row claims is still. What is added is one motion in the picture underneath,
and it belongs to a reading rather than to a setting — how hard a compressor is actually pulling
the signal down, asked of `meter()` once a painting (`src/audio/effects/contract.ts`). Without it
every motion in the drift is a knob position, so a yard that nobody is touching is a still
picture however loud it is playing, and the drift of a performance says nothing about the
performance.

**A reading may move exactly one thing: how deep the row of the instance it was read from cuts.**
Not its period, not its pitch, not its angle, and nothing on the screen: those say which parameter
is doing what, and a number no parameter owns must not be able to answer that question. The row's
own depth is what its knobs are set to and stays that; the reading rides on top of it as a share,
between what the knobs say and the floor a turned-down effect already sits at
([0139](0139-a-row-is-what-an-effect-is-set-to.md)) — so a compressor working hard ducks its own
row the way it is ducking the sound, and the row is never deeper than the effect it belongs to
asked for.

**A reading is per frame and is not a dimension.** It arrives beside the playhead on the one
`peek()` every surface already reads, refilled in place into a map keyed by instance id, and is
written onto the row the way `phase` is — never React state, never durable, never in `driftFrom`
([0070](0070-a-per-frame-read-refills-and-never-clears.md), plan §2). A registry entry cannot
claim it and cannot decline it: an instance whose plugin exposes a meter has one and the rest read
as resting, which is the same picture they drew before. It rides the peek the deck's own level
already rides, so it costs a read per instance and no second traversal; what the picture makes of
it is taken at the drift's own cadence, which is the one that may fall behind
([0144](0144-the-picture-may-fall-behind-the-hand-may-not.md)).
