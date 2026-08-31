# 0240 — The picture folds into itself, and the fold is the whole field's

- **Date:** 2026-08-31
- **Status:** accepted, extending
  [0143](0143-a-row-is-drawn-at-more-than-one-scale.md) and
  [0212](0212-the-picture-draws-the-run-a-read-is-holding.md), constrained by
  [0144](0144-the-picture-may-fall-behind-the-hand-may-not.md)

An automator's run reached the picture twice and both times as rows — one per standing place
(`grownInto`), and the run's own size spent on those rows as octaves
([0230](0230-depth-is-budgeted-across-the-picture.md)). So a busy run was more lines at the same
depth, and a second automator was more lines again — a rack read as a count of things rather than
as one thing. **A run of effects growing inside a run of effects is one picture inside another**, and the painter already had the machinery:
`feedFrame` lays the last frame back into this one under a bounded alpha (0143). That is the same
composite one frame later; this is the same composite one scale smaller.

**The fold is the whole field's and never a row's.** After the gratings are cut and before the frame
is fed back, the field is composited onto itself at a ratio and a turn (`foldField`,
src/ui/moireFold.ts). Each pass doubles the levels it holds — pass `n` is aimed at `ratio ** 2**n`
and laid at `FOLD_KEEP ** 2**n` — so a linear number of picture-sized blits buys a geometric depth
and the cost of what is drawn is its `log2`. `FOLD_KEEP` is under one for the reason
`DRIFT_FEEDBACK_CEILING` is: a share of one unions the stack to opaque, and a field filled to opaque
is a picture with nothing left in it.

**How deep it goes is the summed `presence` of every standing place** — the one number an automator
already publishes for exactly this ([0202](0202-an-effect-declares-how-present-it-is.md)): a place
arriving fades a level in, one leaving fades it out, and the fractional part is the outermost
level's own alpha. **The tween is the run's own ramp and never a clock of the picture's**, because a
second timer here would be a fade that could disagree with the fade the ear hears.

**The ratio and the turn are folded off the holding instance's id**, the way `effectRowPeriod` and
`effectRowCentre` take a row's period and its anchor off one fold
([0076](0076-a-card-reads-itself-out-of-its-own-id.md)) — above the bits those two spend, which
is why `FOLD_SPENT` is exported from src/lib/moire.ts rather than restated. So two automators are two
spirals composed into one stack rather than one spiral drawn twice: the second deepens what the first
is drawing and turns it somewhere else. No stop of the turn is nought, because a level laid exactly
on the one outside it is a doubled copy and not a spiral.

**The cap is on the whole fold and not on one run**, for the reason `DRIFT_SCALES_BUDGET` is on the
row set and not on the row (0230): how many automators a rack holds is a count nobody declared, so a
ceiling per run multiplies by it. Past `DRIFT_FOLD_REACH` every run falls back by the one factor —
evenly, so a busy automator reads as shallower rather than as stopped.

**And so is the ladder.** The passes are the cells of the whole picture's depth and never one per
run, each aimed with the spiral of whichever run is standing at that point of it (`foldOwner`). Two
runs a level apiece are still two spirals composed into one stack; forty runs each barely arriving
are still `ceil(DRIFT_FOLD_REACH)` blits, where a ladder per run would have been forty of them for a
stack nobody can see. A run shallower than a whole pass deepens the picture and does not turn it,
which is the only thing a picture with more runs than levels has to give away. Under that, a share
below `FOLD_FAINTEST` — one part in 255, what a canvas's own alpha byte quantises to nothing — is
skipped, because a blit that lays no pixel is a blit not worth taking. So the cost is
`ceil(DRIFT_FOLD_REACH)` picture-sized blits a painting at worst, at `DRIFT_PAINT_HZ` and never at
frame rate (0144), against the twelve extra fills `DRIFT_SCALES_BUDGET` already permits. Measured:
frame p95 at 10.3ms against a band of 9.3–10.3, green.

**The stack's order is the read's own.** `DeckPeek.grown` is refilled and never cleared (0070), so
its keys stand in the order the instances first grew anything; a run that leaves and comes back
lands on the outside of the composite rather than where it was. That is the same event that already
changes which rows the picture has (0212), so there is nothing to keep in step with, and a second
ordering here would be a second author of what the picture is of.

Durable shape: none. The fold is read off `DeckPeek.grown`, which is already a per-frame read of a
population nothing stores (0204, 0212), and nothing about a picture is stored
([0131](0131-a-row-is-a-grating-and-the-picture-is-their-product.md)).
