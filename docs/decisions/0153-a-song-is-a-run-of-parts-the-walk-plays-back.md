# 0153 — A song is a run of parts the walk plays back, and a chorus is the one that comes back

- **Date:** 2026-08-24
- **Status:** accepted
- **Extends:** [0152](0152-a-character-is-a-region-of-the-spec.md) — a character sets the whole spec
  at once, and this is several of them in an order; and
  [0151](0151-a-figure-is-a-run-of-slots-the-walk-plays-back.md), whose arithmetic this is, one tier
  up

A **part** is `{ character, amount, length, chorus }`, and `PlayerSpec.song` is a list of up to
eight of them. Empty is the whole of "no song", the way `phrase: 0` is the whole of "no figure".

**A part is a region, not a spec.** It names a character and how far into it to go; the voice it is
walked under is _drawn_ at its first jump, from the walk's own generator. So "another riff" is what
a part already is — a riff part of eight jumps deals a new riff every eight jumps, and needed no
second control. What it costs is that a part cannot be edited dial by dial: what a hand shapes is
the character behind it, and every part drawn as that character moves with it.

**A chorus is the part that comes back.** It is drawn once and returned to unchanged every time the
song reaches it; anything else is drawn again each round. That is `phraseReturn` said for a part
instead of a slot, and said as a state rather than as odds: a figure lets go on a count and _may_
come home, where a part is at a place in a list a listener is counting, and a chorus that only
sometimes returned would not be one. Each chorus is remembered under its own place in the list, so
two drawn as one character are two runs.

**The card's dials are what every part is a distance from.** A part blends from the spec rather
than from `PLAYER_DEFAULTS`, so every knob its character does not name is left at the spec's own and
every knob it does name is that many parts of the way from it. The dials therefore stay live under
a song — turning Gate moves every part whose character is silent about the gate, and turning Burst
moves a part at half amount half as far — but a knob a part names at full amount is the region's,
and moving the dial under it does nothing to that part. `plain` is the identity here too: a song of
one plain part is the card's own pattern, walked.

**A part's length is counted in jumps.** Not in loops: a landing sounds for `repeats` bursts of wall
seconds, so how much of the loop's time a part covers is a fact about the yard and never about the
song ([0119](0119-a-burst-is-seconds-and-the-rest-is-slots.md)). Jumps is what every other count in
the module is in.

**The song's draws sit in the one stream.** A part's voice is drawn from the walk's own generator,
in the order the parts are reached, so the pattern stays a pure function of the seed and the step
count and a knob moved mid-pattern re-derives its tail with the arrangement it is hearing
([0089](0089-a-jump-is-the-transports.md), [0096](0096-a-moved-number-re-derives-the-tail.md)).
A chorus costs one draw however many times it comes round. The figure is laid again at every part
boundary: a part is a new run of slots as well as a new set of numbers, and a figure whose `phrase`
changed under it would be a run its keep could never come round on.

**Nothing durable still remembers which character a dial came from.** 0152's rule holds: the spec is
what the pattern _is_. A part names a character because a part is a _plan_ to draw one, which is a
different claim from "this pattern is a riff" — and the menu that presses a name still keeps its
draw in view state alone. That menu now also shows the knobs the pressed name is about, read off the
region rather than listed beside it, so a character edited in `playerCharacter.ts` arrives in its
own menu with no change. Those dials say which character they belong to in their accessible name,
because the card's own row is drawing the same knobs behind the popover and a caption is a dial's
whole name.

**What moved to say it.** `playerWalk` and `playerSequence` left `src/lib/player.ts` for
`src/lib/playerWalk.ts` — the walk now needs the character regions, and `playerCharacter.ts` already
imports `player.ts`, so leaving it where it was would have closed an import cycle those two files
evaluate inside. The character _names_ and the amount's range moved the other way, into
`player.ts` beside `PLAYER_VARIATIONS`: a part carries both durably, and a range is declared where
the one validator that checks it is. `src/lib/playerKnobs.ts` is new and holds every knob's range,
fineness and curve in one declaration — a menu that draws a set of dials it is _handed_ cannot be
written with the ranges spelled out at each dial — and `playerCharacter.ts`'s list of which knobs
are whole and its `knob === "burst"` special case both read it now instead of restating it.

Durable shape: `PlayerSpec` grows `song`, which is validated by the one validator, projected in
declared order, and carried by the ordinary `deck.player` command — so an arrangement is undone,
logged, captured into clips and replayed like any other durable edit
([0107](0107-a-module-is-a-card-and-a-fold-never-silences-it.md)). Pre-release, a stored spec
without it is discarded rather than repaired
([0026](0026-pre-release-has-no-migrations.md)).
