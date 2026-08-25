# 0177 — A page closure carries nothing from the module around it

- **Date:** 2026-08-25
- **Status:** accepted; enforced by [`scripts/closures`](../../scripts/closures) as the `closures`
  step of `./scripts/check`. Does not touch
  [0051](0051-the-profiler-remembers-its-own-runs.md)'s rule that the profiler's numbers never
  decide whether a gate is green.

A function handed to `page.evaluate` is serialized to source text and run in the browser. The
module around it does not exist there, so an import referenced inside one is a `ReferenceError` at
run time and nothing at all at build time — `tsc` sees a legal reference, `oxlint` sees a legal
reference, and the file's own imports make it read correctly. The value crosses in
`evaluate`'s **second argument**, which stays on the Node side and may reference whatever it likes.

**Why it needs a check rather than a habit.** `./scripts/smoke` runs its own closures, so a bad one
there is red in the `drive` step within seconds. `./scripts/profile` is the exception: nothing in
the gate runs it, and nothing can — 0051's whole argument is that its numbers move with the machine
and must never gate. That leaves its eight closures as the only code in the repo that ships unrun.
P127 put a `GEN_SECS` inside one; the profiler died on its last section on every invocation,
recorded nothing, and `--compare` printed no comparison at all. `./scripts/check` was green through
the implementation, four review lenses and the commit. It was found a step later by an agent that
happened to be pointed at the profiler, and had it not been, the history would have quietly stopped
growing — which is the input the next ten comparisons are read against.

**The check is shadowing-aware, and that is the whole difficulty.** The repo's own idiom for
handing a constant in is to destructure it into the closure's parameter list under the same name,
so `WAV_HEADER_BYTES` legitimately appears inside a closure in `scripts/smoke.d/exportAudio.js`
while naming a parameter and not the import. A check that only matched names would fail that file.
So `scripts/closures` collects what each closure binds for itself — every parameter list including
nested arrows, every declaration head — and reports only the names left free. It scans the first
argument alone, because the second is Node's.

**What this forbids.** Referencing a module-scope import inside any `.evaluate(…)` first argument,
anywhere under `scripts/`. Not module-scope _values_ in general: a file-local `const` used inside a
closure breaks in exactly the same way and is not caught, because the demonstrated defect is
imports and a check that guessed at the rest would cost more in false positives than it saves. If a
closure ever needs something the second argument cannot carry — a function, say — it is defined
inside the closure or inlined, never reached for across the boundary.
