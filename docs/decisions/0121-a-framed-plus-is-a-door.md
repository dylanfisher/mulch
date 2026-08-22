# 0121 — A framed plus is a door; a dot is a state

- **Date:** 2026-08-22
- **Status:** accepted

A marker that opens more of a control is the `more` picture from the icon vocabulary — a plus in
its own frame — under a pointer cursor. A marker that reports a state stays the dot it is.
The Hold dial's rate marker (`src/ui/PlayerRate.tsx`) is the first of the former; the lane marker
on a parameter knob (`src/ui/ParameterKnob.tsx`) is the latter and does not change.

The frame is what keeps `more` apart from `add`: a bare plus adds one of something, a framed one
opens a panel of settings that are already there.

**Why.** Both were `size-2 rounded-md`, and one of them is the only way to three controls that are
otherwise undrawn. One dot beside a dial reads as something the dial is, not something behind it,
so the dial that hides three others looked exactly like the ones that hide nothing.

**And it is one colour**, the instrument's own ink. The marker used to light in the accent when
any of the three was off its default, which is the second half of what
[0118](0118-the-rate-walk-is-the-performers.md) asked of it; that is dropped. A door is not a
readout — the accent on this card means a value has moved, and spending it on the lid meant the
lid was orange in most sessions, which says nothing once it is always true. The three dials say
what they are set to when the door is open, and the Hold dial says its own number when it is
shut.

An icon rather than a shape drawn here — the first version was a `clip-path` triangle folded
into the corner — because the interface already has one vocabulary of pictures and the answer to
"what says there is more behind this" belongs in it, at a key, next to its sentence
(`src/ui/icons.ts`, `ACTION_TOOLTIPS`). A hand-cut shape also had to be worked around: a clipped
element is clipped for hit testing, and the centre of a corner triangle — where a pointer, a test
and `./scripts/smoke` all aim — falls on the cut edge.
