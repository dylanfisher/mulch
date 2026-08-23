# 0131 — A row is a grating, and the picture is what they make together

- **Date:** 2026-08-22
- **Status:** accepted, superseding the ribbon half of
  [0098](0098-a-row-is-drawn-against-its-own-band.md)

A yard's items were drawn one under another: a ribbon per lane and per rack instance, its waveform
picked by the parameter's fold, its band a slice of the canvas's height. **Now every row is one
grating across the whole picture** — angle from that same fold, pitch from its period, phase from
where the deck has read to. Nothing is drawn beside anything: two rows are read off each other or
they are not read at all.

**The picture is one minus the rows' product.** A stack of gratings passes what the one under it
left, so the field is `∏ keep`, and `destination-out` is exactly that multiplication — N rows are N
fills and no pass over any pixel. Superposition was tried and beat at half the depth. But the
product drawn _as_ the ink spends nearly all of itself near its own floor: measured in the app at a
mean alpha of 0.111, then 0.362 once the screen and the picture stopped multiplying two floors
together, and flat both times, because a floor high enough to be seen leaves the gratings too
shallow to beat. So the ink is the **complement** — dense where the gratings block, a window
wherever their slits agree, which is what a stack of gratings does to light. It costs one more
full-canvas fill: a product cannot be inverted in place, `destination-out` needs it as a source.

**A grating's depth is solved for, so brightness never says how many items a yard holds.** Five
gratings at full depth leave 3% of the ink standing and eight leave 0.4%; `gratingDepth` solves
`(1 - d/2)^count = floor` instead, holding the mean from two rows to twelve. This also lifts the
objection that kept the beat out of the screen
([0129](0129-a-beat-is-drawn-because-nothing-else-will-draw-it.md)): the slow term arriving scaled
by depth squared buries it only while a picture must survive underneath, and here the gratings
**are** the picture.

**Two gratings only beat when their pitches are close, so the window's spread is compressed.** The
one thing no test caught and only the running app showed. Ten and eleven pixels come back into step
over a hundred and ten; ten and a hundred and sixty come back over eleven. A yard's periods carried
straight across the canvas, as the ribbons' pitch was, therefore draw a fine comb over a coarse one
with no fringe anywhere in it. The window still orders the pitches, but the spread is compressed
and clamped into the band a lattice happens in — sixteenfold in periods becomes under fourfold in
pitches, and the app then measured a relative beat swing of 0.68 with three rows and 0.45 with
seven. That band's floor is also why nothing declines a tightening the pixels cannot carry (0098)
any more: nothing can ask for a pitch outside it, and that bound could only ever make the picture
_finer_ — a grating under a few device pixels shimmers where a ribbon merely lost detail.

**The reference row is the axis.** Being the reference can no longer mean being underneath at a
lower ink, because nothing is drawn on top of anything: it sits at angle zero and the rest are
fanned around it by their own folds.

**The screen films the picture rather than being a second one.**
[0126](0126-the-screen-rides-the-pictures-own-phase.md)'s tile is now the ink the gratings are cut
out of — the same multiplication in the other order. Its terms and its subpixel fringe
([0130](0130-the-fringe-is-the-rows-own-ink-split.md)) are much shallower, each constant carrying
its own measured reason, and its lean
([0128](0128-every-motion-in-the-screen-belongs-to-a-parameter.md)) is one skew on the tile rather
than one per row drawn, which is that decision's one stated cost gone.

**What it costs.** Nothing measurable: eight gratings over a 2400×1400 canvas held the vsync floor
on a GPU, flat against an empty canvas. Headless Chromium rasterizes canvas in software and the
same case takes 150ms there, so **no frame budget may be asserted headless.**
