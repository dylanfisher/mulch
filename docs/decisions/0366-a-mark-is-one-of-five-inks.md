# 0366 — A mark is one of five inks

The scene's ramp is **cut** where a cell's mark is chosen: `rampStop` (src/lib/moireColour.ts)
reads a stand to the nearest of the five stops the scene named, and never mixes two. **A cell's
ink is exactly one of those five resolved inks**, so a bloom is red marks and cool marks and never
mud. The cut is made in the cell loop of `bands` (src/lib/moireScreenField.ts), in the same place
and at the same cost the mix was: one read a cell, no second pass over the pixels, and nothing
added to the bake the budget is already over (0354, 0365). `ramp` keeps its mix for the two callers
that read a gradient at a scale an eye can see: the tint's band (src/ui/moireTint.ts) and the
bench's own stage.

Nearest, and not five bands of equal width: a hue claim is carried by exactly one stop of the ramp
(`sceneHue`), so rounding onto the stops' own spacing is what makes one stop of claim one stop of
ink wherever the ground already stood. The price is that the two end stops keep half a band each
and are a scene's rarest inks.

The cut is the cell's, not the pixel's. The three channels' fringe and their gains multiply that
ink per pixel afterwards (`channelFringe`, `channelGain`, 0130), and at `DRIFT_REST.fringe` they
do so unevenly, so a covered pixel of a shipping tile is a stop scaled per channel rather than the
stop itself. What the cut guarantees everywhere is that no read is ever a mix of two stops; the
pixel is one of the five outright on a tile the three channels stand level across, which is where
it is read (src/lib/moireScreenField.test.ts).

`GLYPH_FLAT` is therefore a pull on five inks rather than a pull on a gradient, and it **rests at a
half** rather than at the one 0346 left it at. At nought the canopy and the water are a near-black
lattice — both grounds sit at the foot of their own ramps, and the canopy's covered pixels average
7,36,16 against its middle stop's 46,219,75 — so a scene whose name is its colour reads as neither.
At a half every scene's covered pixels average nearer its own middle stop than half the span of its
own ramp (canopy 98 of 200, water 102 of 230, bloom 78 of 232, meadow 3 of 189): the scene's ink
standing under the air its stops were mixed toward, with all five still plainly five.

What this costs is read elsewhere: the film's share still moves the read and never the alpha (0340),
but it now moves it in whole stops, so two shares can land one pixel on the same stop and paint it
the same colour. The shade is therefore read over a band of the tile and no longer at its one
deepest pixel (src/ui/moireCanvasFilm.test.ts).
