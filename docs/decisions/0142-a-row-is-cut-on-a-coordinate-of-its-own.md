# 0142 — A row is cut on a coordinate of its own

- **Date:** 2026-08-24
- **Status:** accepted, amended by
  [0144](0144-the-picture-may-fall-behind-the-hand-may-not.md), extending
  [0131](0131-a-row-is-a-grating-and-the-picture-is-their-product.md),
  [0137](0137-an-effect-declares-the-wave-it-draws-with.md),
  [0139](0139-a-row-is-what-an-effect-is-set-to.md) and
  [0141](0141-colour-is-something-an-effect-turns.md)

> **Amended.** "It runs on a rebuild and never on a frame" was true and not enough: a _rebuild_ was
> every commit, and a knob commits on every pointer move, so a drag paid a picture-sized bake per
> stepped move on the thread the hand was on. 0144 makes a bake asked for not a bake taken — one a
> painting, the paintings themselves budgeted at the picture's own cadence — and moves the loop off
> the main thread where the browser allows it. The loop itself now lives in `curvedField`
> (`src/lib/moireGeometry.ts`) rather than in the painter, so a worker and this thread share one of
> it. Everything below about _what_ a curved row is stands unchanged.

Every row was `aim()`'d with a rotate, a scale and a translate, so every row was a straight comb and
every fringe family in the instrument was straight too. A profile changes the wave a comb is cut to
and a colour changes what it is inked in; neither changes the **axis** it runs down.

**A registry entry declares a `geometry` beside its wave** — `linear | radial | spiral | fan` — and
the registry throws at load for one the picture has no maths for. Unlike a profile it is not claimed
exclusively: two rooms are both radial, and two ring families at two anchors are the picture two
sources make, which is the point. `reverb` claims radial, a room being spherical.

**Three dimensions join `DRIFT_DIMENSIONS`, and they are where and how a row's axis lies.** `centre`
is where on the picture a row is anchored — `delay.time`, because an echo arrives from somewhere.
`chirp` is how hard its spacing is swept across the picture rather than held — `filter.cutoff`,
a cutoff being a slope across a spectrum rather than a line drawn on it. `lens` is how far the
finished field is drawn back through slices slid one against the next — `tape.drive`, the one knob
here that bends what is already there rather than adding a row of its own. The lens is read per
picture off the boldest claim, like the three colour dimensions and for the same reason: it is one
bend of one field, not a property of a row.

**A curved row is a picture-sized tile, and its motion is a matrix.** No affine transform of a
64-pixel tile is a ring family, so a curved row is written a pixel at a time into a tile of the
picture's own size — the one loop over a picture's pixels here, and it runs on a rebuild and never
on a frame, which is the rule 0129 already holds the screen to. What makes that affordable is the
coordinate: **a ring family is cut on the logarithm of the radius**, so scaling it is adding to it,
and a whole cycle of the row is the tile drawn a couple of percent larger about its own anchor. A
spiral is that plus the angle. A fan is scale-invariant and gets the one motion a scale cannot give it — its apex
walks a circle one pitch across, which sweeps every spoke past every point once a turn.

**What a tile is keyed by, a knob steps onto.** The anchor, the ring spacing and the sweep move on a
pointer where a size and a density move on a resize, so each is rounded onto its own steps before it
reaches a tile — eight, eight, and four to the octave — exactly as 0141 steps a colour. And a curved
row's own gesture rides its **phase** rather than its pitch: a lane that moved a baked spacing would
rebuild a picture-sized tile several times a second, so its rings breathe in and out where a
straight row's fringes crowd and open.

**A straight row's anchor is a slide and nothing more, and that is not nothing.** Two combs of one
pitch measured from two places differ by where their crests fall, so their product is a field
neither of them holds — which is what a delay set to two times now is. Where the anchor becomes the
picture rather than a phase is on a row that is swept or curved.

**What is not taken: symmetry.** A mirrored field is a second copy of the field placed beside the
first, which is 0131's "a yard's items are read off each other rather than drawn beside each other"
undone. It stays where the plan left it.
