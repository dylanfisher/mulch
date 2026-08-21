# 0080 — The recurrence is an estimate on a relative grid, and the last unit keeps counting

How long a yard's whole pattern takes to come back round is the least common multiple of every
lane's span and the loop's own period in real seconds — `(loopEnd - loopStart) / rate`, because
rate scales buffer time and not lane time ([0035](0035-a-lane-runs-on-its-own-clock.md)). Taken
exactly it is either 1 or unbounded, since two periods a hair apart share no divisor, so
`recurrenceLength` quantizes onto a coarse grid and takes the multiple there. The grid is relative
rather than absolute — a sixteenth of the shortest period, but never finer than
`MIN_RECURRENCE_GRID_SECS`, which is the binding half for any lane near `MIN_LANE_SPAN` and so the
common case rather than the edge one. One fine enough for a 0.1s lane cannot reach the far end of
the scale for a ten-minute one, and this number is read as an order of magnitude rather than as a
countdown. Two nearly-commensurate periods are therefore reported as commensurate. That is the
estimate, not a defect in it, and nothing may come to depend on the figure being exact.

`MAX_RECURRENCE_TICKS` (2\*\*52) is where the exact integers stop, not where the search does. The
multiple is taken as a factorisation — the largest power of each prime any tick count carries —
because that is the one form of a least common multiple that is both exact and unbounded: the
product may be past 2\*\*53, the sum of its logs never is. `recurrenceLength` carries the product
while it fits under the cap and the sum of logs the whole way regardless, so the two agree either
side of the crossing rather than meeting at it, and it answers with the exact seconds or with
`log10Secs` and never with both. A figure computed on inexact integers would still be a lie with
decimal places (principle 5) — what changed is that a magnitude is not that figure. Two things are
refused rather than approximated: a tick count past the safe integers has no factorisation to take
— a trial division of it would never come back — so that period joins the multiple as its own log,
coprime with everything, which is this estimate erring the way it always errs; and an exact tick
count whose seconds overflow a double is answered in logs too, because a length that is not a
length is no answer at all.

The scale is one ascending, strictly increasing list of unit names and their lengths, in
`src/lib/copy.ts` with the rest of the words, and it runs past where a duration is a duration:
geological epochs, light years, the age of the universe. Ascending is load-bearing — it is what
makes the selection total and every rung reachable — so an entry is added at the length it belongs
at, not at the rung it sounds like. `BEYOND_MEASURE` is the last rung and no longer an answer of
its own: past it the estimate keeps counting in multiples of that unit, said plainly while there
are fewer than ten of them and as a power of ten once there are more — `10^42 × the age of the
universe`. So `describeRecurrence` has three readings and no others, and the flat last unit that
every busy deck used to reach is gone: eleven ridden knobs read as an ordinary two geological
epochs, and it takes genuinely incommensurate periods to reach an exponent. The joke is deadpan:
the exponent reads as a unit, never as an exclamation.

The window both sizes draw across is a few periods of the deck's own loop — what a listener counts
in — widened only where that would not let the slowest row come round twice. Whichever row happens
to be slowest is not the base: a fast loop under one long lane would be zoomed out until it read as
a solid band, which is the one thing this picture must not do.

Each row of the picture is a continuous wave rather than a run of ticks — a phase field sampled
across the window — and the rows reach past their own band, so they overlap and the fringes their
beating makes are the picture. A row carries the identity of the lane it draws and not only its
period: the period sets the fringe pitch, the parameter picks the waveform and turns the row —
there are more parameters than there are waveforms, so the fold picks one by its remainder and
spreads the whole of it across a cycle, the same way an effect's two pools come out of one fold
(0081) — and the lane's own
values — sampled once into `laneBend`, never per frame — bend it, so two lanes of the same period
on different parameters never draw the same row.

The estimate never runs on the frame loop. It is recomputed when a lane, the loop or the rate
moves and cached beside the strip; the strip's motion is phases out of `peek()` painted through
refs and the one frame loop, and the painter is a sibling of `src/ui/peakCanvas.ts` rather than a
reuse of it: both sample a field across the canvas's columns, but peaks reduce recorded audio and
drift evaluates a closed form, so neither has anything of the other to borrow. A yard that is
not moving is painted on its commit rather than animated, because every phase it would repaint is
frozen (0040) — measured over three profile runs a side, with a loop and two lanes playing, the
strip moved the frame mean from 8.285ms to 8.298ms and p95 from 9.60ms to 9.80ms, inside the spread
of either side. Replacing the ticks with the wave field moved none of it again: frame p95 10.3ms
against a median of 10.3ms, heap delta at its median and the longest task at 0ms, over two runs.
