# 0364 — The ground crawls the lattice, and the wind only leans it

The walk's ground move and the screen's crawl were two motions with one name. They are one now: the
one travel the lattice makes across the picture is the ground's, and the rack's wind, which used to
be that travel, leans the lattice instead.

- **A bed is a cell.** `crawlCells` (src/ui/moireCrawl.ts) reads the first ground row's _travelled_
  centre back into beds — one bed being one loop-length of source — and rounds it, so a ground move
  of one bed steps the lattice exactly one cell and a move of four steps four, on the ground's own
  travel and never on a clock of its own. That travel is a **rate** — `easedCentre` carries the whole
  of `DRIFT_CENTRE_REACH` in `playerGroundSecs` — so a move across the file sweeps the lattice across
  it and a bed's move inside a long file steps it almost at once, which is 0235's rule read rather
  than a second one written. No third clock, and nothing new to carry across a rebuilt set.
- **Through the source, not from the loop's in-point.** A hand dragging the loop moves the ground
  _and_ the point a distance from it would be measured against, so `playerGroundBeds`
  (src/lib/playerDrift.ts) measures from the top of the file. A loop resized is another bed and so
  another count, which is the loop changing rather than the ground moving inside it.
- **A quarter-bed nudge steps nothing on its own**; four of them are a bed and step one. The lattice
  is a standing grid and a cell is what the eye can see move (0346).
- **The wind leans.** `MoireWind.lean` is whole cells toward the way the field is blowing, read off
  the direction and the strength — both travelled at the wind's own rate, because the tail steps
  whenever an entry is added or bypassed and a lean written outright off it would hop the lattice
  three marks between two frames. It goes through `leanCells`, which moves to src/lib/moireLattice.ts
  with the constant and the hold it already had: the lattice has one axis, the sides and the tail are
  two readings pulling it along that one, and a second arithmetic for the second reading is the same
  lean said twice (0361). A place and not an integral — a rack blowing all day leans and never walks,
  so the ground's move is the only step. `drift` and the `wind.turns` dial are gone with the travel
  they measured.
- Both are terms on the pattern's transform and touch no field of the tile's key, so a ground
  walking the file all day and a field blowing over it bake nothing (0129, 0354). The ground's cells
  are taken off the rounding, the way the sides are, because they are whole already; a reversed
  landing turns them with the rest of the crawl (0362). The count is an absolute place — how many
  beds through the source the ground stands, not a distance walked — so it is unbounded and a
  reversal mirrors it; a translation of a repeating pattern is exact at any whole number of cells,
  and what the eye reads is the difference between two frames.
