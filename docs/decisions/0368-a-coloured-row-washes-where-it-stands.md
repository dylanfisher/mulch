# 0368 — A coloured row washes where it stands

- **Date:** 2026-09-11
- **Status:** accepted, amending
  [0302](0302-the-ramp-is-washed-across-the-picture.md)

A hue claim reached the picture only as the boldest row's, one number over the whole tile
([`inkTravelInto`](../../src/ui/moireScreenInk.ts)), and the band that spent it was one fill over the
whole canvas: a tape's warmth and a reverb's tone were one mixture wherever they stood, and the
second claim was not in the picture at all. **The tint is now one band per coloured row**, laid at
that row's own `centre` and brought up by that row's own `pulse` — the same reading 0229 lets move
where a row stands, so a colour stands where its row does and two coloured rows are two colours in
two places. The boldest claim still inks the tile; what this adds is the band over it.

**No hue reaches a tile's key.** The band is still one tile per `(colour, scene, light, spread)`,
written once and moved on its own transform, and a row's hue is spent by _translating_ that pattern
so the hue's own place in the ramp — `hue / 2`, the ramp being read forward over the tile's first
half — lands on the row's centre. A hue in the key would be a bake per knob position, which is the
one thing that must never reach the frame path ([0129](0129-a-beat-is-drawn-because-nothing-else-will-draw-it.md),
[0354](0354-the-screen-tile-is-baked-off-the-frame.md)); a translation is free.

**The sweep goes with the one band.** 0302's band slid along the picture over `colour.sweepSecs`,
which was the whole of what said the ramp was a ramp and not a tint. A band now shows the ink its own
row claimed, and a phase sliding that claim around the ramp every twelve seconds says a colour nobody
turned a knob for — the exact thing the whole-picture wash is being removed for. So `phase`,
`TINT_SWEEP_SECS` and its row of copy are gone, and what moves the colour is the rows.

**No band may lay more than `colour.wash`, however many compose.** Each band is its own `source-atop`
fill, a band is `colour.band` of the picture wide and every centre is confined to the middle half of
it (`CENTRE_INSET`), so three coloured rows already put two bands over one pixel and eight put eight.
Laid whole, eight compose to `1 - (1 - strength)^8` — the band replacing the screen and washing away
the three channel lattices, which is what `TINT_STRENGTH` is held under one to prevent (0130). Each
therefore lays `1 - (1 - strength)^(1/lit)`, which composites back to the strength where they all
coincide and is the strength itself when one band stands alone.

**A band carries its row's arrival.** A row's alpha is weighted by `clamp(row.arrival, 0, 1)`, the
same weight the picture's own weight and the row's depth take (`drawnGratings`, `washedDepth`): the
`arrived` test alone is a gate for a vote, and a band is a drawn amount. Without it a colour arrived
six seconds before the grating it names and vanished between two frames when the row finished
leaving, which is the population flash the arrival exists to remove.

**The fill count is the coloured-row count, and `TINT_BANDS` is what bounds it.** One band is one
`fillRect`, so a rack growing a run of thirty rows would otherwise buy thirty fills a frame. Eight
are read, in the picture's own order, off a fixed array refilled in place
([0070](0070-a-per-frame-read-refills-and-never-clears.md)). A row is coloured when it is drawn,
wholly arrived, and claiming a hue other than `DRIFT_REST.hue` — the two guards every reader of a
row's claim takes, plus this one. **A picture no row has claimed a colour in is not washed at all**:
the tile below is already in the ink the yard asked for, and a wash of the middle of the ramp over it
says a colour nobody turned a knob for. That is the behaviour 0302 had and this replaces.

**A band has an edge, because a feather costs an allocation a frame.** The band is a rect
`colour.band` of the picture wide, filled through the pattern; it is not faded out at its two ends.
Fading wants a gradient whose stops are the row's hue, which is a `CanvasGradient` built per band per
frame, or a second fill per band — and the fill count is exactly what this step is bounded by. The
edge is a step between two stops of the ramp at the wash's own alpha, not between colour and none.
