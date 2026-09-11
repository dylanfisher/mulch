# 0346 — The lattice stands still, and the sound's cut is read a cell at a time

**2026-09-10.** Standing on [0345](0345-the-picture-is-a-lattice-of-marks.md) (a cell of the
field is a mark and its coverage is the alpha), amending [0340](0340-the-screen-is-a-shade-and-not-a-window.md)'s
resting motions and [0341](0341-the-cut-is-aimed-at-a-field.md)'s cut, which were both aimed at
a solid tile.

**The numbers that decided it.** The zoomed drift, read off its own canvas on the dev server with
a click train playing and no rack: after 0345 no pixel of the marks stood above three quarters
of its alpha and most stood under a quarter, whatever the film's share or the cut's floor said.
Three things were each a factor of about a half on a stroke one device pixel wide: the pattern
laid at a fraction of a pixel, the pattern turned and leaned by a fraction of a turn, and the
rows' gratings — the picture is the tile seen through their product — sampled a pixel at a time
across the stroke.

**The cell is the screen's column pitch.** Five CSS pixels, `gridPitchPx`, and not a dial: a tile
is `beatPx(pitch)` wide, so a whole number of cells span it by construction, and a mark's bit is a
whole device pixel on every display. The marks are five bits a side for that reason
(`src/lib/moireGlyph.ts`). That is also the reference's own cell in the column it is shown in.

**The lattice stands still.** `inkThrough` rounds its two translations — the crawl, with the ground
and the wind that lean it since
[0364](0364-the-ground-crawls-the-lattice-and-the-wind-only-leans-it.md), and the roll — to whole
cells, so the picture steps through a fixed grid a cell at a time, which
is what the reference's fixed glyph grid does with its picture flowing under it. The turn, the
breath and the shear rest at nought (`screen.turn`, `screen.breath`, `screen.shear`); the dials
stay for a hand that wants the smear, and the cases that read those motions claim them.

**The cut is read a cell at a time.** Before the field is taken out of the picture it is boxed
into its own corner at one pixel per cell — the mean of the window the gratings leave over that
cell — laid back over itself a whole cell at a time, and composed with itself three times
(`boxField`, src/ui/moireCanvas.ts; the block look's own two draws and hardening). A cell the
gratings half block keeps seven eighths of its mark and one they block by nine tenths keeps a
quarter: the sound's cut is holes in a lattice of whole marks. Read back, the marks stand at half
to three quarters of their ink with a tenth of them whole, against none above three quarters
unhardened.

**The channel split rests at nought.** At 0.16 a cell's third is under two pixels and every stroke
of every mark took its own channel: the zoomed drift read as a rainbow grille. `CHANNEL_MIX` is
nought; a standing pop still pushes it to `CHANNEL_MIX_FULL`, and the case that reads the three
channels claims a saturation.

**And the ink is one.** (Until 0366 cut the ramp to the five stops and rested this at a half.)
`glyph.flat` rests at one: read off the same canvas the covered pixels
average the scene's own middle stop — a bloom's red, a canopy's green — where at nought they
average a mud of all five. A scene keeps its ink under its air and loses a gradient a five-pixel
mark could never show. The cases that read the film's shade in colour pin the dial at nought.

**Left standing, and named.** The lattice reads denser than the reference on a bloom or a meadow:
the wrap makes the middle of the ramp the dense marks, and those scenes stand most of their field
there where the reference's sources are mostly dark. That is a mapping from the read to the mark
and not a matter for a scene, and it is the next thing to look at on the bench (docs/plan.md, the
block).
