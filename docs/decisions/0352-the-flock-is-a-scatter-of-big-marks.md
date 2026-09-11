# 0352 — The flock is a scatter of big marks

- **Date:** 2026-09-10
- **Status:** accepted, standing on [0345](0345-the-picture-is-a-lattice-of-marks.md),
  [0336](0336-the-air-falls-and-the-detail-is-the-bright-points.md) and
  [0335](0335-a-place-is-a-reach-and-a-shadow.md), and landing the fifth of the eight the marks
  bench drew ([0347](0347-the-marks-bench-is-its-own-route.md))

A yard whose name ends on a creature or an object puts bright points in the body's third channel —
a flock of the scene's own specks, or the one kept thing — and **a speck is smaller than a mark**.
Read into the lattice it is lost: a cell's read is the mean of its box, and one point a tenth of its
own cell wide moves that mean by a fortieth, which is nought marks. Read at its brightest instead it
is a blanket, which is why `cellGrid` reads the mean (0345).

**So the specks get a layer of their own, at nine cells to a mark**: `scatterLattice` in
`src/ui/moireScreenScatter.ts` reads the third channel a block of three-by-three cells at a time,
cuts that read into the same ten marks **without the wrap**, and unions the coverage into the tile's
alpha beside the second lattice. Without the wrap because the wrap is what makes a field's ground
and its peaks share a mark (0345): a layer that is only ever its peaks wants the plain ladder, so a
peak is a block and a shoulder a dot. In the picture's own ink and never a colour of its own — one
picture in one ink, so a pixel under two lattices is as solid as the solider and no solider.

**The threshold is the specks' own spread, not a dial.** A block of nine cells holding a whole flock
still stands about a hundredth of the way up the ramp, so a read taken against the ramp is the blank
mark everywhere. The read is taken between the channel's own mean over the tile and its own most: a
block where the flock is thickest is the block mark, a block no thicker than the flock's average
inks nothing, and a channel flat across the tile — a flock with no flock in it — draws none of this
at all. That is the one number a dial would have set, and the yard's detail already says it. The
marks bench's own entry spent a dial on keeping the scatter sparse and the same dial on keeping it
from being seen; this spends none.

**A kept thing is one big mark, and that is the same reading.** Where the yard's detail names an
object rather than a creature the channel is `standSpeck` — one hard-edged disc and nought
everywhere else — so one block stands at the channel's most and every other clamps to the mark that
inks nothing. The picture is one solid block where the thing stands, which is a block three cells
wide standing in for an object a few pixels across: the layer says _there is one of it, there_, in
the alphabet the rest of the picture is written in, and the thing's own size was never what the
lattice could say.

**The layer is the detail's and nothing else's.** Where the yard is read for a scene's own specks
the channel is nought and no grid is baked, so that picture is exactly the tile 0351 shipped, down
to the byte. Off the ground channel it would be a coarse halftone of the whole field, which is a
second picture rather than a layer over this one, and that is refused. It moves per bake and never
per frame (0129): the lattice still stands still.

The coarse cell is the fine cell's stride times the span, snapped by the snap the tile comes round
on (`sceneRepeat`, `sceneCells`) — the tile is a repeating pattern, and a coarse cell that did not
come round at its edge would step by a fraction of itself at every join. Where a tile's cell count
is not a multiple of three the coarse cell is three cells within that rounding, which is the same
licence the fine cell's own pitch is held to: a tile is a pitch plus one cells across, so a 1x
display's six cells are two blocks of three exactly and a 2x display's eleven are four blocks of two
and three quarters. **The tile is not grown for this.** Growing it to a multiple of the span would
be 0351's sevenfold bake paid a second time, for a layer only a yard with a detail draws at all.
