# 0309. A motion is a lane drawn as if a hand had recorded it

- **Date:** 2026-09-07
- **Status:** accepted, extending [0028](0028-automation-is-gesture-relative.md) and
  [0152](0152-a-character-is-a-region-of-the-spec.md)

A knob's lane can be **drawn** as well as recorded: the popover behind its marker carries a row
of characters, and pressing one sends the same `automation.set` a release sends, with points a
random walk laid over a span from a seed dealt on the click. From there it is a lane like any
other — stored, stretched, cleared by a plain move, played by the transport — and nothing durable
remembers which character drew it, for the reason 0152 gives: the points would contradict it.
There is no second kind of automation, no second command, no second colour on the corner.

The span is the dial's business. A press with no chosen span deals one off its own seed, between
`MOTION_SPAN_SECS`, so two presses are two lengths; a drag on the preview's span dial chooses one,
and every press after it draws at that length until the lane is cleared, when the choice goes
with it. The walk is bent to end where it began, so a drawn lane goes round without a jump.

The first cut kept a motion durable — a character and a seed the transport drew eight-second
stretches from on the spot, its own command, its own map beside the lanes. It was one more thing
a key could hold and one more thing every reader of a key had to know. A lane already is the
thing a knob holds; drawing one is a gesture, not a state.
