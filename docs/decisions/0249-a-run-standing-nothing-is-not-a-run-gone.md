# 0249 — A run standing nothing is not a run gone

- **Date:** 2026-08-31
- **Status:** accepted, amended by
  [0262](0262-a-fractal-row-is-slotted-among-the-structures-own-rows.md), amending
  [0246](0246-the-fractal-is-a-row-and-not-a-mask.md) and
  [0213](0213-a-reading-of-the-output-belongs-to-the-field.md), resting on
  [0248](0248-the-structure-travels-and-its-identity-is-the-automators.md)

An automator crossfades: every place it is standing ramps to nought and the next ramps up. 0246 read
that trough as "no run" — `fractalInto` refused to build the rows while `runStanding <= 0` — so the
structure left the picture entirely for the length of a crossfade and came back whole. That is the
hard cut the eye reads, and 0248's stable slot is what makes it worth removing: the rows can now be
held through the trough without swinging round.

**The test of "no automator" is the map being empty and never the standing being nought.** A yard
with no automator has no key, so `grown.size === 0` preserves 0246's "the automator's own mark and
nothing else's" to the letter, while a run mid-crossfade keeps its two rows at `depth: 0` and the
presence ramp carries them back up through `fractalCut` with no row arriving or leaving.

**A fractal row at nought depth is not free, so it is made free in the three readings that price
it.**
`washedDepth` raises every row toward a full cut, so two held rows on a washed yard would each cut
half a grating (`washedToward(0, 1, wash)`) of a structure no automator is standing — the wash
authoring the picture's own structure, which is exactly what 0213 and 0246 each forbid from their
own side. So `washedDepth` answers nought for a row whose depth is nought and whose geometry is one
of the two only a run may claim (`isFractalGeometry`), and `drawnGratings` makes the same reading, so
the picture's weight and its ink agree. This is narrower than the wash row's and the session's own
rule, which is that a reading at nought counts as the fraction it is: those rows are the field's and
may arrive continuously, and a structure is a picture of a population that is either standing or is
not.

And the third: `row.lens`. `boldestRow` skips only a row with no period, and `cutField` slides the
whole finished field through the boldest lens claim there is, so two held rows reading the master's
flatness would bend the entire picture through a structure nobody is standing — the same violation
one reading further on. `fractalHeard` writes the lens at rest wherever the depth is nought, so all
three agree.

What a yard holding an automator standing nothing then costs, exactly: two rows in the set, `cut <=
0` for both so `placeCurved` is never reached — no bake, no `drawImage`, no key, no fallback touched
— nought in `drawnGratings`, and no lens claim, so every other row weighs and bends what it did.

**Three things this does not fix, named so they are not mistaken for fixed.**

- The slot residue 0248 named is untouched and is what still blinks at a turnover: `order.slot`
  carries the row's `at`, a crossfade holds twice the places for the length of a fade, and each of
  those two rebuilds re-slots both fractal rows. What this removes is the blank _across_ the trough,
  not the one at its edges; the plan's `moireCanvasTiles` case for a fallback across a seed step is
  where the rest of it is owed.
- `washedDepth` is discontinuous in the depth at nought for these two geometries, so on a fully
  washed yard the cut steps by half a grating at each edge of the trough rather than ramping. That
  is the price of the rule being about the row and not about a threshold, and it is a step at one
  edge where it used to be a hole across the whole trough.
- `rack.growth` files a key for every unbypassed automator, so a rack merely _holding_ one that has
  never grown a place carries the two rows for as long as it holds it. They cut, weigh and bend
  nothing, and `grownStanding` already treats such a key as visible in the picture (0248) — the
  rows are what that key means.

Durable shape: none.
