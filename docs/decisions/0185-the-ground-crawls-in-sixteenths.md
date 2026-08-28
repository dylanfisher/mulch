# 0185 — The ground crawls in sixteenths, and a hand can plant it

- **Date:** 2026-08-27
- **Status:** accepted, extending
  [0183](0183-a-bed-is-the-loop-moved-and-it-is-the-transports.md) — whose bed, wrap and single
  read seam are all kept — and resting on
  [0184](0184-the-ground-is-the-songs-and-a-part-plays-back-on-it.md), whose one ground per song is
  what makes a single plant meaningful.

**The walk carries an offset in the loop's own sixteenths, not an index of loop lengths.**
`bedDistance` is drawn in sixteenths and its ceiling is `PLAYER_SLOTS`, which is exactly the
one-bed hop it replaced; below that the loop creeps across the source and drifts out of phase with
it. `bedBounds` answers those sixteenths, `bedWrap` folds one, and `bedStart` multiplies by
`grid.slot` rather than `gridSpan`. A bed is still one loop-length and a burst is still clamped
inside the one the pattern is standing on — what stopped being true is that the ground begins on a
boundary of them.

**Two units, one cursor, and the finer one wins.** `spec.bed` stays whole beds, because "which bed
the song opens on" is a place a hand names and ±64 of them is the reach that dial offers — whole
until the fold, which since the crawl can land an out-of-reach bed part of one along rather than on
the boundary it used to. The dial's promise is conditional on the file holding that many, which is
what its caption now says. The walk
converts it once at the open and once at a home (`spec.bed * PLAYER_SLOTS`) and counts sixteenths
everywhere else. `PlayerStep.bed` keeps its name and changes its unit, documented at the field: a
rename would have touched six test files to say what one sentence says, and the plan's own words
kept `bedWrap` and `slotStart`.

**`bedGround` is the seam every surface outside the transport reads.** The fold and the buffer
second it lands at, composed, because the fold and the `/ PLAYER_SLOTS` after it are the whole of
the crawl, and a surface that spelled them itself is a rectangle that can disagree with the loop a
press writes (principle 1). The transport keeps `bedStart`: it holds a grid whose bounds were
answered once for the pass, and re-folding per source is what that file is shaped to avoid. So the
divide is written twice after all — `span / PLAYER_SLOTS` here and `grid.slot` there — which is two
spellings of one quantity that can part by an ulp and by nothing a loop edge or a rectangle can
express. What is said once is the _fold_, which is the part that could be wrong.

**Plant is an ordinary `deck.loop`, sent from the jumps card.** It reads the standing ground off
`peek` at the press — a fact about the moment the hand went down, the way a capture reads the
session — and writes it back as the loop. Undo, persistence, archives and export parity keep
working because no surface learns a new kind of edit: `gestureOf` gives `deck.loop` its own
checkpoint, so a plant undoes on its own and never coalesces with a knob beside it.

**It restarts the pass, exactly as every other loop edit on a jumping deck does.** `moveInPlace`
refuses outright while a player is held (src/audio/deck.ts), so `setLoop` falls through to `start`,
`player.begin` rebuilds the walk and the pattern opens again from the top of its seed. That is the
whole of what a press costs, and it is 0089's standing answer rather than anything this gesture
invented — a drag on the handles costs the same. 0183's distinction survives with its meaning
intact but not its comfort: a hand may move the loop because a hand is allowed to restart a pass,
and a clock may not because it would restart one several times a second.

**Plant answers the ground, not the dial, and at a non-zero `bed` those differ.** The walk opens
`spec.bed` beds from whatever loop it is handed, so a plant with `bed: 3` writes the ground three
beds along and the restart then re-opens three beds past _that_ — press again and the loop ratchets
on. Each press is honest about what it does (it plants where the pattern was reading) and none of
them converges. Left as it is: making it converge means sending a `deck.player` alongside, and the
step's own words are that plant sends an ordinary `deck.loop` and adds no durable shape. A hand
that wants the loop to stay put after planting turns `bed` to zero, which is where it already is.

A press with no pattern armed, or one standing on the loop itself, is a gesture with nothing to do
and sends nothing — a loop written over itself is a restarted pass and a history entry for a move
that never happened.

**No character names the distance, still.** The unit changed; the argument 0183 gave did not. A
period is not a texture and a where is not a like.
