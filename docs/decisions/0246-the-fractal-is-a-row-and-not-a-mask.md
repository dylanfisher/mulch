# 0246 — The fractal is a row, and not a mask

- **Date:** 2026-09-01
- **Status:** accepted, amended by
  [0248](0248-the-structure-travels-and-its-identity-is-the-automators.md), replacing
  [0245](0245-the-picture-is-cut-through-an-attractor.md), amending
  [0211](0211-the-pictures-kernel-is-gated-on-byte-equality.md), resting on
  [0131](0131-a-row-is-a-grating-and-the-picture-is-their-product.md) and
  [0142](0142-a-row-is-cut-on-a-coordinate-of-its-own.md)

**A mask is not a grating, so nothing beats against it.** 0245 built its attractor with the one
composite that unions a set, measured a block-contrast spectrum that rose at every scale, and put a
pale attractor-shaped stain over an unchanged lattice. The measurement was not wrong and the arithmetic
was not wrong; the _layer_ was. A support laid over the picture can only sit on top of it — 0131 says
the picture is the product of its gratings, and a thing that is not one of them adds nothing to that
product but its own shape. Three things followed, and all three are gone with it: the compensation
(`attractorKeep`) that halved every row's depth picture-wide and could solve `gratingDepth` to zero
outright; a polarity that erased the field _off_ the set, so the set kept full field alpha and read as
the pale region; and a coverage measured through a `getImageData` stub that answers 255 to every
whole-picture read, so no test in the repo could ever have caught either.

**What replaces it is a coordinate.** `geometryTurns` (src/lib/moireGeometry.ts) is already the one
place a row's axis is a number — a line, a ring, a spoke, a spiral — and `curvedField` is already the
one pixel loop, baked at most once a painting behind a worker and a standing-tile fallback (0142,
0144). Two more coordinates go in there: the escape-time field of `z → z² + c` read as a Mandelbrot
view, and a plane folded into itself. A row cut along one of them is a grating like any other, so
every other row beats against it, the boundary's filigree comes out of the interference rather than
out of an outline, and **the picture's weight solves itself** — `gratingDepth(count, PICTURE_FLOOR)`
counts it like any row and there is no compensation anywhere.

**Three things a shot decided and no measurement could.**

**The centre must be on the boundary.** Seeded as a Julia set's own `c` — the first shape of this —
a run drew a smooth sweep with no structure in it: the escape field is smooth wherever the orbit
leaves quickly and flat wherever it never leaves, and the only place it has structure is the curve
between those. A `c` folded out of a square band lands off that curve almost always. Read as a
Mandelbrot view instead, the picture _is_ the plane the constant runs across, so nothing has to land
on an interesting value — the interesting values are the picture, and the seed only says where it
stands. It stands in the seahorse valley and wanders `FRACTAL_WANDER` about it, which is boundary at
every scale it is looked at.

**The count is banded on its logarithm.** Banded linearly, the contours crowd past a pixel at the
boundary while the open plane gets two of them — a tenth of the picture moving two whole fringes
between neighbouring pixels, which is noise. A logarithm spaces them through the approach.

**And the spacing is the whole of it.** A structure a dozen cycles across the picture against a
lattice of ninety does not beat — it stacks, which is a coarse shape over a fine weave and is exactly
what a mask was. `FRACTAL_BAND_CYCLES` and `FRACTAL_LEVEL_CYCLES` put both coordinates in the band the
lattice is drawn in, for the reason `PITCH_COMPRESS` exists (src/lib/moireGrating.ts).

**Two copies and not one** (`FRACTAL_BEAT`). One copy beats against the lattice, and the lattice is
straight, so what comes out is the weave gently bent — a shot showed exactly that. Two copies of the
same structure on close periods open at slightly different rates and beat against **each other**, and
the fringes of that carry the structure's own shape at every scale it holds. That is 0131 applied to
the thing rather than laid beside it, and it is what "the moiré is built into the structure" means.

**No effect may claim either coordinate**, and the registry refuses one that does. What an escape
field or a folded plane is a picture of is the whole population a run is standing, which belongs to
the field and to no plugin; the jumps module folds its own coordinate out of a pool that now excludes
them (`DRIFT_PICKED_GEOMETRIES`), because a fold takes a remainder and a pool that grew under one
would silently move every part's coordinate.

**0241's three readings are spent as three things, and one of them still touches no bake**: the
population is the rows' identity, and so the structure; `spectralEdge` is how deep they cut
(`heardBite`, now reaching a ceiling of one — a row cut fainter than every knob in the yard was the
first shot of this); `spectralFlatness` is how far the finished field is bent through its own lens
(`heardBeat`), which is where the second cut of a mask went.

**0211 is amended, and the amendment is the coordinate's own nature.** The harness licenses one
rewrite — a divide hoisted out of the pixel loop — which moves `u` in a double's last bit. An escape
count amplifies that without bound at the boundary, so held to the _field_ the two spellings disagree
at 96 pixels in a hundred. Neither is more right than the other and the eye cannot tell them apart.
The two are held where the claim still means something: given the same point, the shipped kernel
answers exactly what the arithmetic it was written from answers.

**It is cheaper than what it replaces at rest and dearer at a turnover.** The mask paid twenty-five
picture-sized blits when the population moved and one blit a painting after. Two fractal rows pay two
picture-sized _bakes_ when the population moves or the opening steps, and one `drawImage` each after —
through the shop every curved row already goes through, so a bake that has not landed draws the tile
the row was standing on rather than holding the picture up (0144).

Durable shape: none. The rows are built off a population nothing stores (0070, 0204) and rebuilt when
it turns over, and their tiles are the shop's cache.
