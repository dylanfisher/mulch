# 0102 — A hold is pinned by hand, and the tape flushes what is not a number

A hold at a time the audio thread has already passed is pinned by hand —
`cancelScheduledValues(t)` then `setValueAtTime(target.value, t)`, what was the Firefox fallback.
`cancelAndHoldAtTime` survives in exactly one place: `scheduleAutomation` in src/audio/ramp.ts
holding a cycle whose origin is still ahead of the clock. `rampTo` never holds ahead, so it never
calls the method at all.

**Why.** A manual move is asked for at a time already in the past: `when` is `ctx.currentTime` read
on the main thread, so the audio thread sees the call a block or more after the instant it names.
Chrome, cancel-and-holding at a past time while a `linearRampToValueAtTime` is in flight, hands the
next render quantum a computed value of **0** — below the parameter's own declared `minValue`, so
nothing clamps it. Measured live: dragging Drive on a tape, `tape.drive` arrived at the worklet as 0
in three runs of four; holding at `when + 0.05` instead, or pinning by hand, in none of seven.

**A lane is both.** `armLanes` in src/audio/deck.ts arms the cycle the clock is already inside
before the ones across the horizon (0035), so a lane's first origin is always in the past and the
rest are seconds ahead. The past one takes the hand-pinned hold; a future one cannot, because the
value it has to hold is the one the cycles between now and then have yet to leave there, and
offline the whole horizon is armed before the render that produces it — `target.value` read at
arming time would flatten the lane. So `scheduleAutomation` takes the clock alongside the origin
and picks by comparing them, and `buildDeckChain` reads that clock off the context as it schedules
— the audio clock, not the lane clock `armLanes` places origins with, which is held a lookahead
ahead of the thread and offline runs the whole horizon before the render reaches any of it.

**Why that was fatal rather than a click.** `tape.drive` is a divisor —
`adaaTanh(state, x * drive) / drive` — so one block of zero divides a NaN into a loop that feeds
itself. `flush` cleared denormals and let a NaN through, so the buffer stayed poisoned for the life
of the node: NaN out of the wet path, NaN through the dry sum beside it, and a NaN reaching the
master `DynamicsCompressor` latches it, which is the whole page silent until a reload. Both meters
tap ahead of the limiter and `peakMagnitude` reports NaN as 0, so nothing on any surface could say
what had happened.

**So `flush` flushes non-finite too.** A denormal and a NaN are the same kind of thing to this loop
— a value that, once in the buffer, never leaves it — and the guard puts the loop back inside one
delay's length rather than losing the context. It is the second line of defence and not the fix:
the parameter is what was wrong.

**What this costs.** A hand-pinned hold reads `target.value`, which is the value at the last block
boundary rather than at `when` exactly; mid-ramp it can be a block stale. That is under three
milliseconds on a parameter already being ramped over ten, and it is what Firefox has always done
here.
