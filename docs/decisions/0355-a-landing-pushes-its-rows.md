# 0355 — A landing pushes its rows

**2026-09-11.** The lattice of marks stands still between events (0346), and what may move it is an
event. A landing of the walk now lifts the threshold passes one mark for the cell rows it stands
in, at its own level, falling on the deck clock over a share of the loop — so a row flares when its
landing sounds and settles after, and nothing else in the picture moves.

**The level is `joltWalked` and nothing new.** How far the walk just jumped is already the field's
own reading of a landing (0271), bounded nought to one and nought for a hole or for the first
landing of a pass. It is read once in `refillRows` and spent twice: as the jolt the whole field
answers with, and as the push this landing puts on the marks. A landing that jumps nowhere pushes
nothing, which is the same judgement the jolt already makes about it.

**The push rides on the jolt.** `MoireJolt.pushes` holds `CELL_PUSHES` falling landings, each a
level and a centre (`cellPushInto`, src/ui/moireCellPush.ts). One landing is one event and one
reading of it (principle 1), and a rebuilt set carries the flares with the jolt it was already
carrying (`carryJolt`) rather than through a second carry that would have to agree with it. Four
slots, because the fall is at most a loop and a walk lands eight or sixteen times in one; a landing
arriving on a full ring takes the weakest slot and one weaker than every slot is dropped.

**The band is `DRIFT_CENTRE_SWING`, placed through `centreAcross`, and no dial was minted for it.**
The cell rows a landing lifts are the rows its own anchor could be standing in — one step of the
ladder every anchor is quantised onto — so two landings a step apart light two bands that do not
touch, and how far apart two anchors stand is declared in one place. A centre is an anchor _turn_
and not a fraction of the height: both ends of the band go through `centreAcross`
(src/lib/moireGeometry.ts), the one map every row in the picture is drawn through, because read
straight down the picture a landing at nought flares the top of it while the rows it landed on
stand a quarter of the way down — and only the resting centre comes out right.

**The lift is on the boxed read, not on the picture.** One `lighter` fillRect of `bandFloor(1)` —
one mark's worth of the ramp, the step every band floor is a multiple of — over the pushed rows of
the read, before a single band is cut out of it. The read is one pixel a cell, so a landing costs a
fill over a handful of rows of a surface the picture's area over the cell squared: no pass is added,
no picture-sized draw, no rebake. `STAMP_PICTURE_DRAWS` is untouched and the frame still pays ten
passes and one draw (0353), and the screen tile is not keyed by any of it, so no bake is asked for
(0354).

The decay dial is `cells.decay`, a share of the loop and never a span in seconds, resting at a half
and reaching one at most: a push that outlives its loop is the still lattice lifted rather than a
row flaring.
