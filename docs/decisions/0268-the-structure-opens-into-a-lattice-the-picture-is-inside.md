# 0268 — The structure opens into a lattice the picture is inside

- **Date:** 2026-09-01
- **Status:** accepted, amending
  [0246](0246-the-fractal-is-a-row-and-not-a-mask.md) and
  [0261](0261-the-picture-flies-through-its-structure-on-a-clock-of-its-own.md), on
  [0251](0251-the-structure-stands-on-the-ground-and-opens-with-the-age.md)

The reference is a coarse cell lattice, five cells across a whole picture, every cell redrawing the
same field at its own scale with its boundary lit. Ours had the family and spent all of it on
filigree. Three levers, and the third is the one that changes what 0246 decided.

**The band the breath opens through is doubled and its rung is untouched.** `FRACTAL_OPENING` goes
from four to eight and `FRACTAL_ZOOM_STEPS` from twelve to eighteen, because `4 ** (1 / 12)` and
`8 ** (1 / 18)` are both `2 ** (1 / 6)`: the picture is seen through half again as much depth and the
step the eye is asked to swallow does not move at all. It costs six more stops of the ladder a
breath a row, which is the budget 0246 opened this ladder against.

**The flight is a travel through the coordinate, where 0261 made it a second scale.** A scale that
comes back is a breath however slow it is, so the picture flew into one part of the structure and
back out of the same part, four minutes at a time. `fractalFlight` now answers how far through a
_level_ the deck has sounded, on 0..1, and the row's own coordinate is slid by it — the cells march
outward for as long as the deck sounds and a new one is born in the middle of the picture.

0261 refused an endless dive because a dive wraps in _scale_ and a wrap in scale is invisible only
where the structure repeats: a folded plane repeats every `ratio` and an escape field repeats at no
scale at all. A travel wraps in _cycles_, and a grating repeats every cycle, at every scale, in both
coordinates. One level is `FRACTAL_LEVEL_CYCLES` fringes and that is a whole number, so the tile at
the top of a level and the tile at the bottom of the next are the same tile. The refusal was right
about scales and says nothing about phases.

**And the level is ruled coarsely, with its boundary lit — which is what amends 0246.**
`FRACTAL_LEVEL_CYCLES` goes from a dozen to four. 0246 chose the dozen so the levels stood about as
far apart as the lattice and the two fringed rather than stacked, and it was right that a coarse
shape over a fine weave is what a mask was. What it bought was a picture in which the visible unit
is the fringe: the cells were there at their own size the whole time and nothing in the picture was
cell-sized.

The beat is bought back at the boundary instead. `fractalRule` bends the level count inside each
whole level — fast where the level begins, slow through the middle of the cell — so the row's own
fringes crowd onto the boundary and _draw_ it, at the lattice's own pitch, out of the same
interference and at the same depth as every other fringe. That is the answer to the obvious
alternative: a stroked contour, or a second fill, is ink laid over the picture, which is the layer
0246 removed. `FRACTAL_EDGE` is held under `1 / TAU`, because at or past a turn's worth the bend
doubles back and every level grows the hard ring a smoothed level count exists to avoid. And the
bend is inside the level and never in total — a whole level is still exactly its own whole number of
fringes, which is what the flight's wrap rests on.

The shot that decided it: one yard on a click train, an automator laying places, driven fourteen
seconds and read on the drift strip's own 1:1 crop, interleaved base/head/base/head. Base swings
0.033 and 0.027 at a mean of 0.354; head swings 0.070 and 0.078 at a mean of 0.350 — two and a half
times the structure at the same ink. The crops say the same thing plainly: base is a flat fine
weave, head is a row of cells with lit edges.

Cost: the seed grows a sixth number and both fractal keys grow a field, so an escape row's key
carries four and a nested one's six. The bake ladder moves — eighteen stops a breath a row instead
of twelve, and the flight's own ladder goes from two dozen transitions a flight to three levels of
nineteen, one every four or five seconds a row — through the shop, at one bake a painting, drawing
the tile the row was standing on until the new one lands (0144). Nothing reaches the frame path:
the travel is a stepped key like the opening beside it, and no per-frame term was added.

Durable shape: none.
