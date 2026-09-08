# 0309. A motion is a seed that keeps drawing the lane

- **Date:** 2026-09-07
- **Status:** accepted, extending [0035](0035-a-lane-runs-on-its-own-clock.md) and
  [0152](0152-a-character-is-a-region-of-the-spec.md)

A knob can be given a **motion**: a character and a seed, and nothing else is durable. Every
eight-second stretch of the lane it plays is a pure function of `(seed, index)` — the character's
dials drawn fresh from its region per stretch, so it evolves rather than repeats, and each stretch
bent to end on a point of a slow path that is itself an O(1) draw, so any stretch can be drawn
without the ones before it and still begins where the last one ended. The transport holds it in
the same map a lane lives in, under the same key, with `MOTION_STRETCH_SECS` as its span and each
armed cycle's points drawn on the spot; the dial paints from the same maths, keeping one stretch
between frames. A key holds a lane **or** a motion: setting either deletes the other, the session
validator refuses both, and a plain move clears a motion the way it clears a lane, in one undo.
The peek files a motion's whole elapsed time rather than a phase, because its reader needs the
stretch as well as the place in it; `motionCycle` and `motionPhase` are the one split.

0152 says nothing durable remembers which character it was, because the dials would contradict
it. A motion has no dials on screen, so the name is the whole of what the motion is and is stored.
The reveal is the same corner the lane marker uses, in a second colour — hollow over a knob that
could hold one, filled over one that does — and the popover behind it is the menu rather than the
preview. The drift picture does not follow a motion yet (0150 is a lane's rule); a blend pad over
the characters is not built.
