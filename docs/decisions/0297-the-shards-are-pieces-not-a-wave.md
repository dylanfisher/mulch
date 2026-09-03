# 0297 — The shards are pieces, not a wave

- **Date:** 2026-09-03
- **Status:** accepted, amending [0296](0296-the-automator-shards-the-picture.md)

0296 threw every slice by a cosine of the raw escape count over sixteen cycles. Down the centre
column of an open picture the count climbs a handful of cycles, so the sixty-four slices sat on one
flank of one wave and moved by nearly what their neighbours moved: the whole picture bent once by
under a tenth of its height, and a periodic weave bent smoothly is the same weave. A tear is how much
_neighbours_ differ, not how far anything moves.

**The count is cut into pieces and every piece is thrown by an unrelated amount.** `throwOf`
(src/lib/moireShards.ts) floors the count into pieces `SHARD_STEP` cycles wide and turns the cosine
by the golden ratio's conjugate a piece (`SHARD_SCATTER`), so contiguous slices in one piece stand
together and the seam between two pieces is a jump of up to two reaches. `SHARD_REACH` is 0.15 of
the height, and `SHARD_CEILING` is derived as three reaches rather than stated twice. `SHARD_TURN`
went back to the bench as `STRUCTURE_TURN`, which is the only thing that still reads it.

**Shot on the strip of a click-train yard**, interleaved none/one/two twice through
`./scripts/drive --dev --shot`: no automator reads a mean ink of 0.225 both times at a swing of 0.029;
one 0.316 and 0.317 at 0.034 and 0.040; two 0.328 both times at 0.035 and 0.026. The 1:1 crop at one
automator is the vertical bars of the yard cut into columns standing at different heights with hard
edges between, and the rows broken into stretches laid at different offsets; at two the pieces are
finer and cross. Fails on 0296's throw at the first test in src/lib/moireShards.test.ts.
