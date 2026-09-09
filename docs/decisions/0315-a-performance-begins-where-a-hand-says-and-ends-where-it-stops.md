# 0315 — A performance begins where a hand says, and ends where it stops

- **Date:** 2026-09-08
- **Status:** accepted, extending
  [0216](0216-a-take-begins-where-the-ear-is.md) and
  [0239](0239-a-warm-up-is-bounded-by-what-a-rack-remembers.md), whose one arithmetic
  for where a take begins is kept whole, and standing on
  [P66](../plan.md) — the global press is the per-deck ones a hand would have sent, plus the one
  thing that is the session's.

**`ExportSpec.fromStart` is a way of saying a number, not a second path through the take.** Set, the
lookback reads as the elapsed run — which is the beginning `backSecs`' own doc already describes —
and everything below it is the arithmetic that was already there. A branch inside `exportTake`
would have been a second answer to where a take begins, and the two would drift the first time one
of them learned about the settle. The dialog greys the offset field rather than hiding it, because
the number it is answering for is still what the checkbox means.

**`session.rewind` returns the session's elapsed run to nought.** The audio clock cannot be
rewound: it is the context's own `currentTime` and every envelope is stamped against it. What the
run is measured from is the facade's, so a rewind moves the origin and the clock goes on running.
Nothing durable moves and no yard is told, so it enters neither history nor the session, for the
reason a seek enters neither (0041).

**`probe().at` is the run; `stats().at` stays the clock.** They were one number and now they are
two, because two readers mean two things by it. `probe().at` answers "how long has this been
performing", which is where a take begins — so a rewind moves it. `stats().at` answers "what is an
envelope's `at` stated on", which is the counter the debug console draws, the clock a scheduled
envelope is compared against and the origin a lane recording measures its own points from; nothing
rewinds that, and a gesture open across a Stop is why nothing may.

**The global Stop sends it; a yard's own Stop does not.** One yard stopping is not the session
ending, and P66's rule is that the header's press is the per-deck presses plus whatever is the
session's own. It rides the press whether or not a yard answered: the run has been going since the
page opened however little was loaded, and it is the session's rather than any yard's.
