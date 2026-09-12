# 0371 — An effect may ask the transport for a hold, and never touch it

- **Date:** 2026-09-11
- **Status:** accepted, amending [0089](0089-a-jump-is-the-transports.md)
  and [0222](0222-an-effect-hears-what-passes-through-it.md), whose mechanism it
  keeps and whose conclusion it narrows; resting on
  [0320](0320-an-effects-address-is-a-rack-not-a-yard.md) for where the master's asks come from.

**An instance still holds nothing but its own nodes.** 0089 ruled out a rack plugin allowed to reach
the transport because the moment one plugin has a handle on the voice, "an effect processes what
reaches it" is no longer true of any of them. That stays true: the lull has no handle. What it has
is a list. `holds(until, out)` writes the hold and release edges it asks for up to a horizon, the
rack gathers the lists of its running instances, and the voice reads them on the same arming tick
it lays lanes and steps on — a function of the ticks covered and never of when it was called, the
pump's own rule (0204). The transport decides what an ask is worth: a yard walking a pattern refuses
it, a yard already resting refuses a second, and a release with no rest standing is nothing.

**A hand always wins.** Play, pause, stop and seek each take the standing rest with them — the
scheduled stop and the release laid ahead — and a play tells every instance to count its gap again
from there through `resetHolds`. A hand's pause is never let go of by the rack. Bypassing or removing
the last instance that asks releases a yard resting for it, on its rack or on the master's.

**The master asks for every yard at once.** The rack under all the yards has no transport, so it
hands its asks up whole and the host fans each edge out to every voice that is playing — one draw,
the same instants on every yard. A yard started after the tick misses that rest and catches the next.

**A beat reaches an instance the way the clock does.** `setTempo` pushes a yard's sounding bpm down
to its rack when its analysis lands and when its own rate moves; the master counts the session's
shared clock as one beat, or none.
