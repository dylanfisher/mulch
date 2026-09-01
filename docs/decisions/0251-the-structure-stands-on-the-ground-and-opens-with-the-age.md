# 0251 — The structure stands on the ground and opens with the age

- **Date:** 2026-09-01
- **Status:** accepted, extending
  [0235](0235-a-ground-move-is-travelled-not-written.md) and
  [0246](0246-the-fractal-is-a-row-and-not-a-mask.md), amending
  [0242](0242-the-picture-ages-while-it-sounds.md) (three spends become four), on
  [0250](0250-the-picture-is-fed-back-at-the-depth-the-run-earns.md)

0246 made the structure a grating so that every other row would beat against it, and it still read
as a layer over the field rather than as part of it. Two of the reasons are one sentence each, and
both are about the structure standing still while everything around it moves.

**It never travelled with the ground.** The fractal rows are built through `plainRow`, so they rest
at `DRIFT_REST.centre` and stay there, while the reference row, the wash over it and the module's
own tiers are all carried to wherever in the file the yard is reading (0235). A field travelling
under a structure that does not is two pictures. `onGround` now answers for the fractal read too and
the per-frame walk writes `row.centre` from the same `easedCentre` the rest of the field is written
from — one ground, one anchor, one travel. Where the structure stands on its own _plane_ is a
different journey and stays the population's (`fractalTravelInto`, 0248).

**And nothing about how long the yard had been sounding reached it.** `agedOpening(age)` is the
fourth spend of `src/lib/moireAge.ts` and the first that reaches the support: `FRACTAL_OPENING` is
the whole band a row's breath opens through, and the age says how much of it this performance has
earned — half fresh, the whole of it on the oldest picture there is. A power and not a blend,
because the band is a scale, which is `agedPitch`'s argument on `agedPitch`'s own floor.

**The import runs one way.** `moireAge` reaches into `moireFractal` for the ramp an age is a
coefficient on, so `fractalZoom` takes the opening it is handed as an argument and never reaches
back for an age — the rule 0250 wrote for `runFeedback` and `fractalCut`, now the second case of it.
Its default is the whole band, the way `fractalCut`'s is the whole bite.

**The age is stepped onto `DRIFT_STEPS` before it is spent, and that is what makes it affordable.**
`fractalZoom` already steps the phase for this reason; an age is the harder case, because it is a
saturating exponential and never comes to rest — unstepped it moves the tile's key at every frame of
a whole performance rather than at every frame of a breath (0142, 0144). Stepped, the opening widens
eight times over the life of one — five of them inside the first twenty minutes, and the last only
as the age saturates. The ladder is `DRIFT_STEPS` and not a count of its own, because
everything else rounded before it reaches a tile is rounded onto that one; `stepped` itself is the
screen's and a lib may not reach up for it, so the ladder is spent here through `snapToStep`.

Cost: the two fractal rows now walk the anchor ladder a ground move already walks
(`moireCanvasTiles.test.ts`), which is the bake budget that file already bounds — per row: the rows
asking a fresh picture-sized tile per ground stop go from one to three, and nothing measures that
total, only the ladder each of them is on. Plus the eight openings above, each of which retires both
rows' held tiles at once, so they draw their own fallback for a painting or two while the shop
catches up at one bake apiece (0144). Nothing else moved.

The shot that decided the first half: on a yard six seconds into an automator's run, the whole
picture is broad arcs standing over a fine straight weave — the structure still reads as a layer
once it travels and is fed back, which is the condition the plan put on taking the ground anchor at
all.

**Refused, and named here so it is not re-proposed: an age widening `octavesEarned`.** One
dimension said twice — the run already drives it through `spreadOctaves` and `grownOctaves`, and
0242 deleted `agedFoldReach` for exactly this. 0244 measured that the spread is a redistribution at
fixed ink, so more scales buy fills and return a flatter picture.

Durable shape: none.
