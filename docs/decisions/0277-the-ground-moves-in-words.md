# 0277 — The ground moves in words, and the switchboard is the fold's own rows

- **Date:** 2026-09-02
- **Status:** accepted, closing the move bench of
  [0276](0276-the-ground-bench-asks-how-it-moves.md) under
  [0254](0254-the-bench-argues-the-card-fold-by-fold.md)'s rule; amending
  [0193](0193-the-grounds-distance-is-a-share-of-the-sample.md) — the sixteenth is still the unit
  and `PLAYER_BED_DISTANCE_MAX` is still the far reach, but no dial spans it — and, for the ground
  only, [0162](0162-a-lean-is-an-amount-and-replaces-the-walk.md)'s "a lean is an amount"

**The switchboard won.** Of the six readings of how the ground moves, it is the one where every
word the fold can say is on the board at once: rows of presses under the Every dial, one word lit
on each — On its own (stays put, wanders), How far (a nudge, a bed, anywhere), Which way (back,
either way, on). A leash, a pad and a fence were felt and said less; a sentence hid its other words
behind a press. The Distance, Lean and Home dials are gone, and the Counted-in row now has three
siblings drawn the same way.

**The spec holds three words, and the numbers are said once.** `bedReach`, `bedWay` and
`bedWanders` replace `bedDistance`, `bedBias` and `bedHome`; `bedMove` in src/lib/playerBed.ts is
the one place a reach becomes sixteenths, a way becomes a lean and staying put becomes the home
roll certain, and the walk hands that to the same `leanStep` in the same draw order, so a pattern
that said four sixteenths, no lean and no home draws exactly what a nudge, either way and wandering
draws. The words are refused by name at the wire (`oneOf`, the third guard of its kind), and a
stored spec still carrying the numbers is refused by its keys — there is no migration (0026).
`bedWanders` is not a second "never moves" beside `bedEvery` at zero: with the period open, staying
put comes home on every due move, which is a return a hand hears whenever a kept ground has walked
the loop away.

**The fourth row is not built.** Whether the loop's own boundary shrinks, holds or grows is the
one fact the six agreed on and the fold still cannot say; it changes what the transport reads, so
it is a step of its own with a decision of its own, and nothing in this change is half of it.

**The six are deleted**, with their arithmetic, their file and their stage's drag, as 0254 said
they would be. `sentence` rejoins the cleared list, and `SketchStage` is single-bench again. The
bench asks one question now: when the ground moves.
