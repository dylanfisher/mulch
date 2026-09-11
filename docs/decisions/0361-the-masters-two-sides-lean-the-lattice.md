# 0361 — The master's two sides lean the lattice

**2026-09-11.** `MasterPeek.left` and `right` reached no moiré file: the picture read the output's
level, its tilt, its flatness and its edge, and knew nothing about where its weight was. They reach
it now as one signed reading — the gap between the two channels, toward the left — and that reading
is spent in two places and no others: the half of the picture the sound is louder on is stamped one
mark denser, and the screen's crawl leans that way.

**The reading is the gap and never a ratio.** `heardSides` (src/lib/moireSound.ts) is the two peaks
subtracted and bounded to a whole one either way, which is twice each side's own level over the mean
of the pair. A ratio would say the same thing about a whisper panned hard as about a mix panned
hard, and would say nothing at all about silence; the gap says how much weight is on one side, so a
quiet pan moves the picture a little and a loud one moves it all the way.

**It rides on `MoireShape`, beside the lean and the loudness.** Those are already readings of the
same output travelled on the same short window (`SHAPE_HEARD_SECS`), carried across a rebuilt set by
the one `carryShape`, and reaching the painter through the one `shape` the painting is already
handed. A second field on the set, a second carry and a second parameter down the paint path would
be three declarations of one frame's reading (principle 1, 0213). It travels across the whole span
of the pair, so a pan crossing from one side to the other takes the window a hit takes to thicken
the gutter.

**The lift is on the boxed read, the way a landing's is.** One `lighter` fillRect of `bandFloor(1)`
at the gap, over the louder half of the read, before a band is cut out of it — the same surface, the
same arithmetic and the same place in the frame as `liftPushes` (0355). So the ten threshold passes
see that half one mark higher, no pass is added, nothing picture-sized is drawn, no tile is keyed by
any of it and no bake is asked for: `STAMP_PICTURE_DRAWS` is untouched (0353, 0354, checkpoint B's
own boolean at 0358).

**The louder half and never both, and an odd middle column stands on neither.** A `lighter` fill only
adds, and each side's level over the mean is one fact signed two ways, so lifting the louder half by
the whole gap says it once. The halves are `floor(wide / 2)` cells each: a cell the two shared would
be lifted whichever way the output leaned, which is a column that never answers the pan, and a
picture one cell wide has no sides to lean between.

**The crawl leans three cells and no dial was minted.** The crawl is the one travel the lattice makes
across the picture, and the lean is a term on its transform in whole cells of the marks — so the
lattice still lands on whole cells (0346), and touching no field of the tile's key, so a mix panned
all day bakes nothing (0129). Three cells: one is inside the swing the crawl already has and would
not read as a side at all, and a few marks is far enough to follow across a sweeping pan while still
being the same picture leaning. No dial, because the lift has none either — what the pair is worth is
one number in each place it is spent, and a knob for each would be two knobs for one reading.

**And the cell is rounded where the reading is travelled, not where the crawl spends it, because the
reading is not monotone.** Every other term in that translation is: a phase read off the deck's
position, and an integral of the rack's tail. Each crosses a cell's edge once and steps forward. The
two sides are unsmoothed instantaneous peaks, so the weight they read wobbles frame to frame on a
steady mix — rounded at the spend, a mix sitting near a cell's edge would hop the whole lattice a
cell and back on alternate frames, which is precisely the still lattice moving. So `MoireShape`
carries the lean as its own whole number beside the continuous weight (`leanCells`,
src/ui/moireShape.ts): the cell it holds changes only once the weight stands `SIDES_HOLD` past it,
which is three fifths of a cell — over twice the furthest one painting's travel can carry the reading
at `SHAPE_HEARD_SECS`, so no wobble can flip it and a pan that really moves still steps at every cell
it passes. The lift needs none of this: an alpha is continuous, and a wobble there is a wobble and
not a hop.
