# 0230 — Depth is budgeted across the picture, not per row

- **Date:** 2026-08-31
- **Status:** accepted, extending
  [0143](0143-a-row-is-drawn-at-more-than-one-scale.md) and
  [0212](0212-the-picture-draws-the-run-a-read-is-holding.md), constrained by
  [0144](0144-the-picture-may-fall-behind-the-hand-may-not.md)

An automator holding six effects drew six rows at one scale each, so a rack that got six times
busier got six times wider and never deeper. **`octaves` is the run's own size, spent on the rows it
grew** (`grownOctaves`, src/lib/effectGrowth.ts): one copy per effect held, each an octave coarser
and half as deep, bounded by `DRIFT_OCTAVES_REACH`. The automator itself may not claim the dimension
— `STRAIGHT_DIMENSIONS` refuses `chirp` and `octaves` to a curved entry and its own geometry is
`fan` — so the claim lands on what it grew, and **a curved grown row is one scale as the answer and
not as a claim dropped in the painter**: an octave of a ring family is a picture-sized bake per copy
([0142](0142-a-row-is-cut-on-a-coordinate-of-its-own.md)), which is 0142's own sentence said once
more where a test can reach it.

**The new bound is on the set and not on the row, because the number of rows is not bounded.**
`DRIFT_OCTAVES_REACH` says how deep one row may go; nothing said how many rows may go there, and
four automators holding six apiece ask for four times the fills one does. `DRIFT_SCALES_BUDGET` is
the total extra fills a whole row set may ask for — twelve, the deepest rack the picture already
carried — and past it `shareOctaves` holds every row to one ceiling and hands the remainder out a
copy at a time in row order. **Falling back evenly is the point**: cutting the deepest rows to
nothing while the shallow ones keep what they asked for would make the picture say a busy automator
had stopped, where an even fall-back says every row got shallower. A very large rack draws fewer
scales rather than turning the painter into a slideshow — the picture pays and the hand does not
(0144), and this is what keeps the falling-behind bounded rather than merely permitted.

**A budget on fills is not a budget on tiles, so the painter's own cap had to stop rolling.** A
straight row's tile is sixty-four pixels and shared by every octave of it, but a _swept_ one is
keyed by the cycles its pitch comes to, so each octave of a chirping row is a picture-wide bake of
its own. Five grown filters at three scales is twenty keys against a `TILE_CACHE` of twelve, and a
cap that evicts by age alone misses on every lookup of every painting — the rows are walked in the
same order each time, so the entry thrown out is always the one asked for next. `heldStraight`
stamps that cache with the painting that asked, hit as well as miss, and refuses a key wanted
lately, which is what
[0144](0144-the-picture-may-fall-behind-the-hand-may-not.md) already says of every cap here: a rack
over the cap goes over it for as long as it is up and shrinks back after, rather than rolling.

**It is spent where the set is built and never on a frame.** How many scales a row is drawn at is
its identity and what its effect is set to, not a per-frame read (0070), so the budget is shared out
once at the end of `moireRows` and again whenever the population turns over (0212).

Durable shape: none. Nothing about a picture is stored (0131).
