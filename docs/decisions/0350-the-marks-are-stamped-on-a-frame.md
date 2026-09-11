# 0350 — The marks are stamped on a frame

- **Date:** 2026-09-10
- **Status:** accepted, standing on [0131](0131-a-row-is-a-grating-and-the-picture-is-their-product.md),
  [0346](0346-the-lattice-stands-still.md) and [0129](0129-a-beat-is-drawn-because-nothing-else-will-draw-it.md), and landing
  the third of the eight the marks bench drew
  ([0347](0347-the-marks-bench-is-its-own-route.md))

The sound reached the picture as a hole: every grating is cut out of the ink already laid down, so a
row going by on the strip was a run of holes through a lattice of whole marks. **The same reading is
now also stamped back over the picture as marks**, in the lattice's own alphabet — the bench's entry
08, landed frame-side where the cut is.

**One machine, `stampMarks` in `src/ui/moireCanvasMarks.ts`, and ten fills a frame.** The boxed
field is the product one pixel a cell, the mean the gratings leave over each (0346). It is read
through one threshold pass per mark: the pass's band is the read taken down to the band's own floor
and back up sixteen-fold, folded twice into a step, and the bands already stamped cut out of it — so
the bands are disjoint, a cell is written in one mark and never in two, and the whole pass is canvas
composites rather than a loop over pixels — three picture-sized ones a mark, which is what a fill a
mark actually costs. Each band is blown back up onto whole cells unsmoothed
and filled through that mark's own pattern. **A fill a mark, whatever the cell count**: a
`drawImage` per cell and a per-frame `getImageData` are what this shape refuses (0129).

**Read without the wrap.** The lattice under it reads a wrapped ramp, so its ground and its peaks
are both sparse marks (0345). The stamp must not: the first band starts at nought and its mark is
the one that carries no ink, so a cell the rows leave quiet writes nothing and silence is not drawn
as the mark a ground is drawn in.

**Over the picture, never cut out of it.** The `destination-out` cut stays — the picture is still
the rows' product (0131) — and the stamp is laid after it, in the picture's own ink and under the
band the tint washes over it, at a depth `cells.rows` resting at a half. What it adds is the rows as
marks where the product is strong, which is where the cut left holes.

**Read where the box is made, stamped where the cut is laid.** `readMarks` runs beside `boxField`
and mints the surfaces and the marks' tiles; `stampMarks` runs after `cutField` and asks for the
patterns. Two calls and not one, because the surfaces a painting mints have to be the same surfaces
whatever the rack is doing — a pass's own surface is where its case looks for it — and because the
patterns must be asked for after the picture's own two, so a stamp the engine will not serve cannot
starve the rows' grating or the screen. It is asked for before the band the tint washes over the
picture, which it has to be: the stamp is laid under that band. A painting handed fewer patterns
than it asks for stamps nothing at all, the way a picture whose lattice cell is still baking draws
no lattice (0144).

**The read is taken over the boxed span and never the field's own.** The box lays its blocks out to
`wide · cell`, which overhangs a picture whose width is not a whole number of cells — every canvas
whose width is not a multiple of the pitch, which is most of them. Read over the field's width the
stamp samples each cell a little to the left of where it stands, a whole cell out by the far edge,
and the marks drift off the lattice they are a picture of. `boxCells` holds the count; the source
span is what holds the grid.

The cell count the box writes and the stamp reads is one declaration, `boxCells`, and the marks'
bit grid is read back through `markCoverage` rather than copied (`GLYPH_GRID`). The bench's entry
08 is deleted with this, as 0247 says.
