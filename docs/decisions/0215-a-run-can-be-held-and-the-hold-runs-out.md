# 0215 — A run can be held, and the hold runs out

- **Date:** 2026-08-30
- **Status:** accepted, extending [0204](0204-a-run-is-laid-on-the-automation-horizon.md) and
  [0210](0210-a-run-is-a-size-range.md)

A hand that likes what an automator has grown had no way to keep it. `auto.wait` is that way: one
ordinary parameter declaration in the automator's own table, said in seconds because that is what a
hand asks for. Nought is not waiting, and the top of its range is not a very long wait but a wait
with no end — the lock, held until the knob comes back down.

**The hold is armed by the command and not by the number it carries.** The plugin takes the
instant the set arrived and holds until `at + wait`, so asking for the value the knob already reads
asks for that time over again. That is what makes the hourglass at the head of the run a control
rather than a readout, and it is why the gesture needs no second command and no nudge: nothing on
the road from `param.set` to the instance compares the new value with the old one — `setParam` in
`src/app/execute.ts` clamps and applies, and history's coalescing merges what a repeat does to the
undo stack without ever dropping the command.

**A rack built from what the session holds arms the hold it was carrying.** A reload, an undo or
redo, and the offline render an export is all rebuild every instance from stored values, so a run
locked when the page closed comes back locked, and a wait that was standing is asked for again from
the top. That an undo re-arms a hold it did not touch is the same fact one level down as an undo
discarding the run itself: a restore builds a fresh graph, so the population is redrawn from the
seed either way, and a hold that survived the rebuild while the run it held did not would be the
odd one out. The alternative — a stored countdown — is a durable value that counts itself down,
which is a command a second (plan §2). How long is left is derived from the arming instant and
reported per instance beside `grown` in the per-frame read; a surface asks between pumps as often as
on them, so the part of the hold the pump has not credited yet is derived there too.

**A hold stops the run's own clock rather than skipping its ticks.** `born` — the instant every
tick's own instant is measured from — is pushed out by exactly the time held, so the ticks a wait
covers are not laid at all rather than laid late, and a released run lays its next place a full
turnover on rather than catching up in one pump. Every place standing under the hold has that same
time added to its life, so a held run's rows stop counting down instead of draining to nothing
while nothing leaves.

**It does not cut what is already scheduled, and that bounds how soon it bites.** A pump lays the
run across `AUTOMATION_REARM_SECS` plus one tick of horizon (0204), and nothing this entry holds is
ever cut off (0202) — so up to that much already-laid run finishes before the hold is audible. At
the knob's own defaults that is at most one turnover; it is only visible as a limit where a run is
made to turn over faster than the horizon, which is why the offline proof of the hold renders past
that horizon rather than inside it. A knob that reshapes the run still redraws through a hold: a
hold is the clock stopped, and a redraw is a hand asking for a different run — settling what the
hold owes the clock it is replacing, because a halted deck runs no pump and an unsettled debt
charged to the fresh clock would push the run out by the wait twice.
