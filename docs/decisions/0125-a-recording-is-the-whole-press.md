# 0125 — A recording is the whole press, not the moving part of it

- **Date:** 2026-08-22
- **Status:** accepted

An Option-held press on a knob (`src/ui/ParameterKnob.tsx`) begins the lane, and the release ends
it. The press writes the value under the hand at `at: 0`, and the ending writes that value again at
the distance from the press, so the lane runs press to release however much of it the hand spent
still. Recorded from the moves alone, a press held four seconds, moved quickly and held four more
stored a fraction of a second and replayed on a span nobody performed.

A stillness inside the gesture is held rather than ramped across. A move further than
`SAME_GESTURE_GAP_SECS` from the one before it is a move standing alone —
[0065](0065-a-live-move-is-joined-over-its-own-cadence.md) already reads it that way and gives it
the immediate ramp — so the recording lays the previous value down again `PARAM_RAMP_SECS` before
it. The lane then replays the shape that was performed: flat, and then a ramp of the same length
the live move made, landing on the value where the hand reported it rather than a ramp later. Both
constants are imported from `src/audio/ramp.ts`; the rule for what counts as one continuous move is
declared once.

Nothing is written per frame a press does nothing in: a stillness costs the one point that ends it,
whatever its length, so the point count is the pointer's events plus the press, the release, and
one per stillness. That is what keeps this off the thinning plan.md §4 prices for a stretched lane.

**Only the dial's own press is a press.** What the wrapper holds between a press and the first move
is the press — a clock reading and a value — never a recording, because the lane's popover renders
through a portal and its span dial bubbles `pointerdown` to that same wrapper along the React tree.
A recording opened there would take the dial and the preview's own dot off the lane they are
painting (0035) for as long as the press lasted, and a press that takes no pointer has no ending
coming to clear it (0114). The first move of that press is what turns it into a recording, so a
press that never reaches the dial can record nothing.

For the same reason only a press has a release to run to: a move with nothing pressed behind it is
a keyboard nudge or a double-click reset, and it commits the one point it is rather than a lane as
long as Option was held.

A press that never rode commits nothing, and does not become the inert state a committed gesture
leaves behind — Option-pressing an automated knob and then dragging it is still the ordinary move
that clears its lane (0028).
