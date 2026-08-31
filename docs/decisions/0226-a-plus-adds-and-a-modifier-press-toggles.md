# 0226 — A plus adds and a modifier-press toggles

- **Date:** 2026-08-30
- **Status:** accepted, superseding in part
  [0194](0194-a-kept-ground-comes-round-on-its-own-count.md) — a kept ground still comes round on
  its own count, but the two gestures that write one no longer share an arithmetic.

The grounds a hand keeps are one list edited from two places, and until P165 they were edited by
one function: `plantBed`, which added a ground the list did not hold and removed one it did. That
is the right arithmetic for exactly one of the two gestures.

**The `+` at the end of the kept row adds and never takes away. The Option-press on the picture
toggles.** `keepBed` is the add — the same list back where the ground is already kept or where
there is no room — and `plantBed` is `keepBed` with a take-away in front of it. Two functions,
one add between them (`src/lib/playerGround.ts`).

Not one arithmetic, because these are not one gesture. A modifier-press on a lit block a hand can
see is legibly a toggle: the block says whether it is kept, and the press means "flip that". A `+`
at the end of a row says "one more", and a hand pressing it twice on the same ground ended with an
empty row. Principle 1 asks for one author per fact; the fact here is what each gesture means, and
there are two of them. Where both refusals are true at once the already-kept one wins: letting a ground
go does not make a press work that was aimed at a ground the list already holds.

Two things follow, and both are load-bearing:

- The row's `+` reads `player.bed` — the durable field the Bed dial turns and the drag on the
  picture writes — and never the peek's step. A press that read where the walk had wandered to
  meant nothing on a stopped yard and something different on every frame of a running one; reading
  the window makes it the same press either way, live wherever the row is drawn. (Which is not
  quite everywhere a spec is: a bypassed module draws no row at all, because `playerSounding`
  answers null for one and the card draws what it hears — 0225.)
- A press that can do nothing says which nothing it is, in its accessible name and not only in its
  tooltip: a disabled control opens no tooltip. `PLAYER_BEDS_KEPT` and `PLAYER_BEDS_FULL` are the
  two refusals (`src/lib/copyGround.ts`, principle 5).

Letting one go stays where it already was: the `×` under the row, and the Option-press on the
block.
