# 0204 — A run is laid on the automation horizon, and every decision is the tick's

- **Date:** 2026-08-29
- **Status:** accepted, extending [0071](0071-the-offline-pump-arms-the-lanes.md)

An automator has to evolve identically in an `AudioContext` and an `OfflineAudioContext`, and the
two are paced differently: live it is an interval, offline it is the render's own suspensions at a
fixed cadence. So it rides the tick a deck already has — `armAhead` live, `armAutomation` offline —
rather than owning a clock. **No new interval and no second clock** is the whole of why an export
sounds like the performance it exports.

That makes one rule non-negotiable: **every decision is a function of the tick index, never of the
moment the pump ran.** A tick's instant is `born + n × step`; its fade is scheduled at that instant;
nothing reads `now` except to clamp a late pump forward. Nothing in the type system enforces it,
which is why the test that matters pumps the same automator at two cadences and demands the same
run out of both.

**A graph edit cannot be scheduled, so the two ends are asymmetric.** An arrival is added to the
inner rack _early_, at its plugin's own silence, and its fade is scheduled for its instant. A
departure fades at its instant and its nodes are removed _late_, on a later pump, once the fade has
provably passed — removing an already-transparent instance late is inaudible, and that slack is
exactly what lets the two cadences differ.

Consequences, each of which was a bug before it was a rule:

- **A place keeps both of its ramps**, not "the last fade". The run is laid ahead, so a place's
  departure is often scheduled while its arrival is still in the future; one record would forget
  the arrival and report a place as fully in from the moment it was drawn.
- **A retired place leaves the run but not the rack.** The tick that retires a slot fills it again
  in the same breath, so a departing instance held in that map is overwritten by its own
  replacement and never removed from the graph at all. What is _sounding_ is a separate list.
- **The lead is one pump's gap and no more.** Every tick laid ahead is an audio graph built early
  and standing silent until its instant, so laying a full eight-second horizon over a fast tick is
  a rack of unheard reverbs. And a tick has a floor: a whole effect arriving is not a
  sixteenth-note gesture, and below about a second the run is a burst of edits nobody can hear.
- **A place lives exactly as many ticks as the run is wide**, so a fade is clamped to half of that.
  A fade longer than a life would still be arriving when it was asked to leave, and `rampTo` pins
  what it finds — turning a departure into a step.

The pool is weighted by six literal knobs rather than a packed number: a weight is a proportion
("twice as often as"), and each one earns a dial, a readout and a sentence. What a run turns over
into never reaches the drift picture, which reads the durable rack — the picture is of what a hand
set, and nothing here was set by one.
