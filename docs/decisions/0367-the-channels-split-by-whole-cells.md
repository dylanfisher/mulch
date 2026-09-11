# 0367 — The channels split by whole cells

A pop's saturation stands the three channels **a whole cell of the marks apart**, and no longer a
third of a cell onto its own subpixel. `channelMix` (src/lib/moireScreenFilm.ts) keeps its knob and
what it moves is now an offset in cells, rounded: nought at rest and `CHANNEL_MIX_FULL`, one cell,
at a full saturation. In the pixel loop (`bands`, src/lib/moireScreenField.ts) the red of a pixel is
the mark standing a cell to its right and the blue the mark a cell to its left, each written in the
ink its own cell was cut to — so the red lattice stands a cell **left** of the green's, the blue a
cell right of it, and what a saturated picture grows is a coloured ghost of the lattice either side.
The lit channel is a mark and never a stroke.

The subpixel split is gone with it. It rested at nought since 0346 — a mark's stroke is a device
pixel and a cell's third is under two, so every stroke took a different channel and the zoomed
drift read as a rainbow grille — and with the saturation moved onto the cells there was nothing
left to push it: `channelGain`, `channelAt`, `FLAT_GAIN` and the `gains` field of a `ScreenBake`
were a term every tile multiplied by one. 0130's fringe survives where it was always visible, on
the three channels' own blob lattices (`channelFringe`, `CHANNEL_LAG`), and 0366's note about the
gains standing between a pixel and its stop is answered rather than kept: nothing multiplies a
channel per pixel now but that fringe. The three tokens stay in `src/ui/tokens.css` as the names of
the channels; no code reads them for a gain.

A pixel carries one alpha, so the ghosts are written by scaling: the pixel is covered wherever any
of the marks standing there does — the three of this lattice, and whichever of the rack's second
lattice and the specks' scatter is here — and each channel carries the ink of whichever of them
stands solidest in it, at its own share of that union. Where all three stand the ink is the cell's
own; where only one does the pixel is a ghost of that channel; and where the other two lattices are
what covers, all three channels carry the cell's own ink exactly as they do at rest, because those
two are not split. The cost is the background showing through a ghost pixel less in the two blank
channels than it would if each channel had an alpha of its own — a ghost is a dimmed page with one
channel of ink on it, which is what a single-alpha raster can say. The union is also more of the
page: a full split lights 8194 pixels of the case's own tile against 7152 at rest, 15% more, for
the same ink within 0.02%.

Two whole cells apart is one cell either side, so a lattice two cells across folds the two ghosts
onto one cell and shows one magenta neighbour instead of two. Nothing ships that narrow — a tile is
a beat cell wide and a beat cell is many marks — and the split has nowhere narrower to go.

It is two more reads of the coverage a pixel, and **only while a pop is standing**: at rest the
branch is the one line it always was and the two arrays of shifted columns are not built at all, so
the bake the budget is already over pays nothing for this until a saturation asks (0354, 0365). The
tile's key carries the split in cells rather than the saturation that chose it, so a pop easing in
walks nine rungs of the ink's own ladder and rebakes at exactly one of them — the other eight would
have baked the tile already standing.

The queued hand is read off the cell a mark comes from and not off the pixel it lands on, so a
split still writes the armed alphabet on one cell column and no more (0356, 0363).

The split reaches the lattice of marks and neither the rack's second lattice nor the specks'
scatter: those two stand on cells of their own, and a whole cell of _this_ lattice is not a whole
cell of theirs.
