# 0134 — A pattern plays the repeats it was set

- **Date:** 2026-08-22
- **Status:** accepted

With vary, rest and hold all at zero the player still landed fewer bursts than the Repeats dial
said. The cause was arithmetic and not scheduling: `playerWalk` drew `1 + floor(random() * repeats)`
per step, so the dial was a ceiling on a uniform draw and a landing set to four repeats sounded
one, two, three or four of them. There is no reading of the card at which that draw was off.

**A repeat count is exactly the number on the dial.** Every other amount this module strays is
strayed by an amount the performer set — `vary` for a burst, `restSpread` for a wait, `drift` and
`spread` for a rate — and each of those has a zero that means "do not stray". The repeat count had
no such amount, so its draw was variation nobody could turn off, and turning every other knob to
zero left a count that was still not arithmetic — where the slot and the gate are drawn by
construction, the count had nothing to draw for. The knob now says what it does, which is the
precondition for anything that later says how far it may stray (P97).

**One draw left the stream.** The walk consumed a random per step for the count and no longer does,
so the same seed unfolds a different sequence than it did before this. Nothing durable moved and
nothing is migrated ([0026](0026-pre-release-has-no-migrations.md)): a seed is reproducible within a
build, which is what the export fingerprint compares, and a pattern is not a stored sequence.

**A step at a count above one is longer than it was**, since the count is now its maximum rather
than its mean — so a jumping deck arms fewer steps across the same horizon. The shortest step is
unmoved, which is what `MAX_PLAYER_STEPS` is sized against
([0115](0115-the-burst-floor-is-the-seam-and-moves-with-it.md)); what changes is that a long step is
now every step at those dials rather than an occasional draw, so how far ahead a moved knob is heard
at `repeats × burst` past the horizon is deterministic rather than lucky (docs/plan.md §4).
