# 0104 — A join is the gap, however short

`joinMoves` ramps a live move over the time since the move before it. The only question it asks is
whether that move is still inside the gesture — `gap <= SAME_GESTURE_GAP_SECS` — and not whether
the gap is wide enough to be worth joining.

It used to also require `gap > PARAM_RAMP_SECS`, which made the join unreachable for the cadence
it was written for: every current trackpad reports faster than 100Hz, so the ordinary drag arrived
in gaps under 10ms and took the lone-move branch —
[0065](0065-a-live-move-is-joined-over-its-own-cadence.md) undone by its own floor, on the
parameters it was written for.

The floor is zero, not a smaller constant: two moves stamped at the same instant have no gap to
ramp over and keep the immediate ramp, and everything above that is joined over exactly its own
gap. A future cadence that is faster still needs no number changed here.
