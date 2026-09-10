# 0335 — A place is a reach and a shadow

- **Date:** 2026-09-10
- **Status:** accepted, landing the fourth step of the block that reads a yard's whole name into
  the picture, over [0332](0332-a-scene-is-the-colour-and-the-film-is-the-alpha.md)'s contract

**A place noun is a shadow, not a thing.** The twenty-four nouns are grouped into four shapes the
shade takes — a wall is a band across the tile, steps cut it into terraces, a grille is a coarse
open lattice and a mass is one upright column to one side — and `standShade` (src/lib/moireStand.ts)
answers how much of that shade falls on a pixel. One shadow over all four scenes and never a stand
per scene: a wall on water and a wall in a meadow are the same shade on different ink, which is the
whole reason the shade is spent on the ramp's position rather than drawn in a colour of its own.
Nothing here mints a token, and nothing here is ever the object — a bench is a band of shade.

**The shade is spent after the travel, not before it.** `build` reads the ground, carries it along
the ramp by however far the picture's hue has travelled, and _then_ pulls that read toward the
scene's own first stop. The other order was written first and measured: a shaded band sits near the
foot of the ramp, so a claim at either end of the travel swung it from the ramp's darkest stop to
its second — and the meadow's second stop is the hot ink. The yard's own claim began repainting the
field instead of sliding it, which is the case `moireScreen.test.ts` already stood against.

**A shadow deep enough to reach the ramp's floor is a shadow that repaints the field.** For the same
reason, the resting shade is 0.45 of the read and not the 0.72 it was drawn at: past about 0.6 the
band spends enough of the tile on the steepest part of the ramp to cross that same bar. A hand can
still push it, which is what a dial is; what a rest may not do is put the picture where the claim
stops being an offset.

**A reach scales a mark's period, and a stand's shade its width.** `SCENE_REACH_TERMS` is one number
per reach — close 1.6, middle 1, far 0.62 — multiplied into every mark's period before the ground
snaps it with `sceneRepeat`, so standing closer draws the whole field bigger and the snap still
comes round at the tile's edges. On the shade it scales the _width_ instead: a far wall is a thinner
band on the same field, not the same band drawn smaller, because a shadow's spacing is nothing — it
has only the one.

**Every shape comes round at both edges.** The wall and the mass are reached through `sceneNear`,
lifted here out of the water's blades (0333) now that a second caller wants the shortest signed
offset on an axis that repeats; the grille is snapped by `sceneRepeat`; and the flight of steps
rises from its last tread back to its first over a pixel rather than dropping there. A shadow stated
in absolute pixels would step at every tile join exactly as a ground would, which is the ruled grid
all of this exists to prevent.
