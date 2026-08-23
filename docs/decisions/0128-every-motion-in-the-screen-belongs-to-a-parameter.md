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
