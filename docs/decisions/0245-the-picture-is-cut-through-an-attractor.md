# 0245 — The picture is cut through an attractor, and the fold is gone

- **Date:** 2026-09-01
- **Status:** superseded by [0246](0246-the-fractal-is-a-row-and-not-a-mask.md) — the support
  was a layer and not a grating, so nothing in the picture beat against it; it replaced
  [0240](0240-the-picture-folds-into-itself.md) and
  [0243](0243-the-fold-cuts-and-travels.md) and amending
  [0241](0241-the-picture-may-ask-for-one-spectrum-a-frame.md), resting on
  [0131](0131-a-row-is-a-grating-and-the-picture-is-their-product.md) and
  [0244](0244-the-whole-picture-is-drawn-at-several-scales.md)

**The fold goes, on its own measurements.** 0243 found four passes of it moved the field's
low-frequency contrast from 22.19% to between 22.2% and 22.5% while dropping the mean by a third,
and said so. Measured again as a block-contrast spectrum, its four passes leave the coarse end
identical to three figures — 3.8% at 32px and 1.2% at 64px with it on and with it off. That is the
second measurement in two decisions saying the fold draws nothing, and the reason is structural: a
product of periodic functions is periodic, everything in the drift is a grating, and cutting a
periodic field by scaled copies of itself leaves it periodic. No tuning of the ratio, the bite or
the travel reaches that. `src/lib/moireFractal.ts` and `src/ui/moireFold.ts` are deleted.

**What replaces it is an iterated function system.** The union of five contracted copies of a
surface, taken five times over — `source-over`, which is the one composite that builds a set,
because a union of images is what it does to alpha. The fold's own `destination-out` provably cannot:
a subtractive self-blit converges on the complement of the attractor rather than on the attractor.
The result is baked into a mask and the picture is **cut through** it: the attractor is the support
and the gratings are still the ink (0131), so the moiré lattice reads underneath a shape that is not
itself periodic.

**Measured, on the same fourteen-row picture 0244 used** (`src/lib/moireAttractor.test.ts`):

| block | no run | one place | two places |
| ----- | ------ | --------- | ---------- |
| 2 px  | 23.7%  | 26.9%     | 48.7%      |
| 16 px | 11.1%  | 18.6%     | 44.1%      |
| 32 px | 2.87%  | 14.5%     | 40.1%      |
| 64 px | 1.15%  | 13.1%     | 34.1%      |
| mean  | 0.300  | 0.300     | 0.300      |

**1.2% at 64 pixels is the floor nothing may return to**, asserted rather than remembered, because
the fold passed every test in this repo while contributing nothing. And unlike 0244's spread this is
not a trade between scales: the support is a second structure over the same lattice rather than the
same ink drawn coarser, so the fine end rises with the coarse end.

**The weight is held by solving the gratings against what the support leaves.** `attractorKeep` is
what the two cuts leave standing on average, off the mask's own mean alpha measured at the bake —
the coverage of an attractor is not a number its maps answer — and `gratingDepth` is then solved
against `PICTURE_FLOOR / keep`. That is 0244's lesson (`octaveShare`) run over the support: a layer
that takes ink must be counted as taking it, or the picture's weight says how busy the rack is.

**The bite is what a shot decided, and no measurement could have.** The compensation cancels exactly
the average the support takes, so what reaches the eye is the variation alone. At `ATTRACTOR_BITE`
0.45 the block-contrast spectrum already read 22% at 64px and the picture on the screen was the
lattice it always was. At 0.6 the set reads, and the fine scale rises with it rather than paying for
it. That is what the plan meant by "answered by shooting it, not by tuning it" — and the two
questions it put to the shot are answered: the mask **cuts** the ink, the lattice reading through the
support inside it and outside it, and the support reads as the picture's own shape rather than as a
shape pasted on, because its edge is the lattice changing weight across a region and never an
outline.

**The ratio band is measured, not chosen.** Five maps at ratio `r` cover `5r²` of what they copy, so
under `1/√5 ≈ 0.447` the copies miss and the attractor is a measure-zero dust — at `[0.28, 0.42]` it
settles on 2% of the picture and buys 2.6% at 64px, barely twice the fold. Over the threshold the
copies overlap, the set holds area, and its holes and its boundary are the structure: 22.0% at
`[0.48, 0.60]`, 22.6% at `[0.55, 0.67]`, 21.4% at `[0.70, 0.82]`. The band sits at the lower edge of
that plateau because the measurement cannot tell those three apart and the coverage can — a quarter
of the picture here against two thirds at the top, where the holes have closed and the support is
one lumpy region with an outline.

**It is cheaper than what it replaces.** The fold paid four picture-sized blits at every painting for
ever. The support pays twenty-five once, when the population turns over, and one blit at each
painting after — two where the output rings.

**A baked input must be one that rests, and that is what decides where a reading may be spent.** The
population rests: a place arrives, a place goes, and between those the maps stand. A spectrum never
rests. So 0241's three readings are spent as three things and only one of them touches a map:

- the population seeds the five maps and ramps the share over `ATTRACTOR_REACH`, which is two
  because that is `auto.least` — the smallest run an automator's defaults ever hold;
- sharpness (`spectralEdge`, `heardBite`) is the share the mask is cut at;
- resonance (`spectralFlatness`, `heardBeat`) is how far the mask is cut a **second** time at
  `ATTRACTOR_BEAT` — the support beaten against its own next scale, which fringes for the same
  reason two gratings do. Over one rather than under, so the second copy covers the picture: drawn
  smaller it leaves a ring outside itself where the mask says nothing, which is a vignette.

0241's `heardTight` is gone with the fold's ratio it was spent on; flatness keeps its band and its
direction under the new name. **What fades is the share and never the shape**: a set is the fixed
point of its own maps and there is no half of one, so an arriving place changes where the picture is
cut, where a deepening one changes only how hard.

**Five maps whatever the population is.** The count is what puts the overlap threshold where the
band is measured against, so a count that moved with the run would draw a dust at one size and a
blob at another off the same band. A run standing one place seeds all five off that place's id at
five slots; a run standing six seeds the five off six. What the population moves is where the set
stands and how hard it cuts.

Durable shape: none. The maps are read per painting off a population nothing stores (0070, 0204),
and the mask is a cache keyed on them, held per field so the strip and the overlay do not rebake
each other.
