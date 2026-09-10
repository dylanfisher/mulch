# 0342 — The strip is the field at a strip's size

- **Date:** 2026-09-10
- **Status:** accepted, standing on
  [0109](0109-the-drift-is-one-picture-at-two-sizes.md) as
  [0293](0293-the-picture-holds-its-pitch-when-the-window-grows.md) left it,
  [0338](0338-a-gust-is-a-lean-per-strip-of-the-fill.md),
  [0340](0340-the-screen-is-a-shade-and-not-a-window.md) and
  [0341](0341-the-cut-is-aimed-at-a-field.md)

**Nothing moves, and that is the result.** 0109 stands unamended by this step — it keeps the
narrowing 0338 already put on it, a gust that breaks its own tile leaning less on the bigger
canvas, which is a term read off `canvas.height` and not off `seen`: the strip and the overlay are
one picture at two sizes, each reading the scene at its own `seen` (src/lib/moireScene.ts) — the
canvas's own height — so the two share their window (`MOIRE_CYCLES`, a spacing against a reference
width since 0293 and no longer the canvas's own) and not their marks. The
amendment this step was opened to consider, that a strip read the scene at the overlay's `seen` so
the marks are the same marks at both sizes, is refused: the shots say the strip already reads as
the field it stands in, and one number in the terms is a second picture for the strip in all but
name (0070, 0139).

**A head is under a pixel and the field is still legible.** At 32 CSS pixels a bloom's head is
smaller than a device pixel, so the strip is not a small overlay: it is the field's ink at the
scale where a mark is a speck. That is enough. Six yards playing on one page read as four
different fields at a glance — bloom green shot with scarlet, water blue with pale blades leaning
through it, canopy a dark green with almost no light in it, meadow a warm cream — and no yard has
to be opened to tell which is which, which is what the strip is for.

**The shots, three fixtures, each read twice on each of three yards.** `./scripts/drive --shot`,
the 1:1 crop read beside the mean; the yards are Foxglove, Reed and Hazel past the Water Butt, one
per scene, on a four-a-second click train.

| fixture                                             | strip mean       | swing       |
| --------------------------------------------------- | ---------------- | ----------- |
| no rack — the yard loaded and stopped               | 0.350 every time | 0.044       |
| the click train playing, no rack                    | 0.524            | 0.048–0.055 |
| the rack of six, once the wind's travel has arrived | 0.749–0.756      | 0.035–0.058 |

Every pair agrees to the digit. The mean does not move with the scene, and it should not: what
the film and the cut spend is the rows' business and the scene is what stands under it. Two
readings need naming. **The rack of six has to be let settle**: read three seconds in, before
`SHAPE_SECS` has run out, the same fixture reads 0.68 — a lattice still tightening, not a
different picture. **And a starved frame loop reads exactly 0.350**, the at-rest picture: headless
Chromium drops the drift's cadence under six painting yards or an unlucky click-train run, so a
0.350 on a playing yard is the harness and not the app, and it is told apart by being the
no-rack number to the digit. 0340's own 0.350 is not one of those: it is a playing yard, but its
pair was taken on the headed dev server as well as here, and a headed run does not starve.
0341's 0.665 on the rack of six is this table's fixture read before the lattice had finished
tightening — the same 0.68 named above, a hundredth off — so the two numbers are one picture at
two moments and not a change.

**And the beat crawls, which a single frame cannot say on its own.** A stopped yard's strip is
the same picture every time: two runs of the no-rack fixture are identical to the pixel
(`magick compare -metric RMSE` of the two crops is 0). A playing yard's never is: two runs of the
click train at the same elapsed second differ by 0.23 RMSE and two of the rack of six by 0.14,
which is the picture travelling and the shot catching it wherever it has got to. What the crops
prove is the band and its bars; that the bars move is this pair of comparisons, and how they move
is 0341's.

**A bare yard is a lighter picture, and that is 0341's known cost showing.** At no rack the strip
is 0.350 against the rack of six's 0.750, and at the crop the difference is the width of the
white bars the rows cut: a pair and a trio saturate under a floor of a tenth and leave a quarter
and an eighth of the ink as window. The field's colour still reads between them at every count,
so the strip says which field the yard stands in whether the rack is empty or full — it says less
about the weight of the picture, which is the direction 0341 chose.
