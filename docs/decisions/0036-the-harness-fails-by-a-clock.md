# 0036. The harness fails by a clock, and says what it was waiting on

- **Date:** 2026-08-15
- **Status:** accepted

Nothing in the harness may hang: every `drive` run carries a deadline (`--deadline SECS`, 180s by default, off for `--repl`) and dies at it naming the stage it was in, `./scripts/drive --stop` kills stray drive processes by matching the command line rather than a pidfile, stdin is only read by a bare invocation or `--repl` (not a file-argument run), and a failed assertion prints all the evidence it had, not just the threshold that tripped it.
