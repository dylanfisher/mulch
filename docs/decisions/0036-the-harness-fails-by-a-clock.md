# 0036. The harness fails by a clock, and says what it was waiting on

- **Date:** 2026-08-15
- **Status:** accepted

## Context

A task that should have cost twenty minutes cost over an hour. Almost none of the difference was
work: `./scripts/check` runs in about four and a half seconds, and its own reported time is
accurate. The hour went to `./scripts/drive` invocations that never returned — one backgrounded
and never reaped, then repeated attempts with ever longer timeouts, each of which also hung.

Two of those processes were still alive when this was written, hours later, each holding a
headless Chromium. They had produced no output at all: not a line of stdout, not the `building…`
note on stderr. That is the whole problem in one observation. A run that hangs silently is worth
less than a run that fails, because a failure names a suspect and a hang names nothing — and the
only recovery, `kill`, is denied to agents by `.claude/settings.json`, correctly, since a stray
`pkill` is exactly how a human's dev server dies.

The second cost was thinner. When a render's threshold assertion failed, `scripts/smoke` printed
the two numbers that tripped it. Two numbers cannot distinguish a broken gesture from a window
that landed on an edge — and edges are expected here, because the master bus delays rendered audio
against the schedule that made it (`DeckReport`, `src/audio/deck.ts`). Each guess costs a build, a
Chromium and a render; printing the whole array costs nothing and answered it immediately.

## Decision

**Nothing in the harness may hang.** Every `drive` run carries a deadline (`--deadline SECS`,
180s by default, off for `--repl`) and dies at it naming the stage it was in — building, launching
Chromium, waiting for the instrument to attach, rendering, reading stdin. The stage is the finding;
the deadline only makes it printable.

**The recovery path is a flag, not a signal.** `./scripts/drive --stop` kills any other drive
process. It lives here rather than in a shell because the allowlist denies `kill` and should: this
matches on the command line being this script, so it can never take down a server a human started.
No pidfile — several drives run at once by design, so there is no single pid to record and a stale
file would be one more thing to be wrong about.

**stdin is an input, not a suffix.** A file argument is the whole script; only a bare invocation
or `--repl` reads the pipe. Appending stdin to a file run made every invocation from a parent that
holds its pipe open wait for an EOF that was never coming.

**A failed assertion prints everything it had.** `fail` takes evidence and dumps it whole. The
threshold says which comparison failed; the evidence says whether the signal is wrong or the
window is merely on an edge.

## Consequences

The gate gains a second: a deliberately stalled `drive` runs alongside the other fixtures and has
to die at its deadline. That is the only way to prove this property — it fails, before the change,
by never finishing.

The deadline is a wall, not a diagnosis. A genuinely slow run on a cold machine can hit it and be
told to pass `--deadline`. That is the right trade: the default is generous against a cold build
and far under the patience of whoever is waiting, and the failure is a sentence rather than an hour.

`--stop` is a blunt instrument aimed at one target. It kills drives, including healthy ones — which
is why `scripts/smoke`, whose parallel drives it would take out, must never call it.
