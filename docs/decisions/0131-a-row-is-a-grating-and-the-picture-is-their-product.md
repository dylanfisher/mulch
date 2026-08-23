# 0131 — A row is a grating, and the picture is what they make together

- **Date:** 2026-08-22
- **Status:** accepted, superseding the ribbon half of
  [0098](0098-a-row-is-drawn-against-its-own-band.md)

A yard's items were drawn one under another: a ribbon per lane and per rack instance, its waveform
picked by the parameter's fold, its band a slice of the canvas's height. **Now every row is one
grating across the whole picture** — its angle from that same fold, its pitch from its period, its
phase from where the deck has read to — and the picture is what they make together. Nothing is
drawn beside anything. Two rows are read off each other or they are not read at all.

**The picture is the rows' product, not their sum.** A stack of gratings is what a physical moiré
is: each one passes what the one under it left, so the field is `∏ keep`. `destination-out` is
exactly that multiplication — it leaves `under × (1 - source)` — so N rows are N full-canvas fills
and no pass over any pixel. Superposition was tried and is a different picture: the sum of N
cosines tends to grey as N grows, and measured at a hundred blocks it beat at half the depth the
product did.

**Which side is ink decides whether any of it can be seen.** The product itself, drawn as alpha, is
a picture that spends nearly all of itself near its own floor: measured in the app at a mean alpha
of 0.111, and 0.362 after the screen and the picture stopped multiplying two floors together — flat
both times, because a floor high enough to be seen leaves the gratings too shallow to beat. The
picture is therefore **one minus** the product: ink everywhere the gratings block, a window
wherever their slits agree. That is what a stack of gratings does to light, it inverts the
distribution rather than fighting it, and it costs one more full-canvas fill because a product
cannot be inverted in place — `destination-out` needs it as a source, so it is built on a surface
of its own.

**A grating's depth is solved for, so brightness never says how many items a yard holds.** Five
gratings at full depth leave 3% of the ink standing and eight leave 0.4%. `gratingDepth` solves
`(1 - d/2)^count = floor` instead, which holds the mean at the floor from two rows to twelve. This
is also the answer to the objection that kept the beat out of the screen
([0129](0129-a-beat-is-drawn-because-nothing-else-will-draw-it.md)): the slow term arriving scaled
by the gratings' depth squared only buries it while a picture has to survive underneath, and here
the gratings **are** the picture. Measured across two to twelve rows the field's mean holds and the
beat's own swing does not fall with it.

**Two gratings only beat when their pitches are close, so the window's spread is compressed.**
This is the one thing no test caught and only the running app showed. Carried straight across the
canvas as the ribbons' pitch was, a yard's periods — three quarters of a second against twelve —
draw a fine comb over a coarse one with no fringe anywhere in it: ten and eleven pixels come back
into step over a hundred and ten, ten and a hundred and sixty over eleven. The window still orders
the pitches, and a row that comes round often is still drawn finer than a slow one, but the spread
is pulled to a quarter power and clamped into a band about a middle in CSS pixels. Sixteenfold in
periods becomes under fourfold in pitches, and the app then measured a relative beat swing of 0.68
with three rows and 0.45 with seven.

That band's own floor is why there is no longer a bound that declines a tightening the pixels
cannot carry (0098): nothing can ask for a pitch outside it. The bound had to go anyway — it could
only ever make the picture _finer_, and a grating under a few device pixels does not lose detail
like a ribbon, it shimmers when nothing is moving.

**What the reference row is, is the axis.** It is not drawn underneath at a lower ink any more,
because nothing is drawn on top of anything: it sits at angle zero and every other row is fanned
around it by its fold. That is the whole of what being the reference means now.

**The screen films the picture; it is no longer a second one.** [0126](0126-the-screen-rides-the-pictures-own-phase.md)'s
tile is now the ink the gratings are cut out of, which is the same multiplication in the other
order. Its own terms are much shallower — its two floors were multiplying with the picture's — and
its subpixel fringe ([0130](0130-the-fringe-is-the-rows-own-ink-split.md)) is shallower still: at
0.45 it caught every crest in a field of fine gratings instead of a handful of edges on a broad
ribbon, and the yard read as red and green candy stripes rather than as its own ink. The lean
([0128](0128-every-motion-in-the-screen-belongs-to-a-parameter.md)) is now one skew on the tile
rather than one per row drawn, which is that decision's one stated cost gone.

**What it costs.** Nothing measurable. Eight gratings over a 2400×1400 canvas held the vsync floor
on a GPU, flat against an empty canvas. Headless Chromium rasterizes canvas in software and the
same case takes 150ms there, so **no frame budget may be asserted headless** — that number is
SwiftShader's and not any user's.
