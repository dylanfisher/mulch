# 0065 — A live move is joined over its own cadence

`bindParam(target).set` ramps a move over the gap since the move before it, not over the fixed
`PARAM_RAMP_SECS`. A fixed ramp is shorter than a pointer's cadence, so a drag reaches its value
in 10ms and then holds flat until the next event: a staircase. On gain or pan the risers are too
small to hear. On the wide log parameters — filter cutoff, EQ frequency and Q — one pointer event
is hundreds of Hz, and the flat stretch between the risers is the click that the same gesture,
once it is a lane, does not make, because `scheduleAutomation` ramps point to point with nothing
flat in between.

The price is that a joined move arrives one pointer event late, so only a move within
`SAME_GESTURE_GAP_SECS` of the one before it is joined at all. The binding is built with the
effect instance and outlives every gesture made on it, so "no cadence yet" cannot mean "never
moved before": a move that stands alone is one whose predecessor's ramp arrived long ago, leaving
no riser to smooth. That is the first move of any drag, a keyboard nudge, a double-click reset,
and a lane handing a parameter back to its manual value — all of which keep the immediate ramp.

This holds for every registry parameter bound by a plugin. The deck's own gain and pan still write
through `rampTo` directly in `src/audio/chain.ts`: their ranges are narrow enough that the
staircase is inaudible, and 0031's rate parameters must keep stepping rather than ramping at all.
