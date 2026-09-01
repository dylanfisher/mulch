# 0269 — The rack's scatter shatters the field

- **Date:** 2026-09-01
- **Status:** accepted, on
  [0213](0213-a-reading-of-the-output-belongs-to-the-field.md),
  [0250](0250-the-picture-is-fed-back-at-the-depth-the-run-earns.md) and
  [0267](0267-the-rack-tail-blows-the-field.md)

Six scatters is the yard at its most broken and the picture was at its most orderly: scatter's whole
claim on it was one row's pitch, so six instances were six straight rows at six pitches, which is
more weave.

**One reading, and it is the standing scatters' own two values.** `rackScatter`
(src/lib/moireSound.ts) sums each instance's Odds by its Gate — how crowded its windows are, times
how much of the signal they take at all, which is the same `presence` the tail is weighed by
(`effectHeard`) — over `RACK_SHATTER_BAND`, one whole scatter to six. **One is nought and not a
little**: a single instance replacing everything it hears displaces nothing visible in a field of
fourteen rows, and six is where the slices are wide enough to break every straight row there is. The
sum and never the longest, which is the whole difference from the tail: stages that ring run at once,
where stages that chop each chop what the one before it already chopped. Linear for the same reason —
a tail is a ratio of two lengths and this is a count.

**It buys the one thing the picture had never done: the field read back through itself displaced.**
`cutField` (src/ui/moireCanvasField.ts) already took the finished field back out of the screen in
`LENS_SLICES` bands where a row asked for a lens; a shattering rack draws a share of those bands from
somewhere else along the picture instead, so a shattered picture is the same picture read out of
order rather than a second fill over it.

**Whole pieces, and never a share of every piece.** The first cut of this crossfaded each band with a
displaced copy of itself, which is not a crossfade at all: two `destination-out` draws compose as a
product, `1 - (1 - s·d)(1 - (1-s)·o)`, whose residual `s(1-s)·d·o` is largest at exactly the half the
ceiling stands at. Every window in the picture came out three-quarters open — an even haze over the
whole field, which is the flattening this reading exists to break. A piece is now drawn from where it
belongs or from somewhere else, cut once either way at the one alpha the painting cuts at, and the
share is `shatterPieces`: how many of the eight are the second kind.

**In eighths of the width, not in sixty-fourths of it.** The first shot of this took the share from
another _slice_ — one device pixel of a strip — and a tear that fine reads as a smear: the strip's
coarse-block swing fell from 0.018 to 0.004 and the picture came out flatter than the one it
replaced, which is the opposite of the step. `shatterSlide` displaces along the width instead, in
`SHATTER_BANDS` = 8 pieces walked by a stride coprime with them: every piece is drawn from a
different eighth of the picture, one lands back where it was, and each is deep enough to see a
straight row inside — which is what has to be seen breaking across the edge between two of them. It
is stable at every frame because the displacement is where the field is read from and not a motion
of its own — what moves under it is the field (0126).

**The share is bounded at `SHATTER_CEILING`, which is the number `DRIFT_FEEDBACK_CEILING` is and
bounded for 0250's reason.** Written where it is spent rather than derived from the feedback's: two
facts about two passes that happen to agree at a half, and a picture that wanted one of them deeper
should not have to move the other. A share of one is every band taken from a part of the picture it has nothing to do
with, which is a
picture of nothing; under a half each band is still mostly itself. The bound also holds what the
double cut costs — two `destination-out` draws of one band do not cut as deep as one, so a fully cut
point at the ceiling stays three-quarters cut and the field thins by a fraction rather than fading.

**It rests on the field and is read at the rebuild.** `MoireRowSet.shatter` sits beside `wash`, `age`
and `tail`: the shatter is the whole picture's and no row's, no registry entry declares it, and
nothing about it is durable (0030, 0128, 0145). It is a fact about what the rack is _set to_, so it
is filled when the set is built — a knob touch is that rebuild — and never on a frame. **And nothing
travels**: unlike the wind's direction, this is continuous in every knob that moves it, and an
instance added or retired is a population change the same rebuild already answers.

Naming a scatter is what a reading of scatters costs. `rackShatter` (src/ui/moireShatter.ts) matches
`scatterEffect.id` and reads `scatter.odds`, which is not the per-effect list, tag or override the
plan refuses — no registry entry gains a field, and the values it reads are the ones scatter already
declares. The reading is the standing rack's, so an instance an automator grew is out of it, exactly
as it is out of the wind's.

Cost: no bake, and no term in any tile key, so the key space is what 0266 and 0267 left it at. On the
frame path a broken piece costs one extra `drawImage` of what is already drawn — the copy either side
of the edge it is slid over — and a scattering yard with no lens standing pays a slice loop where it
used to pay one blit. Measured on
this step's own gate: frame p95 10.4ms, at the median of the last seven runs and unmoved from the
9.3–10.4ms band 0240–0242 and 0250 record — the profiler's frame section samples an idle page, so
what it prices is the slice loop's presence in the painter and not a scattering yard. On the strip, a
six-scatter yard against a one-scatter one: the field's mean stood at 0.415 against 0.398 — a
displacement moves ink and does not add any — and the coarse-block swing fell from 0.018 to 0.005,
which is what a block measure says about a picture whose pieces no longer line up. The swing is not
the proof and cannot be: the crossfade this replaced moved it the same way by hazing the whole field.
At 1:1 the straight rows run in staggered pieces rather than down the whole height, at the contrast
they had.

Durable shape: none.
