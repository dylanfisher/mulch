# 0208 — A run is bounded off the pool it draws from, never by parameters of its own

- **Date:** 2026-08-30
- **Status:** accepted, extending [0203](0203-a-rack-may-hold-a-rack.md) and
  [0207](0207-a-run-is-redrawn-by-crossfade.md)

A hand may put a window on what an automator's run draws. The window is one durable field —
`SessionEffect.bounds`, `{}` on every entry that draws nothing — keyed by the **pool's** parameter
ids rather than by the automator's own. Absent means that parameter's whole declared range, or,
for a presence parameter, the single point its plugin declares `full` at.

**Read off the pool's declarations, not declared twice.** The alternative was forty-two automator
parameters — a min and a max per pool parameter — which would have to be added by hand every time
a plugin gained a knob, and would put a second authority on a parameter's range beside
`src/audio/params.ts`. `BOUNDABLE_PARAM_IDS` is the pool's own drawn parameters, folded out of
`drawnParamIds` in the registry, and the durable shape, the wire guard, the restoration expansion
and the popover are all checked against that one list. A parameter added to a plugin tomorrow is
bounded by construction and nothing here changes.

**It rides its own road, because it is not a parameter.** `setBounds` sits beside `setSync` on
`EffectInstance`: pushed down through the rack and the chain, named for one instance rather than
broadcast, and taken and ignored by a plugin that draws nothing. Moving one redraws the run by the
crossfade 0207 already requires — what may be drawn has changed, so the population drawn under the
old window leaves the way anything leaves.

**A presence is drawn like anything else.** Its window is the degenerate one at `full` until a
hand widens it, so today's fade target is the same number written as a range — and the draw is
spent whatever the window says, so the stream stays a function of the spec and the tick count
alone ([0134](0134-a-pattern-plays-the-repeats-it-was-set.md), 0204).

**An entry declares whether what it runs comes round.** `Effect.grows` is that one declaration and
carries both consequences: a hand may bound what such an entry draws, and what it is running is a
stream rather than a period, so `recurrenceLength` answers `{ unbounded: true }` and the estimate
beside the picture reads `infinite?`. A jumping yard is unbounded by the same argument — its steps
are drawn from a seed, and its row's period is how often it steps rather than when it comes back.
A figure in kyr for something that will never line up is the one thing that number must not say
([0080](0080-the-recurrence-is-an-estimate-on-a-relative-grid.md)).

**Wander is one dial, and it moves only what carries a lane.** Stray is how far from its plugin's
default a value is drawn; Wander is how alive it is once drawn — the odds a knob moves at a tick
and how fast it gets there, rolled onto one curve, laid ahead on the same horizon the population
is (0204), so the live and offline paths agree. A value with no lane behind it could only be
stepped, which is the one thing this entry exists to refuse
([0202](0202-an-effect-declares-how-present-it-is.md)), so it never wanders.
