# 0192 — The ground's period is counted on a clock a hand picks

- **Date:** 2026-08-28
- **Status:** accepted, extending
  [0183](0183-a-bed-is-the-loop-moved-and-it-is-the-transports.md) and
  [0185](0185-the-ground-crawls-in-sixteenths.md) — the move itself, its distance and its lean all
  stand untouched — and resting on
  [0184](0184-the-ground-is-the-songs-and-a-part-plays-back-on-it.md), whose one ground per song is
  what makes a boundary of the song a thing the ground can be counted on.

**`bedEvery` counts whatever `bedPer` names: jumps, parts, or whole rounds of the song.** The
period was in jumps because every counter in this module is, and a jump is the wrong unit for the
thing a hand actually asks for — that the loop move _when the music does_. A part beginning and a
song coming round are the two boundaries the walk already crosses, and neither of them was reachable
from a number of jumps: a part's length is a dial of its own, so "one move per part" was a period
that drifted out of step the moment any part was a different length from the others.

**A choice, not a fourth amount.** Three clocks are three clocks rather than three points on one, so
the field is one of `PLAYER_BED_PERS` and not a number — which makes it the one durable field of a
player spec that is not one. It is refused by name at the wire and in storage (`bedPerOf`), the way
every bound is refused there, and it is projected with the rest so one ground has one spelling
(0021). A period per unit would have been three periods disagreeing about when the loop moves.

**One place moves the ground; two places tick the counter.** The move stays exactly where it was in
the walk — same arithmetic, same draw, same `leanStep` one grid up — and what `bedPer` changes is
where the counter is incremented: at the jump for `jump`, and at the part boundary for the two the
song keeps. A ground counted in parts lands on the _first_ jump of the part that moved it, so the
move is heard as the part arriving somewhere new. `SongDraw` answers whether the boundary is the top
of the arrangement rather than a walk comparing part ids, because the song's cursor is the one thing
that knows which part of the run it just handed out (principle 1).

**A pattern with no song never moves on either song clock.** No part begins and no round comes
round, so the period never comes due — the honest answer, and not a fall back to jumps (principle
5). `jump` is what a switch press leaves and is the module as it was before this field existed, so a
switch pressed today moves its ground exactly as one pressed before this decision did.

**Amended, P158 and then P170: the album's round was a fourth clock, and it is gone with the
album.** `PLAYER_BED_PERS` gained `"album"` and has lost it again: the tier it counted no longer
exists, so the choice is the three this decision was written for and every sentence above counting
to three is the live one
([0231](0231-there-are-two-tiers-and-a-third-earns-a-fact-of-its-own.md)).

**It is the song's, so no character draws it and no part carries it.** The same refusal the five bed
knobs already carry (0184): a character says what a pattern is _like_, and which clock the ground is
counted on is a _when_ about the whole arrangement. It is out of `PlayerVoice` for that reason —
a voice is the numbers a step is drawn from, and the walk reads this off the spec beside the period
it counts.
