# 0126 — The screen the drift is filmed through rides the picture's own phase

- **Date:** 2026-08-22
- **Status:** accepted, amended by [0127](0127-the-fringe-is-the-rows-own-ink-split.md),
  [0128](0128-every-motion-in-the-screen-belongs-to-a-parameter.md) and
  [0129](0129-a-beat-is-drawn-because-nothing-else-will-draw-it.md)

The drift picture draws true interference ([0098](0098-a-row-is-drawn-against-its-own-band.md)).
What a camera pointed at a monitor adds on top of that — the unlit gap between the screen's own
columns, the scan line crossing them, and one broad band rolling down — is a texture over the same
rows and never a second picture. All three live in one repeating tile that `src/ui/moireCanvas.ts`
fills the rows with instead of flat ink, so the whole of it costs one `fillStyle` and no second
loop of anything: no extra pass over the pixels, no second RAF, no shader.

**Nothing here carries a clock of its own** — which 0128 keeps, for four more motions. The band
rolls by shifting that tile, and how far it
has shifted is read off the reference row's phase — the deck's own read position. A halted yard is
painted and not animated ([0040](0040-automation-holds-where-the-transport-left-it.md)), so a term on a wall clock would
travel across a picture that is standing still, and would have to keep a frame loop alive to do it.
The rate is exactly one traverse per reference cycle, because a band riding a phase that wraps
arrives back where it left at that rate and jumps at every other one. What beats against it is
every other row, each on its own period, which is the picture's whole subject anyway.

**The screen takes ink; it never names a colour.** The tile is a full fill of the row's own
resolved token with the gaps taken back out through `destination-out`, so no literal is written and
no channel is separated. That is why the fringing the reference shows most plainly — the red, green
and blue of the monitor's subpixels pulled apart at every edge — is not here: it would have to mint
three colours the theme does not hold, in a painter rather than in `src/ui/tokens.css`, which is
the one boundary that has only ever been crossed by a written decision. The picture is a little
dimmer for carrying a screen; every term is kept shallow for the same reason, since a fringe is a
product of two translucent crests and whatever one row loses the fringe loses twice.

> **Amended.** The fringing is now had, and the painter does name three tokens — 0127 is the
> written decision that crossing needed, and it answers what the three are relative to the row's
> own ink. The terms are no longer kept shallow either: the reference reads as a lattice leading a
> picture, not as a wash over one, and what holds the screen to a texture is now one declared floor
> on the whole tile rather than each term separately. The tile is no longer built out of fills at
> all — 0129 says why it has to be written a pixel at a time, and why a frame still costs what this
> decision promised it would.

**The tile is as tall as a whole number of scan pitches, not as tall as the canvas.** Shifting a
tile only works if both terms come round at its end. The band does on its own — it is one cosine
across the tile — but the scan lines sit on a fixed pitch, so a tile cut to an arbitrary canvas
height leaves one long gap in the grid at the join, and the shift walks that gap down the picture
once a cycle: the exact edge these terms exist instead of. Rounding up rather than down also means a
strip shorter than one scan pitch still has a line in it; what spills past the bottom is a screen
larger than the window onto it, which is what filming one looks like.

The tile is rebuilt only when the colour, the height or the display's density moves, and it is held
per canvas: the strip and the overlay are two canvases of two heights, and one slot between them
would rebuild it twice a frame for as long as both are up.
