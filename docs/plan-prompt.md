# Task: implement every step in plan.md, one at a time

You are the PRIMARY ORCHESTRATOR. `docs/plan.md` §1 "Ordered next work" is the source of
truth for what remains and in what order. You do not implement anything yourself, with one
exception: when a step is abandoned under "Resolving what would otherwise be a question"
below, you write its §4 paragraph and commit that documentation change alone.

This is a fully autonomous run. There is no human to ask. Never stop the loop to ask a
question, never wait for approval, never end a turn holding an unanswered question. When
a decision is genuinely ambiguous, take the most conservative option that keeps the gate
clean and the plan's rules intact, record the choice in `docs/decisions/` or in the commit
message, and keep going.

**Document order under "### Scheduled" is the run order.** Take the first entry, always. A
step's number is an identifier, not a position — never sort by it, and never reorder on
your own judgment.

**`docs/plan.md` is the loop's only state.** Never hold progress solely in your own
context. If you are resumed mid-run, re-read the file and continue from the first
scheduled entry; the steps already removed from it are the steps already done.

**§4 is "Not taken".** Everything abandoned, narrowed, or landed with a known cost goes
there as one paragraph. Nothing in §4 is scheduled by being there.

**`docs/subagent-prompt.md` holds the standing clauses.** Every subagent is told to follow
it. You do not restate it — you check its outcomes in step 4. Never ask an agent to resend
a report: the notification only ever carried its final message, and the file is the report.

## Loop

Repeat until `docs/plan.md` §1 has no entries left under "### Scheduled":

0. **Pre-flight.** The branch must be `main`. `git status --porcelain` must contain nothing
   under `src/` or `scripts/` — if it does, stop the loop and report exactly what is
   uncommitted; never stash it, never work around it. Uncommitted changes under `docs/` are
   the human editing the plan while you run: fold them into the current step's commit and
   keep going. Then record `BASE=$(git rev-parse HEAD)` for this step.
1. Read `docs/plan.md` and identify the next step: the first entry in document order
   under "### Scheduled".
2. Spawn ONE Opus subagent and give it the **Step prompt** below verbatim, with
   `<STEP>` replaced by that step's identifier and title.
3. Wait for it. Do not start the next step, and do not run a second step's subagent
   concurrently — the steps share surfaces and later ones depend on earlier ones landing.
4. When it returns, read its report file, then verify before accepting:
   - `git rev-parse HEAD` differs from `BASE`, `git rev-list --count BASE..HEAD` is 1,
     and `git status --porcelain` is empty;
   - the step is gone from `docs/plan.md` in that commit;
   - **the gate was not weakened to pass.** Read `git diff BASE..HEAD --stat` and confirm
     it does not touch `scripts/`, does not loosen a tolerance in `src/lib/fingerprint.ts`,
     and does not delete, skip or `.only` a test — unless the step's own text called for
     it. Any of those, unexplained by the step, is a rejection, not a discussion. On lint,
     judge it by the waive-at-the-site clause: a directory-wide override or a raised cap is
     a rejection, a commented single-site `oxlint-disable-next-line` is not;
   - the lint step printed nothing new;
   - for each new test, the report names the command that made it fail with the source
     change reverted, and the failure message it produced;
   - the report names the lenses it ran, and for each finding: the failing input or state,
     and whether it was fixed, refuted, or declined with a reason. A lens that reported
     nothing is a valid result — a report where every lens found exactly something is more
     suspicious than one where two found nothing;
   - `./scripts/check` passed in that final state — if the report does not say so plainly,
     run it yourself and read the output whole.
5. If any of that fails, send the same subagent back with the specific gap. Only spawn a
   replacement if it is dead or has lost the thread. Never patch its work yourself.
6. When a step is accepted, run a profile check — but only if the step could plausibly
   have moved the number. A rename, a copy change or a docs-only step does not warrant an
   agent; anything touching a per-frame path, the audio graph, a canvas painter, or the
   gate's browser work does. Spawn one subagent to run `./scripts/profile --compare`, which
   exits 0 whatever it finds ([0051](decisions/0051-the-profiler-remembers-its-own-runs.md)).
   Skipping is deliberate and it is safe now for a reason: the argument for running it on
   every step was that breadth once caught a step that broke `./scripts/profile` itself
   under a green gate, and `scripts/check`'s `closures` step now catches that class. Run
   `--compare` yourself once after the last step whatever you skipped, per AGENTS.md's
   end-of-a-feature rule, so the skipped steps are still covered in aggregate.
   - If it suspects a regression it must interleave the runs, per the clause in
     `docs/subagent-prompt.md`.
   - It may only report the issue resolved if either A: it fixed it and `--compare` is
     acceptable, or B: it established that the regression predates this commit.
   - A profile fix may land as a second commit referencing the step; the working tree must
     be clean again before the loop continues.
   - If it still regressed after that, record the regression and its suspected cause in
     `plan.md` §4 and continue — the profiler blocks nothing, and a step held hostage to it
     is worse than a recorded regression.
7. Report one line for the finished step (what shipped, what the reviews caught), then
   continue the loop.

## Resolving what would otherwise be a question

- **A step wants a new dependency.** Default is no. Solve it with what the repo already
  has, or narrow the step to the part that needs nothing new and record what was left out
  in `plan.md` §4. Only add one if the step is impossible without it; then record the
  decision and what it replaces.
- **A step wants a build-step or toolchain change** (e.g. P27's WASM crate). Default is
  no. Deliver the measurement or the analysis the step asks for, record "nothing
  qualified" or "qualified but not taken, here is the cost" as a decision, and move on.
- **A change moves the gate's mean by more than 250 ms.** Do not accept it. Find the
  cheaper proof, or move the browser work off the pre-reload critical path per §3, and
  record what you measured.
- **A step cannot pass the gate without weakening it.** That is the step failing. It does
  not get a waiver, a skipped test or a widened tolerance; it goes to §4 with a statement
  of what it needed and why.
- **A step fails its gate twice.** Have the subagent revert with `git reset --hard $BASE`,
  then re-attempt once with a narrower slice of the same step. If that also fails, commit
  nothing for it, move the step to `plan.md` §4 with a one-paragraph account of what
  blocked it, commit that documentation change alone, and continue with the next step.
- **The plan is ambiguous about a step's scope.** Read it the narrowest way that still
  delivers a usable vertical slice, state the reading in the commit message, and proceed.

At the very end, after the last step, report a single summary: every step, its commit,
and every choice made under this section.

---

## Step prompt (hand this to the subagent verbatim)

# Task: implement <STEP> from plan.md

## Rule

`docs/plan.md` is the source of truth for what this step is. Implement exactly this step —
not the one before it, not the one after it, not the remainder of the plan.

This is an autonomous run. Do not ask questions and do not stop for approval. Decide,
record the decision, and finish.

## Expected

1. Read `docs/subagent-prompt.md` first and follow every clause in it — they are not
   optional, and each one is there because a previous run paid for its absence. Then read
   `docs/plan.md` and the decisions it links for this step, `AGENTS.md`, and the
   `docs/boundaries.md` invariants for the area you are touching.
2. Implement the step, including the proof the step names and the test that fails without
   the change.
3. Run `./scripts/fix`, then `./scripts/check`. Read the gate's output whole.
4. Remove the completed step from `plan.md` §1 "### Scheduled" and update the rest of the
   document as needed — the baseline paragraph, the ordering paragraph, and any later step
   that referred to this one. If the step's decision constrains future changes, write it in
   `docs/decisions/`. The step is removed before the review pass begins.
5. With the gate passing, spawn up to 4 read-only Opus subagents in the working tree — no
   separate worktree — one per lens. For a simple task such as a rename, 1 is enough; if
   you run fewer than four, say which lenses you combined and why.
6. Re-run `./scripts/fix` and `./scripts/check` after the review fixes. The gate must pass
   clean.
7. Commit to `main` with a message in the repo's voice (see `git log`) — one commit for
   the step, working tree clean afterward. Do not push.

## Scope

- One step only.
- Review subagents: read-only, no worktree, Opus, up to 4, by lens.
- New dependency: default no. Solve it with what the repo has, or narrow the step and
  record what was left out. Never block on it.
- **The gate is not a variable.** Do not edit `scripts/`, do not loosen a tolerance in
  `src/lib/fingerprint.ts`, and do not delete, skip or `.only` a test — unless the step's
  own text says to. If the step cannot pass without weakening the gate, say so and stop:
  that is the step failing, and the orchestrator will record it.
- Keep token usage efficient throughout.

## Report back

Write your report to `/tmp/mulch-run/<STEP>-report.md`, creating the directory if it does
not exist, then reply with nothing but that path.

The report holds: the step implemented; each review lens and what it found (say plainly
when one found nothing); for each finding, the failing input or state and whether it was
fixed, refuted, or declined and why; for each new test, the command that made it fail
without the change and the failure message; any decision you made in place of asking; the
gate's final result; and the commit SHA.
