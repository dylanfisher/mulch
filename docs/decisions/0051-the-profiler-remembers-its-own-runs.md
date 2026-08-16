# 0051. The profiler remembers its own runs, and blocks nothing

- **Date:** 2026-08-16
- **Status:** accepted

`./scripts/profile` appends every clean run to `.profile-history.jsonl` — gitignored — and
`--compare` prints the current run beside the median and observed band of the last ten. That is
how a continuous number becomes a regression without becoming a threshold: `19.4x` is unreadable,
`19.4x against a median of 31.0x` is a bisect. [0050](0050-the-gate-counts-things-and-the-profiler-measures-them.md)
still holds — nothing continuous is asserted on anywhere, and there is still no golden and no
`--bless`.

Three constraints, each load-bearing.

**The history is never committed and never crosses machines.** A run compared against another
machine's numbers measures the machines. The file is this machine's memory of itself, which is
also why a shared CI runner is the wrong home for it: runners vary between runs by more than most
real regressions do.

**`--compare` exits 0 whatever it finds, and the `pre-push` hook that runs it cannot fail a push.**
A hook that can block gets `--no-verify`'d, a skipped hook records nothing, and a thin history
makes the next comparison meaningless — so the mechanism is load-bearingly ignorable. It flags, a
human reads, a human decides.

**Push is the trigger, not the gate and not a per-prompt hook.** `./scripts/check` runs per change
and costs seconds; this costs half a minute and only answers a question worth asking once a
feature is done. A metric is called out only when it is outside every recorded run _and_ past its
tolerance from the median, which is looser for the numbers that share a machine with the
compositor, the collector and a null audio sink than for the two that repeat the same code path
every run.
