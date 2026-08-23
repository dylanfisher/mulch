# 0137 — An effect declares the wave it draws with, and the channels part across a blob

- **Date:** 2026-08-22
- **Status:** accepted, extending
  [0130](0130-the-fringe-is-the-rows-own-ink-split.md) and
  [0131](0131-a-row-is-a-grating-and-the-picture-is-their-product.md)

Every row of the drift was one more cosine. Its angle came from its parameter's fold and its pitch
from its period, so the picture said how many things a yard was running and how fast, and nothing
about **what kind of thing each one was**: a filter and a delay drew the same row twice.

**A profile is the dimension an effect impresses itself on.** One per registry entry, declared beside
its icon and its parameters — `drift: DriftProfile` on `Effect` — and the grating's tile is cut to
that wave. Two gratings beat into the fringes their harmonics share, so a crest with its echo behind
it (`twin`, the delay) and a crest clipped flat (`flat`, the compressor) cross into different
families of fringes at one pitch and one angle. Declared and not mapped: one map of effect ids to
looks in the painter is the second map from ids to pictures the `icon` field already exists to
prevent (0055), and it leaves the next effect added invisible. `validateEffects` throws at load for
two entries claiming one profile, and for one claiming `plain` — the wave a row no effect owns is cut
to, the loop's reference row and a deck's own knobs (0122). A lane on an effect's knob is that effect
doing something, so it takes the same profile the instance's own row does.

**Every profile averages exactly half the ink over its cycle.** `gratingDepth` solves for a depth on
the assumption that one grating keeps `1 - depth / 2` (0131), so a profile with a mean of its own
would make the picture's brightness say which effects a yard holds. Each is a half plus a term that
integrates to nothing — a cosine and its harmonics, or a ramp of any skew — and `moire.test.ts`
asserts it over all of them, which is what makes the set extensible without measuring the picture
again. What a profile cannot survive is the band's own floor: `gratingPitch` bottoms out near three
device pixels, where a second harmonic is a cycle and a half and a third is under one, so the fastest
rows fold back toward the plain wave. That is the bound 0131 already names, and it is recorded in §4
rather than paid for by moving a pitch band measured for the picture as a whole.

**And the picture went orange.** 0130's subpixel fringe is a third of a five-pixel cell, so the eye
integrates the three channels back into the row's ink at any distance and a yard drawn in one token
reads as that token everywhere — 0130 working exactly as written, and still one hue. A camera does
not sample a monitor's three channels in the same place: one edge of a blob it photographs reaches
its own channel before the others. So the tile now carries **three blob lattices half a channel's
share of a cell apart**, one per channel, at a depth of their own — the alpha keeps the single
lattice it had. Half a share and not a whole one: a whole one puts the three 120° apart, their mean
goes flat, and the lattice has no brightness left at all.

**The three multiply the row's ink, so they can only divide the light it already has.** These
canvases are drawn in `text-primary`, which has no blue in it at either scheme, so the blue lattice
is a no-op and what separates is red against green. That is the bound 0130 settled — adding light is
a tint, not a fringe. The picture stops settling on one hue and does not become a rainbow.

**And a multiplier may not brighten.** A channel is eight bits and this ink sits near the ceiling of
its strongest one, so dividing the three by their mean pinned red flat across 47% of a tile: the
bright half of every blob, exactly the half the fringe is for. They are divided by their own largest
instead, so the channel cresting here keeps all of its light and the other two give some up. Each
crests equally often across a cell, so the hue comes back within 1.1% — three of the ink's own 255
levels — rather than exactly, because a per-pixel normalisation that never brightens cannot also be
exactly even-handed. `moireScreen.test.ts` asserts both, against the multiplier the tile is written
with rather than against the lattice behind it.
