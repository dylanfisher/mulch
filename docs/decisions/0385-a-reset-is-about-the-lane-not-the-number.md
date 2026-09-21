# 0385 — A reset is about the lane, not the number

- **Date:** 2026-09-20
- **Status:** accepted

**A double-click on a dial an automation lane is driving sends the default whether or not the
dial's own value is already the default**, because what the gesture asks for there is the lane
gone and the move is the only thing that clears it (`resetsAnyway`, src/ui/Knob.tsx). Every other
dial keeps the guard that drops a commit landing where the dial already is.

**Because the guard's premise is false the moment a lane is painting.** `commit` compared the
default against `reached.current` and returned, which is right for a dial nobody is driving and
wrong for one whose picture comes from a lane: a lane ridden from the parameter's default — the
ordinary way one is recorded, Option held from wherever the knob was resting — left the value at
the default, so the reset the human pressed was dropped in the knob and the lane was never
cleared. The dial went on following it, which is the report: "double clicking a automated knob
should always reset it."

**A reset is not a ride and not part of a drag.** The wrapper hears the double-click in the
capture phase, before the dial sends the value, so the move is known for what it is
(src/ui/ParameterKnob.tsx): armed, it clears rather than opening a recording, which would take the
default as its one point and lay it back as a lane of one point — the lane still there, where a
hand asked for it gone, and Option is the reveal, so the hand that can see the lane is usually
holding it. And it closes its own history entry, the way a paste does (0067): the reset lands
after the pointer's own ending, so nothing else would, and the next turn of the dial inside
`GESTURE_IDLE_MS` would join it.

**And the die that draws a seed stands beside the field as well as on the card's front.** The
number is read above the fold, so the press that draws another is reachable above the fold
(P98, 0312); the front's die stays where 0259 put it, beside the six names, because those two are
one question asked at two depths. One command either way — the card's own `onReseed`, handed to
both — never a second mint.

**What this costs:** one card now draws two controls that send one command, named apart so a
reader and a smoke can tell them from each other ("Reseed Mulcher on …", "Reseed Seed on …"), and
P130's "a folded module is its heading and nothing else" gains a second thing in that heading.
The heading already holds the seed and the switch; a number that can be read and typed but not
drawn is the half-gesture P98 refused.

**Not chosen:** moving the front's die to the field, which would break the pair of draws 0259
stands on; and making the reset unconditional for every dial, which would send a redundant patch
from every dial carrying a live read — the voice a song moves, a span drag's draft — for a
gesture that changes nothing there.
