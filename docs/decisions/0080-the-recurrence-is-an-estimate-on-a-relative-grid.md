# 0080 — The recurrence is an estimate on a relative grid, and the cap is a unit

How long a yard's whole pattern takes to come back round is the least common multiple of every
lane's span and the loop's own period in real seconds — `(loopEnd - loopStart) / rate`, because
rate scales buffer time and not lane time ([0035](0035-a-lane-runs-on-its-own-clock.md)). Taken
exactly it is either 1 or unbounded, since two periods a hair apart share no divisor, so
`recurrenceSecs` quantizes onto a coarse grid and takes the multiple there. The grid is relative
rather than absolute — a sixteenth of the shortest period, but never finer than
`MIN_RECURRENCE_GRID_SECS`, which is the binding half for any lane near `MIN_LANE_SPAN` and so the
common case rather than the edge one. One fine enough for a 0.1s lane cannot reach the far end of
the scale for a ten-minute one, and this number is read as an order of magnitude rather than as a
countdown. Two nearly-commensurate periods are therefore reported as commensurate. That is the
estimate, not a defect in it, and nothing may come to depend on the figure being exact.

The search is bounded by `MAX_RECURRENCE_TICKS` (2\*\*52), which is what keeps every accepted
multiple an exact integer. Past it there is no number, and `describeRecurrence` answers with the
last unit of `DURATION_SCALE` and no figure at all — a figure computed on inexact integers would
be a lie with decimal places (principle 5). The scale is one ascending, strictly increasing list
of unit names and their lengths, in `src/lib/copy.ts` with the rest of the words, and it runs past
where a duration is a duration: geological epochs, light years, the age of the universe. Ascending
is load-bearing — it is what makes the selection total and every rung reachable — so an entry is
added at the length it belongs at, not at the rung it sounds like.

The window both sizes draw across is a few periods of the deck's own loop — what a listener counts
in — widened only where that would not let the slowest row come round twice. Whichever row happens
to be slowest is not the base: a fast loop under one long lane would be zoomed out until it read as
a solid band, which is the one thing this picture must not do.

The estimate never runs on the frame loop. It is recomputed when a lane, the loop or the rate
moves and cached beside the strip; the strip's motion is phases out of `peek()` painted through
refs and the one frame loop, and the painter is a sibling of `src/ui/peakCanvas.ts` rather than a
reuse of it, because peaks reduce samples to columns and drift has no sample in it. A yard that is
not moving is painted on its commit rather than animated, because every phase it would repaint is
frozen (0040) — measured over three profile runs a side, with a loop and two lanes playing, the
strip moved the frame mean from 8.285ms to 8.298ms and p95 from 9.60ms to 9.80ms, inside the spread
of either side.
