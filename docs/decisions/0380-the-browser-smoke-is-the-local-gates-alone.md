# 0380 — The browser smoke is the local gate's alone

- **Date:** 2026-09-20
- **Status:** accepted, superseding [0330](0330-a-hosted-runners-clock-is-not-the-smokes-word.md)

**`./scripts/check` skips the drive step when `CI` is set**, and `./scripts/setup` installs no
Chromium there. The workflow still runs the gate; the gate itself says which of its steps a hosted
runner can speak for.

**Because every number the browser half is held to is a clock.** 0330 excused a Playwright wait
that expired on a hosted runner and kept every `SmokeFailure` red, on the premise that no amount
of load produces one. The long-task budget (`scripts/smoke.d/longTasks.js`) disproved it: a
`longtask` is wall time, and two shared cores under three Chromiums reported a gesture holding the
thread for 3.9s that holds it for under 200ms on the machine the budget was set against. Excusing
that too would leave a browser half that asserts nothing there, printing pages nobody reads. A
step that cannot be red for a real reason is not a gate; it is a minute and a half of runner time.

**What this costs:** a regression the browser half catches is caught at `./scripts/check` on a
developer's machine, and nowhere else. That was already true of anything slow enough to time out
(0330); it is now true of the whole half, and the local gate is the one thing an agent runs before
every commit.

**Not chosen:** a lower long-task budget under CI, or a bigger runner. One number, one meaning
(principle 1), and a paid runner buys a quieter clock without making it the smoke's word.
