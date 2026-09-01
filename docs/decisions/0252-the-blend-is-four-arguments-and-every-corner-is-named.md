# 0252 — The blend is four arguments, and every corner is named

- **Date:** 2026-09-01
- **Status:** accepted, extending [0247](0247-a-sketch-is-drawn-in-the-real-tokens-and-thrown-away.md)

**Every corner draws its own name, inside its own picture.** The cast pad used to list the six in a
row underneath the SVG in declaration order, so reading which corner was `stutter` meant counting
round from the top and matching by index. A pad whose corners are unlabelled cannot be asked the one
question it exists to answer — can a hand find the character it wants — so the names are `<text>` at
the corners, at `type-readout`, with the weight beside each, and there is no legend anywhere. The
triangle names the three it does not mount as well, at nought, because what it trades is exactly
which three are reachable.

**One blend was presented as though it were the argument.** Inverse-square weights on a hexagon is
one mechanism; "the cast is a place" is the claim. Four blends of one cast now sit side by side
under one readout — hexagon, barycentric triangle, six levers, wheel — so what is compared is the
weighting and not the wallpaper. Each writes the same six numbers, the readout shows whichever a
hand moved last, and each says its own trade under itself. The entry in `SketchPage.tsx` argues for
the family; the per-blend trade lives with the picture that pays it.

**The names come before the geometry.** The pad's box spills 52 units past the square on each side
(`SPILL`, `sketchBlendPad.tsx`) so a name never runs off the edge of its own picture, and the
element is `h-40 w-61` — the box's own 304:200, because any other ratio letterboxes the drawing
inside the element while `placeOf` stretch-fits, handing a blend a place a few units off the
finger. Four shots settled it: a clipped label reads as a smaller number rather than as a
truncation (`stutter 38` drawn as `stutter 3`), so the names set the width and the pad is then as
tall as four of them across a card allow — not the other way round.

**Four files, and each split is the same seam.** The step called for `SketchCast.tsx` (readout,
shared helpers, the row) and `sketchBlends.tsx` (the four pictures). Shared helpers in
`SketchCast.tsx` would have made the two import each other, so the pad — its coordinates,
`normalise`, the corners, `CornerName`, `BlendPad`, `useAim` — went into `sketchBlendPad.tsx`,
which both import and neither imports back. The pictures then reached the 400-line cap, so the
weighings went into `sketchBlendWeights.ts`, which is the seam the step itself names: a blend is
`(x, y) → six weights` and nothing else. That file is testable without a DOM, and
`sketchBlendWeights.test.ts` is where the arithmetic of all four is pinned.

0247's `max-lines-per-function` waiver is not carried into any of the three. A blend is a function
of a gesture and nothing else, and four of them fit under the cap without one.
