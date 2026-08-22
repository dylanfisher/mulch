# 0118 — The rate walk is the performer's, and it is the slot walk a rung down

- **Date:** 2026-08-22
- **Status:** accepted

`hold` said how _often_ the read rate lets go. Everything about where it then went was the
module's: one uniform draw from a closed five-entry set. Three fields now say the rest of it —
`chance`, `spread`, `drift` — and `PLAYER_RATES` becomes a ladder walked in rungs.

**This reverses a sentence in [0089](0089-a-jump-is-the-transports.md).** That decision wrote "how
far the rate may wander is the module's decision, and how often it does is the performer's", and
gave that as the reason `hold` is a count rather than a magnitude. The count survives; the division
of labour does not. A hold of 4 sounds nothing alike at half a semitone of spread and at an octave,
so the module was deciding the more audible half and calling it an implementation detail.

**The vocabulary is the one the module already speaks, one level down.** The slot walk has a
`distance` (how far one jump may travel) and wanders both ways. The rate walk now has `drift`, which
is that distance in rungs, and `spread`, which bounds how far from unity a rung may be — the bound
a slot walk does not need because the loop wraps and the ladder must not. `chance` is the one idea
neither walk had: the odds a due change fires at all.

**What a rung is.** `PLAYER_RATES` is symmetric about `PLAYER_RATE_UNITY`, so a rung is a signed
distance from the deck's own rate and the two directions are the same size. It widened from five
entries to nine — at five, `spread` had three positions and `drift` two, which is a knob that reads
as broken rather than as coarse. It stays a closed ladder: what a rate may _be_ is still the
module's, because these are musical intervals; how far it strays and how often is the performer's.

**A change always changes something.** `drawRung` draws uniformly over the rungs the drift reaches
and the spread allows, with the current one removed. The two alternatives are both worse: clamping
a leap into range makes the ends of the ladder over-represented, and leaving the current rung in
means a hold that expires and audibly does nothing.

**A failed roll is not a change postponed.** `chance` is rolled on every jump the hold is due on,
and a failure leaves the count where it is so the next jump rolls again. Rolling once and deferring
would make `chance` a second, murkier way of saying `hold`. The roll is taken whenever a change is
due whatever its outcome, which keeps the random stream a pure function of the spec and the step
count — the property `playerWalk(spec, from)` needs to re-derive a tail
([0096](0096-a-moved-number-re-derives-the-tail.md)).

**The three are behind a marker on the Hold dial**, not four more dials on a row already eight
wide, following the automation marker in `src/ui/ParameterKnob.tsx`. Two differences: it is always
drawn rather than gated on a held modifier, because it is the only way in; and it is lit when any of
the three is off its default, because a Hold dial reading 4 looks identical whether the changes it
counts are certain or a coin flip. (**Amended, [0121](0121-a-framed-plus-is-a-door.md):** the lit
state is dropped and the marker is one colour. The picture is a door, not a readout.) `PLAYER_RATE_KNOBS` declares which knobs are behind it, as a
partition of `PLAYER_KNOBS` rather than a second list of them.

Defaults reproduce the old behaviour exactly — `chance: 1`, `spread: 2`, `drift: 4` is every due
change firing over the old five rates, leaping freely — so the three are things a hand reaches for
rather than things it has to undo. Pre-release, so specs without them are discarded
([0026](0026-pre-release-has-no-migrations.md)).
