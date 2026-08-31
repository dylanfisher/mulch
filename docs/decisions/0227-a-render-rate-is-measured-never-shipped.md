# 0227 — A render rate is measured, never shipped

- **Date:** 2026-08-30
- **Status:** accepted, extending [0051](0051-the-profiler-remembers-its-own-runs.md)

How long an export takes is how fast the machine it runs on renders, and nothing about the
performance. So **no figure for it may be written in the source**: a constant here would be the
author's laptop quoted at everyone else. The render harness measures itself instead —
`RenderSpec.onProgress` reports rendered seconds against wall seconds at the stops the pump was
already making and once more at the end, because that is the one place holding both clocks — and
`renderRate` is the whole of the arithmetic.

**The countdown on the button is honest because it is measuring the render it describes.** It is
`growthLeft`'s clock with the word around it and not on it
([0221](0221-a-place-is-the-cursors-and-a-countdown-is-an-estimate.md)), and until a stop has been
measured the button says only that it is going. Before a render, the dialog says a figure only
where this session has already measured one — held in memory in the export door for as long as the
tab lives and never durable — and otherwise says the shape of the answer, which is what a stated
unknown looks like beside a made-up number (principle 5,
[0208](0208-a-run-is-bounded-off-the-pool-it-draws-from.md)).
