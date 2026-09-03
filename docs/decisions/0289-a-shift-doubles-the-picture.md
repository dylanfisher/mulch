# 0289 — A shift doubles the picture

- **Date:** 2026-09-02
- **Status:** accepted, standing on [0279](0279-a-look-is-declared-and-the-chain-draws-it.md) (a look
  is declared on the entry and the chain draws it) beside
  [0280](0280-a-room-blooms-the-picture.md), [0281](0281-a-crusher-blocks-the-picture.md),
  [0282](0282-a-delay-repeats-the-picture.md), [0283](0283-a-pop-sharpens-the-picture.md),
  [0285](0285-a-tape-wobbles-the-picture.md), [0286](0286-a-filter-softens-the-picture.md),
  [0287](0287-an-eq-lights-one-band-of-the-picture.md) and
  [0288](0288-a-compressor-squashes-the-picture.md); inside
  [0269](0269-the-rack-scatter-shatters-the-field.md)'s rule rather than amending it — both draws
  are draws of the field — and inside the per-frame line
  [0129](0129-a-beat-is-drawn-because-nothing-else-will-draw-it.md) draws: no pixel loop on a frame,
  no read-back, and no `ctx.filter`

**Shift's look is the double, and it is the ninth to take a slot in the chain.** The field drawn
again over itself at the interval's own ratio, `2^(n/12)`, and nothing else (`doubleLook`,
src/lib/moireDouble.ts). How far the second picture stands from the first is the Interval, in the
semitones it is declared in; how much of it is heard is the Mix. Two draws of what is already drawn,
no fill and no surface made.

**The zoom is about the middle of the field, because a pass has no anchor of its own.** The anchor
in the painter today is a row's: a curved row's tile is baked and zoomed about the point that row is
read from (`aimCurved`, src/ui/moireCanvasCurved.ts) and the fold is a bake on that same coordinate
([0278](0278-the-rack-shapes-the-picture.md)). A pass is handed the _finished_ field — every row
already cut into one picture — so there is no row to ask and no anchor to inherit, and the one point
every pass shares is the middle of the field it was given. Anything else would slide the second
picture across the first as the field changed size, which nothing in the picture asked for.

**The interval reaches the picture as its own semitones and not as a turn of its knob.** It is the
one look term read as a `value` beside the warp's wander, and for the reason `pitch` is the one
dimension of a row that is itself a ratio ([0139](0139-a-row-is-what-an-effect-is-set-to.md)): how far
apart two voices stand is the musical distance, and a doubling is what that distance _is_. The
octave is `SEMITONES_PER_OCTAVE`, now exported from src/lib/timeline.ts where the deck's own rate
maths states it ([0031](0031-rate-is-in-the-plan.md)) rather than written a second
time — an interval is the same doubling whether it reaches the ear as a read rate or the eye as a
zoom (principle 1). `DOUBLE_ZOOM` bounds the drawn scale at the two octaves the entry declares
either way, stated in the look because a look never knows which entry wears it.

**The Mix is read twice and both readings stand at nought in the same place**, which is the
compressor's answer (0288, [0202](0202-an-effect-declares-how-present-it-is.md)): this entry's
presence is the Mix's own distance from silence and the term is that same knob's turn, so a shift
heard as nothing lays no second picture whichever number is asked. **And `weighed` moved, at its third hand-copy.**
A look declared in a file of its own may take only _types_ from the contract file — the contract
file imports the declaration, and a value read back across that cycle is `undefined` at the moment
`LOOKS` is built (0288) — so the squash spelt the shape out by hand and the double would have been
the third copy of it. Principle 3's trigger exactly: the one declaration now stands in
src/lib/moireWeigh.ts, a module every look reaches and which imports none of them, and 0288's own
"four passes' worth of change" turns out to be one file for one of the two shapes. The blocks' walk
stays where it is, at three sites, until something asks it for a fourth.

**The ceiling is 0.35, and the shot set the number.** A second picture laid `source-over` at one
does not stand beside the first, it replaces it everywhere the two overlap; and the field is a dense
mask, so even seven tenths closed nearly every window in the picture — a strip swing of 0.008
against `BASE`'s 0.019, the diagonals gone and the picture a wash, which is a double that has
covered what it doubled. At the sharpen's own ceiling the two pictures stand together.

**At the unison the two pictures land on each other, and that is honest.** An interval of nothing is
a ratio of one, so the second draw is the field over itself — which is what the stage does to the
sound there too: at no interval the heads do not walk and what comes out is a fixed tap of the input
mixed back over it (src/audio/effects/shift.ts). 0269 refuses a _fill_ that hazes every window
evenly; this is the field's own alpha drawn over itself, which is what every pass in the chain but
the squash's floor is made of.

**src/lib/moireDouble.ts is a whole look in a file of its own, which is what the cap leaves.**
src/lib/moireLook.ts stood at 766 lines of 800, so this is the band's and the squash's answer at the
same cap and for the same reason (0287, 0288): terms, maths and draw together in one file, `LOOKS`
holding the name against it, and never half a look in a second place. Every registered effect now
declares a look; only scatter's own step is left in the block.

**What the picture says, on the thirty-two-pixel strip of a yard holding shift alone,** each fixture
shot twice and interleaved against the same rack whose Mix stands at nought — the shift present and
its presence at nought, which the unit case proves draws the field once and nothing else. An octave
up at a full Mix reads a mean ink of 0.303 at a swing of 0.029 against `BASE`'s 0.272 at 0.019, and
an octave down reads 0.345 at 0.046: **the ratio is legible in both directions and neither is a
blur** — a blur takes swing out of a picture and both of these put it in, the coarser copy less and
the finer copy more, which is the second picture's own structure arriving. The crop says the same:
under `BASE`'s one family of diagonals a second, shallower family stands at an octave up, and two
shifts stacked read as two ratios of the picture at once. Rack order is legible: `[shift, crush]`
reads 0.457 at 0.101 — blocks cut out of an already doubled field, cells of mixed levels — against
`[crush, shift]`'s 0.585 at 0.137, where the posterised cells are themselves doubled and the grid
comes back twice over. No flash: every reading above is one of a pair that agreed to the digit,
**but for the rack of two**, whose swing ran 0.016 to 0.032 over four runs. That is the fixture and
not this pass: two reverbs — a look that landed five steps ago — read 0.079, 0.038 and 0.023 on the
same machine in the same interleave, so a stack of two passes is what is unsteady here and the
single-pass fixtures are steady to the digit.
