# 0340 — The screen is a shade and not a window

- **Date:** 2026-09-10
- **Status:** accepted, amending
  [0332](0332-a-scene-is-the-colour-and-the-film-is-the-alpha.md) and standing on
  [0339](0339-the-films-share-is-one-dial.md)

**What the screen spends, it spends as darkness and not as transparency.** The four keep terms —
the two gratings, the lattice they beat into and the rolling band — leave the tile's alpha and
enter its read. After the yard's hue travel and the stand's own shade and before the air,
`stood` is pulled toward the scene's first stop by `filmStand(keep, share)`, exactly as
`standShade` pulls it (0335), and the alpha the tile is written at is `own[3]` at every pixel.
0332's sentence, "the scene is the colour and the film is the alpha", is amended and not
repealed: the sound's own gratings are still the alpha and are still cut with `cutField`. What
the screen was doing to a white page it now does to the field — a canopy's grille is dark leaf
between lit leaf, and a bloom's comb is shade between heads. The three channels' fringe and gain
are unmoved, having only ever multiplied colour.

**`SCREEN_FLOOR` is re-aimed and not re-chosen.** 0.6 was the least of the tile's alpha the
screen could leave; it is now the least of the tile's lightness the shade may leave on average.
The same number, asserted on the read: `moireCanvasFilm.test.ts` paints each scene twice, once
with the film off and once with every Grating and Film knob at the wild end its own panel row
names and the share at the top of its travel, and the mean ink of the shaded tile against the
unshaded one stands at 0.79 (meadow), 0.85 (water), 0.91 (bloom) and 0.93 (canopy). The old
assertion on the four terms themselves (`moireScreen.test.ts:332`) holds unchanged, and so do the
saturation and fringe cases, the fringe never having been in the alpha. Two of those (`:634`,
`:739`) read `tileKeep`, a mean of the alpha, and are restatements of `own[3]` from here on: what
they still guard is that neither a fringe nor a ground reaches the alpha, and the floor's own
teeth are the case above and nowhere else.

**The measurement, interleaved.** A meadow with a four-a-second click train playing, at the
shipped rest of 0.15, base and head alternated and each read twice — the strip through
`./scripts/drive --shot` and the zoomed drift through a headed Playwright on the dev server. The
strip's mean alpha goes **0.331 → 0.350** and the overlay's **0.332 → 0.350**, both pairs
agreeing to the digit across the interleave. 0.350 is exactly the ceiling 0339 measured with the
film off outright, which is the point: the screen now spends none of the alpha at any setting of
its own dial, and what is left in the picture's transparency belongs to the rows' cut and the
ghost — step 3's business, not this one's. At the 1:1 crop the field reads as heads over stems in
their own ink where it read as a pale comb, with the remaining vertical grating the sound's and
no longer the screen's.

**A crest is a limit and not a pixel.** No pixel of a tile has the two gratings, the beat and the
band all at their own crest at once — the most of itself the film ever leaves standing is 0.84 —
so "the same colour at a crest" cannot be asserted on a pixel. It is asserted on tenths instead:
over the tenth of the tile the terms cross deepest under, a smaller share of each pixel's own
read stands than over the tenth they crest under. As a share of the pixel's own read and never as
two brightnesses, because a crest pixel high on the ramp walks further in bytes than a trough
pixel low on it while giving up less of itself.

**And the bench spends the share where the painter spends it.** Entry 10's field multiplied
`filmStand` over the whole palette, so a fully shaded bench pixel landed on the page's ground —
a stop the painter's shade can no longer reach, the tile being opaque. The share is now spent
inside the scene's own stretch of that palette (`FILM_GROUND_STOP + (1 - FILM_GROUND_STOP) *
(filmStand × scene)`, src/ui/sketch/sketchDrift.ts), so the deepest shade lands on the bloom's
first stop and the ground beneath it is drawn in the legend and never in the picture — which is
the relation the app has to the page its tile is composited over.
