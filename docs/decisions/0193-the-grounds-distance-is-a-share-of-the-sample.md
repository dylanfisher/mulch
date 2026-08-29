# 0193 — The ground's distance is a share of the sample

- **Date:** 2026-08-28
- **Status:** accepted, raising the ceiling
  [0185](0185-the-ground-crawls-in-sixteenths.md) set at `PLAYER_SLOTS` and keeping every other
  word of it: the unit is still the loop's own sixteenth, the walk still carries a raw offset, and
  `bedWrap` is still the only thing that folds one.

**`PLAYER_BED_DISTANCE_MAX` is `PLAYER_BED_MAX * PLAYER_SLOTS` — the Bed dial's own reach, said in
sixteenths.** One move at the top may cross sixty-four beds of source, and since `bedWrap` folds
whatever the walk hands it onto the room the file actually has, that is "it can land anywhere in
the song" on every file a hand is likely to load. The old ceiling of one bed made the ground a
crawl and nothing else; the dial now spans the crawl _and_ the leap, which is the range it was
asked for.

**The bound is the dial's reach and not the file's, for the reason `PLAYER_BED_MIN`/`MAX` are
already sixty-four.** How much ground a source holds depends on its length and on the loop the hand
set, and neither is durable in a spec — a spec is checked identically whatever deck it lands on
(0089). So the range is the widest a dial can usefully offer and the buffer decides which of it
exists. A distance measured as a fraction of the loaded buffer would mean handing the walk a room
it is pure of, at every caller of `playerSequence`.

**A log curve, which makes it the second dial to need one.** One sixteenth to a whole file is three
orders of magnitude, and drawn linear the crawl — everything under one bed, which is what the
sixteenth is _for_ — would be the bottom sixtieth of the sweep. Counted all the same: a step of one
sixteenth at either end of it.

**Under the dial it reads as a percentage, `0.1%` to `100%`.** The spec keeps whole sixteenths,
because that is what the walk adds to a cursor; the readout is how a hand thinks about it, and a
hundred percent is the only honest way to spell a reach the buffer, not the dial, decides the edge
of. A decimal below ten percent so the crawl's readings differ, none above it where a whole percent
is finer than a hand can aim.
