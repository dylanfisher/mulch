# 0311. A drawn lane is drawn again every so many passes

- **Date:** 2026-09-07
- **Status:** accepted, extending [0309](0309-a-motion-is-a-lane-drawn-as-if-recorded.md)

Under the row that draws a lane sits a count — off, or one of `MOTION_REDRAW_PASSES` — and while
it is set the knob draws a lane it drew again, in the same character at the lane's own length,
each time that many passes have played. It is the knob's, like the latch: no command, nothing
durable, no history entry, and it does not survive the knob unmounting or a reload. What it sends
is the same `automation.set` a press sends, so 0309 holds — the session remembers lanes and
nothing else, and every redraw is a lane like any other. A lane a hand recorded is never redrawn,
whatever the count says: the knob forgets the character when a recording commits over a drawn
lane or the lane is cleared.

The passes are counted on the one frame loop off the phase `peek()` files, a pass being the
phase wrapping, so nothing is added to the transport and nothing per-frame enters React state.
A redraw lands a frame after the wrap, at the knob's own value, which is where a drawn lane
begins and ends, so the seam is silent. The count starts over with every lane, drawn or redrawn.
