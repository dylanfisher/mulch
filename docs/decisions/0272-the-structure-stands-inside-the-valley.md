# 0272 — The structure stands inside the valley

- **Date:** 2026-09-01
- **Status:** accepted, amending
  [0246](0246-the-fractal-is-a-row-and-not-a-mask.md) and
  [0268](0268-the-structure-opens-into-a-lattice-the-picture-is-inside.md)

A shot of the zoomed picture, on a yard running an automator, showed a uniform fine weave with a
few broad faint arcs bending it. Two complaints, and one cause.

**The picture stood outside the boundary, not on it.** `FRACTAL_SPAN` was 0.35 and a curved row's
coordinates run to about two at the corners, so the frame was most of a unit across — the whole left
bulb of the set and the open plane around it. 0246 chose the seahorse valley for the centre because
that is the one place the escape field has structure at every scale; the span then held the picture
so far back that the valley was a few pixels of it. What a grating cut along an escape count reads
as out in the open plane is a handful of smooth nested contours, which is exactly what the shot
showed. The span is now 0.04 — a sixteenth of a unit across, inside the notch itself.

**And that is also why a turnover was invisible.** `FRACTAL_WANDER` is how far a population's own
fold may carry the centre. Against a frame 1.4 units wide, the whole band moved the picture a
sixtieth of its own width — there was nothing wrong with the travel, and nothing anyone could see at
the end of it. Against a frame a fourteenth of a unit wide the same band moves it more than half a
width, so a run standing somewhere else stands somewhere visibly else.

It is **narrowed** to two hundredths rather than widened, and that is measured: the band is square
and the valley is not. Rendered at each of the band's four corners, three hundredths walks the far
corner off the boundary and draws the smooth open plane; two leaves half the frame standing in
structure at the worst of them. The depth is what buys the visibility, not the band.

**The iteration count is what limits the detail now.** 48 was measured with the whole set in frame,
where the filigree along the boundary was finer than the lattice drawn over it. Inside the valley
that same filigree is a hundred times wider on the picture, and at 48 the boundary is a smooth edge
because every point near it is still counted as never leaving. 120 is where the structure resolves
at the scale it is now drawn. It is paid once per pixel of a picture-sized tile, at most one tile a
painting, off the main thread (src/workers/drift.ts).

Measured, on the same yard running the same automator: the strip's swing across blocks wide enough
to show slow structure went from 0.051 to 0.124 at an unchanged mean ink (0.356 to 0.335) — two and
a half times the large-scale organization for the same weight of picture. The frame p95 does not
move: the tile is baked off the main thread.

Refused: a third copy of the structure, and more scales for the fractal rows. Both were on the table
for "too subtle", and both cost a picture-sized bake. Depth was the cheaper reading of the same
complaint, and it should be measured before anything is spent on more of them.
