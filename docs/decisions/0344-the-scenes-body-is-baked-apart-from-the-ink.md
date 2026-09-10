# 0344 — The scene's body is baked apart from the ink

**2026-09-10.** Standing on [0129](0129-a-beat-is-drawn-because-nothing-else-will-draw-it.md) (the
pixel loop runs on a rebuild and never on a frame) and on
[0266](0266-the-picture-travels-its-ink.md) (the ink walks its ladders one stop at a
time). The two together put the loop on the frame after all: the hue, the fringe, the dispersion
and the saturation all travel while a yard sounds, every step of any of them is a new tile, and a
tile was the whole of the scene's maths — the ground, the shade, the streaks — run again at every
pixel. Measured on a playing rack of two yards, headed, on a real GPU: twenty-six bakes in eight
seconds at twenty-two milliseconds mean and forty-six worst, four long tasks, eight frames over
fifty milliseconds. That is the jank a hand feels, and none of it was the ink.

So `build` (src/ui/moireScreenTile.ts) reads two things it did not make: the scene's **body** —
where each pixel stands on the ramp, how far the shade and the film pull it back, how bright a point
stands there — baked once per what the scene is of and keyed by nothing the ink moves; and one
beat **cell** of the three channels' lattices, which repeat with the cell by construction. A tile is
the body read along the ramp through the ink and split across the cell, and nothing heavier. The
same rack again: nineteen bakes at under two milliseconds mean and three and a half worst, no long
task, one frame over fifty.

**The constraint:** a scene's ground, shade and specks may read the yard, the size and the tunings
and never the ink. A ground that read the hue would be baked once and stale at every step after,
with nothing to say so. What the ink does to a pixel is done in `build`, on the body, and nowhere
else.
