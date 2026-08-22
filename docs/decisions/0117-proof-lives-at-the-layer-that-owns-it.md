# 0117. Proof lives at the layer that owns it

- **Date:** 2026-08-22
- **Status:** accepted

A module with no colocated test is not a gap. Most of `src/` is proven from above, through
`createInstrument` and its manual clock, and a second test at the module's own level would restate
what the seam already asserts and cost a gate run to say it twice. So the question is never "does
this file have a test" but "name the test that goes red when this behaviour breaks" — and where the
answer is a seam test, that is the proof and nothing is owed.

Three kinds of file are owed nothing at all: a module with no runtime code, where the compiler is
the proof; a test double, which the files that drive it prove; and a defensive line whose input
nobody can name, which is not reachable and so not provable.

What is owed is the converse. Where no test anywhere goes red — the audit runs it by inverting the
line and running the whole suite, not by reading — the behaviour is unproven at the layer that owns
it, and gets the one cheapest test that fails without it, watched failing. Pure code has no layer
above it, so anything unproven in `src/lib` is simply unproven. A browser scenario that reports a
number no `fail()` guards is the same defect in the other medium.

No coverage tool and no coverage threshold, ever: a percentage counts files rather than behaviours,
and it would score every one of the declines above as a miss.
