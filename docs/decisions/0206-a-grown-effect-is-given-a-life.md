# 0206 — A grown effect is given a life, not a rate

- **Date:** 2026-08-29
- **Status:** accepted, amending
  [0204](0204-a-run-is-laid-on-the-automation-horizon.md)

The automator first said when in the grid the rest of the app walks: `Every` sixteenths of the
shared clock, over a `Period` it fell back on when no clock was running. Both were true and neither
was the question anyone asks of the card, which is _how long does a thing that arrives stay_. That
answer was three knobs and a division away, and its ceiling — a clock at its slowest, sixty-four
sixteenths, six places — was about thirteen minutes, which is shorter than a session.

**One knob, `Stays`, in seconds, log from four to an hour.** It is the life of one grown effect,
from the moment it begins to arrive to the moment it begins to leave. What turns over is derived:
a place lives exactly `Held` ticks, so a tick is `Stays / Held` — turn `Held` up and the same life
turns over more often. The fade is still bounded by half a life, so an arrival can never still be
arriving when it is asked to go.

The cost, taken deliberately: the automator no longer paces itself off the session's shared clock,
so it declares no `setSync`. A run of effects is not a rhythm — it is scenery changing behind one —
and an hour of it does not belong on a sixteenth grid.

Because the life is now a number the entry holds rather than one derived from a clock it may not
see, a per-frame read can say how long each place has left (`remain` and `life` on `GrownEffect`),
and the rows say it: the bar drains over the whole life and the row reads the time out. When a
thing arrives and when it goes was the other half of what the grid framing hid.
