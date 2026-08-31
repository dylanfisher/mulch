# 0234 — A drawn value is a ramp on a clock of its own

- **Date:** 2026-08-31
- **Status:** accepted, narrowing [0202](0202-an-effect-declares-how-present-it-is.md) and
  [0204](0204-a-run-is-laid-on-the-automation-horizon.md)

A value the automator drew and later moved is **a ramp, and nothing reads it except through that
ramp**. Each drawn value carries the same `Fade` record a presence does — where it started, where
it is headed, when, and over what — and `grown()` derives where the dial stands at the instant it is
read, the way `reach()` already derives a presence. Written into the array the row shares, in place,
so a read allocates nothing (0070). A wander that wrote the destination the moment it scheduled the
ramp drew a dial that had arrived a whole ramp before the sound had moved at all.

An arrival is exempt and honestly so: a grown effect is _built_ at its drawn values and only its
presence is faded (0202), so its ramps stand still at what they were drawn at.

The wander keeps **its own clock**, `stirSecs` — the turnover divided by `STIRS_PER_TICK`, floored
at `STIR_MIN_SECS` (the pump's own re-arm) and capped at the turnover itself. Once per growth tick
was one chance every `stays / most`: at the defaults, one chance every twenty seconds, which is an
occurrence and not a texture. The floor is the re-arm because the ramp a stir lays is bounded by
the stir after it, so finer than the cadence the run is realized at buys shorter ramps and more
draws rather than more motion — and a short enough ramp is the step a wander may not be. The cap is
what keeps the floor honest: a run turning over faster than the floor would otherwise be handed a
wander clock slower than the change tick this clock exists to outpace, and a standing value would
get fewer chances than it had when it had no clock of its own. At the bottom the two clocks are
one; above it every run stirs oftener than it did.

**No slot is held back from a stir.** On one clock, skipping the place about to roll cost it its
last chance. On two it would freeze it for the whole tick window before its retire — a third of its
life at the defaults — with its bar and its countdown still moving. What a value must not do is ramp
into a fade that has already begun, and that refusal belongs where the departure is actually known:
the automator's `goneAt`, not the maths.

Stirs are laid ahead across the same horizon the arrivals are, so each one's ramp is scheduled
before the knob has reached where the ramp before it was headed. `rampTo` pins `target.value`,
which at that moment is a stale reading; `rampFrom` pins the value the caller has derived, and
`rampTo` is now it with `target.value` passed in. Each place's own `fades` are what makes that
value knowable.

Two clocks, one generator. The cursor is `{ tick, stir }`, both spending from the caller's `random`,
and the automator realizes them **in the order their instants fall**, with a stir at a shared instant
going first so a place laid at that tick is not also moved at it. That order is the whole of what a
seed promises (0134, 0204): every draw is spent whenever it is due and whatever it says, so turning
Wander down is a quieter run and never a different one. The cost is that the two cadences are part
of the stream — a life short enough to sit on `STIR_MIN_SECS` draws differently from one that is
not — which is the ordinary shape of 0134 and not an exception to it.

A held parameter is still never drawn and gets no dial, and how far in a place stands is still the
automator's fade and never something the run may wander (0202, 0128).
