# 0115 — The burst floor is the seam, and three numbers move with it

- **Date:** 2026-08-21
- **Status:** accepted

How short a burst can be heard is `PLAYER_MIN_SLOT_SECS`, not `PLAYER_BURST_MIN`: `windowOf`
floors every window there, so widening the knob alone changes nothing audible. The floor is five
`PLAYER_FADE_SECS` — two fades inside a gated repeat and a third overlapping the seam — so
shortening a burst means shortening the fade, and the fade is now 2ms, putting the floor at 10ms.

Anything shorter is measured in a room before it is written down. 2ms is ~96 samples at 48kHz to
get from one step to the next; the next halving is not arithmetic that can be done on paper.

Three numbers move with the fade or the change is a defect, and they are the ones to check next
time it moves:

- `MAX_PLAYER_STEPS` — one arming must cover `AUTOMATION_REARM_SECS`, and every step is at least
  the floor long, so `PLAYER_MIN_SLOT_SECS * MAX_PLAYER_STEPS` has to stay over it or the pattern
  starves between two ticks.
- `gridOf` — a loop whose slots fall under the floor is played straight, so a lower floor makes
  shorter loops start jumping.
- `PLAYER_BURST_MIN` — the knob has to reach the range it now has. A slot's sixteenth of a
  sixteenth puts everything the knob newly reaches in the bottom fiftieth of a linear sweep, so
  that one dial is drawn on `log` — and its step is `PLAYER_BURST_STEP`, finer than its floor,
  because a log dial's arrow key moves by a fraction of the sweep and a move under half a step is
  a key that does nothing.

**Amended, 0119.** The title is now literally true: `PLAYER_BURST_MIN` _is_
`PLAYER_MIN_SLOT_SECS`, because a burst is wall seconds and the two are the same kind of number.
The third bullet's arithmetic — a slot's sixteenth of a sixteenth, and the fiftieth of a sweep it
lands in — is retired with the unit; the log curve and `PLAYER_BURST_STEP` survive it unchanged,
for the reason the bullet gives. The first two bullets are untouched.
