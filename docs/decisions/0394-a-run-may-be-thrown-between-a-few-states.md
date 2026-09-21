# 0394 — A run may be thrown between a few states

- **Date:** 2026-09-21
- **Status:** accepted, extending [0208](0208-a-run-is-bounded-off-the-pool-it-draws-from.md) under
  [0204](0204-a-run-is-laid-on-the-automation-horizon.md)

**`auto.states`, one to four, is the third thing a drawn value can be.** Stray is how far from its
plugin's default a value is drawn and Wander is how alive it is once drawn (0208); States is how
many values it may be at all. Above one, every parameter the run draws is thrown between exactly
that many settings, so a wander is a switch between two places rather than a walk through all of
them and a short life is a run flipping between a handful of sounds.

**One is the run as it was, not one state.** The floor hands the draw back untouched and draws
nothing of its own, so a run with no states takes the draws it always took in the order it took
them. A floor that pinned each parameter to one value would be a new default behaviour wearing the
old default's number.

**The states are drawn, not declared.** `stateDraw` (src/lib/effectGrowth.ts) reads which of
`states` equal shares of the parameter's window a draw landed in, and takes that share at a
**phase** — one phase per parameter, drawn off the run's own generator when the cursor is built and
never again. Without it a knob at two states would throw between the same quarter and the same
three-quarter turn of its window on every seed: a quantizer, and not the two random states this was
asked for. One share per state keeps the states a share apart, so a throw between two of them is
one a hand can hear rather than two draws that happened to land together. The snap is on the draw
and never on the value, because a state is one point per parameter and a lattice over values would
be a lattice over hertz and decibels at once. Nothing is stored: the phases are the cursor's, drawn
again with it from the seed the way the places are (0204).

**Only a value's own draw is snapped.** Which entry a place lays and whether a standing value moves
are decisions about the run rather than values of it: a run thrown between two states still draws
from the whole pool and still wanders at the odds it was given.

**The count is what it takes at most.** A parameter whose window has no width takes one value
whatever the count — a presence, whose window is the point its plugin declares `full` at until a
hand widens it, and any bound a hand has closed (0208) — and so does every parameter at no stray at
all. States is a ceiling, and exactly the count where there is a window to spend it in.

**It reaches the picture as the rows it grows, the way a weight does, and so it is written down
rather than claimed** (0148, 0360). A count of states says which values the grown effects arrive
at, and every one of those effects is a row of its own; the automator's own row has no honest
dimension for it. A dimension would have been worse than the silence: the obvious one is `fringe`,
where a crush's bit depth lands, and `fringe` is one of the five the whole picture shares by
boldest claim, with its rest in the middle of its reach — a count whose floor is the continuum
stands at the far end of that reach, so the shipped default of a knob nobody had touched would have
flattened the three channel lattices of every picture in the instrument.

Durable shape: none — a knob on the automator's declaration, which an instance's values record
already carries. Every run drawn before this knob sounds exactly as it did, but the sessions that
hold one are not loadable: `exactKeys` refuses an automator whose params predate the knob, and such
a session is discarded rather than migrated (0026). And src/lib/effectGrowth.test.ts crossed the
400-line soft cap on the way, so the states cases are src/lib/effectGrowthStates.test.ts, the second
suite over that module.
