# 0287 — An EQ lights one band of the picture

- **Date:** 2026-09-02
- **Status:** accepted, standing on [0279](0279-a-look-is-declared-and-the-chain-draws-it.md) (a look
  is declared on the entry and the chain draws it) beside
  [0280](0280-a-room-blooms-the-picture.md), [0281](0281-a-crusher-blocks-the-picture.md),
  [0282](0282-a-delay-repeats-the-picture.md), [0283](0283-a-pop-sharpens-the-picture.md),
  [0285](0285-a-tape-wobbles-the-picture.md) and [0286](0286-a-filter-softens-the-picture.md), and
  inside the per-frame line [0129](0129-a-beat-is-drawn-because-nothing-else-will-draw-it.md) draws
  — no pixel loop on a frame, no read-back, and no `ctx.filter`

**EQ's look is the band, and it is the seventh to take a slot in the chain.** One slice of the
finished field drawn again over where it already stands: the frequency says where down the picture
it is (`bandCentre` — low at the bottom, which is the way a spectrum is drawn and the other way from
the picture's own y), the Q says how deep (`bandDepth`, a third of the field wide open and a
twenty-fourth at the top of the knob, in shares for the echoes' reason), and the gain says which way
it goes. The edges are softened with draws of the field and nothing else: `BAND_EDGES` nested
slices, each shallower than the last and each at the same share of the alpha, so the middle of the
band carries all of them and its rim carries one.

**The plan's two composites are the right two, and the shot swapped which is the lift.** The field
is a hole mask — every window in it is ink the screen keeps and a covered pixel is ink taken out
(0281, 0283) — so `source-over` on the slice _fills_ the mask by a share of what it already covers,
and on the strip a band drawn the plan's way round came back as the one place the picture went
quiet: in-band mean ink 0.3032 at `BASE` against 0.2629 with the pass, where a lift is the band that
should stand out. So the lift is `destination-out`, which opens the mask instead, and the cut is
`source-over`. **They share the alpha and the slice, and not the size of the move**: the lift leaves
`c(1 - alpha·c)` of coverage where the cut leaves `c + alpha·c(1 - c)`, equal only at half coverage,
so on the strip's own density a lift moves the ink about twice as far as a cut of the same gain
(+0.073 against -0.038 in the band). Both are proportional to what the field already had there,
which is what makes them one pair and keeps neither a fill: a rectangle either way would land its
own flat edge wherever the picture was blank as well as where it was dense (0269).

**Every step of the taper draws, and one row deep at the least.** The steps stand a sixth of the
band apart, so on the thirty-two-row strip at the narrow end of the Q all three round onto one row:
with a slice dropped for having no depth the band drew nothing at all there, and at other
frequencies two thirds or a third of its own alpha — how hard a band was drawn would have depended
on where its frequency rounded. A band thinner than its own taper is one row at the whole of the
alpha (src/ui/moireCanvasField.test.ts has the case, on a field the strip's size).

**A cut is as present as a lift, and that is a change to how presence is read.** `effectHeard`
(src/audio/params.ts) took the signed distance from the knob's silence, which called a band cut by
twelve decibels absent from the picture — so its look never reached the chain and half the plan's
row could not be drawn at all. It now takes the magnitude. Nine entries of ten have their silence at
an end of their own range and read the same either way; the EQ is the one that does not, and it
forces the magnitude exactly as it forced `full` (0202). A notch is as audible as a lift, so the
lattice weighs it the same now too, which is the reading it should always have made; the wind does
not move either way, because an EQ settles at the floor and a tail that short weighs nothing in it
(`rackTail`, src/lib/moireSound.ts). **And an automator can still only grow a lift**: a run ramps a
presence parameter from its declared `silent` toward its `full`, so the cut half of the gain is a
hand's to reach and not a run's, which is a fact about growth and not about this pass.

**The one term that is a sign does not travel, and cannot.** Terms are read live and only presence
eases (0279), so a gain sent from +12 to -12 in one command flips the band from lit to quiet between
two frames with no drain through nought — a hand dragging the knob passes through flat, where the
presence is nothing and the band is not drawn, but a `param.set`, an undo or a restored session does
not. Easing a direction is not a thing the picture can do: what would travel is the composite.

**The gain is read twice and weighed once.** How far it stands from flat is the presence the pass is
drawn at (`bandAlpha`, under `BAND_CEILING`); which side of flat it stands is the term
(`bandLifts`), and the term is a direction and never a second share — a share off the same knob on
top of the presence would square the gain and a band at half its range would all but vanish. The
filter's is the same knob read twice (0286) and this is the same answer.

**src/lib/moireBand.ts is a whole look in a file of its own, which is what the cap leaves.**
src/lib/moireLook.ts stood at 738 lines of 800 and a pass costs it a hundred. 0286 moved a tile out
and said the draws stay beside the declarations they belong to; that still holds, so what moved here
is not half a look but all of one — the band's terms, its maths, its draw and its `Look` are in the
one file and `LOOKS` holds the name against it. The looks left to land (compressor, shift) follow
this shape rather than growing the contract file again.

**What the picture says, on the thirty-two-pixel strip of a yard holding eq alone,** each fixture
shot twice and byte-identical both times, against the same rack at `BASE`. A lift of twelve
decibels at a kilohertz, Q of one: the six rows the band stands on read a mean ink of 0.3759 against
`BASE`'s 0.3032, and the whole picture 0.3142 against 0.3006 — the band lit, and the picture around
it where it was. The same band cut by twelve reads 0.1868 against `BASE`'s 0.2250, which is the same
move the other way. Both bands stand at rows 11–16 of 32, where a kilohertz on its own log range
puts them; at eight kilohertz with a Q of six the band is at rows 3–5 instead — up the picture and
narrower, which is the position and the width read off their own knobs. Two eqs lift twice as one
pass each: the band's peak row reads 0.524 against one's 0.436. No flash and no alias: the strip's
swing is 0.029 and 0.024 against `BASE`'s 0.033 and 0.025, and the mean moves by less than the swing
allows. **What a lift costs is spread inside its own band**: taking coverage out of a hole mask
takes proportionally more of it where the field was dense, so the band's edge energy falls from
0.0908 to 0.0610 as its ink rises. The band reads as one lit band and not as a stripe over the
picture — every row inside it is still the field's own row — but a lift is a band with more ink and
less contrast, and a cut, which keeps its own (0.3181 against 0.3008 of edge to mean), is the half
of the pair that keeps its structure.
