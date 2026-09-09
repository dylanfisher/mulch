# 0319. A motion is carried between knobs, and dies with the tab

- **Date:** 2026-09-08
- **Status:** accepted, extending [0314](0314-a-drawn-lane-says-what-drew-it.md)

Under the character and count rows sits Copy, which takes this knob's whole motion — the lane, the
range it was drawn in, and its `drawn` sibling — and Paste, which puts the carried one on another
knob. What holds it is a module-level manager in `src/ui/motionClipboard.ts` subscribed to with
`useSyncExternalStore`, the way the toast manager is the one other thing in the interface holding
state above a component. Not the session store, which `src/app`'s `send()` alone writes, and
nothing durable: a clipboard is a gesture half-finished, like a selection or a drag, so it is in no
command, no history entry, no archive and no restore, and it is gone when the tab closes. There is
at most one, because a second Copy is what a hand meant by pressing it.

A lane means one thing only beside the range it was drawn in, so a paste is a rescale and never a
clamp, which would flatten every point past the edge onto it: `rescaleLane` (src/lib/automation.ts)
holds each point's fraction of the source range and reads it onto the target's, leaving the times
where they are, and hands the result to `normalizeAutomationLane` so the target's own step and
bounds are stated once. A source range with no width is refused rather than guessed at. The paste
travels as one `history.group` — `automation.set` and `automation.drawn` — which is by definition
one entry, so one undo takes a whole motion back rather than a lane without its sibling; a lane a
hand rode carries no `drawn` and pastes as one nothing drew, which is exactly what it is.

Paste is not rendered at all until something is carried: an empty clipboard is not a press that
does nothing. Copy stands disabled over a knob holding no lane, the way the count row does.
