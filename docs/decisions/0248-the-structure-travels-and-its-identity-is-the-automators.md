# 0248 — The structure travels, and its identity is the automators

- **Date:** 2026-08-31
- **Status:** accepted, amending
  [0245](0245-the-picture-is-cut-through-an-attractor.md) and
  [0246](0246-the-fractal-is-a-row-and-not-a-mask.md), resting on
  [0235](0235-a-ground-move-is-travelled-not-written.md)

**A fold has no between; a plane does.** 0245 and 0246 fold every standing place's id into one
32-bit seed, so a population turnover hands the picture an uncorrelated one: the centre, the ratio
and the turn jump to unrelated stops and the geometry may flip escape ↔ nested outright. An
automator lays and retires a place roughly every twenty seconds, so that is the picture's normal
condition. It is right for a _set_ — a set is the fixed point of its own maps and there is no half
of one — and wrong for a _view_: `cx`, `cy`, `ratio` and `turn` are coordinates on a continuum, and
a picture may be carried across them the way a ground already is (0235).

So the travel is split out of the fold. `FractalStops` is four fractions of their own bands and is
what travels; `fractalSeedInto` denormalizes stops into a seed as it always did, and the fold leaves
the painter altogether. `fractalTravelInto` is four `easedCentre` calls and nothing else — every
stop is on the 0..1 `DRIFT_CENTRE_REACH` already is, so the repo's one eased motion applies verbatim
with no second rate declared anywhere. Constant rate and never a fraction of the gap, because an
exponential never arrives and another place lands every twenty seconds. `fractalTravelSecs` is half
the window the rows are already drawn across, exactly as `playerGroundSecs` is half the landing the
module already resolves: a fraction of a length the picture has, never a clock of its own.

**Identity is not a coordinate, so it is folded off something that does not move when a place does.**
`fractalKind` is a word of the run's own keys — the automator instances the rack is holding — and it
is what the two fractal rows are built from. It has to be: the row's angle is folded off its shape
(`gratingTurns`), and so is the slot its last baked tile is held in (`order.slot`), so a row folded
off the places swung round and lost its fallback at every turnover, drew nothing for a painting or
two, and then appeared whole. That blank is the hard cut the eye reads. What the population says is
_where the structure stands on the plane_, and that is the thing that travels.

**Where it stands belongs to the field.** The two fractal rows are one structure on two periods and
what an escape field is a picture of is a whole population, so the stops sit on `MoireRowSet` beside
the wash and the age rather than on any row. `refillRows` takes one step of the travel in its
prologue and never inside the row walk, and `carryFractal` carries where it had got to onto a
rebuilt set for the reason `carryGround` does: neither of those rebuilds is a jump.

**The stops are stepped where the tile is keyed and nowhere else.** `placeCurved` steps them onto
`DRIFT_STEPS` — the ladder every tile key in the picture is already on, not a stop count of its own
— into one module-level scratch beside the order, so the frame path allocates nothing (0070). And
the key is cut per coordinate: `escapeTurns` reads `cx`, `cy` and `zoom` and no more, so an escape
row's key carries three fields where a nested row's carries five, which halves an escape row's key
churn while the picture is travelling.

**Two things this does not fix, named so they are not mistaken for fixed.** The fallback slot is
`at|shape|geometry|profile|size` and only the shape half stands still: `at` is where the row sits in
the picture's own order, and a place arriving pushes a row before the two fractal rows, so the size
of the population still re-slots them. Keying the slot on the shape alone is the unsafe half — a
rebuild can put a different row at index n, and it would inherit a stranger's picture-sized tile
(0144) — so the rule stays as written and the residue is the population's _size_, not its identity.
And the travel is per picture: a strip and an overlay of one yard each carry their own stops, so one
opened mid-travel converges separately, exactly as the ground's own travel already does (0235).

And one thing it forces: `grownStanding` now compares the run's keys as well as its places. An
automator that has grown nothing yet is a key with an empty row (`growth`, src/audio/effects/rack.ts)
— invisible among the places, and not invisible in a picture whose rows are folded off the keys, so
without it a rack gaining an automator moved nothing until that automator's first place arrived and
the structure then swung round on a place.

Durable shape: none. The stops are read per painting off a population nothing stores.
