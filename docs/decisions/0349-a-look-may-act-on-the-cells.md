# 0349 — A look may act on the cells

- **Date:** 2026-09-10
- **Status:** accepted, standing on [0345](0345-the-picture-is-a-lattice-of-marks.md),
  [0346](0346-the-lattice-stands-still.md) and [0348](0348-the-field-is-mostly-ground.md), and
  landing the second of the eight the marks bench drew
  ([0347](0347-the-marks-bench-is-its-own-route.md))

Until now a rack reached the picture only through the cut: a field pass draws the finished field,
and the lattice of marks under it was the same lattice whatever stood in the rack. **A look may now
also act on the marks themselves**, and the two are one declaration on one entry — the cell pass is
what the marks show and the field pass is what the cut shows.

**The contract is one function over the cell grid.** `CellPass` in `src/lib/moireCells.ts` reads
the marks as they stand and raises them into a copy: two grids and not one, so every cell a pass
reads is the picture it is a pass _of_. `runCellPasses` runs the standing ones in the rack's own
order, each off what the one before it left, and makes no scratch grid at all where none stands.
A pass writes a mark and never a pixel, reads no frame and no clock, and never lightens a cell.

**A pass is declared on its look and reads the look's own terms.** `cells` on the entry in
`src/lib/moireLook.ts` — `cellBloom` on the bloom, `cellEchoes` on the echoes through `withCells`,
because a look declared in a file of its own cannot import its own cell pass back without the two
files importing each other. `CELL_TERMS` names the terms any pass may read, and every one of them
is a term some entry already declares into its look through `lookFrom`.

**A pass is part of what a tile is _of_, and every term of it is stepped.** `rackCells` and
`cellsKey` (`src/ui/moireCells.ts`) read the standing looks once a painting and round presence and
terms onto the ladder the ink's own terms already walk, so a knob turned is a rebake and a knob
held is not — and a rack declaring no pass writes nothing into the key, which keeps the resting
yard on the tile it was already holding, byte for byte.

**Reach is counted in whole cells, and bounded by the row the tile actually is.** A tile is one
beat cell wide and so `pitch + 1` cells across — six on a 1× display (0346) — and the grid wraps,
so a ladder longer than the row writes its last rungs back onto the cells it came from and a halo
wider than the row puts every cell inside every other cell's halo. The echoes read their step off
`echoSpacing` across the grid's own `cols`, so the Time knob is one declaration moving both draws,
and the rungs are capped at what the row holds; the bloom's reach is a band of its own
(`BLOOM_CELLS`) because `bloomScale` is the working size a blur is _drawn_ at and turning it into
cells would need the cell's size in device pixels — a halo that changed with the display is what
0346 took out — and it is capped so a row always keeps a cell of page in it.

**Presence is in the count of rungs and not in an alpha.** A field pass carries its travel in the
ladder's alpha (0294); a mark has no alpha to carry it, so a delay arriving is its ladder growing a
rung at a time and a reverb arriving is its halo growing a cell at a time — each step one rebake of
a tile held under the step it grew at.

**The grid is baked beside the tile.** `cellGrid` in `src/ui/moireScreenCells.ts` holds the box
read, the cut into marks and the passes; `src/ui/moireScreenTile.ts` stood at the 800-line cap, so
what moved is a whole reading and never half of one (0045). The ink is still read at the cell's own
stand, before the cut: a pass moves which mark a cell is written in and not one stop of the colour
underneath it (0348).

The bench's entries 03 and 04 are deleted with this, as 0247 says.
