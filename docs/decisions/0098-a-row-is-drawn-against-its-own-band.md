# 0098 — A row is drawn against the band it gets, and a rack instance is one

> **Superseded in part by [0131](0131-a-row-is-a-grating-and-the-picture-is-their-product.md).**
> No row is drawn against a band any longer: a row is one grating across the whole picture, so
> there is no band for a proportion to be read against and no ribbon to keep off its neighbours.
> What survives is this decision's second half, and it survives intact — an effect is drawn whether
> or not anything is automating it, a row nothing automates runs on the deck's own clock, and one
> density is still never one per row. What replaces the first half is a pitch band: 0131 says why
> the bound that could only decline a tightening had to become one that sets the pitch outright.

The drift picture's proportions are **read against the band a row is given in device pixels**, not
fixed. `rowDensity(bandPx)` is one at the band the constants were chosen at and rises below it,
bounded at both ends; the pitch `rowInk` draws at, how far a crest reaches out of its band
(`rowSpread`) and how much ink a row spends (`rowAlpha`) all pass through it. A folded-down strip is
therefore a denser moiré rather than a coarser one — at a fixed pitch the crests end up wider than
the band they beat against and the row reads as a run of blobs, which is the one thing this picture
must not do (0080).

**The band is read in CSS pixels and the pixels have the last word.** How wide a crest is against
its band is a proportion, so it is read off the element and not off the backing store, which is
sized to the display: otherwise one yard is three pictures on three screens and re-pitches itself
under a browser zoom. What is a pixel fact is the ceiling — `affordableDensity` lets the fastest
row in the picture decline a tightening that would put a cycle under a few samples wide, and it can
only decline, never make the picture coarser than the pitch the rows already had.

**One density for the whole picture, never one per row.** A fringe is the ratio between two rows,
so a density applied to some rows and not others would be a different picture rather than a
tighter one. `paintMoire` reads it once, off `height / rows.length`, and hands the same number to
every row. A row's own offset — its identity, folded from its parameter — is left where it is: the
density multiplies the pitch and nothing else.

**An effect is drawn whether or not anything is automating it.** Every instance in the rack
contributes a row, its period and its waveform folded out of its own durable id the way its name
already is (0076) — one fold, the remainder picking the waveform and the quotient the period, so
two instances of one effect are two rows that beat against each other. A lane on that effect goes
on drawing the row it already draws; the instance's row is beside it, not instead of it. So a yard
holding a rack and no lanes has a picture, and the estimate beside it counts the rack in.

**A row nothing automates runs on the deck's own clock.** `moireRows` returns the rows and, beside
them, where each one's phase is read from: a lane's key, or null. A null is the deck's position
since the top of its loop, wrapped — which is what the reference row already did, and is now the
one rule both it and a rack instance's row follow.

**What it costs.** Nothing measurable per frame: frame mean and p95 are unmoved, because the same
one painter does the same one pass and reads its density once. What it does cost is a row per
instance — a picture where a rack and no lanes had none, and one more ribbon on a picture that
already existed — which is the feature and not an overhead.
