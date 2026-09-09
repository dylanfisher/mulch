# 0314 — A drawn lane says what drew it

- **Date:** 2026-09-08
- **Status:** accepted, amending
  [0311](0311-a-drawn-lane-is-drawn-again.md) — which kept the character and
  the count in one knob's refs — and resting on
  [0030](0030-effects-are-instances.md), whose one-value-per-(instance, param) rule this obeys.

**Beside `automation` on the deck and on every rack entry sits `drawn`, keyed the same way.**
`MotionDrawn = { character; redraw }` says what drew a lane and how many passes it plays before it
is drawn again. It was a pair of refs inside `ParameterKnob` because 0311 could see one knob; a
duplicate of the effect, a reload and a button that has to look pressed are three readers of it,
and three readers of a ref is the shape that has to move into the session.

**A sibling map, not a field on `AutomationLane`.** The lane is what the audio host schedules, and
every reader of it would grow two fields it never reads. A map keyed by the same parameter id costs
one validator and no reader, and travels with the entry that owns it exactly as its lanes do.

**One command carries the whole of it.** `automation.drawn` is `{ deck; instance?; param; drawn }`,
null for a lane nothing drew. Two things write it — a press on a character draws a new lane, and a
press on a count sets the count without redrawing — so a command per field would be two ways to say
one fact. Both writers send the whole pair. It carries the same history gesture key as
`automation.set` and `param.set` on that pair, so a draw is one entry to undo rather than two.

**A lane cleared clears it, in `automation.set`'s own reducer.** An `automation.set` with no points
deletes the sibling beside the lane, and a recording committing over a drawn lane sends `drawn:
null` — 0311's rule that a hand's lane is never redrawn, written where the fact lives rather than in
a ref that a second knob could not see. A double-click reset says the same thing in the same
history entry as the clear and the default, because a knob put back to plain while redrawing would
otherwise draw itself a new lane on the next pass.

**A count needs a lane a motion drew.** There is nothing to redraw on a lane a hand rode or on a
knob holding none, so the redraw row is disabled until a character has drawn one — and the count
no longer outlives the lane the way the knob's own `useState` did. That is a loss and it is the
right one: a count kept for a lane that is not there is a setting about nothing, and the row that
showed it said so to a hand that had no way to act on it.

**Both rows are toggle groups pressed on what the session holds.** The characters were five
buttons and the counts were already a group; a character standing and a count standing are one kind
of fact, so they are one control. Pressing the lit character draws a new lane in that same
character, which is the press Base UI reports as an empty selection.
