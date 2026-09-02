# 0273 — The picture travels with the song

- **Date:** 2026-09-01
- **Status:** accepted, amending
  [0268](0268-the-structure-opens-into-a-lattice-the-picture-is-inside.md) and
  [0272](0272-the-structure-stands-inside-the-valley.md), extending
  [0142](0142-a-row-is-cut-on-a-coordinate-of-its-own.md)

The picture read as a lattice the ink slid over, and not as somewhere being travelled through.
Every motion in it was a cycle of one fringe: a straight row slid one pitch per turn of its lane,
so a row on an eight-second lane crept a pixel a second and every row stood still against the
screen. With an automator standing, the flight through the structure was a level every eighty
seconds and the picture's point on the plane moved only when the population turned over. Three
changes, none of them a parameter (0128) and none of them a per-frame bake (0129, 0142).

**A row travels a whole number of its own fringes a turn.** `DRIFT_TRAVEL_CYCLES` multiplies the
slide of a straight row, the rings a turn of a ring family and the circles a turn of a fan's apex.
Whole, because a grating repeats every fringe and a family every ring: the end of a turn is the
picture the turn began with, for any integer and for no fraction, so the wrap is invisible and
the travel is a term on the transform that touches no key. What the number buys is not speed but
_difference_ of speed — a row on a short lane races and a row on a long one creeps, and that is
parallax with no size drawn for it anywhere. A ring family's zoom is turned to open outward
through the turn, the way the fractal flight already dives, so a family and a fold move the same
way. A chirped row's wrap was already a jump and is now this many times wider; a chirp is a rare
claim.

**The flight is a level every half minute, and no faster than the shop bakes.** `FRACTAL_FLIGHT_SECS`
goes from four minutes to ninety seconds, so a whole level is crossed while one place stands.
The bound is the tile shop: every stop of the flight is a picture-sized bake a row through a
worker that bakes serially and drops nothing, so a dive faster than a bake is a queue that only
grows and a picture that falls further behind the longer the deck sounds. A faster dive is the
shop learning to drop a stale order, not a smaller number.

**And the structure roams the plane while the deck sounds — inside the band 0272 bounded.** The
population's travel moves the picture once a turnover and it stood still between them. The roam
is a figure on two prime clocks, on the sounding and pure, so it halts to rest with the flight and
the age and carries no state across a rebuild. It shares the wander band with the travel and
widens it by nothing: each keeps half, both re-centred on the notch, so a population's own move is
half as visible as 0272 measured. That is the trade — one move a turnover the eye reads as a
picture that moved, against a picture that is always somewhere new. Stepped where every other
stop is, so it costs a bake at a stop crossing and nothing between two.

The shot that decided it: one yard on a click train looped at two seconds, an automator laying a
place every five, read on the drift strip's own 1:1 crop at fourteen, fifteen and fifty seconds.
Base swings 0.060, 0.067 and 0.063 at means of 0.346, 0.361 and 0.330; head swings 0.072, 0.068
and 0.065 at 0.354, 0.361 and 0.329 — the ink is the same and the structure is not less. A pixel
diff of two shots a second apart says nothing either way, because the screen's own roll moves
every pixel of both; what the travel is, to the pixel, is asserted on the matrices themselves
(src/ui/moireCanvas.test.ts, src/lib/moireGeometry.test.ts).

Durable shape: none.
