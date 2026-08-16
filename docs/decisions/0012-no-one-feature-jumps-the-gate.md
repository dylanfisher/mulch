# 0012. No one feature jumps the gate

- **Date:** 2026-08-15
- **Status:** accepted

`scripts/check` runs every step concurrently and `scripts/smoke` builds once then drives its
`scripts/drive` invocations at the same time rather than in series, which is why the whole gate is
seconds rather than minutes. There is no fixed ceiling on it and the earlier four-second one is
withdrawn: features and the proofs they carry accumulate, so the number rises, and a hard budget
would in the end be met by deleting coverage. What is fixed is the step size — a change whose mean
moves the gate by more than 250ms stops and asks the human before it is accepted, whatever the
total reads. Measure it the way plan §3 says, by stashing the change and comparing means across
several runs: one run's spread is wider than most features cost, and a single lucky measurement has
produced a wrong figure more than once.
