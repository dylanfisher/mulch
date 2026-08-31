# 0233 — A pool entry is reached in one place

- **Date:** 2026-08-31
- **Status:** accepted, narrowing [0208](0208-a-run-is-bounded-off-the-pool-it-draws-from.md) and
  [0055](0055-a-state-is-a-toggle-and-an-action-has-one-icon.md)

The automator's eight weights are not knobs. `auto.filter` through `auto.scatter` keep their
declarations, their values, their `rebuild` and their `AUTO_UNREACHED` reasons; what is gone is the
row they sat in. Each is one slider at the head of the popover its own entry's button opens, in
`src/ui/PoolEntries.tsx`, above the windows that entry's arrivals are drawn inside.

The dials on the automator's card are about the **shape** of a run — Least, Most, Odds, Stays,
Wait, Fade, Stray, Wander. A weight is about **which thing**, and eight of those among the eight
above them was a row of sixteen numbers that said nothing about which was which. 0208 put a window
on an entry as a badge in the weight knob's corner, which was the two halves of one sentence said
in two places: how often, on the dial; inside what, in a popup hanging off it.

So the rule is **one entry, one control**: a pool entry is reached by a button wearing that entry's
own `plugin.icon` and label, and everything a hand says about that entry is said inside what the
button opens. A future parameter about _which thing_ joins the popover; a future parameter about
the _shape_ of the run joins the knob row. `WEIGHT_OF` stays the one list saying which parameter is
which entry's weight, and it is now what the grid is built from — an effect joining the pool gets
its button by existing, exactly as 0208 made it bounded by existing.

The weight commits on release and never per pointer event, for a harder reason than a window does:
a weight is `rebuild`, so a drag writing one command a frame would be sixty crossfaded populations
(0065, 0090, 0202).

`plugin.icon` is the registry's own field and its point is that a card is found by its shape before
its word (0055). It now lands wherever an entry is named: the button, the rack card's header for
every effect and not only a poolable one, and each row of the run. `ParameterKnob` has no `corner`
slot — it had one caller and went with it.
