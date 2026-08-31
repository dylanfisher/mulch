# 0235 — A ground move is travelled, not written

- **Date:** 2026-08-31
- **Status:** accepted, extending
  [0224](0224-the-drift-has-a-layer-per-tier-and-a-field-the-ground-moves.md) and
  [0142](0142-a-row-is-cut-on-a-coordinate-of-its-own.md)

0224 was right that a ground move re-centres and rotates the field, and never said _how it gets
there_; the answer it left by default was instantly, so a loop jumping to a new stretch of the file
teleported the layer the whole picture is beaten against. **A jump is a distance, and the picture is
the one surface that could show it.** Every row that rests on the ground — the reference row, the
wash, and the part's own tier row — now travels toward the ground's centre rather than being written
to it (`easedCentre`, src/lib/moire.ts), at the rate that a whole `DRIFT_CENTRE_REACH` of travel
takes one ease. So a jump to the next bar slides and a jump across the file sweeps: the distance
travelled is the distance jumped, in the unit the ground is already measured in, and there is no
second number anywhere. Where each row has got to is its own `centre`, because the set is refilled
in place — the travel keeps no state of its own.

**The ease's own time is a fraction of the landing and never a constant** (`playerGroundSecs`,
src/lib/playerDrift.ts). A yard set to jump every quarter second and eased over a second is a
picture permanently chasing a ground two jumps back, which is a smear and not a move — so the travel
has to finish inside the jump it is about, which only the landing the module already resolves and
bands can say (`playerRowPeriod`). A yard that is not jumping has no landing and no ground move, and
its caller writes the ground straight. The one gap a per-frame read cannot hold is how long has
passed, so the picture measures it against the session's own clock, the same read the session's row
already runs its phase on (0228, `MoireStrip`).

The landing it is a fraction of is the banded one, and that band has a floor: under 0.75s every
landing resolves to the same period, so a yard jumping faster than the travel is long is a picture
that never arrives. Accepted rather than fixed — the row's period is the one length the per-frame
read holds, and the ground's own period is a third number the picture has never read (docs/plan.md
§4).

**And a travel is the one accumulated number in the picture, so it survives a rebuilt set.** Every
other field a read writes is written outright; this one is where the travel has got to, and a row
set is rebuilt whenever anything durable moves and whenever a run turns over — neither of which is a
jump. `carryGround` moves it onto the replacing set, without which a knob touch would sweep the
whole field back from the middle of the picture.

**And it may not cost a bake.** `stepped(row.centre, DRIFT_CENTRE_REACH)` is what a curved row's
picture-sized tile is keyed on, so a travelling anchor is only affordable because it walks that
ladder — a whole travel visits the stops between its two ends, which is at most `DRIFT_STEPS + 1`
entries the shop is already holding, exactly as P168's drifting anchor visits four. Any future
motion of an anchor is bound by the same rule: written against the raw centre it is a bake a
painting for as long as the motion lasts, which is the one thing that must never reach the frame
path (0129, 0144).
