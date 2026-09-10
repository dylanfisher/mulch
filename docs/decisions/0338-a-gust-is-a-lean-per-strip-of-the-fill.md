# 0338 — A gust is a lean per strip of the fill

- **Date:** 2026-09-10
- **Status:** accepted, landing the seventh and last step of the block that reads a yard's whole
  name into the picture, over [0337](0337-a-reading-is-said-in-the-pictures-own-words.md)

**The lean varies with x, so the fill is where it varies.** A pattern transform is affine (0331),
so one placement of the screen carries one lean for the whole picture; a gust is a lean that is
different here from there. The only seam in the frame where a lean may change is between one fill
and the next, so `inkThrough` (src/ui/moireScreen.ts) fills the canvas in `tunable("wind.strips")`
vertical strips, each placing the same pattern under the shear the sway already writes plus one
strip further on into a wave that comes round exactly once across the picture. The tile behind all
of them is the one tile the cache answered with — nothing here is baked, nothing is keyed by a
strip, and the pixels covered are the pixels the single `fillRect` covered.

**The wave rides the shear's own row.** A gust with a clock of its own would blow across a halted
yard (0126, 0040). It travels because `termTurns(rows, "shear")` travels, which is the same phase
the sway is read at, so a stopped picture's gust stands exactly where the picture stands.

**The fill moved off the caller.** `paintMoire` (src/ui/moireCanvas.ts) no longer fills the
rectangle: a caller holding the `fillRect` could only ever fill it flat, so the fill belongs to the
file that knows how many leans the frame has. The one fill an engine that will not build a pattern
gets is laid there too, so no path leaves the canvas empty.

**A gust is bowed about the picture's middle.** Two strips leaned by different amounts read the
same tile a step apart at the boundary between them, and a shear carries a point by its own depth,
so anchored at the top row that step is widest at the foot — a vertical break standing at the
bottom of every picture, which is the artefact 0334's own snapping exists to keep out. Pivoting the
gust at half the canvas's height makes the neighbours agree across the middle and part by half as
much at either edge. The break does not go: it is `gust × shear × 2sin(π / strips) × height / 2` at
worst, and the strip count is what shrinks it — which is why the count is the tunable and the
amplitude is not.

**And the swing is bounded by the tile, not by the wind alone.** Halving the break is not bounding
it: the break is measured in the tile's own beat cell and the picture is not always the same size,
so the wildest wind that parts two strips by a thirtieth of a cell on a 64-pixel rack strip parts
them by most of one on a full-bleed overlay — seven vertical breaks through the middle of the
picture. The wave swings as far as the yard's reading asks or as far as `GUST_BREAK` of a beat cell
allows, whichever is less. The cost is that the biggest picture leans a little less than the reading
asked, which narrows what `useMoirePicture` (src/ui/MoireStrip.tsx) claims about the strip and the
overlay being one picture at two sizes: they are, up to the point where the bigger one's own tile
would break, and past it the bigger one leans less. `GUST_BREAK` is a constant
beside the tunables and never one of them — it is not a taste, it is the width at which a boundary
stops being a lean and starts being a line.

**Nought at the stillest wind, and one fill for it.** `SCENE_WIND_TERMS` (src/lib/moireScene.ts)
gains `gust` beside `lean` and `sway`, a share of the screen's own shear like the sway is, nought
at `still` and one at `wild`. A wave of nought amplitude has nowhere to be, so a still yard is
filled once — the frame every picture drew before this — and eight identical fills are seven calls
spent drawing what the first one drew.

**The cost was measured before it was kept.** Six `./scripts/profile` runs, interleaved base and
head three times each: frame mean 8.215 / 8.252 / 8.268 ms at base against 8.255 / 8.272 / 8.298 ms
at eight strips, p95 10.3–10.4 ms on both sides, no long task on either. Thirty microseconds a
frame, inside the spread of the base runs against each other and orders below a step of the tint
ladder, which rebuilds a picture-sized tile. The travelling gust stands; the standing one the step
named as its fallback is not needed. **And eight is the knob's ceiling as well as its rest**: a
tuning group's own push drives every knob in it to its wild end, so a ceiling above the count that
was measured is one gesture away from a frame nobody timed.
