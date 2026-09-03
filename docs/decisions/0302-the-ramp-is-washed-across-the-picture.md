# 0302 — The ramp is washed across the picture

- **Date:** 2026-09-03
- **Status:** accepted, on [0301](0301-the-ink-orbits-a-ramp-of-five.md),
  [0141](0141-colour-is-something-an-effect-turns.md) and [0266](0266-the-picture-travels-its-ink.md)

The picture was one hue at a time: whatever the ink had travelled to, the whole strip and the whole
overlay were drawn in it. The orbit (0301) moves that hue over minutes; nothing moved colour
_across_ the picture, or over seconds.

**A second fill a frame, and that is the whole cost.** After the product is cut back out of the
screen, `tintThrough` (src/ui/moireTint.ts) lays a band of the same ramp over what is left with
`source-atop`, so it lands on the ink and never on the window the gratings agree on, at the strength
the field has travelled to. The band is one tile a pixel wide a stop, written once a colour through
`ramp` off `INK_RAMP_TOKENS` — the ramp read forward and back, so the ends match and the pattern
repeats along the picture with no seam — and moved per frame on the pattern's own transform, exactly
as the screen is. No colour is spelled (0236), nothing is baked a frame (0129), nothing is allocated
a frame (0070).

**Under the fringe, not over it.** At full strength the band replaces the screen and the three
channel lattices that stop a picture reading as one hue go with it (0130). `TINT_STRENGTH` rests
under a half, which is where the fringe still reads through the colour; a hand that wants more has
the dial.

**Three readings drive it, and none of them is new.** How strong: the output's own level
(`heardLevel`) or the standing rack's saturation (`looksSaturate`, 0283), whichever is greater,
between a floor `TINT_LEVEL` leaves and one — travelled on the ink's rate, so a transient swells the
colour rather than flashing it. How wide: `TINT_SPREAD` picture widths a pass, stretched by the ink's
travelled dispersion, so a washed yard holds more of one stop at once. Where: the deck's seconds of
sounding over `TINT_SWEEP_SECS`, wrapped (0126). The reading rests on the set beside the ink
(`MoireRowSet.tint`), is travelled after the read because two of the three are what the read just
travelled, and is carried across a rebuild (`carryTint`) for the ink's reason.

**A halted yard washes nothing.** The strength's target is nought and the travel has no clock, so it
arrives there outright and the phase stands where the last frame put it: a halted picture is painted
on a commit in the screen's own ink (0144), which is the picture every yard drew before this.
