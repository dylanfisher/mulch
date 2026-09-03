# 0288 — A compressor squashes the picture

- **Date:** 2026-09-02
- **Status:** accepted, standing on [0279](0279-a-look-is-declared-and-the-chain-draws-it.md) (a look
  is declared on the entry and the chain draws it) beside
  [0280](0280-a-room-blooms-the-picture.md), [0281](0281-a-crusher-blocks-the-picture.md),
  [0282](0282-a-delay-repeats-the-picture.md), [0283](0283-a-pop-sharpens-the-picture.md),
  [0285](0285-a-tape-wobbles-the-picture.md), [0286](0286-a-filter-softens-the-picture.md) and
  [0287](0287-an-eq-lights-one-band-of-the-picture.md); amends
  [0269](0269-the-rack-scatter-shatters-the-field.md) in one place — the squash is the one pass that
  is a fill over the picture — and stays inside the per-frame line
  [0129](0129-a-beat-is-drawn-because-nothing-else-will-draw-it.md) draws: no pixel loop on a frame,
  no read-back, and no `ctx.filter`

**Compressor's look is the squash, and it is the eighth to take a slot in the chain.** The field's
own alpha put through one affine squeeze and nothing else: every coverage the mask has, mapped onto
a shorter range between a floor and a ceiling (`squashLook`, src/lib/moireSquash.ts). How far the
floor comes up is the Ratio, on its own range; where the ceiling comes down to is the Threshold, on
its. **Which end of the mask is which is the fact the whole record turns on.** The field is the
ground with every grating cut out of it and the screen is cut by the field `destination-out`
(`groundOf`, src/ui/moireCanvas.ts), so the picture's ink stands where the field has _none_ and its
windows stand where the field is covered — the same polarity 0287 states from the band's side. So
the floor thins the deepest ink and the ceiling dims the windows, and a range closed up between two
numbers is the picture's ink closed up between them.

**One of the plan's two composites must be a fill, and the other must not be.** With the field
covering `c` the pass leaves `floor + (top - floor)·c`: the field drawn at `(top - floor)/(1 -
floor)`, and the floor laid under it `destination-over` at its own alpha. The floor is the one fill
in the chain and **it can be nothing else** — 0269 refuses a rectangle that lands its own flat edge
wherever the mask was blank as well as where it was covered, and that flat edge is exactly what a
floor is: the mask's blank is the picture's deepest ink, and every composite of the field with
itself leaves nought at nought, so a squash made only of draws cannot thin an ink line at all. The
shot says the same as the arithmetic. Drawing the floor as `destination-over` of the field over
itself read on the strip as mean ink 0.350 at a swing of 0.033 against `BASE`'s 0.185 at 0.032 — the
whole of the picture's block swing standing and only its mean moved, which is a brightener; the
fill, on the same fixture interleaved against the same `BASE`, read 0.320 at 0.026, the structure
closed up. **The ceiling half needs no fill and is not given one**, which narrows the plan's stated
pair: a `destination-in` at the ceiling and the field drawn at the ceiling's own share are the same
arithmetic on a cleared surface, and the second is a draw of the field. So the exception 0269 gains
is one composite wide and not two, and 0269 carries the back-link that says so.

**The Ratio is read twice and both readings stand at nought in the same place**, which is the
filter's answer and not the bloom's (0286, 0202). This entry's presence is the Ratio's own distance
from one to one and the term is that same knob's turn, so a compressor standing at one to one lays
no floor whichever of the two numbers is asked. What travels is where the range _ends_ — the
floor walks out from nothing and the ceiling from one, which is the blocks' walk and not the bloom's
weighed share (0281), because this pass lays no share of a second picture over the first. Both
shapes are spelt out here rather than imported: **a look declared in a file of its own may take only
_types_ from the contract file**, because the contract file imports the look's declaration, and a
value read back across that cycle is `undefined` at the moment `LOOKS` is built — two cases of
src/lib/moireLook.test.ts fail on it. `weighed` and the blocks' walk stay where they are, and the
walk's third site is here without folding them: that wants a module neither cycle reaches, which is
four passes' worth of change and no part of this step.

**The floor stays under the ceiling at every input, and the two numbers are what keep it there.**
The floor reaches `SQUASH_FLOOR` — 0.2 of full coverage — and the ceiling never falls under the shut
end of `SQUASH_TOP` at 0.7, so the two can meet only if a presence over one were let through, and
both clamp. Kept apart by what the numbers are rather than by a clamp at the draw, because a clamp
would be the maths agreeing to draw a picture with no range left in it and then declining to;
src/lib/moireLook.test.ts asserts the gap over the whole grid of the two knobs and the travel. The
extreme is a range of half the field's own, not a tenth of it: at the first cut of this the numbers
were 0.4 and 0.5 and a compressor at twenty to one read 0.348 at a swing of 0.008 — the picture
flattened to almost nothing, which is a squash that has eaten what it squashed.

**src/lib/moireSquash.ts is a whole look in a file of its own, which is what the cap leaves.**
src/lib/moireLook.ts stood at 752 lines of 800 and a pass costs it a hundred, so this is the band's
answer at the same cap and for the same reason (0287): terms, maths and draw together in one file,
`LOOKS` holding the name against it, and never half a look in a second place. The one look left to
land (shift) follows this shape.

**What the picture says, on the thirty-two-pixel strip of a yard holding compressor alone,** each
fixture shot twice and byte-identical both times, interleaved against the same rack whose Ratio
stands at one to one — the compressor present and its presence at nought, which the unit case proves
draws the field once and nothing else. A compressor at twenty to one over a threshold of -60dB reads
a mean ink of 0.320 at a swing of 0.026 against `BASE`'s 0.185 at 0.032, and a relative swing of
0.081 against 0.176: the picture's contrast against its own level cut by more than half, which is
the squash. Two compressors read as more of it than one — 0.367 at 0.015, relative 0.040. **The mean
rises, and on this field it must**: the strip's field is dense — its ink stands at 0.185 of the
canvas — so most of the picture is at the deep end, and closing the range up moves far more of it up
from the floor than down from the windows. A compressor that raises the average level is the effect
this look is named after, and the crop is where the two halves of the move are legible: the diagonals
come back thin, and the white ground between them comes back tinted. Rack order is legible too:
`[compressor, crush]` reads 0.622 at 0.034 with its cells at an even, muted contrast — blocks cut
out of an already-squashed field — against `[crush, compressor]`'s 0.490 at 0.066, where the
posterised levels were laid first and the brightest cells survive the squeeze. No flash and no
alias: every strip reading above is one of a pair, and the pair agreed to the digit but for the
squash's own mean, which read 0.320 and 0.321 — a thousandth, against a swing of 0.026.
