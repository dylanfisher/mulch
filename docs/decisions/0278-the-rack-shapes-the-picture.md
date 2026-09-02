# 0278 — The rack shapes the picture: a lattice, a warp and a fold

- **Date:** 2026-09-02
- **Status:** accepted, amended by
  [0279](0279-a-look-is-declared-and-the-chain-draws-it.md) (the warp, the fold and the shatter
  become their entries' own declared looks; the lattice alone stays the rack's); taking three of the
  drift bench's eight under
  [0254](0254-the-bench-argues-the-card-fold-by-fold.md)'s rule; extending
  [0246](0246-the-fractal-is-a-row-and-not-a-mask.md) (the field's own geometries),
  [0266](0266-the-picture-travels-its-ink.md) (what a baked reading costs) and
  [0267](0267-the-rack-tail-blows-the-field.md) (a reading of the population rests on the field)

**Three of the eight are taken, together, and each lands where its motion is free.** The bench's
`built` lines said bake-side for all three; two of them are not, because the shot has to move
without snapping and a bake moves in eight stops.

**The lattice is a pattern, not a place.** One rounded cell is baked at its own size
(`latticeTile`, src/lib/moireLattice.ts) and laid over the whole field through the straight rows'
own pattern cache (`cutLattice`, src/ui/moireCanvasPattern.ts), so how tight it stands, how far it
has turned, how it leans and how it breathes are a matrix and cost a fill; only the rim's width is
baked, stepped off the ink's own travelled disperse so it walks the ladder the picture already
pays for. A picture-sized lattice tile turned per frame cannot cover a wide picture — the anchor
is inset, so the far corner is seven tiles away at the overlay and a hundred on the strip — and a
rotation baked in eight stops is an eleven-degree snap. It is a row the field owns (`latticeInto`,
beside `fractalInto`), present whenever anything unbypassed stands in the rack, and the third
geometry no effect may claim. Not taken: the bench's lens of the field inside each cell — a
repeating tile cannot vary per cell.

**The warp is a pass over the finished field, not a bake.** Warping the rows' product is warping
every row by the same warp, and the lens already draws the field back through sixty-four bands
each slid across; the warp's first sine is one more term on that slide, and its second is the same
thing down the columns of what the first pass left, through one surface between (`cutField`,
src/ui/moireCanvasField.ts). No bake, no key, straight rows warp too, and the phase is the sways'
own rate integrated (`shape.sway`), for the wind's reason: a knob moves the speed and never where
the bend has got to.

**The fold is a bake, about the row's own anchor.** Each automator standing is one mirror, folded
onto the folds before it — n automators are 2^n images, capped at four folds — applied to a curved
row's coordinate before it is cut (`foldPlane`, src/lib/moireFold.ts; `curvedField`). About the
anchor because the tile is zoomed about it per frame, and a seam anywhere else would slide. A fold
arriving is two folded pictures crossfaded and never a point slid toward its image, which lies on
the seam at the half. It rides its own eight-stop ladder, one bake a stop per curved row, which is
what 0266 costs an ink. Straight rows are not folded: re-dispatching them to the curved path
loses their octaves, chirp, angle and slide, and costs a picture-sized bake per row per stop.

**One reading, travelled.** How much rack is standing, how much of it is sway and how many
automators hold a run are read once when a set is built (`rackShape`, src/ui/moireShape.ts),
presence-weighted with bypassed entries in none of it; where the picture has got to is travelled
on the one rate and carried across a rebuilt set (`carryShape`), so an effect added tightens,
bends or folds the picture over seconds and never between two frames.
