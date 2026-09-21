# 0398 — A new lint warning is a red gate, and only the new ones are printed

- **Date:** 2026-09-21
- **Status:** accepted

`./scripts/check`'s `lint` step is `./scripts/lint`: oxlint, then its warnings compared against
the HEAD version of every file the change touched, identity being file, rule and message with
the numbers taken out. Errors print whole; warnings print only where they are not at HEAD, under
one count line; a new warning fails the step. `./scripts/fix` runs oxlint `--quiet` for the same
reason, and prints the line count of every touched file against docs/map.md's two caps.

**Because the gate was being read through `tail`.** The soft-cap warnings — 120 lines of
max-lines-per-function and max-dependencies, all pre-existing and all waived or tolerated — were
printed on every run, so in one block of 18 steps 140 of 166 gate reads were piped, and the lint
errors that actually failed the step surfaced one per round: 23 red lint runs. The subagent
prompt already said "a gate that passes with new warnings is not a pass"; this makes the tool say
it. Arch's hard cap failed 10 times in the same run on two files, shaved and re-run; the counts
from `fix` are so the split is planned before the run.

**What it does not change.** A warning is waived at its site with a reason (0007), never in the
config and never here. Off a git checkout (a hosted export) the step is plain oxlint.
