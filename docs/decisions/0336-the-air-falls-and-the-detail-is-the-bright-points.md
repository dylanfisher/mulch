# 0336 — The air falls and the detail is the bright points

- **Date:** 2026-09-10
- **Status:** accepted, landing the fifth step of the block that reads a yard's whole name into the
  picture, over [0335](0335-a-place-is-a-reach-and-a-shadow.md)'s shade

**"in" is a wash and "through" is a fall.** The air's two joining words are grouped by
`SCENE_SPREADS` (src/lib/moireScene.ts) and `SCENE_LIGHT_TERMS` is spent two ways: a wash mixes
every stop of the scene's ramp toward the light's token in `sceneStops`, once a tile, as it always
did; a fall mixes no stop at all and is spent in the pixel loop **on the position rather than on the
ink** — the read slides toward the top of the scene's own ramp by the light's own amount. So a
light that falls through a field is read along the five stops that field already has, and no second
interpolation is paid for it. A light mixed both ways would be that light paid for twice.

**A fall's foot is the tile's middle, because a tile comes round.** The fall is
`amount · sceneAxis(y / height)`: strongest at the tile's top edge, nought at its middle, and back
at the top edge by the next join. A fall stated from the top row to the bottom row is a bright line
at every join, which is the same thing 0334 found for the meadow's and the canopy's own falls to
the foot.

**A detail is what the field's bright points are.** `SCENE_SPECKS` is `own`, `flock` and `kept`: a
creature reads as a flock, an object as one kept thing, and a name with no detail as the scene's
own — the sparks, the glints and the specks of sky the grounds already carry. `own` is not a group
the bank can draw, exactly as the day is not an air anybody writes.

**A flock is the scene's own points at three times their count, and never a new mark.** Every scene
declares `Scene.specks(x, y, terms)` beside its ground, drawn with the same `speckTiled`
(src/lib/moireNoise.ts) the canopy's specks of sky were already made of — a rare jittered disc on a
wrapped cell grid, hashed apart from the points the ground places, so a bird is never one of the
gaps it flies through. `SCENE_FLOCK` is the count and `sceneFlockRare` turns it into a rarity, which
is floored short of every cell: a scene whose own points are common enough would otherwise light
every cell it has and read as a sheet rather than as a field with birds in it.

**A kept thing stands at the foot of the shade, not on the field.** `standSpeck`
(src/lib/moireStand.ts) is one disc, larger and harder-edged than any speck a scene has of its own,
placed under the band a wall lays across the tile, beside a mass's column, or at the foot of a
flight or a grille — on the same field the shade repeats on (`standDown`), so a tile shows one of it
wherever it is cut. The detail is the last thing a name says and the place is what a thing is left
by, which is why it is the stand and not the scene that knows where one stands.

**Both are read after the shade and lifted to the top stop.** A speck standing in a shadow is a
speck nobody put there, and a light that fell only where nothing stood would be a shadow over the
sky. The order in `build` is ground, hue travel, shade, fall, speck.
