# 0243 — The fold is the automator's, it cuts, and it travels

- **Date:** 2026-08-31
- **Status:** accepted, amending
  [0240](0240-the-picture-folds-into-itself.md) and
  [0242](0242-the-picture-ages-while-it-sounds.md), resting on
  [0131](0131-a-row-is-a-grating-and-the-picture-is-their-product.md) and
  [0126](0126-the-screen-rides-the-pictures-own-phase.md)

0240 built the fold and it drew a turned square. What follows is what the fold now is — and, at the
end, the measurement that says it still does not make the picture fractal, which is the honest
record of where this got to rather than a claim that it worked.

**The fold cuts, because the picture is a product.** The field is a mask: filled opaque and then cut
by every grating with `destination-out`, so the picture is the product of its gratings (0131). 0240
laid the fold _onto_ it instead, by analogy with `feedFrame` — but on a mask that only ever raises
alpha, so a level filled its own fringes in. Cut, the level beats against the fringes it crosses.
`FOLD_KEEP` inverts with it and is renamed `FOLD_BITE`; `heardHard` becomes `heardBite`.

**It samples point-for-point** (`imageSmoothingEnabled = false`): a canvas smooths what it shrinks,
which averages away exactly the fringes the level is being cut in to beat against.

**It was tiled and then untiled.** A blit lands as a rectangle, and the edge reads as a shape. Cut
with a `repeat` pattern of the field instead, the copy wraps and there is no edge — but a pattern
takes a copy of its source when it is minted, so a tiled pass costs a whole canvas of allocation per
pass, per painting: at the zoomed picture's size, tens of megabytes a frame. Measured against what
it buys (below), the edge is the cheaper problem, and the blit stands.

**The levels sit near one another in scale, because an octave does not beat.** `foldScale` is
`ratio ** foldLevels(pass)`, so the band is squared at every pass: `FOLD_RATIO_BAND` at `[0.42,
0.68]` ran 0.5, 0.25, 0.06, 0.004 and was a dot by the third pass. And a copy at half the spacing
sits an octave from what it is cut into, which is a harmonic and not a beat — two gratings beat at a
wavelength the eye can see only when their spacings are close, so a half-scale level darkened the
picture evenly and did nothing else. The band is `[0.80, 0.94]` and `FOLD_TIGHT_FLOOR` follows it up
to 0.7.

**And the bite falls once per pass, not once per level.** Once per level is `FOLD_BITE ** foldLevels(pass)`
— the share squared at every pass, which at a bite of a half is 0.5, 0.25, 0.06, 0.004, the last of
those being `FOLD_FAINTEST`. So however deep the picture folded, the painter cut two passes anybody
could see and the depth past them was a number with no picture in it. `FOLD_BITE ** (pass + 1)` at a
bite of 0.6 runs 0.6, 0.36, 0.22, 0.13: every pass the ladder holds is a pass the eye is given.

**The fold is the automator's own mark and nothing else's.** 0240 made the depth the summed
`presence` of an automator's standing places, and 0242 then gated the ceiling on the picture's age —
`agedFoldReach` widening across `DRIFT_AGE_FLOOR`'s share of the reach. Together those made the run's
contribution exactly zero on a fresh deck: the room above the floor was `reach - floor`, and a fresh
`reach` _is_ the floor. A rack could buy at most one doubling, and only after most of twenty
minutes. So the depth is the population and nothing else: no floor under it, no age over it. **A
yard growing nothing folds nothing** — no pass, no fill, and the picture is exactly what it was
before there was a fold at all — which is what makes a fold legible as an automator's doing when
there is one. `agedFoldReach` is deleted (0242 amended); the age keeps its other two bands.

That pays for a deeper reach: `DRIFT_FOLD_REACH` is 4, sixteen levels. While every picture folded,
the depth was a bill every painting paid; now the deepest picture there is is one somebody built a
run to get, and the bound is `ceil(DRIFT_FOLD_REACH)` picture-sized blits on those paintings alone.

**And the turn travels on the row clock.** 0240 folded the ratio and the turn off the holding
instance's id and refused a clock — "the tween is the run's own ramp and never a clock of the
picture's". That was right about the _depth_, where a second timer could disagree with the fade the
ear hears, and wrong about the _turn_: a rack standing still drew a nest standing still. The turn is
carried by the reference row's own `turnsOf` (`foldTravelled`, `foldTurning` in
`src/ui/moireRows.ts`), the clock every other motion in the picture already rides (0126) — so a
halted yard's fold is painted where it stopped and a picture drawn twice on one frame draws the same
thing twice (0040, 0144). **A whole turn per turn of the clock**, so the travel wraps where the clock
wraps; `foldTurned` multiplies it by `foldLevels(pass)`, a power of two, so every level wraps
seamlessly and the inner ones spin faster than the outer ones. A smaller travel would read as more of
a nest and less of a rosette, and it would jump at every wrap; the wrap wins. A yard with no loop has
no reference row and its fold rests where its seeds put it, which is the answer and not a fallback.

0240's "no stop of the turn is nought" now has two authors and needs neither weakened: the seeded
stops keep it for a halted yard, which may stop anywhere, and the travel keeps it for a sounding one
by never resting at all.

**Measured, and it is not enough.** The whole fold — four passes, at every ratio from 0.5 to 0.98 —
moves the low-frequency contrast of the field from 22.19% to between 22.2% and 22.5%, while dropping
its mean from 0.217 to 0.165. It darkens the picture and adds no structure the eye can read, and no
tuning of the ratio or the bite changes that. The reason is that the picture is a product of
periodic gratings and is therefore itself periodic; cutting it by scaled copies of itself leaves it
periodic, because a product of periodic functions is one. Self-similarity has to be built into the
rows rather than composited on after them: the same six rows spread across five octaves instead of
one measure 29.06%. **What stands here is the mechanism and the gate, not the claim that the fold
makes the picture fractal.** It does not.
[0244](0244-the-whole-picture-is-drawn-at-several-scales.md) is what does — every straight row in
the picture drawn at the scales the run earns — and it also gives the fold the one thing the wiring
here still had wrong: a spiral per standing place rather than one per automator.

Durable shape: none. Everything here is read per painting off populations nothing stores (0204,
0212), exactly as 0240 was.
