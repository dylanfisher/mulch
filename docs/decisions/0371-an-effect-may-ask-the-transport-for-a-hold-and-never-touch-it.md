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

**A hand always wins.** Play, pause, stop and seek each take every laid rest with them — the
scheduled stops and the releases laid ahead — and a play tells every instance to count its gap again
from there through `resetHolds`. A hand's pause is never let go of by the rack. Bypassing or removing
the last instance that asks restarts a resting yard in place, on its rack or on the master's — a
restart and not a release, because a stop already scheduled on a source cannot be taken back.

**A redraw drops what it laid.** A knob that rebuilds the run — and a rebuild is paid where a move
arrives — makes the instants the old run gave out nobody's, so the instance asks first for a
`clear`, which the transport answers with the same restart in place, and the rebuild arms at once
rather than a tick later, so a lull set to rest sooner than a tick keeps its first rest.

**The master asks for every yard at once, and only while one plays.** The rack under all the yards
has no transport, so it hands its asks up whole and the host fans each edge out to every voice that
is playing — one draw, the same instants on every yard. It spends nothing while nothing plays; the
first yard to play is what its rests count from, and a yard joining later is handed every edge
still laid ahead, so it joins the rests the others hold rather than waiting a horizon for the next.

**A beat reaches an instance the way the clock does.** `setTempo` pushes a yard's sounding bpm down
to its rack when its analysis lands and when its own rate moves; the master counts the session's
shared clock as one beat, or none.
