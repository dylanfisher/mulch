# 0345 — The picture is a lattice of marks, and a mark's coverage is its alpha

**2026-09-10.** Amends [0340](0340-the-screen-is-a-shade-and-not-a-window.md)'s "the tile is
written at the caller's own alpha at every pixel", standing on
[0332](0332-a-scene-is-the-colour-and-the-film-is-the-alpha.md) (a scene says where on its ramp a
pixel is read) and [0344](0344-the-scenes-body-is-baked-apart-from-the-ink.md) (the body is baked
once and every tile reads it).

**A cell of the field is one of ten marks.** The tile is cut into square cells of the screen's own
column pitch — five CSS pixels, `gridPitchPx`, so a tile is a whole number of cells wide by
construction and a bit of a mark is a whole device pixel on every display — snapped down the tile
with `sceneRepeat`; each cell reads the body over every pixel in it — the ground under its shade,
its air and its bright points, averaged — and that one value chooses one of ten five-by-five
bit-grid marks ordered by ink, nothing to a block (`src/lib/moireGlyph.ts`). The mark's coverage of each pixel, four soft reads a quarter of a device
pixel apart, is the tile's alpha at that pixel; what a mark leaves uncovered is the page. The film's
four terms still reach the read and not the alpha: a deeper share moves _which_ mark a cell gets,
never how solid a mark stands (`moireCanvasFilm.test.ts`).

**The ramp wraps.** The mark is `(floor(value · 10) + 2) mod 10` at the rest of `glyph.phase`: the
field's empty ground is a colon, its peaks come round to a dot, and only the band between reads
dense. Without the wrap a field is a halftone, blank where it is dark and solid where it is bright;
with it a lattice of marks reads as a picture, which is the whole of what the reference this was
drawn against does (docs/plan.md, the block).

**A cell reads its mean and not its centre or its brightest.** Its centre reads the screen's row
grating, a cell's own pitch apart at rest, at one phase in every cell, so the grating vanishes;
its brightest lights every cell a speck grazes and turns a flock into a blanket. So a point smaller
than a mark is a mark one step denser, and the cases that told a kept thing from a flock now count
cells whose mark moved rather than pixels that brightened, eight ways rather than four because a
thing that straddles a cell's corner is one thing on two cells (`moireCanvasScene.test.ts`).

**Bit-grids, not a font.** A mark rasterised from a face is a different mark on every machine and
none at all on the recorder canvas the painter is tested against; ten five-by-five grids in the
source are the same picture everywhere and gestural and digital, as the scene block asks.

**Two dials, one rest still open.** `glyph.phase` (0.2) and `glyph.flat` — how far every mark's
colour is pulled toward the ramp's middle stop, nought leaving the scenes' own five stops and one
the single ink the reference is drawn in. `glyph.flat` rests at nought until the bench and the
shots choose it. The cell is not a dial: a cell that was not the column pitch was a bit that was
a fraction of a pixel, and a stroke that is a fraction of a pixel is a smear
([0346](0346-the-lattice-stands-still.md)). The colour resolving the tile did once a build left for
`src/ui/moireScreenStops.ts` at the 800-line cap.

**Measured.** The strip with a click train playing and no rack, `./scripts/drive --shot` on the dev
server: mean alpha 0.072 against 0.524 the frame before this, which is what a page showing between
marks is; the crop reads as a lattice of colons, dashes and pluses in the bloom's own inks.
