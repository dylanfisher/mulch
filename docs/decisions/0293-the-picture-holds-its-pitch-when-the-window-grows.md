# 0293 — The picture holds its pitch when the window grows

- **Date:** 2026-09-02
- **Status:** accepted, amending
  [0109](0109-the-drift-is-one-picture-at-two-sizes.md) (one window at two sizes now means one
  _spacing_ at two sizes) and
  [0278](0278-the-rack-shapes-the-picture.md) (the lattice's cell is a size, and what the rack
  says is how much tighter than it)

**A cell is a size in CSS pixels, and the rack says how much tighter than that it stands.**
`LATTICE_CELL_PX` is declared beside `PITCH_PX`, in the module that owns the band
(src/lib/moireGrating.ts), and is four of it — so the loosest lattice is a cell about the strip's
own height and the tightest is a cell of the pitch itself. `latticeCells` is now the
presence-weighted _tightening ratio_ over that rest rather than a count per height, and `aimLattice`
scales the baked cell to `LATTICE_CELL_PX · dpr` over it. A cell that was a share of the height drew
a thirty-two-pixel box on the strip and a three-hundred-and-fifty-pixel one on a window fourteen
hundred tall: the same rack read as two different pictures, and the popped-out one read as blocks
rather than as a lattice.

**A row's spread is read against one reference width, not against the canvas.** The window still
carries a row's period into its spacing, and the order is untouched — a row that comes round often
is still drawn finer than a slow one — but the width the spread is measured across is
`PITCH_WIDTH_PX` (720) and never the device width. Carried across the canvas, a picture twice as
wide spread every row twice as far and pushed the slow ones onto the band's ceiling, where they all
stand at one spacing and stop fringing against each other (0131's argument for the band is exactly
this). Measured: three rack rows at 0.75s, 2.4s and 12s across a two-second loop's window drew 13.3,
17.7 and 26.5 device pixels at 720×480 and 15.3, 20.5 and 28.0 — the last of them clamped — at
1280×1400; they now draw 13.3, 17.7 and 26.5 at both.

**The reference width is not a claim about anyone's window.** It is the width the band was tuned at
— near enough what a yard's strip stands at, and the popout's own narrower size — so it is the one
number that says how coarse the picture is drawn, in the module that already owns how fine. The
canvas's own width is still read, and says only that there is a canvas to draw on.

**What this does not fix: a long reference still pins short rows to the floor.** The window is
`MOIRE_CYCLES` of the loop, or of the whole file where there is no loop (0292), so a three-minute
file draws its 0.75s and 3s rack rows at the band's floor whatever width they are drawn across. That
is the window's number and not the width's, and nothing here bends it.
