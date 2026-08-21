# 0085 — A control reads the way it moves

Up is more and on is running, on every control, whatever the field underneath is called.

A dial is dragged up to raise its value, so the lane's span is a dial too — an `xs` rung of
`src/ui/Knob.tsx`, in the preview's top right with its own readout beside it — rather than the
downward drag on the time axis it was. A range no single sweep can land in says its own
`travelPx`: a span is twelve doublings wide, and the shared `DRAG_TRAVEL_PX` would put a doubling
inside fourteen pixels. The dial still sends one `automation.span` for a whole drag
([0065](0065-a-live-move-is-joined-over-its-own-cadence.md),
[0079](0079-a-lane-is-stretched-after-it-is-played.md)): the moves paint it from a ref, and the row it sits in
is where the gesture is known to have started and ended, because that is where the dial's captured
pointer events bubble to. The start is the capture and not the press: a press the dial refused has
no ending to arrive, and would latch the row open.

A switch is on when the thing it names is doing what it names, so the rack's is on for an effect
that is running and off for one that is bypassed, and it carries no caption: a toggle that reads
right needs no word beside it ([0055](0055-a-state-is-a-toggle-and-an-action-has-one-icon.md)).
`effect.bypass` keeps its name and its field — the sense is inverted once, at the control, and
nothing downstream learns a second spelling for the same flag.
