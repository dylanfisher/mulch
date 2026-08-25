# 0162 — A lean is an amount, and it replaces the walk

`PLAYER_VARIATIONS` is gone. `bias` is a number in −1…1 saying which way a jump leans, and the two
named walks are its two ends: +1 only ever moves on through the loop, −1 only ever moves back, and
0 is as likely to go back as on, which is what "wander" was. A spec holding both a bias and a
variation would be one instruction arriving from two fields — at bias +1 and `variation: "wander"`
the two disagree and one of them silently wins — and principle 1 forbids that, so the toggle went
rather than being bounded around. The card's pair of buttons is a dial behind the Distance dial's
own framed plus, where a drawn number's amounts belong
([0124](0124-a-drawn-number-carries-the-amounts-that-shape-its-draw.md)).

**The lean is read as the odds of going back, not the odds of going on.** `travelFrom` in
`src/lib/playerWalk.ts` signs its distance on `random() < (1 - bias) / 2`, which at a bias of zero
is the `random() < 0.5 ? -far : far` wandering already took — the same draw, in the same place in
the stream, giving the same sign. So a switch pressed today lays down exactly the steps it laid
before this field existed, and the two amounts beside it roll nothing at zero for the same reason
the vary and the rest roll nothing at theirs ([0096](0096-a-moved-number-re-derives-the-tail.md),
[0134](0134-a-pattern-plays-the-repeats-it-was-set.md)).

**A homing jump homes a figure too, and that is the point.**
[0151](0151-a-figure-is-a-run-of-slots-the-walk-plays-back.md) hands `createFigure` the walk's own
`travelFrom` so an evolving figure moves by exactly the jump an ordinary step takes, and `home`
does not get an exception: a kept figure whose slot is redrawn under a homing pattern may be
redrawn to slot 0. A figure is a run of slots the walk laid, and a walk that comes home lays runs
that come home. Giving the figure a jump of its own would be the thing 0151 refused — `distance`
and the lean would stop saying what the pattern's steps are like.

**No region names the stride or the home.** Both are heard only on the jumps they fire on — a
stride is indistinguishable from an ordinary jump until it has fired several times over, and a
homing jump is one landing in sixteen — so a character pressed at half an amount would name
something a listener could not hear, which is the argument the ratchet and the drop were left out
on ([0152](0152-a-character-is-a-region-of-the-spec.md), P118). The lean is named by three of them,
because which way a pattern goes is audible in one jump — and the Amount slider now travels it like
every other field, which supersedes 0152's "a walk steps over at the middle": there is no longer a
field of a character that cannot be half taken.

`stride` at one and `bias` at ±1 turn the walk by a fixed number of slots every jump, which is a
rotation of the grid: over sixteen slots a distance of three is one sixteen-jump cycle three slots
wide, not a three-slot one — the plan's phrase for it was loose and the case asserts the arithmetic.

The one stream this does move is a song's. `variation` cost no draw, and a region that names `bias`
spends one — `stutter`, `breathe` and `slide` each do — so a pattern whose song names one of the
three draws its part voices differently from the build before this. That is the price of the lean
being an amount, and pre-release it is paid rather than worked around
([0026](0026-pre-release-has-no-migrations.md)).

Durable shape: `PlayerSpec` loses `variation` and grows `bias`, `stride` and `home`, whose bounds
and `TravelSpec` are declared in `src/lib/playerTravel.ts` — beside the jump, the way the figure's
three are declared beside the figure. Pre-release, a stored spec holding the old field is discarded
([0026](0026-pre-release-has-no-migrations.md)).
