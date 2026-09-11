# 0353 — The stamp runs on the marks' bit grid, and reaches the picture once

2026-09-11. Checkpoint A of the block that plays the lattice (docs/plan.md §1).

## What was measured

The budget's setting: the picture popped out (0138) into a real window of 2560 × 1440 CSS pixels
at two device pixels each — a canvas 5120 × 2684 — a full rack on two yards, a walk playing,
headed Chromium on a real GPU, base (`2f18077`, the commit that opened the block) and head
interleaved three times each over eight-second windows.

**Base paints it. Head, as steps 1–5 left it, does not paint it at all.** On head the opener's
one frame loop (src/ui/frame.ts) stopped on the frame the window opened: no `requestAnimationFrame`
callback ran again, the popped window's renderer stopped answering, and a knob drag on the page
underneath landed 0 of 480 moves in forty seconds. Base over the same window: 120 frames a
second, rAF gap p95 9.8 ms, no long task, and the drag's 480 moves dropping no frame.

Turning `cells.rows` to nought — the one dial that takes `stampMarks` (0350) out of the frame —
made head paint exactly like base. The stamp is the whole of it. Inside the stamp, running the ten
passes with the mark's repeating-pattern fill swapped for a flat colour also made head paint:
**ten `CanvasPattern` fills a frame over a surface the picture's size is the cost**, not the
surface, not the pass count, and not the pixel traffic.

## What this decides

Two things, and neither is a governor.

**The passes run on the marks' own bit grid, and the picture is drawn once.** A pass says nothing
finer than one bit of a mark's `GLYPH_GRID`, so it is run at a pixel a bit — `bitPx` pixels a cell,
a quarter of the picture's area at two device pixels, the picture's own size at one, and never
larger, so the one blow-up at the end is a blow-up and never a decimation on a page zoomed out. The
ten passes are laid together in one `layer` on that grid, which goes onto the picture in a single
draw, and **the depth is spent on the way in rather than on the way out**: two bands share a
shoulder (`STAMP_STEPS`), so a cell there carries a share of two marks, and folding those two
together at full ink before the one draw would lay less on the bits both marks ink than ten draws
at `CELL_ROWS` did. Laid pass by pass at `CELL_ROWS` and drawn whole, the ink is the ink 0350 put
down, to the bit. Where a cell is a whole number of bits the blow-up is exact.
`STAMP_PICTURE_DRAWS` is one, and it is a declared constant the recorder counts against — under,
not equal to, with the constant pinned in one place — because a pass added at the picture's size is
what no hand feels until the window is large.

**A mark is a sheet of its own tile, doubled, and never a repeating pattern.** `sheetOf` lays the
mark's `bitPx` square at the corner and doubles the surface onto itself, across and then down:
about two of its own areas in the logarithm of its width in plain blits. The stamp asks the engine
for no pattern at all now, so the tile is keyed on the mark and the ink alone and the cell is no
longer part of what tells two of them apart.

## What it bought, and what still stands over the budget

Head at the same setting now paints: 86–88 frames a second, the drag's 480 moves all landing, the
popped window answering. The stamp itself costs 1.2 ms mean a frame.

It is still over the budget, and the cause is the tile bake, not the stamp: **36–38 ms mean and
83–98 ms worst**, against 4 ms and 8 ms. That is 0351's tile at seven of the cells it was, with
0349's passes and 0352's scatter baked into the same pixel loop. Every one of the 14–18 bakes in an
eight-second window is a long task, and they are the whole of the rAF p95 of 25–33 ms, the six to
fourteen gaps over 50 ms, and the 63–90 frames a drag drops. Checkpoint B owns it; §4 of the plan
says what it is qualified for.

## What this is not

Not a fix judged on headless timings: the CDP Profiler cannot be used at this setting at all —
`Profiler.start` wedges the renderer with the picture up — so the attribution is per-function
accumulators in the page, base and head instrumented identically and removed before the gate,
beside a `longtask` observer and a rAF-gap histogram. Not a governor: nothing here paints fewer
frames or at a lower resolution than it did. And not a change to what the picture says — the same
ten bands in the same alphabet at the same depth, on the same bits.
