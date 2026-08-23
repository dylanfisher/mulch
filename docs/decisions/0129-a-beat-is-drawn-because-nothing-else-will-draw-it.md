# 0129 — A beat is drawn, because nothing else will draw it

- **Date:** 2026-08-22
- **Status:** accepted, amended by
  [0131](0131-a-row-is-a-grating-and-the-picture-is-their-product.md)

> **Amended.** The second dead end below — two gratings multiplied bury their own beat — was
> conditional on a picture having to survive underneath them, and it says so. Once the gratings
> _are_ the picture (0131) the condition lifts: the beat is plainly there, and it is the depth that
> is solved for rather than the beat that is drawn. The first dead end stands unchanged, and this
> file's own tile is still written a pixel at a time for exactly the reason given here.

The lattice of blobs in the reference is a beat: a monitor's grid sampled by a camera's, a hair
off it, leaving a term far slower than either. `src/ui/moireScreen.ts` draws that term outright,
per pixel, into a tile a whole beat cell wide. Two cheaper things were tried first and both are
dead ends, which is the whole of this decision.

**A rotated repeating pattern does not beat.** The obvious lever — turn the tile a degree or two
and let the rasterizer's undersampling make the moiré, as an optical one would — produces nothing.
Measured in headless Chromium at 0.002, 0.006, 0.015, 0.03, 0.06 and 0.12 turns on the same
6-pixel lattice: six clean rotated grids and not one blob at any angle. A `CanvasPattern`'s
transform is filtered rather than aliased, so it never undersamples and so it never beats. No angle
fixes this; it is not a matter of degree.

**Two gratings multiplied bury their own beat.** The slow term of `cos a · cos b` arrives scaled by
the square of the gratings' depth, so at any depth shallow enough to leave a picture underneath the
beat is invisible, and at a depth that shows it there is no picture left. The physics is right and
the arithmetic is against it.

So the beat is its own term, at its own declared depth, over the cell `beatPx` gives — the span the
two grids come back into step across, which is what makes the tile repeat without a seam. It is the
same beat, drawn at a depth that can be seen.

**The pass over the pixels is the rebuild's, never a frame's.** It runs when the colour, the height
or the display's density moves — measured at about 5ms for the overlay's tile — and a frame after
it still costs one `fillStyle` at about 0.2ms, which is what
[0126](0126-the-screen-rides-the-pictures-own-phase.md) promised and
[0070](0070-a-per-frame-read-refills-and-never-clears.md) requires. A beat recomputed per frame
would be a second loop over the pixels every frame, which the one moiré window has no churn for.
That is also why the tile is only a beat cell wide rather than a canvas: the cell is the smallest
thing that holds a whole blob, and every motion the screen has is a matrix on it.
