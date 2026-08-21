# The standing subagent prompt

The clauses every subagent gets in an autonomous [plan.md](plan.md) run, on top of
[AGENTS.md](../AGENTS.md), which it is told to read for itself — nothing here restates that
file. Each clause is here because a run paid for its absence, and each says what the absence
cost, so that nobody relaxes one on a hunch. Paste them verbatim; a paraphrase drops the
sentence that made it work.

## Report to a path, not into the reply

> Write your full report to `<absolute path outside the repo>/<step>-report.md`, then reply
> with nothing but that path.

The task notification carries your **final message**, not your transcript. A long report signed
off with a one-line "done" is a report that did not arrive, and the only recovery is a resend
that re-runs the work: 5 of 9 orchestrator messages in one run were pure "your report didn't
arrive, resend", and the four steps after the switch needed none. Outside the repo so it never
reaches the gate or a commit — and a file outlives the run, so a later step can read an earlier
step's findings without spawning anything.

## Watch the test fail

> Revert the source hunks — `git stash push` the source files, or invert the fix — run the test,
> keep the command and the failure message for your report, then restore. A test you did not see
> fail is not proof, and "it would fail" is not an answer.

Seven of seven reproduced the failure they claimed to cover, including a worklet seam and a
960k-sample release that a green gate had already crossed.

## The lint step prints nothing new

> A warning that was not there before this step is this step's. A gate that passes with new
> warnings is not a pass.

Two warnings left behind by one step cost two round trips to chase down later; the seven steps
after this clause was added left none.

## Waive at the site, never broaden

> Do not add a directory-wide lint override and do not raise a cap. A single-site
> `oxlint-disable-next-line`, preceded by a comment explaining why, is what
> [0007](decisions/0007-reviewed-oversized-functions.md) requires. Anything broader is a
> rejection.

The blanket version of this rule — "never add an oxlint-disable" — contradicts 0007 and nearly
rejected a step that was obeying it. Read the decision before writing a prohibition into a
prompt.

## Hand the review the diff and the requirement, and nothing else

> Before you change anything, copy the step's text out of its source verbatim and keep it. Give
> each reviewer that text and the diff — `git diff HEAD`, plus any untracked files it added. Do
> not describe what the diff does.

Your description of the diff is the thing the review exists to check; supplied up front it is
what the reviewer checks the diff _against_, and the review becomes a proofread of your own
reasoning. The requirement has to arrive in the plan's words, not in yours, for the same reason.

## Four lenses, and an empty one is a result

Divide review subagents by lens, not by file: bugs live at the seams, so overlap is intended.

- **Contract.** Does the diff satisfy the step as written? What input, ordering or state makes
  it produce the wrong answer or throw?
- **Seam.** What else reads this value, calls this function, or assumed the old shape?
- **Reuse.** Does `src/` already do this job — a constant, type, config value or copy string now
  declared twice, or behavior duplicated rather than imported? Principle 3 holds: the second
  occurrence is not a finding, the third is.
- **State.** Lifecycle, per-frame identity, effect registration and teardown, what survives a
  reload and what must not, and the relevant [boundaries.md](boundaries.md) invariant.

Reporting nothing is a valid and expected outcome. Do not manufacture findings to fill a report —
a review where all four lenses found exactly something is more suspicious than one where two
found nothing. Keep Reuse its own lens: folded into Seam it gets whatever attention Seam has left.

## Refute before you fix

> Take each finding and try to refute it first. If you cannot name the failing input or point at
> the line that makes the failure inevitable, drop it and say so in one line. Where a surviving
> finding describes a reachable failure, add the test that fails without the fix — seen failing,
> per the clause above — then fix it. A finding declined for scope or judgment rather than
> refutation gets its own one-line reason.

Fixing a plausible-but-wrong finding is worse than not reviewing: it edits working code on a
false premise and spends a gate run proving nothing. A refuted finding and an empty lens cost the
same and are worth the same.

## Interleave base and head

> When attributing a regression, alternate the runs — `BASE`, `HEAD`, `BASE`, `HEAD` — never all
> of one and then all of the other.

Machine load drifts across a run, so a sequential comparison measures the drift. Base 3/3 on an
idle machine against head 4/6 under load produced a false regression; interleaved, the same pair
gave base 4/6 against head 3/6 — the opposite verdict, after nine gate runs spent on it.
