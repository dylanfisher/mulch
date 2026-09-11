# 0348 — The field is mostly ground

- **Date:** 2026-09-10
- **Status:** accepted, standing on [0345](0345-the-picture-is-a-lattice-of-marks.md) and
  [0346](0346-the-lattice-stands-still.md), and landing the first of the eight the marks bench
  drew ([0347](0347-the-marks-bench-is-its-own-route.md))

The reference the lattice was drawn against is a sparse ground with ribbons of dense marks through
it. What 0346 shipped is denser than that everywhere: the wrap makes the middle of the ramp the
dense marks and a bloom stands mostly in that middle, so three-quarters of a bloom tile's cells are
heavier than the plus and the picture reads as a halftone with no ground in it.

**A cell's read is pushed toward the ends of its ramp before it is cut into marks.** `pushRead` in
`src/lib/moireGlyph.ts` is a gain about the ramp's middle under one dial, `glyph.push`, beside
`glyph.phase`; `build` (`src/ui/moireScreenTile.ts`) reads it where the cell's mean is cut. It
rests at one, where the heavy share of a bloom falls from about three-quarters to about a fifth.
One multiply per cell, on the bake and never on a frame (0129).

**On the cut alone, never on the ground.** The push reaches `markAt` and nothing else: the cell's
ink is read at the scene's own stand, before the cut, so what a name draws is untouched and a scene
keeps its five stops. The dial spends the picture's contrast and not its colour.

**At nought it is the read itself, exactly.** The push is written `value + (value - 0.5) * push`
and not as a gain on a centred read, because the second form moves a value by a float's width at a
push of nought and the floor of this dial has to be the lattice 0346 shipped, mark for mark.

**It reaches the fields that stand off the ramp's middle, and only those.** A meadow's read
clusters at that middle, which is the one read a push about it cannot move: every cell of a meadow
tile is heavier than the plus at nought, and half of them still are at the top of the dial. That
shortfall is asserted in `src/ui/moireCanvasMarks.test.ts` and held in the plan's §4 rather than
answered here, because both answers available — moving the scene's own ground, or wrapping twice —
are what this step refuses.

**One push and no second wrap.** A read held to the ramp's ends stays there; the ramp is not cut
twice and the ground mark the phase names is still the one a flat field is written in.

The bench's entry 01 is deleted with this, as 0247 says.
